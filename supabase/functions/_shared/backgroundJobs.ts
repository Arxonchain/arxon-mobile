import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

export type BackgroundJobType = "arena_resolve" | "arena_push_blast";

export type ArenaResolvePayload = {
  battle_id: string;
  winner_side: string;
  force?: boolean;
};

export type ArenaPushBlastPayload = {
  battle_id: string;
  offset?: number;
  limit?: number;
};

export async function enqueueBackgroundJob(
  supabase: SupabaseClient,
  jobType: BackgroundJobType,
  payload: Record<string, unknown>,
  idempotencyKey?: string,
): Promise<{ jobId: string | null; error?: string }> {
  const { data, error } = await supabase.rpc("enqueue_background_job", {
    p_job_type: jobType,
    p_payload: payload,
    p_idempotency_key: idempotencyKey ?? null,
  });

  if (error) return { jobId: null, error: error.message };
  return { jobId: data as string };
}

/** Fire-and-forget worker kick (do not await in hot paths). */
export function triggerBackgroundWorker(
  supabaseUrl: string,
  serviceKey: string,
  batchSize = 5,
): void {
  fetch(`${supabaseUrl}/functions/v1/process-background-jobs`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${serviceKey}`,
      apikey: serviceKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ batch_size: batchSize }),
  }).catch((err) => {
    console.warn("process-background-jobs trigger failed:", err);
  });
}

export async function enqueueArenaResolveJob(
  supabase: SupabaseClient,
  payload: ArenaResolvePayload,
  supabaseUrl: string,
  serviceKey: string,
): Promise<{ jobId: string | null; error?: string }> {
  const key = `arena_resolve:${payload.battle_id}`;
  const result = await enqueueBackgroundJob(supabase, "arena_resolve", payload, key);
  if (result.jobId) triggerBackgroundWorker(supabaseUrl, serviceKey);
  return result;
}

export async function enqueueArenaPushBlastJob(
  supabase: SupabaseClient,
  payload: ArenaPushBlastPayload,
  supabaseUrl: string,
  serviceKey: string,
): Promise<{ jobId: string | null; error?: string }> {
  const offset = Number(payload.offset) || 0;
  const key = `arena_push_blast:${payload.battle_id}:${offset}`;
  const result = await enqueueBackgroundJob(
    supabase,
    "arena_push_blast",
    { ...payload, offset, limit: payload.limit ?? 25 },
    key,
  );
  if (result.jobId) triggerBackgroundWorker(supabaseUrl, serviceKey);
  return result;
}
