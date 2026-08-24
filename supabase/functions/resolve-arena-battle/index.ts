import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import {
  adminAuthResponse,
  adminCorsHeaders,
  requireAdminOrService,
} from "../_shared/adminAuth.ts";
import { notifyArenaBattleResolved } from "../_shared/arenaNotifications.ts";
import { enqueueArenaResolveJob } from "../_shared/backgroundJobs.ts";
import { runArenaBattleResolve } from "../_shared/runArenaBattleResolve.ts";

const corsHeaders = adminCorsHeaders;

/**
 * FIXED Reward System (v3):
 * - Total Pool = Prize Pool (admin set) + All Stakes (winners + losers)
 * - EVERY winner gets a guaranteed proportional base share first
 *   (weight = stake × earlyMultiplier; base = floor(weight/totalWeight * TOTAL_POOL))
 * - Streak bonus = % of NET PROFIT, paid ONLY from leftover after all bases
 *   (scaled down if desired streaks exceed leftover — never zeros other winners)
 * - Floor dust (if any) goes to top-weight winner; sum never exceeds TOTAL_POOL
 * - Losers get NOTHING
 * - Battle marked resolved AFTER rewards distributed (atomic)
 */
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const auth = await requireAdminOrService(req);
    if (!auth.ok) return adminAuthResponse(auth);

    const supabase = auth.supabase;
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const body = await req.json().catch(() => ({}));
    const manualWinner = body.winner_side;
    const battleId = body.battle_id;
    const forceResolve = body.force === true;
    const notificationsOnly = body.notifications_only === true;
    const dryRun = body.dryRun === true || body.dry_run === true;
    const fromWorker = body._from_worker === true;
    const useQueue = body.queue !== false && !fromWorker && !notificationsOnly;

    if (dryRun) {
      return new Response(
        JSON.stringify({
          success: true,
          dryRun: true,
          message: "Auth OK — resolve skipped (dry run)",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    console.log("Starting battle resolution...", { manualWinner, battleId, forceResolve, notificationsOnly, fromWorker, useQueue });

    if (battleId && manualWinner && useQueue) {
      const queued = await enqueueArenaResolveJob(
        supabase,
        {
          battle_id: battleId,
          winner_side: manualWinner,
          force: forceResolve,
        },
        supabaseUrl,
        supabaseServiceKey,
      );

      if (!queued.error?.includes("Could not find the function")) {
        if (queued.error) throw new Error(queued.error);
        return new Response(
          JSON.stringify({
            message: "Arena resolve queued",
            queued: true,
            job_id: queued.jobId,
            battle_id: battleId,
            results: [{
              battleId,
              queued: true,
              job_id: queued.jobId,
            }],
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
    }

    if (notificationsOnly && battleId) {
      const { data: battleRow, error: battleErr } = await supabase
        .from("arena_battles")
        .select("id, title, winner_side, side_a_name, side_b_name, side_c_name")
        .eq("id", battleId)
        .maybeSingle();
      if (battleErr || !battleRow?.winner_side) {
        throw new Error(battleErr?.message || "Battle not found or not resolved yet");
      }
      const notif = await notifyArenaBattleResolved(supabase, battleRow, {
        supabaseUrl,
        serviceKey: supabaseServiceKey,
        push: body.push !== false,
        forcePush: body.force === true,
      });
      return new Response(JSON.stringify({ message: "Arena notifications blasted", battleId, notif }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { message, results } = await runArenaBattleResolve(supabase, {
      battleId,
      manualWinner,
      forceResolve,
      supabaseUrl,
      serviceKey: supabaseServiceKey,
    });

    return new Response(
      JSON.stringify({ message, results }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Error in resolve-arena-battle:", errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
