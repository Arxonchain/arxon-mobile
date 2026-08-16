import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

export type AdminAuthResult =
  | { ok: true; mode: "service_role" | "admin"; userId?: string; supabase: SupabaseClient }
  | { ok: false; status: number; error: string };

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-admin-secret",
};

/**
 * Require service-role JWT, matching ADMIN_FUNCTION_SECRET header, or admin user_roles row.
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
  const apiKey = req.headers.get("apikey") ?? "";

  if (adminSecret && headerSecret && headerSecret === adminSecret) {
    return { ok: true, mode: "service_role", supabase };
  }

  if ((token && token === serviceKey) || (apiKey && apiKey === serviceKey)) {
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
