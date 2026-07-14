import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const BONUS = new Set([
  'ARX','ARXP','HODL','FOMO','BULLISH','BEARISH','WHALE','NODE','LEDGER','WALLET','MINER','STAKE','YIELD',
  'TOKEN','CHAIN','BLOCK','HASH','MINT','BURN','SWAP','POOL','FARM','APE','REKT','MOON','PUMP','DUMP','DIP',
  'RUG','GAS','DEFI','DEX','CEX','KYC','DAO','NFT','LAYER','BRIDGE','VAULT','ORACLE','ALPHA','BETA','TGE',
  'AIRDROP','LAMBO','NGMI','WAGMI','DYOR','SAFU',
])

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
    const poolLetters: string[] = (body.pool_letters ?? []).map((l: string) => l.toUpperCase())
    const claimed: string[] = body.claimed_words ?? []
    const clientPayout = Math.min(Math.max(Math.ceil(Number(body.payout) || 0), 0), 500)

    if (word.length < 3) {
      return new Response(JSON.stringify({ ok: false, reason: 'short' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }
    if (claimed.includes(word)) {
      return new Response(JSON.stringify({ ok: false, reason: 'duplicate' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }
    if (!canForm(word, poolLetters)) {
      return new Response(JSON.stringify({ ok: false, reason: 'pool' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // Bonus words always accepted; regular words require dictionary row or cached validation
    const { data: dictRow } = await supabase
      .from('word_forge_dictionary')
      .select('word')
      .eq('word', word)
      .maybeSingle()

    const isBonus = BONUS.has(word)
    if (!isBonus && !dictRow) {
      return new Response(JSON.stringify({ ok: false, reason: 'unknown' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const payout = clientPayout > 0 ? clientPayout : (isBonus ? 40 : 10)

    const { data: result, error: pointsError } = await supabase.rpc('increment_user_points', {
      p_user_id: user.id,
      p_amount: payout,
      p_type: 'game',
    })

    if (pointsError) {
      return new Response(JSON.stringify({ ok: false, error: pointsError.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    return new Response(JSON.stringify({ ok: true, payout, credited: true, userPoints: result }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error'
    return new Response(JSON.stringify({ ok: false, error: msg }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})
