import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    const authHeader = req.headers.get('authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ ok: false, error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    })
    const serviceClient = createClient(supabaseUrl, supabaseServiceKey)

    const { data: { user }, error: authError } = await userClient.auth.getUser()
    if (authError || !user) {
      return new Response(JSON.stringify({ ok: false, error: 'Invalid token' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const body = await req.json()

    await serviceClient.rpc('apply_word_forge_stats', {
      p_user_id: user.id,
      p_words_delta: 0,
      p_best_level: body.best_level != null ? Math.min(Math.max(Number(body.best_level), 1), 999) : null,
      p_current_level: body.current_level != null ? Math.min(Math.max(Number(body.current_level), 1), 999) : null,
      p_session_high: body.session_high != null ? Math.max(0, Number(body.session_high)) : null,
    })

    if (body.hints_left != null || body.shuffles_left != null) {
      await userClient.rpc('sync_word_forge_consumables', {
        p_hints_left: body.hints_left != null ? Math.min(10, Math.max(0, Number(body.hints_left))) : null,
        p_shuffles_left: body.shuffles_left != null ? Math.min(10, Math.max(0, Number(body.shuffles_left))) : null,
        p_tutorial_completed: body.tutorial_completed ?? null,
        p_daily_completed_date: body.daily_completed_date ?? null,
        p_daily_streak: body.daily_streak ?? null,
        p_unlocked_skins: body.unlocked_skins ?? null,
      })
    }

    const { data: row } = await serviceClient.from('word_forge_progress').select('*').eq('user_id', user.id).maybeSingle()

    return new Response(JSON.stringify({ ok: true, progress: row }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error'
    return new Response(JSON.stringify({ ok: false, error: msg }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})
