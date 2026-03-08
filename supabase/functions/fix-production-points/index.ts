import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const prodUrl = Deno.env.get('PROD_SUPABASE_URL')!
    const prodKey = Deno.env.get('PROD_SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(prodUrl, prodKey)

    const body = await req.json().catch(() => ({}))
    const { username, dry_run = true, batch_size = 500, offset = 0 } = body

    // Get users to reconcile
    let userIds: string[] = []

    if (username) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, username')
        .ilike('username', `%${username}%`)

      if (!profiles || profiles.length === 0) {
        return new Response(
          JSON.stringify({ error: `User "${username}" not found` }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
      userIds = profiles.map((p: any) => p.user_id)
    } else {
      const { data: allUsers } = await supabase
        .from('user_points')
        .select('user_id')
        .order('user_id')
        .range(offset, offset + batch_size - 1)

      userIds = (allUsers || []).map((u: any) => u.user_id)
    }

    console.log(`Processing ${userIds.length} users...`)

    const details: any[] = []
    let fixed = 0
    let skipped = 0
    const errors: any[] = []

    for (const userId of userIds) {
      try {
        // Fetch all source data in parallel
        const [
          currentPoints,
          profileData,
          miningData,
          taskData,
          checkinData,
          socialData,
          referralData,
          arenaEarningsData,
          arenaVotesData,
        ] = await Promise.all([
          supabase.from('user_points').select('*').eq('user_id', userId).maybeSingle(),
          supabase.from('profiles').select('username').eq('user_id', userId).maybeSingle(),
          supabase.from('mining_sessions').select('arx_mined').eq('user_id', userId).eq('is_active', false),
          supabase.from('user_tasks').select('points_awarded').eq('user_id', userId).eq('status', 'completed'),
          supabase.from('daily_checkins').select('points_awarded').eq('user_id', userId),
          supabase.from('social_submissions').select('points_awarded').eq('user_id', userId).eq('status', 'approved'),
          supabase.from('referrals').select('points_awarded').eq('referrer_id', userId),
          supabase.from('arena_earnings').select('total_earned, stake_amount').eq('user_id', userId),
          supabase.from('arena_votes').select('power_spent').eq('user_id', userId),
        ])

        const current = currentPoints.data
        if (!current) continue

        const uname = profileData.data?.username || userId.substring(0, 8)

        // === CORRECT FORMULA ===
        // Balance = All credits - All debits
        // Credits: mining + tasks + checkins + social_submissions + referrals + arena_total_earned
        // Debits: arena_votes (staking)

        const rawMining = Math.floor(
          (miningData.data || []).reduce((s: number, r: any) => s + Number(r.arx_mined || 0), 0)
        )
        const rawTask = Math.floor(
          (taskData.data || []).reduce((s: number, r: any) => s + Number(r.points_awarded || 0), 0)
        )
        const rawCheckin = Math.floor(
          (checkinData.data || []).reduce((s: number, r: any) => s + Number(r.points_awarded || 0), 0)
        )
        const rawSocial = Math.floor(
          (socialData.data || []).reduce((s: number, r: any) => s + Number(r.points_awarded || 0), 0)
        )
        const rawReferral = Math.floor(
          (referralData.data || []).reduce((s: number, r: any) => s + Number(r.points_awarded || 100), 0)
        )

        // Arena: credits = total_earned (what resolve-arena-battle credited via increment_user_points)
        // Arena: debits = power_spent (what handle_arena_vote deducted)
        const arenaCredits = Math.floor(
          (arenaEarningsData.data || []).reduce((s: number, r: any) => s + Number(r.total_earned || 0), 0)
        )
        const arenaDebits = Math.floor(
          (arenaVotesData.data || []).reduce((s: number, r: any) => s + Number(r.power_spent || 0), 0)
        )

        // Total correct balance = all credits - all debits
        const totalCredits = rawMining + rawTask + rawCheckin + rawSocial + rawReferral + arenaCredits
        const totalDebits = arenaDebits

        // SAFETY: If user has NO source activity at all, skip them.
        // Their points may have been imported or manually set.
        const hasSourceActivity = rawMining > 0 || rawTask > 0 || rawCheckin > 0 || 
          rawSocial > 0 || rawReferral > 0 || arenaCredits > 0 || arenaDebits > 0
        
        if (!hasSourceActivity) {
          skipped++
          continue
        }

        const correctTotal = Math.max(0, totalCredits - totalDebits)

        // Distribute into categories
        // Mining = rawMining, Task = rawTask + rawCheckin, Referral = rawReferral
        // Social = rawSocial + arena net (credits - debits), absorbs arena impact
        const arenaNet = arenaCredits - arenaDebits
        let finalMining = rawMining
        let finalTask = rawTask + rawCheckin
        let finalReferral = rawReferral
        let finalSocial = Math.max(0, rawSocial + arenaNet)

        // If arena net is deeply negative, it may eat into social. 
        // Spread remainder across other categories.
        if (rawSocial + arenaNet < 0) {
          let deficit = Math.abs(rawSocial + arenaNet)
          finalSocial = 0
          // Deduct deficit from mining first
          if (deficit > 0 && finalMining > 0) {
            const d = Math.min(deficit, finalMining)
            finalMining -= d
            deficit -= d
          }
          if (deficit > 0 && finalTask > 0) {
            const d = Math.min(deficit, finalTask)
            finalTask -= d
            deficit -= d
          }
          if (deficit > 0 && finalReferral > 0) {
            const d = Math.min(deficit, finalReferral)
            finalReferral -= d
            deficit -= d
          }
        }

        const finalTotal = finalMining + finalTask + finalSocial + finalReferral
        const storedTotal = Math.floor(Number(current.total_points || 0))
        const diff = finalTotal - storedTotal

        if (Math.abs(diff) <= 1) {
          skipped++
          if (username) {
            details.push({
              username: uname, userId, action: 'no_change',
              stored: { mining: Number(current.mining_points), task: Number(current.task_points), social: Number(current.social_points), referral: Number(current.referral_points), total: storedTotal },
              correct: { mining: finalMining, task: finalTask, social: finalSocial, referral: finalReferral, total: finalTotal },
              sources: { rawMining, rawTask, rawCheckin, rawSocial, rawReferral, arenaCredits, arenaDebits, arenaNet },
            })
          }
          continue
        }

        const entry: any = {
          username: uname, userId, action: dry_run ? 'would_fix' : 'fixed', diff,
          stored: { mining: Number(current.mining_points), task: Number(current.task_points), social: Number(current.social_points), referral: Number(current.referral_points), total: storedTotal },
          correct: { mining: finalMining, task: finalTask, social: finalSocial, referral: finalReferral, total: finalTotal },
          sources: { rawMining, rawTask, rawCheckin, rawSocial, rawReferral, arenaCredits, arenaDebits, arenaNet },
        }

        if (!dry_run) {
          const { error: updateError } = await supabase
            .from('user_points')
            .update({
              mining_points: finalMining,
              task_points: finalTask,
              social_points: finalSocial,
              referral_points: finalReferral,
              total_points: finalTotal,
              updated_at: new Date().toISOString(),
            })
            .eq('user_id', userId)

          if (updateError) {
            entry.action = 'error'
            entry.error = updateError.message
            errors.push({ userId, username: uname, error: updateError.message })
          } else {
            fixed++
          }
        }

        details.push(entry)
      } catch (err: any) {
        errors.push({ userId, error: err.message })
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        dry_run,
        total_users: userIds.length,
        fixed,
        skipped,
        needs_fix: details.filter(d => d.action === 'would_fix' || d.action === 'fixed').length,
        errors: errors.length,
        details,
        error_details: errors.length > 0 ? errors : undefined,
        message: dry_run
          ? 'DRY RUN complete. Call again with dry_run=false to apply.'
          : `Fixed ${fixed} users, skipped ${skipped}, ${errors.length} errors.`,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error: any) {
    console.error('Fix error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
