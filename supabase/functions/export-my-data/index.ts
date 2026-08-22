import {
  rateLimitHeaders,
  rateLimitResponse,
  RATE_LIMITS,
} from "../_shared/rateLimiter.ts";
import { checkRateLimitDurableKey } from "../_shared/rateLimiterDb.ts";
import {
  corsPreflight,
  getAuthenticatedUser,
  jsonResponse,
  serviceRoleClient,
} from "../_shared/authenticatedUser.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return corsPreflight();

  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("cf-connecting-ip") ||
    "unknown";
  const rl = await checkRateLimitDurableKey(`export-my-data:${ip}`, RATE_LIMITS.auth);
  if (!rl.allowed) return rateLimitResponse(rl);

  if (req.method !== "GET" && req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  try {
    const auth = await getAuthenticatedUser(req);
    if (!auth) {
      return jsonResponse({ error: "Unauthorized" }, 401, rateLimitHeaders(rl));
    }

    const userId = auth.user.id;
    const admin = serviceRoleClient();

    const [
      authUserResult,
      profileResult,
      pointsResult,
      walletsResult,
      referralsGivenResult,
      referralsReceivedResult,
      miningSessionsResult,
      arenaVotesResult,
      badgesResult,
    ] = await Promise.all([
      admin.auth.admin.getUserById(userId),
      admin.from("profiles").select("*").eq("user_id", userId).maybeSingle(),
      admin.from("user_points").select("*").eq("user_id", userId).maybeSingle(),
      admin.from("user_wallets").select("wallet_address, is_primary, created_at").eq("user_id", userId),
      admin.from("referrals").select("referred_id, created_at").eq("referrer_id", userId).limit(200),
      admin.from("referrals").select("referrer_id, created_at").eq("referred_id", userId).limit(20),
      admin.from("mining_sessions")
        .select("id, started_at, ended_at, is_active, arx_mined, credited_at")
        .eq("user_id", userId)
        .order("started_at", { ascending: false })
        .limit(100),
      admin.from("arena_votes")
        .select("battle_id, side, power_spent, created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(500),
      admin.from("user_badges").select("badge_type, badge_name, earned_at").eq("user_id", userId),
    ]);

    const authUser = authUserResult.data.user;

    const payload = {
      exported_at: new Date().toISOString(),
      account: {
        id: userId,
        email: authUser?.email ?? null,
        created_at: authUser?.created_at ?? null,
        last_sign_in_at: authUser?.last_sign_in_at ?? null,
        email_confirmed_at: authUser?.email_confirmed_at ?? null,
      },
      profile: profileResult.data,
      points: pointsResult.data,
      wallets: walletsResult.data ?? [],
      referrals_given: referralsGivenResult.data ?? [],
      referrals_received: referralsReceivedResult.data ?? [],
      mining_sessions: miningSessionsResult.data ?? [],
      arena_votes: arenaVotesResult.data ?? [],
      badges: badgesResult.data ?? [],
      notice:
        "This export contains personal data stored by Arxon. Mining/arena history may be truncated to recent rows.",
    };

    const filename = `arxon-data-export-${userId.slice(0, 8)}-${new Date().toISOString().slice(0, 10)}.json`;

    return new Response(JSON.stringify(payload, null, 2), {
      status: 200,
      headers: {
        ...rateLimitHeaders(rl),
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers":
          "authorization, x-client-info, apikey, content-type",
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (e) {
    console.error("export-my-data error", e);
    return jsonResponse({ error: "Export failed" }, 500);
  }
});
