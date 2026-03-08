import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

/**
 * Backfill function to credit all uncredited mining sessions.
 * This runs through all sessions that have arx_mined > 0 but credited_at IS NULL
 * and credits the points to the users.
 */
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Authenticate admin (optional - can be called via cron or manually)
    const authHeader = req.headers.get('authorization')
    let isAdmin = false
    
    if (authHeader) {
      const { data: { user } } = await supabase.auth.getUser(
        authHeader.replace('Bearer ', '')
      )
      
      if (user) {
        const { data: role } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .eq('role', 'admin')
          .maybeSingle()
        
        isAdmin = !!role
      }
    }

    // Parse body for options
    const body = await req.json().catch(() => ({}))
    const limit = Math.min(body.limit || 100, 500)
    const dryRun = body.dry_run === true

    console.log(`Backfill starting - limit: ${limit}, dryRun: ${dryRun}`)

    // Find all uncredited sessions (ended, has points, not credited)
    const { data: sessions, error: fetchError } = await supabase
      .from('mining_sessions')
      .select('id, user_id, arx_mined, started_at, ended_at')
      .eq('is_active', false)
      .is('credited_at', null)
      .gt('arx_mined', 0)
      .order('ended_at', { ascending: true })
      .limit(limit)

    if (fetchError) {
      console.error('Failed to fetch sessions:', fetchError)
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to fetch sessions' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!sessions || sessions.length === 0) {
      console.log('No uncredited sessions found')
      return new Response(
        JSON.stringify({ success: true, message: 'No uncredited sessions found', credited: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`Found ${sessions.length} uncredited sessions`)

    const results: Array<{
      session_id: string
      user_id: string
      points: number
      status: 'credited' | 'failed' | 'skipped'
      error?: string
    }> = []

    let totalCredited = 0
    let totalPoints = 0

    for (const session of sessions) {
      const points = Math.floor(Number(session.arx_mined) || 0)
      
      if (points <= 0) {
        results.push({
          session_id: session.id,
          user_id: session.user_id,
          points: 0,
          status: 'skipped',
          error: 'No points to credit'
        })
        continue
      }

      if (dryRun) {
        results.push({
          session_id: session.id,
          user_id: session.user_id,
          points,
          status: 'skipped',
          error: 'Dry run - not credited'
        })
        totalPoints += points
        continue
      }

      try {
        // Mark session as credited ATOMICALLY
        const { data: creditUpdate, error: creditError } = await supabase
          .from('mining_sessions')
          .update({ credited_at: new Date().toISOString() })
          .eq('id', session.id)
          .is('credited_at', null)
          .select('id')
          .maybeSingle()

        if (creditError || !creditUpdate) {
          results.push({
            session_id: session.id,
            user_id: session.user_id,
            points,
            status: 'skipped',
            error: 'Already being processed or credited'
          })
          continue
        }

        // Award points using RPC
        const { error: pointsError } = await supabase.rpc('increment_user_points', {
          p_user_id: session.user_id,
          p_amount: points,
          p_type: 'mining',
        })

        if (pointsError) {
          // Rollback credited_at
          await supabase
            .from('mining_sessions')
            .update({ credited_at: null })
            .eq('id', session.id)

          results.push({
            session_id: session.id,
            user_id: session.user_id,
            points,
            status: 'failed',
            error: pointsError.message
          })
          continue
        }

        results.push({
          session_id: session.id,
          user_id: session.user_id,
          points,
          status: 'credited'
        })
        totalCredited++
        totalPoints += points

        console.log(`Credited ${points} points to user ${session.user_id} for session ${session.id}`)

      } catch (err: any) {
        results.push({
          session_id: session.id,
          user_id: session.user_id,
          points,
          status: 'failed',
          error: err.message
        })
      }
    }

    const summary = {
      success: true,
      total_sessions: sessions.length,
      credited: totalCredited,
      total_points: totalPoints,
      dry_run: dryRun,
      results: results.slice(0, 50) // Limit results in response
    }

    console.log(`Backfill complete: ${totalCredited} sessions credited, ${totalPoints} total points`)

    return new Response(
      JSON.stringify(summary),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error: any) {
    console.error('Backfill error:', error)
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})