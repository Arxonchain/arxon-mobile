import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import type { DistributeRewardsPayload } from "./backgroundJobs.ts";

type DistributeResult = Record<string, unknown>;

async function listAllAuthUsers(db: SupabaseClient): Promise<Array<{ id: string; email?: string | null }>> {
  let allUsers: Array<{ id: string; email?: string | null }> = [];
  let page = 1;
  let hasMoreUsers = true;
  while (hasMoreUsers) {
    const { data: { users: batch }, error: authErr } = await db.auth.admin.listUsers({ page, perPage: 1000 });
    if (authErr) throw authErr;
    allUsers = allUsers.concat(batch || []);
    hasMoreUsers = (batch?.length || 0) === 1000;
    page++;
  }
  return allUsers;
}

async function runRumbleRewards(
  db: SupabaseClient,
  dryRun: boolean,
  requestEmails?: string[],
): Promise<DistributeResult> {
  const emails = requestEmails || [
    "metaken101@gmail.com",
    "probandocrytobullis@gmail.com",
    "mrvision@mail.ru",
    "midulkhan985@gmail.com",
    "riskiafani04@gmail.com",
    "umar.bisniscore@gmail.com",
    "sesawljem@gmail.com",
    "gabemetax@gmail.com",
  ];
  const amount = 10000;
  const results: Record<string, unknown>[] = [];
  const allUsers = await listAllAuthUsers(db);

  for (const email of emails) {
    const authUser = allUsers.find((u) => u.email?.toLowerCase() === email.toLowerCase());
    if (!authUser) {
      results.push({ email, status: "not_found" });
      continue;
    }

    const uid = authUser.id;

    if (!dryRun) {
      const { data: current } = await db
        .from("user_points")
        .select("social_points, total_points")
        .eq("user_id", uid)
        .maybeSingle();

      if (current) {
        const { error: updateErr } = await db.from("user_points").update({
          social_points: Number(current.social_points) + amount,
          total_points: Number(current.total_points) + amount,
          updated_at: new Date().toISOString(),
        }).eq("user_id", uid);
        if (updateErr) {
          results.push({ email, user_id: uid, status: "credit_failed", error: updateErr.message });
          continue;
        }
      } else {
        const { error: insertErr } = await db.from("user_points").insert({
          user_id: uid,
          social_points: amount,
          total_points: amount,
        });
        if (insertErr) {
          results.push({ email, user_id: uid, status: "credit_failed", error: insertErr.message });
          continue;
        }
      }

      try {
        await db.from("user_notifications").insert({
          user_id: uid,
          title: "🏆 Discord Rumble Winner!",
          message: "Congratulations! You earned 10,000 ARX-P for winning the Discord Rumble event!",
          notification_type: "rumble_reward",
          amount,
          expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        });
      } catch {
        /* notifications optional */
      }
    }

    results.push({ email, user_id: uid, status: dryRun ? "would_credit" : "credited", amount });
  }

  return {
    success: true,
    action: "rumble_rewards",
    dry_run: dryRun,
    total_credited: results.filter((r) => r.status === "credited").length,
    total_distributed: results.filter((r) => r.status === "credited").length * amount,
    results,
  };
}

async function runInflationCompensation(
  db: SupabaseClient,
  dryRun: boolean,
): Promise<DistributeResult> {
  const amount = 50000;
  const userStakes: Record<string, number> = {};
  let offset = 0;
  let hasMore = true;
  while (hasMore) {
    const { data, error } = await db
      .from("arena_votes")
      .select("user_id, power_spent")
      .range(offset, offset + 999);
    if (error) throw error;
    for (const v of data || []) {
      userStakes[v.user_id] = (userStakes[v.user_id] || 0) + Number(v.power_spent);
    }
    hasMore = (data?.length || 0) === 1000;
    offset += 1000;
  }

  const userEarnings: Record<string, number> = {};
  offset = 0;
  hasMore = true;
  while (hasMore) {
    const { data, error } = await db
      .from("arena_earnings")
      .select("user_id, total_earned")
      .range(offset, offset + 999);
    if (error) throw error;
    for (const e of data || []) {
      userEarnings[e.user_id] = (userEarnings[e.user_id] || 0) + Number(e.total_earned);
    }
    hasMore = (data?.length || 0) === 1000;
    offset += 1000;
  }

  const affectedUsers = Object.entries(userStakes)
    .filter(([uid, staked]) => (staked - (userEarnings[uid] || 0)) > 5000)
    .map(([uid, staked]) => ({
      user_id: uid,
      staked,
      earned: userEarnings[uid] || 0,
      net_loss: staked - (userEarnings[uid] || 0),
    }))
    .sort((a, b) => b.net_loss - a.net_loss);

  const results: Record<string, unknown>[] = [];

  for (const affected of affectedUsers) {
    const uid = affected.user_id;
    const { data: profile } = await db
      .from("profiles")
      .select("username")
      .eq("user_id", uid)
      .maybeSingle();

    if (!dryRun) {
      const { data: current } = await db
        .from("user_points")
        .select("social_points, total_points")
        .eq("user_id", uid)
        .maybeSingle();

      if (current) {
        const { error: updateErr } = await db.from("user_points").update({
          social_points: Number(current.social_points) + amount,
          total_points: Number(current.total_points) + amount,
          updated_at: new Date().toISOString(),
        }).eq("user_id", uid);
        if (updateErr) {
          results.push({ ...affected, username: profile?.username, status: "credit_failed" });
          continue;
        }
      }

      try {
        await db.from("user_notifications").insert({
          user_id: uid,
          title: "🎁 Compensation Reward",
          message: "You received 50,000 ARX-P as a reward for the inconvenience caused by the recent points adjustment. Thank you for your patience and continued support!",
          notification_type: "inflation_compensation",
          amount,
          expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        });
      } catch {
        /* notifications optional */
      }
    }

    results.push({
      ...affected,
      username: profile?.username || uid,
      status: dryRun ? "would_credit" : "credited",
      amount,
    });
  }

  return {
    success: true,
    action: "inflation_compensation",
    dry_run: dryRun,
    affected_count: affectedUsers.length,
    total_distributed: dryRun ? 0 : affectedUsers.length * amount,
    results: results.slice(0, 100),
  };
}

async function runCreateAnnouncement(dryRun: boolean, db: SupabaseClient): Promise<DistributeResult> {
  if (!dryRun) {
    const { error } = await db.from("announcements").insert({
      title: "🏆 Reward Distributions Applied!",
      message: "Two reward distributions have been applied:\n\n1️⃣ Discord Rumble Winners — 10,000 ARX-P has been credited to each winner from our recent Discord Rumble event. Congratulations to all winners!\n\n2️⃣ Points Adjustment Compensation — 50,000 ARX-P has been credited to all users who were affected by the recent balance reconciliation. This is our way of saying thank you for your patience and continued support.\n\nCheck your dashboard balance for the updated totals. Keep mining and staking! ⛏️🔥",
      is_active: true,
    });
    if (error) throw error;
  }
  return { success: true, action: "create_announcement", dry_run: dryRun };
}

export async function runDistributeRewards(
  db: SupabaseClient,
  payload: DistributeRewardsPayload,
): Promise<DistributeResult> {
  const dryRun = payload.dry_run !== false;

  if (payload.action === "rumble_rewards") {
    return runRumbleRewards(db, dryRun, payload.emails);
  }
  if (payload.action === "inflation_compensation") {
    return runInflationCompensation(db, dryRun);
  }
  if (payload.action === "create_announcement") {
    return runCreateAnnouncement(dryRun, db);
  }
  throw new Error("Invalid action. Use: rumble_rewards, inflation_compensation, create_announcement");
}
