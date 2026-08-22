import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  checkRateLimit,
  type RateLimitConfig,
  type RateLimitResult,
} from "./rateLimiter.ts";

function parseRateLimitRow(data: Record<string, unknown>): RateLimitResult {
  return {
    allowed: Boolean(data.allowed),
    remaining: Number(data.remaining) || 0,
    resetAt: Number(data.reset_at) || Date.now(),
    retryAfterMs: Number(data.retry_after_ms) || 0,
  };
}

/**
 * Postgres-backed rate limit (shared across edge isolates).
 * Falls back to in-memory limiter if RPC fails.
 */
export async function checkRateLimitDurable(
  admin: SupabaseClient,
  key: string,
  config: RateLimitConfig
): Promise<RateLimitResult> {
  try {
    const { data, error } = await admin.rpc("check_edge_rate_limit", {
      p_bucket_key: key,
      p_max_requests: config.maxRequests,
      p_window_ms: config.windowMs,
    });

    if (!error && data && typeof data === "object") {
      return parseRateLimitRow(data as Record<string, unknown>);
    }

    if (error) {
      console.warn("check_edge_rate_limit RPC failed, using in-memory fallback", error.message);
    }
  } catch (e) {
    console.warn("check_edge_rate_limit exception, using in-memory fallback", e);
  }

  return checkRateLimit(key, config);
}

function serviceRoleClient(): SupabaseClient | null {
  const url = (Deno.env.get("SUPABASE_URL") || "").trim();
  const serviceKey = (Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "").trim();
  if (!url || !serviceKey) return null;
  return createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

/** Convenience wrapper for edge handlers. */
export async function checkRateLimitDurableKey(
  bucketKey: string,
  config: RateLimitConfig
): Promise<RateLimitResult> {
  const admin = serviceRoleClient();
  if (!admin) return checkRateLimit(bucketKey, config);
  return checkRateLimitDurable(admin, bucketKey, config);
}
