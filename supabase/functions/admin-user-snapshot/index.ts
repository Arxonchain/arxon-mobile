import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Get authorization header and verify admin
    const authHeader = req.headers.get('authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'No authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Verify the calling user is an admin
    const { data: { user: callingUser }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    )

    if (authError || !callingUser) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check if calling user is admin
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
    const { userId } = body

    if (!userId) {
      return new Response(
        JSON.stringify({ error: 'userId is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`Admin ${callingUser.id} fetching snapshot for user ${userId}`)

    // Fetch all user data in parallel using service role (bypasses RLS)
    const [
      profileResult,
      pointsResult,
      walletsResult,
      referralsGivenResult,
      referralsReceivedResult,
      xProfileResult,
      xRewardsResult,
      socialSubmissionsResult,
      miningSessionsResult,
      arenaVotesResult,
      arenaBoostsResult,
      badgesResult
    ] = await Promise.all([
      // Profile
      supabase.from('profiles').select('*').eq('user_id', userId).maybeSingle(),
      // Points
      supabase.from('user_points').select('*').eq('user_id', userId).maybeSingle(),
      // Wallets
      supabase.from('user_wallets').select('*').eq('user_id', userId),
      // Referrals given (user as referrer)
      supabase.from('referrals').select('*').eq('referrer_id', userId),
      // Referrals received (user as referred)
      supabase.from('referrals').select('*').eq('referred_id', userId),
      // X Profile
      supabase.from('x_profiles').select('*').eq('user_id', userId).maybeSingle(),
      // X Post Rewards
      supabase.from('x_post_rewards').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
      // Social Submissions
      supabase.from('social_submissions').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
      // Mining Sessions (last 20)
      supabase.from('mining_sessions').select('*').eq('user_id', userId).order('started_at', { ascending: false }).limit(20),
      // Arena Votes
      supabase.from('arena_votes').select('*').eq('user_id', userId),
      // Arena Boosts (active)
      supabase.from('arena_boosts').select('*').eq('user_id', userId).gte('expires_at', new Date().toISOString()),
      // Badges
      supabase.from('user_badges').select('*').eq('user_id', userId)
    ])

    // Calculate boost breakdown
    const points = pointsResult.data
    const xProfile = xProfileResult.data
    const arenaBoosts = arenaBoostsResult.data || []
    const socialSubmissions = socialSubmissionsResult.data || []
    const referralsGiven = referralsGivenResult.data || []

    // X scan boost (from x_profiles.boost_percentage - historical scan boost)
    const xScanBoost = xProfile?.boost_percentage || 0

    // X post boost from user_points.x_post_boost_percentage (each approved social submission adds 5%)
    // This is stored in the DB, not calculated from submissions count
    const xPostBoost = points?.x_post_boost_percentage || 0
    const claimedXPosts = socialSubmissions.filter(s => s.status === 'approved' && s.points_awarded > 0).length

    // Referral boost from user_points.referral_bonus_percentage (each referral adds 5%, capped at 50%)
    const referralBoost = points?.referral_bonus_percentage || 0

    // Arena boost (sum of active boosts)
    const arenaBoost = arenaBoosts.reduce((sum, b) => sum + (b.boost_percentage || 0), 0)

    // Calculate effective mining rate using ALL boost sources
    const BASE_POINTS_PER_HOUR = 10
    const totalBoostPercentage = referralBoost + xScanBoost + xPostBoost + arenaBoost
    const effectiveMiningRate = BASE_POINTS_PER_HOUR * (1 + totalBoostPercentage / 100)

    // Build unified snapshot
    const snapshot = {
      userId,
      profile: profileResult.data,
      points: pointsResult.data,
      wallets: walletsResult.data || [],
      referrals: {
        given: referralsGivenResult.data || [],
        received: referralsReceivedResult.data || [],
        count: referralsGiven.length,
      },
      xProfile: xProfileResult.data,
      xRewards: xRewardsResult.data || [],
      socialSubmissions: socialSubmissionsResult.data || [],
      miningSessions: miningSessionsResult.data || [],
      arenaVotes: arenaVotesResult.data || [],
      arenaBoosts: arenaBoostsResult.data || [],
      badges: badgesResult.data || [],
      // Boost breakdown
      boostBreakdown: {
        xScanBoost,           // From X profile scan (x_profiles.boost_percentage)
        xPostBoost,           // From X post submissions (user_points.x_post_boost_percentage)
        referralBoost,        // From referrals (user_points.referral_bonus_percentage)
        arenaBoost,           // From active arena boosts
        totalBoostPercentage, // Total effective boost (sum of all above)
        effectiveMiningRate,  // ARX-P per hour
        claimedXPostsCount: claimedXPosts,
        referralCount: referralsGiven.length,
      },
      // Summary stats
      stats: {
        totalPoints: points?.total_points || 0,
        miningPoints: points?.mining_points || 0,
        taskPoints: points?.task_points || 0,
        socialPoints: points?.social_points || 0,
        referralPoints: points?.referral_points || 0,
        dailyStreak: points?.daily_streak || 0,
        totalSessions: miningSessionsResult.data?.length || 0,
        activeSessions: miningSessionsResult.data?.filter(s => s.is_active).length || 0,
        totalArxMined: miningSessionsResult.data?.reduce((sum, s) => sum + Number(s.arx_mined || 0), 0) || 0,
        arenaVotesCount: arenaVotesResult.data?.length || 0,
        arenaPowerSpent: arenaVotesResult.data?.reduce((sum, v) => sum + Number(v.power_spent || 0), 0) || 0,
      }
    }

    console.log(`Snapshot generated for user ${userId}:`, {
      boostBreakdown: snapshot.boostBreakdown,
      stats: snapshot.stats
    })

    return new Response(
      JSON.stringify({ success: true, data: snapshot }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error: any) {
    console.error('Error generating user snapshot:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
