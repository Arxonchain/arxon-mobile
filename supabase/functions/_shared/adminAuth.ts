import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

export type AdminAuthResult =
  | { ok: true; mode: "service_role" | "admin"; userId?: string; supabase: SupabaseClient }
  | { ok: false; status: number; error: string };

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-admin-secret",
};

function collectServiceSecrets(): string[] {
  const secrets = new Set<string>();
  for (const key of [
    "SUPABASE_SERVICE_ROLE_KEY",
    "SUPABASE_SECRET_KEY",
    "SERVICE_ROLE_KEY",
  ]) {
    const v = Deno.env.get(key);
    if (v) secrets.add(v.trim());
  }
  for (const jsonKey of ["SUPABASE_SECRET_KEYS", "SUPABASE_SERVICE_ROLE_KEYS"]) {
    const raw = Deno.env.get(jsonKey);
    if (!raw) continue;
    try {
      const parsed = JSON.parse(raw) as Record<string, unknown>;
      for (const v of Object.values(parsed)) {
        if (typeof v === "string" && v) secrets.add(v.trim());
      }
    } catch {
      /* ignore */
    }
  }
  return [...secrets];
}

function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const b64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = b64 + "=".repeat((4 - (b64.length % 4)) % 4);
    return JSON.parse(atob(padded)) as Record<string, unknown>;
  } catch {
    return null;
  }
}

async function verifyHs256Jwt(token: string, secret: string): Promise<boolean> {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return false;
    const data = new TextEncoder().encode(`${parts[0]}.${parts[1]}`);
    const key = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["verify"],
    );
    const sigB64 = parts[2].replace(/-/g, "+").replace(/_/g, "/");
    const sigPadded = sigB64 + "=".repeat((4 - (sigB64.length % 4)) % 4);
    const sig = Uint8Array.from(atob(sigPadded), (c) => c.charCodeAt(0));
    return await crypto.subtle.verify("HMAC", key, sig, data);
  } catch {
    return false;
  }
}

async function isServiceRoleCredential(
  value: string,
  supabaseUrl: string,
): Promise<boolean> {
  if (!value) return false;
  const secrets = collectServiceSecrets();
  if (secrets.includes(value)) return true;

  const payload = decodeJwtPayload(value);
  if (!payload || payload.role !== "service_role") return false;

  const jwtSecret =
    Deno.env.get("SUPABASE_JWT_SECRET") ??
    Deno.env.get("JWT_SECRET") ??
    "";
  if (jwtSecret && (await verifyHs256Jwt(value, jwtSecret))) {
    return true;
  }

  // Prove the JWT with PostgREST (rejects forged signatures).
  try {
    const probe = createClient(supabaseUrl, value);
    const { error } = await probe.from("push_subscriptions").select("id").limit(1);
    return !error;
  } catch {
    return false;
  }
}

/**
 * Require service-role JWT/secret, matching ADMIN_FUNCTION_SECRET header, or admin user_roles row.
 */
export async function requireAdminOrService(req: Request): Promise<AdminAuthResult> {
  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const adminSecret = Deno.env.get("ADMIN_FUNCTION_SECRET") ?? "";

  if (!supabaseUrl || !serviceKey) {
    return { ok: false, status: 500, error: "Server misconfigured" };
  }

  const supabase = createClient(supabaseUrl, serviceKey);
  const authHeader = req.headers.get("authorization") ?? "";
  const token = authHeader.replace(/^Bearer\s+/i, "").trim();
  const headerSecret = req.headers.get("x-admin-secret") ?? "";
  const apiKey = (req.headers.get("apikey") ?? "").trim();

  if (adminSecret && headerSecret && headerSecret === adminSecret) {
    return { ok: true, mode: "service_role", supabase };
  }

  if (
    (await isServiceRoleCredential(token, supabaseUrl)) ||
    (await isServiceRoleCredential(apiKey, supabaseUrl))
  ) {
    return { ok: true, mode: "service_role", supabase };
  }

  if (!token) {
    return { ok: false, status: 401, error: "Unauthorized" };
  }

  const {
    data: { user },
    error: authErr,
  } = await supabase.auth.getUser(token);

  if (authErr || !user) {
    return { ok: false, status: 401, error: "Unauthorized" };
  }

  const { data: roleRow } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id)
    .eq("role", "admin")
    .maybeSingle();

  if (!roleRow) {
    return { ok: false, status: 403, error: "Admin access required" };
  }

  return { ok: true, mode: "admin", userId: user.id, supabase };
}

export function adminAuthResponse(result: Extract<AdminAuthResult, { ok: false }>): Response {
  return new Response(JSON.stringify({ success: false, error: result.error }), {
    status: result.status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

export { corsHeaders as adminCorsHeaders };
