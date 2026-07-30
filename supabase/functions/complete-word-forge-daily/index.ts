import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const DAILY_BONUS = 50

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
    const completionDate = String(body.completion_date ?? new Date().toISOString().slice(0, 10))
    const missionMet = body.mission_met === true

    if (!missionMet) {
      return new Response(JSON.stringify({ ok: false, error: 'Daily mission not met' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const { data: existing } = await supabase
      .from('word_forge_daily_completions')
      .select('bonus_awarded')
      .eq('user_id', user.id)
      .eq('completion_date', completionDate)
      .maybeSingle()

    if (existing) {
      return new Response(JSON.stringify({ ok: true, already: true, payout: Number(existing.bonus_awarded) }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const { error: insertErr } = await supabase
      .from('word_forge_daily_completions')
      .insert({ user_id: user.id, completion_date: completionDate, bonus_awarded: DAILY_BONUS })

    if (insertErr && insertErr.code !== '23505') {
      return new Response(JSON.stringify({ ok: false, error: insertErr.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const { data: userPoints, error: pointsErr } = await supabase.rpc('increment_user_points', {
      p_user_id: user.id,
      p_amount: DAILY_BONUS,
      p_type: 'game',
    })

    if (pointsErr) {
      return new Response(JSON.stringify({ ok: false, error: pointsErr.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    await supabase.from('word_forge_progress').upsert({
      user_id: user.id,
      daily_completed_date: completionDate,
      daily_streak: body.daily_streak ?? undefined,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' })

    return new Response(JSON.stringify({ ok: true, payout: DAILY_BONUS, userPoints }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error'
    return new Response(JSON.stringify({ ok: false, error: msg }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})
