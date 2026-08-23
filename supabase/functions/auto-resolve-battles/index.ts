import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import {
  adminCorsHeaders,
  requireServiceRole,
  serviceAuthResponse,
} from "../_shared/adminAuth.ts";
import { enqueueArenaAutoResolveJob } from "../_shared/backgroundJobs.ts";
import { listBattlesNeedingAutoResolve } from "../_shared/runArenaAutoResolve.ts";

const corsHeaders = adminCorsHeaders;

/**
 * Scans for ended arena battles and enqueues per-battle AI auto-resolve jobs.
 * Each job uses AI to suggest/verify an outcome; payout only when ALLOW_AI_AUTO_PAY=true.
 */
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const auth = await requireServiceRole(req);
    if (!auth.ok) return serviceAuthResponse(auth);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = auth.supabase;

    const body = await req.json().catch(() => ({}));
    const dryRun = body.dryRun === true || body.dry_run === true;

    if (dryRun) {
      return new Response(
        JSON.stringify({
          success: true,
          dryRun: true,
          message: "Auth OK — auto-resolve skipped (dry run)",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (!Deno.env.get("OPENAI_API_KEY")) {
      throw new Error("OPENAI_API_KEY not configured");
    }

    const endedBattles = await listBattlesNeedingAutoResolve(supabase);

    if (endedBattles.length === 0) {
      return new Response(
        JSON.stringify({ message: "No battles to resolve", queued: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const queued: Array<{ battleId: string; battle: string; job_id: string | null; error?: string }> = [];

    for (const battle of endedBattles) {
      const result = await enqueueArenaAutoResolveJob(
        supabase,
        { battle_id: battle.id },
        supabaseUrl,
        supabaseServiceKey,
      );
      queued.push({
        battleId: battle.id,
        battle: battle.title,
        job_id: result.jobId,
        error: result.error,
      });
    }

    return new Response(
      JSON.stringify({
        message: "Auto-resolve jobs queued",
        total: endedBattles.length,
        queued: queued.filter((q) => q.job_id).length,
        results: queued,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Error in auto-resolve-battles:", errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
