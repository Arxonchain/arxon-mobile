import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import {
  adminAuthResponse,
  adminCorsHeaders,
  requireAdminOrService,
} from "../_shared/adminAuth.ts";

const corsHeaders = adminCorsHeaders;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const auth = await requireAdminOrService(req);
    if (!auth.ok) return adminAuthResponse(auth);

    const { data, error } = await auth.supabase.rpc("notify_arena_battles_ended");
    if (error) {
      return new Response(JSON.stringify({ ok: false, error: error.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ ok: true, battles_notified: data ?? 0 }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({ ok: false, error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
