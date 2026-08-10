import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Keep in sync with src/features/word-forge/data/bonusWords.ts (server is source of truth for payout)
const BONUS_WORDS = new Set([
  'QUARTZ', 'JINX', 'ZEPHYR', 'VORTEX', 'NEXUS', 'CRYPTO', 'FORGE', 'ARXON',
  'PIXEL', 'QUANTUM', 'GALAXY', 'COSMIC', 'ORBIT', 'PULSE', 'BLAZE', 'STORM',
  'SHADOW', 'FROST', 'EMBER', 'THUNDER', 'CRYSTAL', 'PHANTOM', 'DRAGON', 'TITAN',
])

function streakMultiplier(streak: number): number {
  if (streak >= 5) return 2
  if (streak >= 3) return 1.5
  return 1
}

function lengthBonus(word: string): number {
  return 1 + Math.max(0, word.length - 4) * 0.25
}

function payoutForWord(word: string, streak: number): number {
  const w = word.toUpperCase()
  if (BONUS_WORDS.has(w)) {
    return Math.ceil(10 * 4 * streakMultiplier(streak))
  }
  return Math.ceil(10 * lengthBonus(w) * streakMultiplier(streak))
}

function canForm(word: string, pool: string[]): boolean {
  const counts = new Map<string, number>()
  for (const l of pool) counts.set(l, (counts.get(l) ?? 0) + 1)
  for (const ch of word) {
    const n = counts.get(ch) ?? 0
    if (n <= 0) return false
    counts.set(ch, n - 1)
  }
  return true
}

function assignSlots(slotWords: string[], foundWords: string[]): { filledCount: number } {
  const rows = slotWords.map((target) => ({ target, filledBy: null as string | null }))
  for (const raw of foundWords) {
    const word = raw.toUpperCase()
    const exact = rows.find((r) => !r.filledBy && r.target === word)
    if (exact) { exact.filledBy = word; continue }
    const sameLen = rows.find((r) => !r.filledBy && r.target.length === word.length)
    if (sameLen) sameLen.filledBy = word
  }
  return { filledCount: rows.filter((r) => r.filledBy).length }
}

function fillsSlot(word: string, slotWords: string[], claimed: string[]): boolean {
  const w = word.toUpperCase()
  const before = assignSlots(slotWords, claimed).filledCount
  const after = assignSlots(slotWords, [...claimed, w]).filledCount
  return after > before
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
    const word = String(body.word ?? '').toUpperCase().trim()
    const poolLetters: string[] = (body.pool_letters ?? []).map((l: string) => String(l).toUpperCase()).slice(0, 16)
    const claimed: string[] = (body.claimed_words ?? []).map((w: string) => String(w).toUpperCase()).slice(0, 40)
    const slotWords: string[] = (body.slot_words ?? []).map((w: string) => String(w).toUpperCase()).slice(0, 20)
    // Bind attempt to calendar day to limit farm via random attempt ids
    const rawAttempt = String(body.attempt_id ?? 'default').slice(0, 64)
    const day = new Date().toISOString().slice(0, 10)
    const attemptId = `${day}:${rawAttempt}`

    if (!/^[A-Z]+$/.test(word) || word.length < 3 || word.length > 12) {
      return new Response(JSON.stringify({ ok: false, reason: 'short' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }
    if (claimed.includes(word)) {
      return new Response(JSON.stringify({ ok: false, reason: 'duplicate' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }
    if (poolLetters.length < 3 || poolLetters.length > 16) {
      return new Response(JSON.stringify({ ok: false, reason: 'pool' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }
    if (!canForm(word, poolLetters)) {
      return new Response(JSON.stringify({ ok: false, reason: 'pool' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }
    if (slotWords.length > 0 && !fillsSlot(word, slotWords, claimed)) {
      return new Response(JSON.stringify({ ok: false, reason: 'noslot' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // Dictionary check (bonus words always allowed)
    if (!BONUS_WORDS.has(word)) {
      const { data: dictRow } = await supabase
        .from('word_forge_dictionary')
        .select('word')
        .eq('word', word)
        .maybeSingle()
      if (!dictRow) {
        return new Response(JSON.stringify({ ok: false, reason: 'unknown' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }
    }

    // Server-authoritative streak from prior credits in this attempt
    const { count: priorCount } = await supabase
      .from('word_forge_word_credits')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('attempt_id', attemptId)
    const serverStreak = Math.min((priorCount ?? 0) + 1, 20)
    const payout = Math.min(payoutForWord(word, serverStreak), 80)

    const { data: existingCredit } = await supabase
      .from('word_forge_word_credits')
      .select('payout')
      .eq('user_id', user.id)
      .eq('attempt_id', attemptId)
      .eq('word', word)
      .maybeSingle()

    if (existingCredit) {
      const { data: currentPoints } = await supabase.from('user_points').select('*').eq('user_id', user.id).maybeSingle()
      return new Response(JSON.stringify({
        ok: true, payout: Number(existingCredit.payout), credited: true, userPoints: currentPoints, already: true,
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const { data: inserted, error: insertErr } = await supabase
      .from('word_forge_word_credits')
      .insert({ user_id: user.id, attempt_id: attemptId, word, payout })
      .select('id, payout')
      .maybeSingle()

    if (insertErr) {
      if (insertErr.code === '23505') {
        const { data: raceCredit } = await supabase
          .from('word_forge_word_credits')
          .select('payout')
          .eq('user_id', user.id)
          .eq('attempt_id', attemptId)
          .eq('word', word)
          .maybeSingle()
        const { data: currentPoints } = await supabase.from('user_points').select('*').eq('user_id', user.id).maybeSingle()
        return new Response(JSON.stringify({
          ok: true, payout: Number(raceCredit?.payout ?? payout), credited: true, userPoints: currentPoints, already: true,
        }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }
      return new Response(JSON.stringify({ ok: false, error: insertErr.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const { data: result, error: pointsError } = await supabase.rpc('increment_user_points', {
      p_user_id: user.id,
      p_amount: payout,
      p_type: 'game',
    })

    if (pointsError) {
      await supabase.from('word_forge_word_credits').delete()
        .eq('user_id', user.id).eq('attempt_id', attemptId).eq('word', word)
      return new Response(JSON.stringify({ ok: false, error: pointsError.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    await supabase.rpc('log_points_ledger_entry', {
      p_user_id: user.id,
      p_amount: payout,
      p_category: 'game',
      p_description: `Word Forge: ${word} (+${payout} ARX-P)`,
      p_reference_type: 'word_forge_word',
      p_reference_id: inserted?.id ?? null,
    })

    await supabase.rpc('apply_word_forge_stats', {
      p_user_id: user.id,
      p_words_delta: 1,
      p_best_streak: serverStreak,
      p_longest_word: word,
    })

    return new Response(JSON.stringify({ ok: true, payout, credited: true, userPoints: result }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error'
    return new Response(JSON.stringify({ ok: false, error: msg }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})
