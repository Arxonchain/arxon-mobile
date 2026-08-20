import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import {
  adminAuthResponse,
  adminCorsHeaders,
  requireAdminOrService,
} from "../_shared/adminAuth.ts";
import { pushArenaNewBattleBroadcast, claimArenaCreatedPush } from "../_shared/arenaNotifications.ts";

const corsHeaders = adminCorsHeaders;

/**
 * Cron / admin entry:
 * 1) Mark battles whose staking window ended (in-app arena_battle_end)
 * 2) FCM-broadcast any newly live battles that have not been pushed yet
 */
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const auth = await requireAdminOrService(req);
    if (!auth.ok) return adminAuthResponse(auth);

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    const { data: endedCount, error: endErr } = await auth.supabase.rpc("notify_arena_battles_ended");
    if (endErr) {
      return new Response(JSON.stringify({ ok: false, error: endErr.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const createdResults: Array<Record<string, unknown>> = [];
    const { data: pending, error: pendingErr } = await auth.supabase.rpc(
      "list_arena_battles_pending_created_push",
      { p_limit: 10 },
    );

    let pendingRows = pending || [];
    if (pendingErr) {
      const { data: rows } = await auth.supabase
        .from("arena_battles")
        .select("id, title")
        .eq("is_active", true)
        .is("winner_side", null)
        .is("created_push_at", null)
        .lte("starts_at", new Date().toISOString())
        .order("starts_at", { ascending: true })
        .limit(10);
      pendingRows = rows || [];
    }

    for (const row of pendingRows) {
      const { error: ensureErr } = await auth.supabase.rpc("ensure_arena_new_battle_notifications", {
        p_battle_id: row.id,
      });
      if (ensureErr) {
        console.warn("ensure_arena_new_battle_notifications:", ensureErr.message);
      }

      const claimed = await claimArenaCreatedPush(auth.supabase, row.id, false);
      if (!claimed) continue;

      const push = await pushArenaNewBattleBroadcast(
        auth.supabase,
        { id: row.id, title: row.title },
        serviceKey,
        supabaseUrl,
      );

      createdResults.push({
        battle_id: row.id,
        title: row.title,
        devices_sent: push.sent,
        devices_total: push.total,
      });
    }

    return new Response(
      JSON.stringify({
        ok: true,
        battles_ended_notified: endedCount ?? 0,
        battles_created_pushed: createdResults.length,
        created: createdResults,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ ok: false, error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
