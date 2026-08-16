import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import {
  adminAuthResponse,
  adminCorsHeaders,
  requireAdminOrService,
} from "../_shared/adminAuth.ts";
import {
  blastArenaBattleNotifications,
  blastArenaBattleNotificationsFallback,
} from "../_shared/arenaNotifications.ts";

const corsHeaders = adminCorsHeaders;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const auth = await requireAdminOrService(req);
    if (!auth.ok) return adminAuthResponse(auth);

    const body = await req.json().catch(() => ({}));
    const battleId = body.battle_id as string | undefined;
    if (!battleId) {
      return new Response(JSON.stringify({ ok: false, error: "battle_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let result = await blastArenaBattleNotifications(auth.supabase, battleId);

    if (!result.ok && result.error?.includes("Could not find the function")) {
      result = await blastArenaBattleNotificationsFallback(auth.supabase, battleId);
    }

    return new Response(JSON.stringify({ ok: result.ok, ...result }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({ ok: false, error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
