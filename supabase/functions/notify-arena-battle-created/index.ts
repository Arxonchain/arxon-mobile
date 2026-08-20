import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import {
  adminAuthResponse,
  adminCorsHeaders,
  requireAdminOrService,
} from "../_shared/adminAuth.ts";
import {
  claimArenaCreatedPush,
  pushArenaNewBattleBroadcast,
  type BattleRow,
} from "../_shared/arenaNotifications.ts";

const corsHeaders = adminCorsHeaders;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const auth = await requireAdminOrService(req);
    if (!auth.ok) return adminAuthResponse(auth);

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const body = await req.json().catch(() => ({}));
    const battleId = body.battle_id as string | undefined;
    const limit = Math.min(Number(body.limit) || 10, 20);

    const targets: BattleRow[] = [];

    if (battleId) {
      const { data: battle, error } = await auth.supabase
        .from("arena_battles")
        .select("id, title, winner_side, side_a_name, side_b_name, side_c_name, is_active, starts_at, created_push_at")
        .eq("id", battleId)
        .maybeSingle();
      if (error) throw error;
      if (!battle) {
        return new Response(JSON.stringify({ ok: false, error: "battle_not_found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (battle.is_active !== true) {
        return new Response(JSON.stringify({ ok: false, error: "battle_not_active" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (battle.starts_at && new Date(battle.starts_at).getTime() > Date.now()) {
        return new Response(JSON.stringify({ ok: true, skipped: "not_started", battle_id: battleId }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (battle.created_push_at && body.force !== true) {
        return new Response(JSON.stringify({ ok: true, skipped: "already_pushed", battle_id: battleId }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      targets.push(battle);
    } else {
      const { data: pending, error } = await auth.supabase.rpc(
        "list_arena_battles_pending_created_push",
        { p_limit: limit },
      );
      if (error) {
        // Migration not applied yet — fall back to direct query
        const { data: rows, error: qErr } = await auth.supabase
          .from("arena_battles")
          .select("id, title, winner_side, side_a_name, side_b_name, side_c_name")
          .eq("is_active", true)
          .is("winner_side", null)
          .is("created_push_at", null)
          .lte("starts_at", new Date().toISOString())
          .order("starts_at", { ascending: true })
          .limit(limit);
        if (qErr) throw qErr;
        for (const row of rows || []) targets.push(row);
      } else {
        for (const row of pending || []) {
          targets.push({ id: row.id, title: row.title });
        }
      }
    }

    const results: Array<Record<string, unknown>> = [];

    for (const battle of targets) {
      const { error: ensureErr } = await auth.supabase.rpc("ensure_arena_new_battle_notifications", {
        p_battle_id: battle.id,
      });
      if (ensureErr) {
        console.warn("ensure_arena_new_battle_notifications:", ensureErr.message);
      }

      // Fallback ensure if RPC missing / failed
      const { count } = await auth.supabase
        .from("user_notifications")
        .select("id", { count: "exact", head: true })
        .eq("battle_id", battle.id)
        .eq("notification_type", "arena_new_battle");

      if (!count) {
        const { data: profiles } = await auth.supabase.from("profiles").select("user_id");
        const rows = (profiles || []).map((p: { user_id: string }) => ({
          user_id: p.user_id,
          notification_type: "arena_new_battle",
          title: "⚔️ New Arena Battle!",
          message: `A new prediction market is live: "${battle.title}". Stake your ARX-P now!`,
          battle_id: battle.id,
          data: { battle_id: battle.id, title: battle.title, url: "/arena/prediction-market" },
        }));
        if (rows.length) {
          const chunk = 500;
          for (let i = 0; i < rows.length; i += chunk) {
            const { error: insErr } = await auth.supabase
              .from("user_notifications")
              .insert(rows.slice(i, i + chunk));
            if (insErr) console.warn("notif insert chunk:", insErr.message);
          }
        }
      }

      // Claim BEFORE FCM so admin + cron cannot both broadcast the same battle.
      const claimed = await claimArenaCreatedPush(auth.supabase, battle.id, body.force === true);
      if (!claimed) {
        results.push({
          battle_id: battle.id,
          title: battle.title,
          skipped: "already_claimed",
          devices_sent: 0,
          devices_total: 0,
          errors: [],
        });
        continue;
      }

      const push = await pushArenaNewBattleBroadcast(
        auth.supabase,
        battle,
        serviceKey,
        supabaseUrl,
      );

      results.push({
        battle_id: battle.id,
        title: battle.title,
        devices_sent: push.sent,
        devices_total: push.total,
        errors: push.errors,
      });
    }

    return new Response(JSON.stringify({ ok: true, processed: results.length, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({ ok: false, error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
