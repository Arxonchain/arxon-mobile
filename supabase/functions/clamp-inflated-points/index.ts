import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ClampResult {
  userId: string
  username: string | null
  before: {
    mining: number
    task: number
    social: number
    referral: number
    total: number
  }
  provable: {
    mining: number
    task: number
    social: number
    referral: number
    checkin: number
    total: number
  }
  after: {
    mining: number
    task: number
    social: number
    referral: number
    total: number
  }
  pointsReduced: number
}

/**
 * Admin-only function to clamp inflated user points back to provable totals.
 * 
 * This calculates the MAXIMUM legitimate points from:
 * - Mining: sum of arx_mined from finalized sessions (is_active=false)
 * - Tasks: sum of points_awarded from completed user_tasks
 * - Social: sum of points_awarded from approved social_submissions
 * - Referrals: sum of points_awarded from referrals table
 * - Check-ins: sum of points_awarded from daily_checkins
 * 
 * If stored points exceed provable points, they are clamped down.
 */
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
    const { dryRun = true, threshold = 1.5, batchSize = 100 } = body

    console.log(`Clamp request: dryRun=${dryRun}, threshold=${threshold}, batchSize=${batchSize}`)

    // Find all users with inflated points
    // We use a ratio threshold: if mining_points > (finalized_mined * threshold), it's suspicious
    const { data: suspiciousUsers, error: fetchError } = await supabase
      .from('user_points')
      .select('user_id, mining_points, task_points, social_points, referral_points, total_points')
      .order('total_points', { ascending: false })
      .limit(batchSize)

    if (fetchError) throw fetchError

    const results: ClampResult[] = []
    let totalClamped = 0
    let totalReduced = 0

    for (const userPoints of suspiciousUsers || []) {
      // Fetch all provable points in parallel
      const [
        profileResult,
        miningResult,
        tasksResult,
        socialResult,
        referralsResult,
        checkinsResult,
      ] = await Promise.all([
        supabase.from('profiles').select('username').eq('user_id', userPoints.user_id).maybeSingle(),
        supabase.from('mining_sessions')
          .select('arx_mined')
          .eq('user_id', userPoints.user_id)
          .eq('is_active', false),
        supabase.from('user_tasks')
          .select('points_awarded')
          .eq('user_id', userPoints.user_id)
          .eq('status', 'completed'),
        supabase.from('social_submissions')
          .select('points_awarded')
          .eq('user_id', userPoints.user_id)
          .eq('status', 'approved'),
        supabase.from('referrals')
          .select('points_awarded')
          .eq('referrer_id', userPoints.user_id),
        supabase.from('daily_checkins')
          .select('points_awarded')
          .eq('user_id', userPoints.user_id),
      ])

      // Calculate provable totals
      const provableMining = (miningResult.data || []).reduce(
        (sum, s) => sum + Number(s.arx_mined || 0), 0
      )
      const provableTask = (tasksResult.data || []).reduce(
        (sum, t) => sum + Number(t.points_awarded || 0), 0
      )
      const provableSocial = (socialResult.data || []).reduce(
        (sum, s) => sum + Number(s.points_awarded || 0), 0
      )
      const provableReferral = (referralsResult.data || []).reduce(
        (sum, r) => sum + Number(r.points_awarded || 100), 0
      )
      const provableCheckin = (checkinsResult.data || []).reduce(
        (sum, c) => sum + Number(c.points_awarded || 0), 0
      )

      const storedMining = Number(userPoints.mining_points || 0)
      const storedTask = Number(userPoints.task_points || 0)
      const storedSocial = Number(userPoints.social_points || 0)
      const storedReferral = Number(userPoints.referral_points || 0)
      const storedTotal = Number(userPoints.total_points || 0)

      // Check if mining points exceed threshold
      const miningRatio = provableMining > 0 ? storedMining / provableMining : (storedMining > 0 ? Infinity : 1)
      
      if (miningRatio <= threshold) {
        // Not suspicious, skip
        continue
      }

      // Calculate clamped values (use provable values as ceiling)
      const clampedMining = Math.min(storedMining, provableMining)
      const clampedTask = Math.min(storedTask, provableTask)
      // Social includes checkins
      const clampedSocial = Math.min(storedSocial, provableSocial + provableCheckin)
      const clampedReferral = Math.min(storedReferral, provableReferral)
      const clampedTotal = clampedMining + clampedTask + clampedSocial + clampedReferral

      const pointsReduced = storedTotal - clampedTotal

      if (pointsReduced <= 0) continue

      totalClamped++
      totalReduced += pointsReduced

      const result: ClampResult = {
        userId: userPoints.user_id,
        username: profileResult.data?.username || null,
        before: {
          mining: storedMining,
          task: storedTask,
          social: storedSocial,
          referral: storedReferral,
          total: storedTotal,
        },
        provable: {
          mining: provableMining,
          task: provableTask,
          social: provableSocial,
          referral: provableReferral,
          checkin: provableCheckin,
          total: provableMining + provableTask + provableSocial + provableReferral + provableCheckin,
        },
        after: {
          mining: clampedMining,
          task: clampedTask,
          social: clampedSocial,
          referral: clampedReferral,
          total: clampedTotal,
        },
        pointsReduced,
      }

      results.push(result)

      // Apply the clamp if not dry run
      if (!dryRun) {
        // Log to audit before clamping
        await supabase.from('points_audit_log').insert({
          user_id: userPoints.user_id,
          audit_type: 'admin_clamp',
          stored_mining_points: storedMining,
          stored_task_points: storedTask,
          stored_social_points: storedSocial,
          stored_referral_points: storedReferral,
          stored_total_points: storedTotal,
          computed_mining_points: provableMining,
          computed_task_points: provableTask,
          computed_social_points: provableSocial,
          computed_referral_points: provableReferral,
          computed_checkin_points: provableCheckin,
          computed_total_points: provableMining + provableTask + provableSocial + provableReferral + provableCheckin,
          mining_diff: storedMining - clampedMining,
          task_diff: storedTask - clampedTask,
          social_diff: storedSocial - clampedSocial,
          referral_diff: storedReferral - clampedReferral,
          total_diff: pointsReduced,
          action_taken: 'clamped',
          points_restored: -pointsReduced, // Negative because we reduced
          notes: `Admin clamp: ratio=${miningRatio.toFixed(2)}x, threshold=${threshold}`,
          created_by: callingUser.id,
        })

        // Apply the clamp
        const { error: updateError } = await supabase
          .from('user_points')
          .update({
            mining_points: clampedMining,
            task_points: clampedTask,
            social_points: clampedSocial,
            referral_points: clampedReferral,
            total_points: clampedTotal,
            updated_at: new Date().toISOString(),
          })
          .eq('user_id', userPoints.user_id)

        if (updateError) {
          console.error(`Failed to clamp user ${userPoints.user_id}:`, updateError)
        } else {
          console.log(`Clamped user ${userPoints.user_id}: -${pointsReduced} points`)
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        dryRun,
        threshold,
        summary: {
          usersScanned: suspiciousUsers?.length || 0,
          usersClamped: totalClamped,
          totalPointsReduced: totalReduced,
        },
        results,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error: any) {
    console.error('Clamp error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
