import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ReconciliationResult {
  userId: string
  username: string | null
  stored: {
    mining: number
    task: number
    social: number
    referral: number
    total: number
  }
  computed: {
    mining: number
    task: number
    social: number
    referral: number
    checkin: number
    total: number
  }
  diff: {
    mining: number
    task: number
    social: number
    referral: number
    total: number
  }
  action: 'restored' | 'none' | 'flagged'
  pointsRestored: number
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Verify admin
    const authHeader = req.headers.get('authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'No authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { data: { user: callingUser }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    )

    if (authError || !callingUser) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { data: adminRole } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', callingUser.id)
      .eq('role', 'admin')
      .maybeSingle()

    if (!adminRole) {
      return new Response(
        JSON.stringify({ error: 'Admin access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const body = await req.json()
    const { userId, dryRun = true, batchSize = 100, offset = 0 } = body

    console.log(`Reconciliation request: userId=${userId || 'all'}, dryRun=${dryRun}, batch=${batchSize}, offset=${offset}`)

    // If specific user, reconcile just that user
    if (userId) {
      const result = await reconcileUser(supabase, userId, callingUser.id, dryRun)
      return new Response(
        JSON.stringify({ success: true, results: [result], total: 1 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Otherwise, batch reconcile all users
    const { data: users, error: usersError } = await supabase
      .from('user_points')
      .select('user_id')
      .range(offset, offset + batchSize - 1)
      .order('user_id')

    if (usersError) throw usersError

    const { count } = await supabase
      .from('user_points')
      .select('*', { count: 'exact', head: true })

    const results: ReconciliationResult[] = []
    for (const u of users || []) {
      const result = await reconcileUser(supabase, u.user_id, callingUser.id, dryRun)
      results.push(result)
    }

    // Summary
    const restored = results.filter(r => r.action === 'restored')
    const flagged = results.filter(r => r.action === 'flagged')
    const totalRestored = restored.reduce((sum, r) => sum + r.pointsRestored, 0)

    return new Response(
      JSON.stringify({
        success: true,
        dryRun,
        total: count,
        processed: results.length,
        offset,
        hasMore: offset + batchSize < (count || 0),
        summary: {
          restored: restored.length,
          flagged: flagged.length,
          noChange: results.filter(r => r.action === 'none').length,
          totalPointsRestored: totalRestored,
        },
        results,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error: any) {
    console.error('Reconciliation error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

async function reconcileUser(
  supabase: any,
  userId: string,
  adminId: string,
  dryRun: boolean
): Promise<ReconciliationResult> {
  // Fetch all source data in parallel
  const [
    userPointsResult,
    profileResult,
    miningResult,
    tasksResult,
    socialResult,
    referralsResult,
    checkinsResult,
  ] = await Promise.all([
    supabase.from('user_points').select('*').eq('user_id', userId).maybeSingle(),
    supabase.from('profiles').select('username').eq('user_id', userId).maybeSingle(),
    // Mining: sum of arx_mined from FINALIZED sessions only (is_active = false)
    supabase.from('mining_sessions')
      .select('arx_mined')
      .eq('user_id', userId)
      .eq('is_active', false),
    // Tasks: sum of points_awarded where status = completed
    supabase.from('user_tasks')
      .select('points_awarded')
      .eq('user_id', userId)
      .eq('status', 'completed'),
    // Social: sum of points_awarded where status = approved
    supabase.from('social_submissions')
      .select('points_awarded')
      .eq('user_id', userId)
      .eq('status', 'approved'),
    // Referrals: count * 100 (referrer gets 100 points per referral)
    supabase.from('referrals')
      .select('id, points_awarded')
      .eq('referrer_id', userId),
    // Checkins: sum of points_awarded
    supabase.from('daily_checkins')
      .select('points_awarded')
      .eq('user_id', userId),
  ])

  const stored = userPointsResult.data || {
    mining_points: 0,
    task_points: 0,
    social_points: 0,
    referral_points: 0,
    total_points: 0,
  }

  // Compute provable points from source tables
  const computedMining = (miningResult.data || []).reduce(
    (sum: number, s: any) => sum + Number(s.arx_mined || 0), 0
  )
  const computedTask = (tasksResult.data || []).reduce(
    (sum: number, t: any) => sum + Number(t.points_awarded || 0), 0
  )
  const computedSocial = (socialResult.data || []).reduce(
    (sum: number, s: any) => sum + Number(s.points_awarded || 0), 0
  )
  // Referral points: use stored points_awarded if available, else count * 100
  const computedReferral = (referralsResult.data || []).reduce(
    (sum: number, r: any) => sum + Number(r.points_awarded || 100), 0
  )
  const computedCheckin = (checkinsResult.data || []).reduce(
    (sum: number, c: any) => sum + Number(c.points_awarded || 0), 0
  )

  // Total computed = mining + task + social + referral + checkin
  // Note: checkin points are typically added to total but not tracked separately in user_points
  // We'll add them to the social category for simplicity, or handle separately
  const computedTotal = computedMining + computedTask + computedSocial + computedReferral + computedCheckin

  const storedMining = Number(stored.mining_points || 0)
  const storedTask = Number(stored.task_points || 0)
  const storedSocial = Number(stored.social_points || 0)
  const storedReferral = Number(stored.referral_points || 0)
  const storedTotal = Number(stored.total_points || 0)

  // Calculate differences (positive = user is missing points)
  const miningDiff = computedMining - storedMining
  const taskDiff = computedTask - storedTask
  const socialDiff = (computedSocial + computedCheckin) - storedSocial // Checkins go to social
  const referralDiff = computedReferral - storedReferral
  const totalDiff = computedTotal - storedTotal

  // Determine action
  let action: 'restored' | 'none' | 'flagged' = 'none'
  let pointsRestored = 0

  // Only restore if user is missing points (positive diff)
  // Flag if stored > computed by more than 10% (potential exploit)
  if (totalDiff > 0) {
    action = 'restored'
    pointsRestored = totalDiff
  } else if (totalDiff < -Math.max(100, storedTotal * 0.1)) {
    // User has more than 10% or 100 extra points - flag for review
    action = 'flagged'
  }

  // Create audit log entry
  const auditEntry = {
    user_id: userId,
    audit_type: dryRun ? 'dry_run' : 'reconciliation',
    stored_mining_points: storedMining,
    stored_task_points: storedTask,
    stored_social_points: storedSocial,
    stored_referral_points: storedReferral,
    stored_total_points: storedTotal,
    computed_mining_points: computedMining,
    computed_task_points: computedTask,
    computed_social_points: computedSocial,
    computed_referral_points: computedReferral,
    computed_checkin_points: computedCheckin,
    computed_total_points: computedTotal,
    mining_diff: miningDiff,
    task_diff: taskDiff,
    social_diff: socialDiff,
    referral_diff: referralDiff,
    total_diff: totalDiff,
    action_taken: action,
    points_restored: action === 'restored' ? pointsRestored : 0,
    notes: dryRun ? 'Dry run - no changes made' : null,
    created_by: adminId,
  }

  // Always log the audit (even for dry runs)
  await supabase.from('points_audit_log').insert(auditEntry)

  // If not dry run and action is restore, update user_points
  if (!dryRun && action === 'restored') {
    const updates: any = {}
    
    if (miningDiff > 0) {
      updates.mining_points = computedMining
    }
    if (taskDiff > 0) {
      updates.task_points = computedTask
    }
    if (socialDiff > 0) {
      updates.social_points = computedSocial + computedCheckin
    }
    if (referralDiff > 0) {
      updates.referral_points = computedReferral
    }
    if (totalDiff > 0) {
      updates.total_points = computedTotal
    }
    updates.updated_at = new Date().toISOString()

    if (Object.keys(updates).length > 1) {
      const { error: updateError } = await supabase
        .from('user_points')
        .update(updates)
        .eq('user_id', userId)

      if (updateError) {
        console.error(`Failed to update user ${userId}:`, updateError)
      } else {
        console.log(`Restored ${pointsRestored} points for user ${userId}`)
      }
    }
  }

  return {
    userId,
    username: profileResult.data?.username || null,
    stored: {
      mining: storedMining,
      task: storedTask,
      social: storedSocial,
      referral: storedReferral,
      total: storedTotal,
    },
    computed: {
      mining: computedMining,
      task: computedTask,
      social: computedSocial,
      referral: computedReferral,
      checkin: computedCheckin,
      total: computedTotal,
    },
    diff: {
      mining: miningDiff,
      task: taskDiff,
      social: socialDiff,
      referral: referralDiff,
      total: totalDiff,
    },
    action,
    pointsRestored,
  }
}
