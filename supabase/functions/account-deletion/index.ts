import {
  rateLimitHeaders,
  rateLimitResponse,
} from "../_shared/rateLimiter.ts";
import { checkRateLimitDurableKey } from "../_shared/rateLimiterDb.ts";
import {
  callerIsAdmin,
  corsPreflight,
  getAuthenticatedUser,
  jsonResponse,
  serviceRoleClient,
} from "../_shared/authenticatedUser.ts";

const TEAM_EMAIL =
  (Deno.env.get("ACCOUNT_DELETION_TEAM_EMAIL") || "").trim() ||
  "team@arxonchain.org";

type Action = "request" | "cancel" | "approve" | "deny" | "complete";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return corsPreflight();
  if (req.method !== "POST") return jsonResponse({ error: "Method not allowed" }, 405);

  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("cf-connecting-ip") ||
    "unknown";
  const rl = await checkRateLimitDurableKey(`account-deletion:${ip}`, {
    maxRequests: 20,
    windowMs: 60 * 60 * 1000,
  });
  if (!rl.allowed) return rateLimitResponse(rl);

  try {
    const auth = await getAuthenticatedUser(req);
    if (!auth) return jsonResponse({ error: "Unauthorized" }, 401, rateLimitHeaders(rl));

    let body: {
      action?: unknown;
      confirmation?: unknown;
      requestId?: unknown;
      note?: unknown;
    } = {};
    try {
      body = await req.json();
    } catch {
      body = {};
    }

    const action = String(body.action || "request") as Action;
    const admin = serviceRoleClient();
    const isAdmin = await callerIsAdmin(admin, auth.user.id);

    if (action === "request") {
      return await handleRequest(admin, auth.user, body.confirmation, rl);
    }
    if (action === "cancel") {
      return await handleCancel(admin, auth.user.id, rl);
    }
    if (!isAdmin) {
      return jsonResponse({ error: "Admin only", code: "admin_required" }, 403, rateLimitHeaders(rl));
    }
    const requestId = String(body.requestId || "");
    if (!requestId) {
      return jsonResponse({ error: "requestId required" }, 400, rateLimitHeaders(rl));
    }
    if (action === "approve") return await handleApprove(admin, auth.user.id, requestId, body.note, rl);
    if (action === "deny") return await handleDeny(admin, auth.user.id, requestId, body.note, rl);
    if (action === "complete") return await handleComplete(admin, auth.user.id, requestId, rl);
    return jsonResponse({ error: "Unknown action" }, 400, rateLimitHeaders(rl));
  } catch (e) {
    console.error("account-deletion error", e);
    return jsonResponse({ error: "Account deletion request failed" }, 500);
  }
});

async function handleRequest(
  admin: ReturnType<typeof serviceRoleClient>,
  user: { id: string; email?: string },
  confirmation: unknown,
  rl: { remaining: number; resetAt: number; retryAfterMs: number },
) {
  if (await callerIsAdmin(admin, user.id)) {
    return jsonResponse(
      { error: "Admin accounts cannot be self-deleted. Ask another admin.", code: "admin_blocked" },
      403,
      rateLimitHeaders(rl),
    );
  }
  if (String(confirmation || "") !== "DELETE") {
    return jsonResponse(
      { error: "Type DELETE to confirm.", code: "confirmation_required" },
      400,
      rateLimitHeaders(rl),
    );
  }

  const { data: open } = await admin
    .from("account_deletion_requests")
    .select("id, status, scheduled_for")
    .eq("user_id", user.id)
    .in("status", ["pending", "approved"])
    .maybeSingle();
  if (open) {
    return jsonResponse(
      { error: "A deletion request is already open for this account.", request: open },
      409,
      rateLimitHeaders(rl),
    );
  }

  const { data: profile } = await admin
    .from("profiles")
    .select("username")
    .eq("user_id", user.id)
    .maybeSingle();

  const scheduledFor = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
  const email = user.email || null;
  const username = profile?.username || null;

  const { data: row, error } = await admin
    .from("account_deletion_requests")
    .insert({
      user_id: user.id,
      email,
      username,
      status: "pending",
      confirmation: "DELETE",
      scheduled_for: scheduledFor,
    })
    .select("*")
    .single();

  if (error) {
    console.error("account-deletion insert", error);
    return jsonResponse({ error: "Could not record deletion request." }, 500, rateLimitHeaders(rl));
  }

  const when = new Date(scheduledFor).toUTCString();
  const html = `
    <p>A miner submitted an account deletion request.</p>
    <ul>
      <li>User id: ${escapeHtml(user.id)}</li>
      <li>Email: ${escapeHtml(email || "unknown")}</li>
      <li>Username: ${escapeHtml(username || "unknown")}</li>
      <li>Scheduled deletion (30 days from request): ${escapeHtml(when)}</li>
      <li>Request id: ${escapeHtml(row.id)}</li>
    </ul>
    <p>Review this in ARXON Admin → Deletion requests. Approve or deny during the waiting period. Do not complete deletion before the scheduled date.</p>
  `;
  const text =
    `Account deletion request\nuser: ${user.id}\nemail: ${email || "unknown"}\nusername: ${username || "unknown"}\nscheduled: ${when}\nrequest: ${row.id}\n`;

  await sendMail({
    to: TEAM_EMAIL,
    subject: `Account deletion request — ${email || user.id}`,
    html,
    text,
    purpose: "team-deletion-request",
  });
  if (email) {
    await sendMail({
      to: email,
      subject: "We received your ARXON account deletion request",
      html: `<p>Your ARXON account is scheduled for deletion on <strong>${escapeHtml(when)}</strong>, after team review.</p>
        <p>You can cancel this request in the app before that date. Questions: ${escapeHtml(TEAM_EMAIL)}</p>`,
      text: `Your ARXON account is scheduled for deletion on ${when}, after team review. Cancel in the app before that date. ${TEAM_EMAIL}`,
      purpose: "user-deletion-request",
    });
  }

  return jsonResponse({ success: true, request: row }, 200, rateLimitHeaders(rl));
}

async function handleCancel(
  admin: ReturnType<typeof serviceRoleClient>,
  userId: string,
  rl: { remaining: number; resetAt: number; retryAfterMs: number },
) {
  const { data: open } = await admin
    .from("account_deletion_requests")
    .select("*")
    .eq("user_id", userId)
    .in("status", ["pending", "approved"])
    .maybeSingle();
  if (!open) {
    return jsonResponse({ error: "No open deletion request." }, 404, rateLimitHeaders(rl));
  }
  const { error } = await admin
    .from("account_deletion_requests")
    .update({ status: "cancelled", cancelled_at: new Date().toISOString() })
    .eq("id", open.id);
  if (error) return jsonResponse({ error: "Could not cancel request." }, 500, rateLimitHeaders(rl));

  await sendMail({
    to: TEAM_EMAIL,
    subject: `Account deletion cancelled — ${open.email || userId}`,
    html: `<p>User cancelled deletion request ${escapeHtml(open.id)} (${escapeHtml(open.email || userId)}).</p>`,
    text: `Cancelled ${open.id} ${open.email || userId}`,
    purpose: "team-deletion-cancel",
  });
  return jsonResponse({ success: true }, 200, rateLimitHeaders(rl));
}

async function handleApprove(
  admin: ReturnType<typeof serviceRoleClient>,
  adminId: string,
  requestId: string,
  note: unknown,
  rl: { remaining: number; resetAt: number; retryAfterMs: number },
) {
  const { data: row } = await admin.from("account_deletion_requests").select("*").eq("id", requestId).maybeSingle();
  if (!row || (row.status !== "pending" && row.status !== "approved")) {
    return jsonResponse({ error: "Request is not awaiting approval." }, 400, rateLimitHeaders(rl));
  }
  const { error } = await admin
    .from("account_deletion_requests")
    .update({
      status: "approved",
      approved_at: new Date().toISOString(),
      reviewed_by: adminId,
      admin_note: typeof note === "string" ? note.slice(0, 500) : row.admin_note,
    })
    .eq("id", requestId);
  if (error) return jsonResponse({ error: "Could not approve." }, 500, rateLimitHeaders(rl));
  return jsonResponse({ success: true }, 200, rateLimitHeaders(rl));
}

async function handleDeny(
  admin: ReturnType<typeof serviceRoleClient>,
  adminId: string,
  requestId: string,
  note: unknown,
  rl: { remaining: number; resetAt: number; retryAfterMs: number },
) {
  const { data: row } = await admin.from("account_deletion_requests").select("*").eq("id", requestId).maybeSingle();
  if (!row || (row.status !== "pending" && row.status !== "approved")) {
    return jsonResponse({ error: "Request is not open." }, 400, rateLimitHeaders(rl));
  }
  const { error } = await admin
    .from("account_deletion_requests")
    .update({
      status: "denied",
      denied_at: new Date().toISOString(),
      reviewed_by: adminId,
      admin_note: typeof note === "string" ? note.slice(0, 500) : "Denied by admin",
    })
    .eq("id", requestId);
  if (error) return jsonResponse({ error: "Could not deny." }, 500, rateLimitHeaders(rl));
  return jsonResponse({ success: true }, 200, rateLimitHeaders(rl));
}

async function handleComplete(
  admin: ReturnType<typeof serviceRoleClient>,
  adminId: string,
  requestId: string,
  rl: { remaining: number; resetAt: number; retryAfterMs: number },
) {
  const { data: row } = await admin.from("account_deletion_requests").select("*").eq("id", requestId).maybeSingle();
  if (!row) return jsonResponse({ error: "Request not found." }, 404, rateLimitHeaders(rl));
  if (row.status !== "approved") {
    return jsonResponse({ error: "Request must be approved before completion." }, 400, rateLimitHeaders(rl));
  }
  if (new Date(row.scheduled_for).getTime() > Date.now()) {
    return jsonResponse(
      { error: "The 30-day waiting period has not ended.", code: "too_early" },
      400,
      rateLimitHeaders(rl),
    );
  }
  if (await callerIsAdmin(admin, row.user_id)) {
    return jsonResponse({ error: "Admin accounts cannot be deleted this way." }, 403, rateLimitHeaders(rl));
  }

  const { error: deleteError } = await admin.auth.admin.deleteUser(row.user_id);
  if (deleteError) {
    console.error("account-deletion complete failed", deleteError);
    return jsonResponse({ error: "Could not delete the auth user." }, 500, rateLimitHeaders(rl));
  }

  await admin
    .from("account_deletion_requests")
    .update({
      status: "completed",
      completed_at: new Date().toISOString(),
      reviewed_by: adminId,
    })
    .eq("id", requestId);

  return jsonResponse({ success: true }, 200, rateLimitHeaders(rl));
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

async function sendMail(opts: {
  to: string;
  subject: string;
  html: string;
  text: string;
  purpose: string;
}): Promise<void> {
  const resendKey = (Deno.env.get("RESEND_API_KEY") || "").trim();
  const fromEmail =
    (Deno.env.get("RESEND_FROM_EMAIL") || "").trim() ||
    "Arxon <security@arxonchain.xyz>";
  if (!resendKey) {
    console.error("account-deletion missing RESEND_API_KEY", opts.purpose);
    return;
  }
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: fromEmail,
        to: [opts.to],
        subject: opts.subject,
        html: opts.html,
        text: opts.text,
      }),
    });
    const raw = await res.text().catch(() => "");
    console.log("account-deletion resend", { purpose: opts.purpose, status: res.status, snippet: raw.slice(0, 200) });
  } catch (e) {
    console.error("account-deletion mail failed", opts.purpose, e);
  }
}
