import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

/**
 * Paginated sum: fetches all rows in batches to bypass the 1000-row default limit.
 */
async function paginatedSum(
  db: any, table: string, field: string,
  filters: Record<string, any>, eqFilters?: Record<string, any>,
  pageSize = 1000
): Promise<number> {
  let total = 0
  let offset = 0
  let hasMore = true
  while (hasMore) {
    let q = db.from(table).select(field).range(offset, offset + pageSize - 1)
    for (const [k, v] of Object.entries(filters)) q = q.eq(k, v)
    if (eqFilters) for (const [k, v] of Object.entries(eqFilters)) q = q.eq(k, v)
    const { data, error } = await q
    if (error) throw error
    total += (data || []).reduce((s: number, r: any) => s + Number(r[field] || 0), 0)
    hasMore = (data?.length || 0) === pageSize
    offset += pageSize
  }
  return total
}

/**
 * Paginated fetch of all rows matching filters.
 */
async function paginatedFetch(
  db: any, table: string, selectFields: string,
  filters: Record<string, any>, pageSize = 1000
): Promise<any[]> {
  const all: any[] = []
  let offset = 0
  let hasMore = true
  while (hasMore) {
    let q = db.from(table).select(selectFields).range(offset, offset + pageSize - 1)
    for (const [k, v] of Object.entries(filters)) q = q.eq(k, v)
    const { data, error } = await q
    if (error) throw error
    all.push(...(data || []))
    hasMore = (data?.length || 0) === pageSize
    offset += pageSize
  }
  return all
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const prodUrl = Deno.env.get('PROD_SUPABASE_URL')!
    const prodKey = Deno.env.get('PROD_SUPABASE_SERVICE_ROLE_KEY')!
    const db = createClient(prodUrl, prodKey)

    const body = await req.json().catch(() => ({}))
    const {
      dry_run = true,
      phase = 'audit',        // 'audit' | 'restore_earnings' | 'rebuild_balances'
      batch_size = 200,
      offset = 0,
      username = null,
    } = body

    console.log(`Phase=${phase}, dry_run=${dry_run}, batch=${batch_size}, offset=${offset}, user=${username}`)

    // ═══════════════════════════════════════════════════════════════
    // PHASE 1: AUDIT / RESTORE MISSING ARENA EARNINGS
    // For every resolved battle, check if each winning voter has
    // a corresponding arena_earnings record. If not, calculate the
    // correct payout and optionally insert it.
    // ═══════════════════════════════════════════════════════════════
    if (phase === 'audit' || phase === 'restore_earnings') {
      const { data: battles, error: bErr } = await db
        .from('arena_battles')
        .select('id, title, winner_side, side_a_power, side_b_power, side_c_power, prize_pool')
        .not('winner_side', 'is', null)
        .order('created_at', { ascending: true })

      if (bErr) throw bErr

      const missing: any[] = []
      let inserted = 0
      let battlesWithMissing = 0

      for (const b of battles || []) {
        const pool = Math.floor(
          (Number(b.side_a_power) || 0) +
          (Number(b.side_b_power) || 0) +
          (Number(b.side_c_power) || 0) +
          (Number(b.prize_pool) || 0)
        )

        if (pool <= 0) continue

        // Get ALL winning votes (paginated)
        const winVotes = await paginatedFetch(
          db, 'arena_votes', 'user_id, power_spent, early_stake_multiplier',
          { battle_id: b.id, side: b.winner_side }
        )

        if (!winVotes.length) continue

        // Get existing earnings for this battle
        const existingEarnings = await paginatedFetch(
          db, 'arena_earnings', 'user_id, total_earned',
          { battle_id: b.id }
        )

        const hasRecord = new Set(existingEarnings.map((e: any) => e.user_id))
        const alreadyDistributed = existingEarnings.reduce(
          (s: number, e: any) => s + Number(e.total_earned || 0), 0
        )

        // Total weighted winning power for proportional calculation
        const totalWP = winVotes.reduce(
          (s: number, v: any) => s + Number(v.power_spent) * Number(v.early_stake_multiplier || 1), 0
        )

        let battleMissing = 0

        for (const v of winVotes) {
          if (hasRecord.has(v.user_id)) continue

          const wp = Number(v.power_spent) * Number(v.early_stake_multiplier || 1)
          const share = totalWP > 0 ? wp / totalWP : 0
          const baseReward = Math.floor(share * pool)

          if (baseReward <= 0) continue

          const netProfit = baseReward - Number(v.power_spent)

          missing.push({
            battle_id: b.id,
            battle_title: b.title,
            user_id: v.user_id,
            stake: Number(v.power_spent),
            earned: baseReward,
            net_profit: netProfit,
          })
          battleMissing++

          if (phase === 'restore_earnings' && !dry_run) {
            const { error: ie } = await db.from('arena_earnings').insert({
              battle_id: b.id,
              user_id: v.user_id,
              stake_amount: Number(v.power_spent),
              total_earned: baseReward,
              pool_share_earned: Math.max(0, netProfit),
              bonus_earned: 0,
              streak_bonus: 0,
              is_winner: true,
            })
            if (!ie) inserted++
            else console.error(`Insert err for ${v.user_id} in battle ${b.id}:`, ie.message)
          }
        }

        if (battleMissing > 0) battlesWithMissing++
      }

      return new Response(JSON.stringify({
        success: true,
        phase,
        dry_run,
        battles_checked: battles?.length || 0,
        battles_with_missing: battlesWithMissing,
        missing_earnings_total: missing.length,
        earnings_inserted: inserted,
        total_missing_points: missing.reduce((s, r) => s + r.earned, 0),
        sample_missing: missing.slice(0, 100),
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // ═══════════════════════════════════════════════════════════════
    // PHASE 2: REBUILD USER BALANCES
    // Recalculates every user's category columns from source-of-truth
    // tables. Arena net = earned - staked. Nexus net = received
    // (sender bonus cancels debit). Applies to social_points if
    // positive, or subtracts sequentially if negative.
    // ═══════════════════════════════════════════════════════════════
    if (phase === 'rebuild_balances') {
      let targets: { user_id: string; username?: string }[] = []

      if (username) {
        const { data: profiles } = await db
          .from('profiles')
          .select('user_id, username')
          .ilike('username', `%${username}%`)
        targets = (profiles || []).map((p: any) => ({ user_id: p.user_id, username: p.username }))
      } else {
        const { data: allUsers } = await db
          .from('user_points')
          .select('user_id')
          .order('total_points', { ascending: false })
          .range(offset, offset + batch_size - 1)
        targets = (allUsers || []).map((u: any) => ({ user_id: u.user_id }))
      }

      const results: any[] = []
      let fixed = 0

      for (const u of targets) {
        const uid = u.user_id

        // Fetch all source-of-truth sums in parallel
        const [
          currentRes,
          profileRes,
          rawMining,
          rawTask,
          rawCheckin,
          rawSocial,
          rawReferral,
          arenaEarned,
          arenaStaked,
          nexusReceived,
          nexusSent,
        ] = await Promise.all([
          db.from('user_points').select('*').eq('user_id', uid).maybeSingle(),
          db.from('profiles').select('username').eq('user_id', uid).maybeSingle(),
          paginatedSum(db, 'mining_sessions', 'arx_mined', { user_id: uid, is_active: false }),
          paginatedSum(db, 'user_tasks', 'points_awarded', { user_id: uid, status: 'completed' }),
          paginatedSum(db, 'daily_checkins', 'points_awarded', { user_id: uid }),
          paginatedSum(db, 'social_submissions', 'points_awarded', { user_id: uid, status: 'approved' }),
          paginatedSum(db, 'referrals', 'points_awarded', { referrer_id: uid }),
          paginatedSum(db, 'arena_earnings', 'total_earned', { user_id: uid }),
          paginatedSum(db, 'arena_votes', 'power_spent', { user_id: uid }),
          paginatedSum(db, 'nexus_transactions', 'amount', { receiver_id: uid }),
          paginatedSum(db, 'nexus_transactions', 'amount', { sender_id: uid }),
        ])

        const current = currentRes.data
        if (!current) continue

        // Build category columns from source data
        let mining = Math.floor(rawMining)
        let task = Math.floor(rawTask + rawCheckin)
        let social = Math.floor(rawSocial)
        let referral = Math.floor(rawReferral)

        const arenaNet = Math.floor(arenaEarned) - Math.floor(arenaStaked)
        // Nexus: sender bonus = amount sent (cancels debit), so net = received
        const nexusNet = Math.floor(nexusReceived)

        // Apply arena + nexus net impact
        const extra = arenaNet + nexusNet
        if (extra >= 0) {
          social += extra
        } else {
          // Subtract deficit sequentially: mining → task → social → referral
          let deficit = Math.abs(extra)
          const sub = (val: number) => {
            const d = Math.min(val, deficit)
            deficit -= d
            return val - d
          }
          mining = sub(mining)
          task = sub(task)
          social = sub(social)
          referral = sub(referral)
        }

        // Ensure non-negative
        mining = Math.max(0, mining)
        task = Math.max(0, task)
        social = Math.max(0, social)
        referral = Math.max(0, referral)
        const total = mining + task + social + referral

        const storedTotal = Number(current.total_points)
        const diff = total - storedTotal

        // Skip if no meaningful change
        if (Math.abs(diff) < 1) continue

        const uname = u.username || profileRes.data?.username || uid

        results.push({
          user_id: uid,
          username: uname,
          stored: {
            mining: Number(current.mining_points),
            task: Number(current.task_points),
            social: Number(current.social_points),
            referral: Number(current.referral_points),
            total: storedTotal,
          },
          correct: { mining, task, social, referral, total },
          sources: {
            rawMining: Math.floor(rawMining),
            rawTask: Math.floor(rawTask),
            rawCheckin: Math.floor(rawCheckin),
            rawSocial: Math.floor(rawSocial),
            rawReferral: Math.floor(rawReferral),
            arenaEarned: Math.floor(arenaEarned),
            arenaStaked: Math.floor(arenaStaked),
            arenaNet,
            nexusReceived: Math.floor(nexusReceived),
            nexusSent: Math.floor(nexusSent),
            nexusNet,
          },
          diff,
        })

        if (!dry_run) {
          const { error: updateErr } = await db
            .from('user_points')
            .update({
              mining_points: mining,
              task_points: task,
              social_points: social,
              referral_points: referral,
              total_points: total,
              updated_at: new Date().toISOString(),
            })
            .eq('user_id', uid)

          if (!updateErr) fixed++
          else console.error(`Update failed for ${uid}:`, updateErr.message)
        }
      }

      return new Response(JSON.stringify({
        success: true,
        phase,
        dry_run,
        users_checked: targets.length,
        needs_fix: results.length,
        fixed,
        total_points_change: results.reduce((s, r) => s + r.diff, 0),
        results: results.slice(0, 100),
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    return new Response(
      JSON.stringify({ error: 'Invalid phase. Use: audit, restore_earnings, rebuild_balances' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error: any) {
    console.error('Restore error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
