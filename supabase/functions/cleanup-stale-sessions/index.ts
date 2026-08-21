import {
  adminCorsHeaders,
  requireServiceRole,
  serviceAuthResponse,
} from "../_shared/adminAuth.ts";

const corsHeaders = adminCorsHeaders;

interface StaleSession {
  id: string;
  user_id: string;
  started_at: string;
  arx_mined: number;
}

interface UserBoosts {
  referral_bonus_percentage: number;
  x_post_boost_percentage: number;
  daily_streak: number;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const auth = await requireServiceRole(req);
    if (!auth.ok) return serviceAuthResponse(auth);

    const supabase = auth.supabase;

    // Parse request - can optionally specify batch size and dry run
    const { batchSize = 100, dryRun = false } = await req.json().catch(() => ({}));

    // Find all stale sessions (active but started >8 hours ago)
    const eightHoursAgo = new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString();
    
    const { data: staleSessions, error: fetchError } = await supabase
      .from("mining_sessions")
      .select("id, user_id, started_at, arx_mined")
      .eq("is_active", true)
      .lt("started_at", eightHoursAgo)
      .limit(batchSize);

    if (fetchError) {
      throw new Error(`Failed to fetch stale sessions: ${fetchError.message}`);
    }

    if (!staleSessions || staleSessions.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: "No stale sessions found",
          processed: 0 
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Found ${staleSessions.length} stale sessions to process`);

    const results: Array<{
      sessionId: string;
      userId: string;
      pointsEarned: number;
      status: string;
    }> = [];

    // Process each stale session
    for (const session of staleSessions as StaleSession[]) {
      try {
        // Fetch user's boost percentages for accurate calculation
        const { data: userPoints } = await supabase
          .from("user_points")
          .select("referral_bonus_percentage, x_post_boost_percentage, daily_streak")
          .eq("user_id", session.user_id)
          .single();

        // Fetch arena boosts
        const { data: arenaBoosts } = await supabase
          .from("arena_boosts")
          .select("boost_percentage")
          .eq("user_id", session.user_id)
          .gt("expires_at", new Date().toISOString());

        // Fetch nexus boosts
        const { data: nexusBoosts } = await supabase
          .from("nexus_boosts")
          .select("boost_percentage")
          .eq("user_id", session.user_id)
          .eq("claimed", true)
          .gt("expires_at", new Date().toISOString());

        // Calculate total boost percentage
        const boosts: UserBoosts = userPoints || { 
          referral_bonus_percentage: 0, 
          x_post_boost_percentage: 0, 
          daily_streak: 0 
        };
        
        const referralBoost = Math.min(boosts.referral_bonus_percentage || 0, 50);
        const xPostBoost = boosts.x_post_boost_percentage || 0;
        const streakBoost = Math.min(boosts.daily_streak || 0, 30);
        const arenaBoost = arenaBoosts?.reduce((sum, b) => sum + (b.boost_percentage || 0), 0) || 0;
        const nexusBoost = nexusBoosts?.reduce((sum, b) => sum + (b.boost_percentage || 0), 0) || 0;

        const totalBoostPercentage = referralBoost + xPostBoost + streakBoost + arenaBoost + nexusBoost;
        
        // Base rate: 10 ARX-P per hour, max 8 hours = 80 ARX-P base
        const basePointsPerHour = 10;
        const maxHours = 8;
        const basePoints = basePointsPerHour * maxHours;
        
        // Apply boost (capped at reasonable maximum to prevent exploits)
        const boostMultiplier = 1 + Math.min(totalBoostPercentage, 300) / 100;
        const earnedPoints = Math.floor(basePoints * boostMultiplier);
        
        // Cap at 60 ARX-P per hour * 8 hours = 480 max
        const cappedPoints = Math.min(earnedPoints, 480);

        if (!dryRun) {
          // Atomic end+credit (balance + ledger). Avoid marking arx_mined without credited_at.
          const { data: creditResult, error: creditError } = await supabase.rpc(
            "end_and_credit_mining_session",
            {
              p_session_id: session.id,
              p_user_id: session.user_id,
            },
          );

          if (creditError || !creditResult?.success) {
            const msg = creditError?.message || creditResult?.error || "credit failed";
            console.error(`Failed to credit session ${session.id}:`, msg);
            results.push({
              sessionId: session.id,
              userId: session.user_id,
              pointsEarned: 0,
              status: `failed: ${msg}`,
            });
            continue;
          }

          results.push({
            sessionId: session.id,
            userId: session.user_id,
            pointsEarned: Math.max(0, Number(creditResult.points || 0)),
            status: "success",
          });
          console.log(
            `Processed session ${session.id}: ${creditResult.points || 0} ARX-P credited`,
          );
          continue;
        }

        results.push({
          sessionId: session.id,
          userId: session.user_id,
          pointsEarned: cappedPoints,
          status: dryRun ? "dry-run" : "success",
        });

        console.log(`Processed session ${session.id}: ${cappedPoints} ARX-P credited`);
      } catch (sessionError: unknown) {
        const errMsg = sessionError instanceof Error ? sessionError.message : "Unknown error";
        console.error(`Error processing session ${session.id}:`, sessionError);
        results.push({
          sessionId: session.id,
          userId: session.user_id,
          pointsEarned: 0,
          status: `error: ${errMsg}`,
        });
      }
    }

    const successCount = results.filter((r) => r.status === "success" || r.status === "dry-run").length;
    const totalPointsCredited = results
      .filter((r) => r.status === "success")
      .reduce((sum, r) => sum + r.pointsEarned, 0);

    return new Response(
      JSON.stringify({
        success: true,
        dryRun,
        processed: results.length,
        successful: successCount,
        totalPointsCredited,
        results,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : "Unknown error";
    console.error("Cleanup error:", error);
    return new Response(
      JSON.stringify({ success: false, error: errMsg }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
