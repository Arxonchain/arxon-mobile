import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

export type BattleRow = {
  id: string;
  title: string;
  winner_side?: string | null;
  side_a_name?: string;
  side_b_name?: string;
  side_c_name?: string | null;
};

type EarningsRow = {
  user_id: string;
  is_winner: boolean;
  total_earned: number;
  stake_amount: number;
};

export function winnerName(battle: BattleRow): string {
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

const ARENA_URL = "/arena/prediction-market";

function battleData(battleId: string, extra: Record<string, unknown> = {}) {
  return { battle_id: battleId, url: ARENA_URL, ...extra };
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
  return notifyArenaParticipantsResolved(supabase, battle, earnings || [], winSide);
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

export async function notifyArenaParticipantsResolved(
  supabase: SupabaseClient,
  battle: BattleRow,
  earnings: EarningsRow[],
  winSide?: string,
): Promise<{ wins: number; losses: number; resolved: number }> {
  const winner = winSide || winnerName(battle);
  const rows: Array<Record<string, unknown>> = [];
  const seenResolved = new Set<string>();

  for (const row of earnings) {
    if (!seenResolved.has(row.user_id)) {
      seenResolved.add(row.user_id);
      rows.push({
        user_id: row.user_id,
        title: "📊 Battle Resolved",
        message: `"${battle.title}" is settled — winner: ${winner}. Tap to view your result.`,
        notification_type: "arena_battle_resolved",
        amount: 0,
        battle_id: battle.id,
        data: battleData(battle.id, { winner_name: winner }),
      });
    }

    if (row.is_winner) {
      rows.push({
        user_id: row.user_id,
        title: "🏆 Arena Victory!",
        message: `You won "${battle.title}" on ${winner}. +${Number(row.total_earned).toLocaleString()} ARX-P credited!`,
        notification_type: "arena_win",
        amount: row.total_earned,
        battle_id: battle.id,
        data: battleData(battle.id, { winner_name: winner }),
      });
    } else {
      rows.push({
        user_id: row.user_id,
        title: "💧 Arena Battle Result",
        message: `Your pick lost in "${battle.title}". ${Number(row.stake_amount).toLocaleString()} ARX-P stake was not returned.`,
        notification_type: "arena_loss",
        amount: -Math.abs(Number(row.stake_amount)),
        battle_id: battle.id,
        data: battleData(battle.id, { winner_name: winner }),
      });
    }
  }

  if (rows.length === 0) return { wins: 0, losses: 0, resolved: 0 };

  const { error: insertErr } = await supabase.from("user_notifications").insert(rows);
  if (insertErr) throw insertErr;

  return {
    wins: earnings.filter((e) => e.is_winner).length,
    losses: earnings.filter((e) => !e.is_winner).length,
    resolved: seenResolved.size,
  };
}

type PushTarget = { userId: string; title: string; body: string; tag: string };

export async function sendPushToUser(
  supabaseUrl: string,
  serviceKey: string,
  target: PushTarget,
): Promise<{ sent: number; total: number; error?: string }> {
  const res = await fetch(`${supabaseUrl}/functions/v1/send-push-notification`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${serviceKey}`,
      apikey: serviceKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      userId: target.userId,
      title: target.title,
      body: target.body,
      url: ARENA_URL,
      tag: target.tag,
    }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    return { sent: 0, total: 0, error: json.error || res.statusText };
  }
  return { sent: Number(json.sent || 0), total: Number(json.total || 0) };
}

export async function pushArenaResolvedNotifications(
  supabase: SupabaseClient,
  battle: BattleRow,
  serviceKey: string,
  supabaseUrl: string,
): Promise<{ pushed: number; attempted: number; errors: string[] }> {
  const { data: earnings } = await supabase
    .from("arena_earnings")
    .select("user_id, is_winner, total_earned, stake_amount")
    .eq("battle_id", battle.id);

  const winSide = winnerName(battle);
  let pushed = 0;
  const errors: string[] = [];
  const seen = new Set<string>();

  for (const row of earnings || []) {
    if (!seen.has(row.user_id)) {
      seen.add(row.user_id);
      const resolved = await sendPushToUser(supabaseUrl, serviceKey, {
        userId: row.user_id,
        title: "📊 Battle Resolved",
        body: `"${battle.title}" is settled — winner: ${winSide}.`,
        tag: "arena-resolved",
      });
      if (resolved.sent > 0) pushed += 1;
      if (resolved.error) errors.push(resolved.error);
    }

    const winPush = row.is_winner
      ? {
          title: "🏆 You Won!",
          body: `You won ${Number(row.total_earned).toLocaleString()} ARX-P in "${battle.title}"!`,
          tag: "arena-win",
        }
      : {
          title: "💧 Battle Result",
          body: `"${battle.title}" — ${Number(row.stake_amount).toLocaleString()} ARX-P stake was not returned.`,
          tag: "arena-loss",
        };

    const result = await sendPushToUser(supabaseUrl, serviceKey, {
      userId: row.user_id,
      ...winPush,
    });
    if (result.sent > 0) pushed += 1;
    if (result.error) errors.push(result.error);
  }

  return { pushed, attempted: (earnings || []).length, errors: [...new Set(errors)] };
}

/** Chunked FCM push for large battles (background job worker). */
export async function pushArenaResolvedChunk(
  supabase: SupabaseClient,
  battle: BattleRow,
  serviceKey: string,
  supabaseUrl: string,
  offset = 0,
  limit = 25,
): Promise<{ pushed: number; processed: number; hasMore: boolean; errors: string[] }> {
  const { data: earnings, error } = await supabase
    .from("arena_earnings")
    .select("user_id, is_winner, total_earned, stake_amount")
    .eq("battle_id", battle.id)
    .order("user_id", { ascending: true })
    .range(offset, offset + limit - 1);

  if (error) throw error;

  const rows = earnings || [];
  const winSide = winnerName(battle);
  let pushed = 0;
  const errors: string[] = [];
  const seen = new Set<string>();

  for (const row of rows) {
    if (!seen.has(row.user_id)) {
      seen.add(row.user_id);
      const resolved = await sendPushToUser(supabaseUrl, serviceKey, {
        userId: row.user_id,
        title: "📊 Battle Resolved",
        body: `"${battle.title}" is settled — winner: ${winSide}.`,
        tag: "arena-resolved",
      });
      if (resolved.sent > 0) pushed += 1;
      if (resolved.error) errors.push(resolved.error);
    }

    const winPush = row.is_winner
      ? {
          title: "🏆 You Won!",
          body: `You won ${Number(row.total_earned).toLocaleString()} ARX-P in "${battle.title}"!`,
          tag: "arena-win",
        }
      : {
          title: "💧 Battle Result",
          body: `"${battle.title}" — ${Number(row.stake_amount).toLocaleString()} ARX-P stake was not returned.`,
          tag: "arena-loss",
        };

    const result = await sendPushToUser(supabaseUrl, serviceKey, {
      userId: row.user_id,
      ...winPush,
    });
    if (result.sent > 0) pushed += 1;
    if (result.error) errors.push(result.error);
  }

  const { count } = await supabase
    .from("arena_earnings")
    .select("user_id", { count: "exact", head: true })
    .eq("battle_id", battle.id);

  const total = count ?? rows.length;
  const hasMore = offset + rows.length < total;

  return {
    pushed,
    processed: rows.length,
    hasMore,
    errors: [...new Set(errors)],
  };
}

/** @deprecated use pushArenaResolvedNotifications */
export async function pushArenaNotifications(
  supabase: SupabaseClient,
  battle: BattleRow,
  serviceKey: string,
  supabaseUrl: string,
): Promise<{ pushed: number }> {
  const r = await pushArenaResolvedNotifications(supabase, battle, serviceKey, supabaseUrl);
  return { pushed: r.pushed };
}

export async function notifyArenaBattleResolved(
  supabase: SupabaseClient,
  battle: BattleRow,
  options: { supabaseUrl: string; serviceKey: string; push?: boolean },
): Promise<{ inApp: unknown; push?: { pushed: number; attempted: number; errors: string[] } }> {
  const rpc = await blastArenaBattleNotifications(supabase, battle.id);
  let inApp: unknown = rpc.detail;
  if (!rpc.ok && rpc.error?.includes("Could not find the function")) {
    inApp = await notifyArenaResolveFallback(supabase, battle);
  } else if (!rpc.ok) {
    throw new Error(rpc.error || "notify failed");
  }

  let push: { pushed: number; attempted: number; errors: string[] } | undefined;
  if (options.push !== false) {
    push = await pushArenaResolvedNotifications(
      supabase,
      battle,
      options.serviceKey,
      options.supabaseUrl,
    );
  }
  return { inApp, push };
}

export async function blastArenaBattleWithPush(
  supabase: SupabaseClient,
  battleId: string,
  options: { supabaseUrl: string; serviceKey: string; push?: boolean },
): Promise<{ inApp: unknown; push?: { pushed: number; attempted: number; errors: string[] } }> {
  const { data: battle, error } = await supabase
    .from("arena_battles")
    .select("id, title, winner_side, side_a_name, side_b_name, side_c_name")
    .eq("id", battleId)
    .maybeSingle();
  if (error || !battle?.winner_side) {
    throw new Error(error?.message || "battle_not_resolved");
  }
  return notifyArenaBattleResolved(supabase, battle, options);
}

/**
 * Broadcast FCM/web-push for a newly live arena battle (works with app closed).
 * Uses send-push-notification broadcast in one call; falls back to paged userIds.
 */
export async function pushArenaNewBattleBroadcast(
  _supabase: SupabaseClient,
  battle: BattleRow,
  serviceKey: string,
  supabaseUrl: string,
): Promise<{ sent: number; total: number; errors: string[] }> {
  const title = "⚔️ New Arena Battle!";
  const body = `"${battle.title}" is live — open Arxon and stake your ARX-P!`;
  const errors: string[] = [];

  const res = await fetch(`${supabaseUrl}/functions/v1/send-push-notification`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${serviceKey}`,
      apikey: serviceKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      broadcast: true,
      title,
      body,
      url: ARENA_URL,
      tag: `arena-live-${battle.id}`,
      data: { battle_id: battle.id, type: "arena_new_battle" },
    }),
  });

  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    errors.push(json.error || res.statusText || `HTTP ${res.status}`);
    return { sent: 0, total: 0, errors };
  }

  return {
    sent: Number(json.sent || 0),
    total: Number(json.total || 0),
    errors,
  };
}

/**
 * Claim the single FCM slot for a battle (admin + cron race-safe).
 * force=true re-marks and allows another broadcast.
 */
export async function claimArenaCreatedPush(
  supabase: SupabaseClient,
  battleId: string,
  force = false,
): Promise<boolean> {
  if (force) {
    await supabase
      .from("arena_battles")
      .update({ created_push_at: new Date().toISOString() })
      .eq("id", battleId);
    return true;
  }

  const { data, error } = await supabase.rpc("claim_arena_battle_created_push", {
    p_battle_id: battleId,
  });
  if (!error && typeof data === "boolean") return data;

  // Fallback if migration not applied yet
  const { data: row } = await supabase
    .from("arena_battles")
    .select("created_push_at")
    .eq("id", battleId)
    .maybeSingle();
  if (row?.created_push_at) return false;

  const { error: updErr } = await supabase
    .from("arena_battles")
    .update({ created_push_at: new Date().toISOString() })
    .eq("id", battleId)
    .is("created_push_at", null);
  return !updErr;
}
