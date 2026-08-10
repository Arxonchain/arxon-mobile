import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

/** Server-authoritative task → reward map. claim_key is derived server-side. */
const HINT_TASKS: Record<string, number> = {
  'refer-one': 2,
  'daily-checkin': 1,
  'daily-forge': 2,
  'share-link': 1,
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const authHeader = req.headers.get('authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ ok: false, error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''))
    if (authError || !user) {
      return new Response(JSON.stringify({ ok: false, error: 'Invalid token' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const body = await req.json()
    const taskId = String(body.task_id ?? '')
    if (!taskId || !(taskId in HINT_TASKS)) {
      return new Response(JSON.stringify({ ok: false, error: 'Unknown or missing task_id' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const reward = HINT_TASKS[taskId]
    const today = new Date().toISOString().slice(0, 10)
    const claimKey = `${taskId}:${today}`

    if (taskId === 'refer-one') {
      const { count } = await supabase
        .from('referrals')
        .select('id', { count: 'exact', head: true })
        .eq('referrer_id', user.id)
      if ((count ?? 0) < 1) {
        return new Response(JSON.stringify({ ok: false, error: 'Referral requirement not met' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }
    }

    if (taskId === 'daily-checkin') {
      const { data: pts } = await supabase.from('user_points').select('last_checkin_date').eq('user_id', user.id).maybeSingle()
      if (pts?.last_checkin_date !== today) {
        return new Response(JSON.stringify({ ok: false, error: 'Check-in required today' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }
    }

    if (taskId === 'daily-forge') {
      const { data: done } = await supabase
        .from('word_forge_daily_completions')
        .select('completion_date')
        .eq('user_id', user.id)
        .eq('completion_date', today)
        .maybeSingle()
      if (!done) {
        return new Response(JSON.stringify({ ok: false, error: 'Daily forge not completed' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }
    }

    // share-link: one claim per day only (honor-system reduced to daily cap via claim_key)
    const { error: insertErr } = await supabase
      .from('word_forge_hint_claims')
      .insert({ user_id: user.id, claim_key: claimKey, reward })

    if (insertErr) {
      if (insertErr.code === '23505') {
        return new Response(JSON.stringify({ ok: true, already: true, reward: 0 }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }
      return new Response(JSON.stringify({ ok: false, error: insertErr.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const { data: progress } = await supabase
      .from('word_forge_progress')
      .select('hints_left, hint_task_claims')
      .eq('user_id', user.id)
      .maybeSingle()

    const claims = { ...(progress?.hint_task_claims as Record<string, string> ?? {}), [claimKey]: new Date().toISOString() }
    const hintsLeft = Math.min(10, (progress?.hints_left ?? 0) + reward)

    await supabase.from('word_forge_progress').upsert({
      user_id: user.id,
      hints_left: hintsLeft,
      hint_task_claims: claims,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' })

    return new Response(JSON.stringify({ ok: true, reward, hintsLeft, claims, claim_key: claimKey }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error'
    return new Response(JSON.stringify({ ok: false, error: msg }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})
