import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

type BattleRow = {
  id: string;
  title: string;
  winner_side?: string | null;
  side_a_name?: string;
  side_b_name?: string;
  side_c_name?: string | null;
};

function winnerName(battle: BattleRow): string {
  switch (battle.winner_side) {
    case "a":
      return battle.side_a_name || "Side A";
    case "b":
      return battle.side_b_name || "Side B";
    case "c":
      return battle.side_c_name || "Draw";
    case "none":
      return "Void / Tie";
    default:
      return "Unknown";
  }
}

/** Idempotent in-app notifications via DB RPC (migration 20260816201500). */
export async function blastArenaBattleNotifications(
  supabase: SupabaseClient,
  battleId: string,
): Promise<{ ok: boolean; detail?: unknown; error?: string }> {
  const { data, error } = await supabase.rpc("blast_arena_battle_notifications", {
    p_battle_id: battleId,
  });
  if (error) return { ok: false, error: error.message };
  return { ok: true, detail: data };
}

/** REST fallback when migration RPCs are not applied yet. */
export async function blastArenaBattleNotificationsFallback(
  supabase: SupabaseClient,
  battleId: string,
): Promise<{ ok: boolean; detail?: unknown; error?: string }> {
  const { data: battle, error: battleErr } = await supabase
    .from("arena_battles")
    .select("id, title, winner_side, side_a_name, side_b_name, side_c_name")
    .eq("id", battleId)
    .maybeSingle();
  if (battleErr || !battle?.winner_side) {
    return { ok: false, error: battleErr?.message || "battle_not_resolved" };
  }

  const detail = await notifyArenaResolveFallback(supabase, battle);
  return { ok: true, detail };
}

export async function notifyArenaResolveFallback(
  supabase: SupabaseClient,
  battle: BattleRow,
): Promise<{ wins: number; losses: number; resolved: number }> {
  const winSide = winnerName(battle);
  const { data: earnings, error } = await supabase
    .from("arena_earnings")
    .select("user_id, is_winner, total_earned, stake_amount")
    .eq("battle_id", battle.id);
  if (error) throw error;

  const rows: Array<Record<string, unknown>> = [];
  const seenResolved = new Set<string>();

  for (const row of earnings || []) {
    if (!seenResolved.has(row.user_id)) {
      seenResolved.add(row.user_id);
      rows.push({
        user_id: row.user_id,
        title: "📊 Battle Resolved",
        message: `[${battle.id}] "${battle.title}" is settled. Winning side: ${winSide}. Tap to view your result.`,
        notification_type: "arena_battle_resolved",
        amount: 0,
      });
    }

    if (row.is_winner) {
      rows.push({
        user_id: row.user_id,
        title: "🏆 Arena Victory!",
        message: `[${battle.id}] You won "${battle.title}". ${Number(row.total_earned).toLocaleString()} ARX-P has been credited to your balance!`,
        notification_type: "arena_win",
        amount: row.total_earned,
      });
    } else {
      rows.push({
        user_id: row.user_id,
        title: "💧 Arena Battle Result",
        message: `[${battle.id}] Your side lost "${battle.title}". ${Number(row.stake_amount).toLocaleString()} ARX-P stake was not returned.`,
        notification_type: "arena_loss",
        amount: -Math.abs(Number(row.stake_amount)),
      });
    }
  }

  if (rows.length === 0) return { wins: 0, losses: 0, resolved: 0 };

  const { error: insertErr } = await supabase.from("user_notifications").insert(rows);
  if (insertErr) throw insertErr;

  return {
    wins: (earnings || []).filter((e) => e.is_winner).length,
    losses: (earnings || []).filter((e) => !e.is_winner).length,
    resolved: seenResolved.size,
  };
}

export async function pushArenaNotifications(
  supabase: SupabaseClient,
  battle: BattleRow,
  serviceKey: string,
  supabaseUrl: string,
): Promise<{ pushed: number }> {
  const { data: earnings } = await supabase
    .from("arena_earnings")
    .select("user_id, is_winner, total_earned, stake_amount")
    .eq("battle_id", battle.id);

  let pushed = 0;
  for (const row of earnings || []) {
    const title = row.is_winner ? "🏆 You Won!" : "💧 Battle Result";
    const body = row.is_winner
      ? `You won ${Number(row.total_earned).toLocaleString()} ARX-P in "${battle.title}"!`
      : `Your team lost "${battle.title}". ${Number(row.stake_amount).toLocaleString()} ARX-P stake was not returned.`;

    const res = await fetch(`${supabaseUrl}/functions/v1/send-push-notification`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${serviceKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        userId: row.user_id,
        title,
        body,
        url: "/arena/prediction-market",
        tag: row.is_winner ? "arena-win" : "arena-loss",
      }),
    });
    if (res.ok) {
      const json = await res.json();
      if (json.sent > 0) pushed += 1;
    }
  }
  return { pushed };
}

export async function notifyArenaBattleResolved(
  supabase: SupabaseClient,
  battle: BattleRow,
  options: { supabaseUrl: string; serviceKey: string; push?: boolean },
): Promise<{ inApp: unknown; push?: { pushed: number } }> {
  const rpc = await blastArenaBattleNotifications(supabase, battle.id);
  let inApp: unknown = rpc.detail;
  if (!rpc.ok && rpc.error?.includes("Could not find the function")) {
    inApp = await notifyArenaResolveFallback(supabase, battle);
  } else if (!rpc.ok) {
    throw new Error(rpc.error || "notify failed");
  }

  let push: { pushed: number } | undefined;
  if (options.push !== false) {
    push = await pushArenaNotifications(supabase, battle, options.serviceKey, options.supabaseUrl);
  }
  return { inApp, push };
}

export { winnerName };
