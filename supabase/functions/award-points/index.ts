import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

/**
 * Secure backend endpoint for awarding points.
 * 
 * This replaces direct client-side RPC calls to increment_user_points.
 * Only the backend (service_role) can execute the actual point increment.
 * 
 * CRITICAL SECURITY:
 * - Mining points REQUIRE a valid session_id that hasn't been credited yet
 * - Points are calculated server-side based on actual elapsed time
 * - Double-crediting is prevented via credited_at timestamp
 * - All amounts are validated and capped server-side
 */
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Authenticate the user
    const authHeader = req.headers.get('authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    )

    if (authError || !user) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const body = await req.json()
    const { type, amount, session_id } = body

    const fetchCurrentUserPoints = async () => {
      try {
        const { data } = await supabase
          .from('user_points')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle()
        return data ?? null
      } catch {
        return null
      }
    }

    // Validate type
    if (!['mining', 'task', 'social'].includes(type)) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid point type' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // For mining points, ALWAYS require session_id and validate server-side
    if (type === 'mining') {
      if (!session_id) {
        console.error('Mining points requested without session_id')
        return new Response(
          JSON.stringify({ success: false, error: 'Session ID required for mining points' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Check if session exists, belongs to user, and hasn't been credited
      const { data: session, error: sessionError } = await supabase
        .from('mining_sessions')
        .select('id, user_id, is_active, arx_mined, credited_at, started_at, ended_at')
        .eq('id', session_id)
        .eq('user_id', user.id)
        .maybeSingle()

      if (sessionError || !session) {
        console.error('Session not found:', session_id, sessionError)
        return new Response(
          JSON.stringify({ success: false, error: 'Session not found or access denied' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Prevent double-crediting - this is critical
      if (session.credited_at) {
        console.log('Session already credited:', session_id, 'at', session.credited_at)
        const currentPoints = await fetchCurrentUserPoints()
        return new Response(
          JSON.stringify({ success: true, message: 'Already credited', points: 0, userPoints: currentPoints }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Calculate points SERVER-SIDE based on actual elapsed time
      const startTime = new Date(session.started_at).getTime()
      const endTime = session.ended_at ? new Date(session.ended_at).getTime() : Date.now()
      const elapsedMs = Math.max(0, endTime - startTime)
      const elapsedSeconds = Math.floor(elapsedMs / 1000)
      
      const maxHours = 8
      const maxSeconds = maxHours * 60 * 60
      const effectiveSeconds = Math.min(elapsedSeconds, maxSeconds)

      // Fetch user's boost percentages for accurate calculation
      const [userPointsRes, xProfileRes, arenaBoostsRes, nexusBoostsRes] = await Promise.all([
        supabase
          .from('user_points')
          .select('referral_bonus_percentage, x_post_boost_percentage, daily_streak')
          .eq('user_id', user.id)
          .maybeSingle(),
        supabase
          .from('x_profiles')
          .select('boost_percentage')
          .eq('user_id', user.id)
          .maybeSingle(),
        supabase
          .from('arena_boosts')
          .select('boost_percentage')
          .eq('user_id', user.id)
          .gte('expires_at', new Date().toISOString()),
        supabase
          .from('nexus_boosts')
          .select('boost_percentage')
          .eq('user_id', user.id)
          .eq('claimed', true)
          .gte('expires_at', new Date().toISOString()),
      ])

      const userPoints = userPointsRes.data
      const xProfile = xProfileRes.data
      const arenaBoosts = arenaBoostsRes.data || []
      const nexusBoosts = nexusBoostsRes.data || []

      const referralBoost = Math.min(userPoints?.referral_bonus_percentage || 0, 50)
      const xPostBoost = userPoints?.x_post_boost_percentage || 0
      const streakBoost = Math.min(userPoints?.daily_streak || 0, 30)
      const xProfileBoost = xProfile?.boost_percentage || 0
      const arenaBoost = arenaBoosts.reduce((sum: number, b: any) => sum + (b.boost_percentage || 0), 0)
      const nexusBoost = nexusBoosts.reduce((sum: number, b: any) => sum + (b.boost_percentage || 0), 0)

      const totalBoost = Math.min(referralBoost + xPostBoost + streakBoost + xProfileBoost + arenaBoost + nexusBoost, 500)
      const basePointsPerHour = 10
      const pointsPerHour = Math.min(basePointsPerHour * (1 + totalBoost / 100), 60)
      
      // Calculate points based on actual elapsed time (max 480 for 8 hours)
      // ALWAYS round UP to whole number - no decimals
      const calculatedPoints = Math.min(480, Math.ceil((effectiveSeconds / 3600) * pointsPerHour))

      // Use calculated points (ignore client-sent amount for mining)
      const finalPoints = calculatedPoints

      if (finalPoints <= 0) {
        console.log('No points to award for session:', session_id, 'elapsed:', effectiveSeconds, 'seconds')
        const currentPoints = await fetchCurrentUserPoints()
        return new Response(
          JSON.stringify({ success: true, message: 'No points to award', points: 0, userPoints: currentPoints }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Mark session as credited ATOMICALLY before awarding points
      const { data: creditUpdate, error: creditError } = await supabase
        .from('mining_sessions')
        .update({ 
          credited_at: new Date().toISOString(),
          arx_mined: finalPoints
        })
        .eq('id', session_id)
        .is('credited_at', null) // Only update if not yet credited (atomic check)
        .select('id')
        .maybeSingle()

      if (creditError) {
        console.error('Failed to mark session as credited:', creditError)
        return new Response(
          JSON.stringify({ success: false, error: 'Failed to process session' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // If no rows updated, session was already credited by another request
      if (!creditUpdate) {
        console.log('Session was already credited by another request:', session_id)
        const currentPoints = await fetchCurrentUserPoints()
        return new Response(
          JSON.stringify({ success: true, message: 'Already credited', points: 0, userPoints: currentPoints }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Award points using service role
      const { data: result, error: pointsError } = await supabase.rpc('increment_user_points', {
        p_user_id: user.id,
        p_amount: finalPoints,
        p_type: 'mining',
      })

      if (pointsError) {
        console.error('Failed to award points:', pointsError)
        // Rollback the credited_at
        await supabase
          .from('mining_sessions')
          .update({ credited_at: null })
          .eq('id', session_id)
        
        return new Response(
          JSON.stringify({ success: false, error: 'Failed to award points' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      console.log(`Awarded ${finalPoints} mining points to ${user.id} for session ${session_id} (${effectiveSeconds}s, ${totalBoost}% boost)`)

      return new Response(
        JSON.stringify({ success: true, points: finalPoints, userPoints: result }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // For task/social points, validate and cap the amount - ALWAYS round UP
    const safeAmount = Math.min(Math.max(Math.ceil(Number(amount) || 0), 0), 500)
    if (safeAmount <= 0) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid amount' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Award points using service role
    const { data: result, error: pointsError } = await supabase.rpc('increment_user_points', {
      p_user_id: user.id,
      p_amount: safeAmount,
      p_type: type,
    })

    if (pointsError) {
      console.error('Failed to award points:', pointsError)
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to award points' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`Awarded ${safeAmount} ${type} points to ${user.id}`)

    return new Response(
      JSON.stringify({ success: true, points: safeAmount, userPoints: result }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error: any) {
    console.error('Award points error:', error)
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})