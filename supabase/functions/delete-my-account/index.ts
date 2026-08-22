import {
  checkRateLimit,
  rateLimitHeaders,
  rateLimitResponse,
  RATE_LIMITS,
} from "../_shared/rateLimiter.ts";
import {
  callerIsAdmin,
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
  const rl = checkRateLimit(`delete-my-account:${ip}`, {
    maxRequests: 5,
    windowMs: 60 * 60 * 1000,
  });
  if (!rl.allowed) return rateLimitResponse(rl);

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  try {
    const auth = await getAuthenticatedUser(req);
    if (!auth) {
      return jsonResponse({ error: "Unauthorized" }, 401, rateLimitHeaders(rl));
    }

    let body: { confirmation?: unknown } = {};
    try {
      body = await req.json();
    } catch {
      body = {};
    }

    if (body.confirmation !== "DELETE") {
      return jsonResponse(
        {
          error: 'Type DELETE in the confirmation field to permanently delete your account.',
          code: "confirmation_required",
        },
        400,
        rateLimitHeaders(rl)
      );
    }

    const userId = auth.user.id;
    const admin = serviceRoleClient();

    if (await callerIsAdmin(admin, userId)) {
      return jsonResponse(
        { error: "Admin accounts cannot be self-deleted. Contact another admin.", code: "admin_blocked" },
        403,
        rateLimitHeaders(rl)
      );
    }

    const { error: deleteError } = await admin.auth.admin.deleteUser(userId);
    if (deleteError) {
      console.error("delete-my-account failed", deleteError);
      return jsonResponse({ error: "Account deletion failed. Please contact support." }, 500, rateLimitHeaders(rl));
    }

    return jsonResponse(
      { success: true, message: "Your account has been permanently deleted." },
      200,
      rateLimitHeaders(rl)
    );
  } catch (e) {
    console.error("delete-my-account error", e);
    return jsonResponse({ error: "Account deletion failed" }, 500);
  }
});
