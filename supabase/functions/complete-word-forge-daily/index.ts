import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const DAILY_BONUS = 50
const MIN_WORDS_FOR_DAILY = 5

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

    // Server UTC date only — ignore client completion_date / mission_met
    const completionDate = new Date().toISOString().slice(0, 10)
    const attemptPrefix = `${completionDate}:`

    const { count: wordsToday } = await supabase
      .from('word_forge_word_credits')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .like('attempt_id', `${attemptPrefix}%`)

    if ((wordsToday ?? 0) < MIN_WORDS_FOR_DAILY) {
      return new Response(JSON.stringify({
        ok: false,
        error: `Daily mission not met (need ${MIN_WORDS_FOR_DAILY} validated words today)`,
        words: wordsToday ?? 0,
      }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const { data: existing } = await supabase
      .from('word_forge_daily_completions')
      .select('id, bonus_awarded')
      .eq('user_id', user.id)
      .eq('completion_date', completionDate)
      .maybeSingle()

    if (existing) {
      return new Response(JSON.stringify({ ok: true, already: true, payout: Number(existing.bonus_awarded) }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const { data: inserted, error: insertErr } = await supabase
      .from('word_forge_daily_completions')
      .insert({ user_id: user.id, completion_date: completionDate, bonus_awarded: DAILY_BONUS })
      .select('id')
      .maybeSingle()

    if (insertErr) {
      if (insertErr.code === '23505') {
        const { data: race } = await supabase
          .from('word_forge_daily_completions')
          .select('bonus_awarded')
          .eq('user_id', user.id)
          .eq('completion_date', completionDate)
          .maybeSingle()
        return new Response(JSON.stringify({ ok: true, already: true, payout: Number(race?.bonus_awarded ?? DAILY_BONUS) }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }
      return new Response(JSON.stringify({ ok: false, error: insertErr.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const { data: userPoints, error: pointsErr } = await supabase.rpc('increment_user_points', {
      p_user_id: user.id,
      p_amount: DAILY_BONUS,
      p_type: 'game',
    })

    if (pointsErr) {
      await supabase.from('word_forge_daily_completions').delete().eq('id', inserted!.id)
      return new Response(JSON.stringify({ ok: false, error: pointsErr.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    await supabase.rpc('log_points_ledger_entry', {
      p_user_id: user.id,
      p_amount: DAILY_BONUS,
      p_category: 'game',
      p_description: `Word Forge daily bonus (+${DAILY_BONUS} ARX-P)`,
      p_reference_type: 'word_forge_daily',
      p_reference_id: inserted?.id ?? null,
    })

    // Compute streak from completions table (server-side)
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10)
    const { data: yest } = await supabase
      .from('word_forge_daily_completions')
      .select('completion_date')
      .eq('user_id', user.id)
      .eq('completion_date', yesterday)
      .maybeSingle()
    const { data: prog } = await supabase.from('word_forge_progress').select('daily_streak').eq('user_id', user.id).maybeSingle()
    const nextStreak = yest ? Math.max(1, (prog?.daily_streak ?? 0) + 1) : 1

    await supabase.from('word_forge_progress').upsert({
      user_id: user.id,
      daily_completed_date: completionDate,
      daily_streak: nextStreak,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' })

    return new Response(JSON.stringify({ ok: true, payout: DAILY_BONUS, daily_streak: nextStreak, userPoints }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error'
    return new Response(JSON.stringify({ ok: false, error: msg }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})
