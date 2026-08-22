import { createClient, SupabaseClient, User } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

export function jsonResponse(
  body: unknown,
  status = 200,
  extraHeaders: Record<string, string> = {}
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, ...extraHeaders, "Content-Type": "application/json" },
  });
}

export function corsPreflight(): Response {
  return new Response("ok", { headers: corsHeaders });
}

/** Resolve caller from Authorization bearer JWT. */
export async function getAuthenticatedUser(
  req: Request
): Promise<{ user: User; token: string } | null> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;
  const token = authHeader.replace("Bearer ", "").trim();
  if (!token) return null;

  const url = (Deno.env.get("SUPABASE_URL") || "").trim();
  const serviceKey = (Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "").trim();
  if (!url || !serviceKey) return null;

  const client = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: { user }, error } = await client.auth.getUser(token);
  if (error || !user) return null;
  return { user, token };
}

export function serviceRoleClient(): SupabaseClient {
  const url = (Deno.env.get("SUPABASE_URL") || "").trim();
  const key = (Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "").trim();
  if (!url || !key) throw new Error("Server misconfigured");
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export async function callerIsAdmin(
  admin: SupabaseClient,
  userId: string
): Promise<boolean> {
  const { data } = await admin
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();
  return !!data;
}
