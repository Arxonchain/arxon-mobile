import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import {
  adminCorsHeaders,
  requireServiceRole,
  serviceAuthResponse,
} from "../_shared/adminAuth.ts";
import {
  enqueueArenaPushBlastJob,
  type ArenaPushBlastPayload,
  type ArenaResolvePayload,
} from "../_shared/backgroundJobs.ts";
import {
  blastArenaBattleNotifications,
  pushArenaResolvedChunk,
  type BattleRow,
} from "../_shared/arenaNotifications.ts";
import { runArenaBattleResolve } from "../_shared/runArenaBattleResolve.ts";

import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = adminCorsHeaders;
const WORKER_ID = `process-background-jobs:${crypto.randomUUID().slice(0, 8)}`;

type ClaimedJob = {
  id: string;
  job_type: string;
  payload: Record<string, unknown>;
};

type JobOutcome = {
  id: string;
  job_type: string;
  ok: boolean;
  detail?: unknown;
  error?: string;
};

async function processArenaResolve(
  supabase: SupabaseClient,
  supabaseUrl: string,
  serviceKey: string,
  payload: ArenaResolvePayload,
): Promise<unknown> {
  const { message, results } = await runArenaBattleResolve(supabase, {
    battleId: payload.battle_id,
    manualWinner: payload.winner_side,
    forceResolve: payload.force === true,
    supabaseUrl,
    serviceKey,
  });

  const battleResult = results[0];
  if (battleResult?.error) {
    throw new Error(String(battleResult.error));
  }
  if (battleResult?.skipped && battleResult?.reason !== "already_distributed") {
    const reason = String(battleResult.reason || "skipped");
    if (reason !== "already_resolved" && reason !== "already_paid") {
      throw new Error(reason);
    }
  }

  return { message, results };
}

async function processArenaPushBlast(
  supabase: SupabaseClient,
  supabaseUrl: string,
  serviceKey: string,
  payload: ArenaPushBlastPayload,
): Promise<unknown> {
  const battleId = payload.battle_id;
  const offset = Number(payload.offset) || 0;
  const limit = Number(payload.limit) || 25;

  const { data: battle, error } = await supabase
    .from("arena_battles")
    .select("id, title, winner_side, side_a_name, side_b_name, side_c_name")
    .eq("id", battleId)
    .maybeSingle();

  if (error || !battle?.winner_side) {
    throw new Error(error?.message || "battle_not_resolved");
  }

  if (offset === 0) {
    const inApp = await blastArenaBattleNotifications(supabase, battleId);
    if (!inApp.ok && !inApp.error?.includes("Could not find the function")) {
      throw new Error(inApp.error || "in_app_blast_failed");
    }
  }

  const push = await pushArenaResolvedChunk(
    supabase,
    battle as BattleRow,
    serviceKey,
    supabaseUrl,
    offset,
    limit,
  );

  if (push.hasMore) {
    await enqueueArenaPushBlastJob(
      supabase,
      { battle_id: battleId, offset: offset + push.processed, limit },
      supabaseUrl,
      serviceKey,
    );
  }

  return { inApp: offset === 0, push };
}

async function runClaimedJobs(
  supabase: SupabaseClient,
  supabaseUrl: string,
  serviceKey: string,
  claimed: ClaimedJob[],
  batchSize: number,
): Promise<JobOutcome[]> {
  const outcomes: JobOutcome[] = [];

  for (const job of claimed) {
    try {
      let detail: unknown;
      if (job.job_type === "arena_resolve") {
        detail = await processArenaResolve(
          supabase,
          supabaseUrl,
          serviceKey,
          job.payload as ArenaResolvePayload,
        );
      } else if (job.job_type === "arena_push_blast") {
        detail = await processArenaPushBlast(
          supabase,
          supabaseUrl,
          serviceKey,
          job.payload as ArenaPushBlastPayload,
        );
      } else {
        throw new Error(`unknown job_type: ${job.job_type}`);
      }

      await supabase.rpc("complete_background_job", {
        p_job_id: job.id,
        p_result: detail as Record<string, unknown>,
      });
      outcomes.push({ id: job.id, job_type: job.job_type, ok: true, detail });
    } catch (jobErr) {
      const msg = jobErr instanceof Error ? jobErr.message : "job failed";
      await supabase.rpc("fail_background_job", {
        p_job_id: job.id,
        p_error: msg,
        p_retry_after_seconds: 90,
      });
      outcomes.push({ id: job.id, job_type: job.job_type, ok: false, error: msg });
    }
  }

  if (claimed.length >= batchSize) {
    fetch(`${supabaseUrl}/functions/v1/process-background-jobs`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${serviceKey}`,
        apikey: serviceKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ batch_size: batchSize }),
    }).catch(() => {});
  }

  return outcomes;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const auth = await requireServiceRole(req);
    if (!auth.ok) return serviceAuthResponse(auth);

    const body = await req.json().catch(() => ({}));
    const batchSize = Math.min(Math.max(Number(body.batch_size) || 5, 1), 20);

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    await auth.supabase.rpc("release_stale_background_jobs", { p_stale_minutes: 15 });

    const { data: jobs, error: claimErr } = await auth.supabase.rpc("claim_background_jobs", {
      p_limit: batchSize,
      p_worker_id: WORKER_ID,
    });

    if (claimErr) {
      throw new Error(claimErr.message);
    }

    const claimed = (jobs || []) as ClaimedJob[];

    if (claimed.length === 0) {
      return new Response(
        JSON.stringify({ ok: true, worker: WORKER_ID, claimed: 0, outcomes: [] }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const work = runClaimedJobs(auth.supabase, supabaseUrl, serviceKey, claimed, batchSize);

    const edgeRuntime = (globalThis as { EdgeRuntime?: { waitUntil: (p: Promise<unknown>) => void } }).EdgeRuntime;
    if (edgeRuntime?.waitUntil) {
      edgeRuntime.waitUntil(work);
      return new Response(
        JSON.stringify({ ok: true, worker: WORKER_ID, claimed: claimed.length, async: true }),
        { status: 202, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const outcomes = await work;

    return new Response(
      JSON.stringify({
        ok: true,
        worker: WORKER_ID,
        claimed: claimed.length,
        outcomes,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ ok: false, error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
