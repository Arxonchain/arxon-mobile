import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

/**
 * Secure backend endpoint for awarding mining points.
 * Clients must not write arx_mined / credited_at (protect_mining_session_credits).
 * This function ends + credits sessions with service_role.
 */
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

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
    const { type, session_id } = body

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

    const closeSession = async (sessionId: string, endedAt?: string | null) => {
      await supabase
        .from('mining_sessions')
        .update({
          is_active: false,
          ended_at: endedAt || new Date().toISOString(),
        })
        .eq('id', sessionId)
        .eq('is_active', true)
    }

    if (type !== 'mining') {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Only mining credits are allowed via award-points. Use complete_task_and_award_points / social claim / referral trigger / Word Forge validators.',
        }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!session_id) {
      return new Response(
        JSON.stringify({ success: false, error: 'Session ID required for mining points' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { data: session, error: sessionError } = await supabase
      .from('mining_sessions')
      .select('id, user_id, is_active, arx_mined, credited_at, started_at, ended_at')
      .eq('id', session_id)
      .eq('user_id', user.id)
      .maybeSingle()

    if (sessionError || !session) {
      return new Response(
        JSON.stringify({ success: false, error: 'Session not found or access denied' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (session.credited_at) {
      if (session.is_active || !session.ended_at) {
        await closeSession(session_id, session.ended_at || session.credited_at)
      }
      const currentPoints = await fetchCurrentUserPoints()
      return new Response(
        JSON.stringify({ success: true, message: 'Already credited', points: 0, userPoints: currentPoints }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const startTime = new Date(session.started_at).getTime()
    const endTime = session.ended_at ? new Date(session.ended_at).getTime() : Date.now()
    const elapsedSeconds = Math.floor(Math.max(0, endTime - startTime) / 1000)
    const effectiveSeconds = Math.min(elapsedSeconds, 8 * 60 * 60)
    const endedAtIso = session.ended_at || new Date().toISOString()

    const [userPointsRes, xProfileRes, arenaBoostsRes, nexusBoostsRes] = await Promise.all([
      supabase.from('user_points').select('referral_bonus_percentage, x_post_boost_percentage, daily_streak').eq('user_id', user.id).maybeSingle(),
      supabase.from('x_profiles').select('boost_percentage').eq('user_id', user.id).maybeSingle(),
      supabase.from('arena_boosts').select('boost_percentage').eq('user_id', user.id).gte('expires_at', new Date().toISOString()),
      supabase.from('nexus_boosts').select('boost_percentage').eq('user_id', user.id).eq('claimed', true).gte('expires_at', new Date().toISOString()),
    ])

    const userPoints = userPointsRes.data
    const xProfile = xProfileRes.data
    const arenaBoosts = arenaBoostsRes.data || []
    const nexusBoosts = nexusBoostsRes.data || []
    const totalBoost = Math.min(
      Math.min(userPoints?.referral_bonus_percentage || 0, 50)
      + (userPoints?.x_post_boost_percentage || 0)
      + Math.min(userPoints?.daily_streak || 0, 30)
      + (xProfile?.boost_percentage || 0)
      + arenaBoosts.reduce((sum: number, b: { boost_percentage?: number }) => sum + (b.boost_percentage || 0), 0)
      + nexusBoosts.reduce((sum: number, b: { boost_percentage?: number }) => sum + (b.boost_percentage || 0), 0),
      500,
    )
    const pointsPerHour = Math.min(10 * (1 + totalBoost / 100), 60)
    const finalPoints = Math.min(480, Math.ceil((effectiveSeconds / 3600) * pointsPerHour))

    if (finalPoints <= 0) {
      await supabase
        .from('mining_sessions')
        .update({
          is_active: false,
          ended_at: endedAtIso,
          credited_at: new Date().toISOString(),
          arx_mined: 0,
        })
        .eq('id', session_id)
        .is('credited_at', null)

      const currentPoints = await fetchCurrentUserPoints()
      return new Response(
        JSON.stringify({ success: true, message: 'No points to award', points: 0, userPoints: currentPoints }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { data: creditUpdate, error: creditError } = await supabase
      .from('mining_sessions')
      .update({
        is_active: false,
        ended_at: endedAtIso,
        credited_at: new Date().toISOString(),
        arx_mined: finalPoints,
      })
      .eq('id', session_id)
      .is('credited_at', null)
      .select('id')
      .maybeSingle()

    if (creditError) {
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to process session' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!creditUpdate) {
      await closeSession(session_id, endedAtIso)
      const currentPoints = await fetchCurrentUserPoints()
      return new Response(
        JSON.stringify({ success: true, message: 'Already credited', points: 0, userPoints: currentPoints }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { data: result, error: pointsError } = await supabase.rpc('increment_user_points', {
      p_user_id: user.id,
      p_amount: finalPoints,
      p_type: 'mining',
    })

    if (pointsError) {
      await supabase
        .from('mining_sessions')
        .update({ credited_at: null })
        .eq('id', session_id)

      return new Response(
        JSON.stringify({ success: false, error: 'Failed to award points' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ success: true, points: finalPoints, userPoints: result }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return new Response(
      JSON.stringify({ success: false, error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
