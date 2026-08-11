import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

/**
 * Secure backend endpoint for awarding mining points.
 * Delegates to end_and_credit_mining_session (atomic balance + ledger).
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

    const { data: result, error: rpcError } = await supabase.rpc('end_and_credit_mining_session', {
      p_session_id: session_id,
      p_user_id: user.id,
    })

    if (rpcError) {
      return new Response(
        JSON.stringify({ success: false, error: rpcError.message || 'Failed to award points' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!result?.success) {
      return new Response(
        JSON.stringify({ success: false, error: result?.error || 'Failed to award points' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const points = Math.max(0, Math.ceil(Number(result.points || 0)))
    return new Response(
      JSON.stringify({
        success: true,
        points,
        message: result.message,
        userPoints: result.user_points ?? null,
      }),
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
