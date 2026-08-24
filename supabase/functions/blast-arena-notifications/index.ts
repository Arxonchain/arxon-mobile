import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import {
  adminAuthResponse,
  adminCorsHeaders,
  requireAdminOrService,
} from "../_shared/adminAuth.ts";
import { blastArenaBattleWithPush } from "../_shared/arenaNotifications.ts";

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

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    if (body.cleanup === true) {
      const { data: deleted, error } = await auth.supabase.rpc("cleanup_arena_battle_notifications", {
        p_battle_id: battleId,
      });
      if (error && !error.message.includes("Could not find the function")) {
        return new Response(JSON.stringify({ ok: false, error: error.message }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (error) {
        await auth.supabase
          .from("user_notifications")
          .delete()
          .like("message", `%${battleId}%`);
      }
    }

    const result = await blastArenaBattleWithPush(auth.supabase, battleId, {
      supabaseUrl,
      serviceKey,
      push: body.push !== false,
      forcePush: body.force === true,
    });

    return new Response(JSON.stringify({ ok: true, battle_id: battleId, ...result }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({ ok: false, error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
