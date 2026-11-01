import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import {
  rateLimitHeaders,
  rateLimitResponse,
  RATE_LIMITS,
} from "../_shared/rateLimiter.ts";
import { checkRateLimitDurableKey } from "../_shared/rateLimiterDb.ts";
import { getSignupEmailRejection } from "../_shared/signupEmailPolicy.ts";
import {
  turnstileFailureMessage,
  verifyTurnstile,
} from "../_shared/verifyTurnstile.ts";

/**
 * Branded signup:
 * 1) Verify Turnstile
 * 2) Admin createUser (no Auth mailer / no *.supabase.co verify link)
 * 3) If the email already exists but is unconfirmed, reuse it and resend
 * 4) admin/generate_link → hashed_token
 * 5) Resend HTTP with https://{site}/auth/confirm?token_hash&type=signup
 *
 * Secrets: SUPABASE_SERVICE_ROLE_KEY (auto), RESEND_API_KEY, TURNSTILE_SECRET_KEY
 * Optional: RESEND_FROM_EMAIL, PUBLIC_SITE_URL
 */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type SignupBody = {
  email?: unknown;
  password?: unknown;
  referral_code?: unknown;
  captcha_token?: unknown;
  redirect_to?: unknown;
};

type AuthUser = {
  id?: unknown;
  email?: unknown;
  email_confirmed_at?: unknown;
  confirmed_at?: unknown;
};

function jsonResponse(
  body: unknown,
  status = 200,
  headers: Record<string, string> = {}
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      ...headers,
      "Content-Type": "application/json",
    },
  });
}

function allowedConfirmBase(raw: string): string {
  const fallback = "https://arxonchain.xyz/auth/confirm";
  const input = (raw || "").trim();
  if (!input) return fallback;
  try {
    const u = new URL(input.startsWith("http") ? input : `https://${input}`);
    u.protocol = "https:";
    const host = u.hostname.toLowerCase();
    const ok =
      host === "arxonchain.xyz" ||
      host === "www.arxonchain.xyz" ||
      host === "arxon-mobile.pages.dev" ||
      host === "localhost" ||
      host === "127.0.0.1";
    if (!ok) return fallback;
    u.pathname = "/auth/confirm";
    u.search = "";
    u.hash = "";
    return u.toString().replace(/\/$/, "");
  } catch {
    return fallback;
  }
}

function brandedConfirmUrl(base: string, tokenHash: string, type: string): string {
  const u = new URL(base);
  u.searchParams.set("token_hash", tokenHash);
  u.searchParams.set("type", type);
  return u.toString();
}

function adminHeaders(serviceRole: string): HeadersInit {
  return {
    apikey: serviceRole,
    Authorization: `Bearer ${serviceRole}`,
    "Content-Type": "application/json",
  };
}

function isConfirmed(user: AuthUser | null): boolean {
  if (!user) return false;
  return Boolean(user.email_confirmed_at || user.confirmed_at);
}

function errorText(json: Record<string, unknown> | null, raw: string): string {
  return String(
    json?.msg || json?.error_description || json?.error || raw || ""
  );
}

/**
 * Send via Mining App Resend only (Deno.env RESEND_API_KEY on oztccmrhiawleucdluwb).
 * Never call website / arxon-web Resend keys or cross-project relays.
 */
function deliveryErrorMessage(status: number, snippet: string): string {
  const s = snippet.toLowerCase();
  if (
    s.includes("verify your domain") ||
    s.includes("testing emails") ||
    s.includes("domain is not verified") ||
    s.includes("invalid `from`")
  ) {
    return "We could not deliver the confirmation email to that address. The sending domain is not verified for outbound mail.";
  }
  if (status === 429 || s.includes("rate")) {
    return "We could not send a confirmation email just now. Wait a minute, then try Create Account again.";
  }
  return "We could not send a confirmation email. Please try again in a few minutes.";
}

async function sendBrandedEmail(opts: {
  to: string;
  subject: string;
  html: string;
  text: string;
  purpose: string;
}): Promise<{ ok: boolean; status: number; snippet: string; id: string }> {
  const resendKey = (Deno.env.get("RESEND_API_KEY") || "").trim();
  const fromEmail =
    (Deno.env.get("RESEND_FROM_EMAIL") || "").trim() ||
    "Arxon <noreply@arxonchain.xyz>";
  if (!resendKey) {
    return { ok: false, status: 500, snippet: "RESEND_API_KEY missing", id: "" };
  }
  if (/supabase\.co\/auth\/v1\/verify/i.test(`${opts.html}\n${opts.text}`)) {
    return { ok: false, status: 400, snippet: "supabase_verify_link_forbidden", id: "" };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12_000);
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
      signal: controller.signal,
    });
    const raw = await res.text().catch(() => "");
    let json: Record<string, unknown> | null = null;
    try {
      json = raw ? (JSON.parse(raw) as Record<string, unknown>) : null;
    } catch {
      json = null;
    }
    const id = String(json?.id || "");
    console.log("auth-signup resend", {
      purpose: opts.purpose,
      status: res.status,
      toDomain: opts.to.split("@")[1] || "?",
      hasId: !!id,
    });
    return {
      ok: res.ok && !!id,
      status: res.status,
      snippet: String(json?.message || json?.error || raw).slice(0, 300),
      id,
    };
  } finally {
    clearTimeout(timeout);
  }
}

async function parseJson(
  res: Response
): Promise<{ raw: string; json: Record<string, unknown> | null }> {
  const raw = await res.text().catch(() => "");
  let json: Record<string, unknown> | null = null;
  try {
    json = raw ? (JSON.parse(raw) as Record<string, unknown>) : null;
  } catch {
    json = null;
  }
  return { raw, json };
}

async function findUserByEmail(
  supabaseUrl: string,
  serviceRole: string,
  email: string
): Promise<AuthUser | null> {
  const res = await fetch(
    `${supabaseUrl}/auth/v1/admin/users?page=1&per_page=200&email=${encodeURIComponent(email)}`,
    { headers: adminHeaders(serviceRole) }
  );
  const { json } = await parseJson(res);
  const users = Array.isArray(json?.users) ? (json.users as AuthUser[]) : [];
  const hit =
    users.find(
      (u) => String(u.email || "").trim().toLowerCase() === email
    ) || null;
  if (hit) return hit;

  // Some GoTrue versions return a single user object for ?email=
  if (json && String(json.email || "").trim().toLowerCase() === email) {
    return json as AuthUser;
  }
  return null;
}

async function deleteUser(
  supabaseUrl: string,
  serviceRole: string,
  userId: string
): Promise<void> {
  if (!userId) return;
  await fetch(`${supabaseUrl}/auth/v1/admin/users/${userId}`, {
    method: "DELETE",
    headers: adminHeaders(serviceRole),
  }).catch(() => {});
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return jsonResponse({ success: false, error: "Method not allowed" }, 405);
  }

  const ip = (req.headers.get("x-forwarded-for") ?? "unknown").split(",")[0].trim();
  const rl = await checkRateLimitDurableKey(`auth-signup:${ip}`, RATE_LIMITS.auth);
  if (!rl.allowed) {
    return rateLimitResponse(rl, corsHeaders);
  }

  try {
    const body = (await req.json().catch(() => ({}))) as SignupBody;
    const email =
      typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const password = typeof body.password === "string" ? body.password : "";
    const referralCode =
      typeof body.referral_code === "string"
        ? body.referral_code.trim().toUpperCase()
        : "";
    const captchaToken =
      typeof body.captcha_token === "string" ? body.captcha_token.trim() : "";
    const redirectTo =
      typeof body.redirect_to === "string" ? body.redirect_to.trim() : "";

    console.log("auth-signup request", {
      emailDomain: email.includes("@") ? email.split("@")[1] : "?",
      ip,
      hasCaptcha: !!captchaToken,
      redirectHost: (() => {
        try {
          return redirectTo ? new URL(redirectTo).host : "";
        } catch {
          return "";
        }
      })(),
    });

    if (!email || !password) {
      return jsonResponse(
        { success: false, error: "Missing email or password" },
        400,
        rateLimitHeaders(rl)
      );
    }
    if (password.length < 8) {
      return jsonResponse(
        { success: false, error: "Password must be at least 8 characters." },
        400,
        rateLimitHeaders(rl)
      );
    }

    const emailReject = getSignupEmailRejection(email);
    if (emailReject) {
      return jsonResponse(
        {
          success: false,
          error: emailReject,
          code: "email_blocked",
        },
        400,
        rateLimitHeaders(rl)
      );
    }

    const captcha = await verifyTurnstile(captchaToken, ip, {
      failClosed: true,
      logPrefix: "auth-signup",
    });
    if (!captcha.ok) {
      return jsonResponse(
        {
          success: false,
          error: turnstileFailureMessage(captcha.code),
          code:
            captcha.code === "missing_secret"
              ? "captcha_misconfigured"
              : "captcha_failed",
        },
        captcha.code === "missing_secret" ? 503 : 400,
        rateLimitHeaders(rl)
      );
    }

    const SUPABASE_URL = (Deno.env.get("SUPABASE_URL") || "").trim().replace(/\/$/, "");
    const SERVICE_ROLE = (Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "").trim();
    if (!SUPABASE_URL || !SERVICE_ROLE) {
      console.error("auth-signup misconfigured: missing SUPABASE_URL or SERVICE_ROLE");
      return jsonResponse(
        { success: false, error: "Server misconfigured" },
        500,
        rateLimitHeaders(rl)
      );
    }

    // Branded confirm host (App Links + inbox filters). Ignore pages.dev from the app.
    const confirmBase = allowedConfirmBase(
      Deno.env.get("PUBLIC_SITE_URL") || "https://arxonchain.xyz/auth/confirm"
    );
    const metadata = referralCode ? { referred_by_code: referralCode } : undefined;

    // 1) Create user without sending Auth's default ConfirmationURL email.
    const createRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
      method: "POST",
      headers: adminHeaders(SERVICE_ROLE),
      body: JSON.stringify({
        email,
        password,
        email_confirm: false,
        user_metadata: metadata,
      }),
    });
    const createParsed = await parseJson(createRes);
    const createJson = createParsed.json;
    const createMsg = errorText(createJson, createParsed.raw).toLowerCase();
    const alreadyExists =
      !createRes.ok &&
      (createRes.status === 422 ||
        createMsg.includes("already") ||
        createMsg.includes("registered") ||
        createMsg.includes("exists"));

    let userId = createRes.ok ? String(createJson?.id || "") : "";
    let createdNew = createRes.ok && !!userId;
    let userPayload: Record<string, unknown> | null = createRes.ok ? createJson : null;

    if (!createRes.ok && !alreadyExists) {
      console.error("auth-signup createUser failed", {
        status: createRes.status,
        snippet: createParsed.raw.slice(0, 240),
      });
      return jsonResponse(
        { success: false, error: "Sign up failed. Please try again." },
        400,
        rateLimitHeaders(rl)
      );
    }

    if (alreadyExists) {
      const existing = await findUserByEmail(SUPABASE_URL, SERVICE_ROLE, email);
      if (isConfirmed(existing)) {
        return jsonResponse(
          {
            success: false,
            error: "An account already exists with this email — please log in.",
            code: "already_registered",
          },
          422,
          rateLimitHeaders(rl)
        );
      }
      userId = existing?.id ? String(existing.id) : "";
      createdNew = false;
      userPayload = (existing as Record<string, unknown>) || null;

      if (userId) {
        await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${userId}`, {
          method: "PUT",
          headers: adminHeaders(SERVICE_ROLE),
          body: JSON.stringify({
            password,
            ...(metadata ? { user_metadata: metadata } : {}),
          }),
        }).catch(() => {});
      }
    }

    // 2) Generate token_hash without sending mail.
    const linkRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/generate_link`, {
      method: "POST",
      headers: adminHeaders(SERVICE_ROLE),
      body: JSON.stringify({
        type: "signup",
        email,
        password,
        redirect_to: confirmBase,
      }),
    });
    const linkParsed = await parseJson(linkRes);
    const linkJson = linkParsed.json;
    const properties =
      linkJson?.properties && typeof linkJson.properties === "object"
        ? (linkJson.properties as Record<string, unknown>)
        : null;
    const hashedToken = String(
      linkJson?.hashed_token || properties?.hashed_token || ""
    );
    const emailOtp = String(
      linkJson?.email_otp || properties?.email_otp || ""
    ).replace(/\s+/g, "");
    const linkMsg = errorText(linkJson, linkParsed.raw).toLowerCase();

    if (!linkRes.ok || !hashedToken) {
      if (
        linkMsg.includes("already") ||
        linkMsg.includes("registered") ||
        linkMsg.includes("confirmed")
      ) {
        return jsonResponse(
          {
            success: false,
            error: "An account already exists with this email — please log in.",
            code: "already_registered",
          },
          422,
          rateLimitHeaders(rl)
        );
      }
      console.error("auth-signup generate_link failed", {
        status: linkRes.status,
        snippet: linkParsed.raw.slice(0, 240),
      });
      if (createdNew && userId) {
        await deleteUser(SUPABASE_URL, SERVICE_ROLE, userId);
      }
      return jsonResponse(
        {
          success: false,
          error:
            "We could not send a confirmation email. Please try again in a few minutes.",
        },
        503,
        rateLimitHeaders(rl)
      );
    }

    const verifyUrl = brandedConfirmUrl(confirmBase, hashedToken, "signup");
    let linkHost = "";
    try {
      linkHost = new URL(verifyUrl).host;
    } catch {
      linkHost = "";
    }

    // Never ship supabase.co verify links.
    if (linkHost.endsWith("supabase.co")) {
      console.error("auth-signup refused supabase host in confirm link", { linkHost });
      if (createdNew && userId) {
        await deleteUser(SUPABASE_URL, SERVICE_ROLE, userId);
      }
      return jsonResponse(
        { success: false, error: "Server misconfigured" },
        500,
        rateLimitHeaders(rl)
      );
    }

    const otpBlock = emailOtp
      ? `<p>Your confirmation code:</p><p style="font-size:28px;letter-spacing:4px;font-weight:700">${emailOtp.replace(/</g, "")}</p>`
      : "";
    const html = `<div style="font-family:system-ui,sans-serif;line-height:1.5;color:#111">
  <h2>Confirm your email</h2>
  <p>Use this email to finish signing up for Arxon.</p>
  ${otpBlock}
  <p><a href="${verifyUrl.replace(/"/g, "&quot;")}" style="display:inline-block;background:#111;color:#fff;padding:12px 18px;border-radius:8px;text-decoration:none">Confirm email address</a></p>
  <p style="color:#666;font-size:13px;word-break:break-all">If the button does not work, open this link:<br/>${verifyUrl.replace(/</g, "&lt;")}</p>
  <p style="color:#666;font-size:13px">If you did not create an Arxon account, you can ignore this email.</p>
</div>`;
    const text = [
      emailOtp ? `Your Arxon confirmation code: ${emailOtp}` : "",
      `Confirm your Arxon email: ${verifyUrl}`,
      "",
      "If you did not create an account, ignore this email.",
    ]
      .filter(Boolean)
      .join("\n");

    const sent = await sendBrandedEmail({
      to: email,
      subject: "Confirm your Arxon account",
      html,
      text,
      purpose: createdNew ? "signup_confirm" : "signup_confirm_resend",
    });

    console.log("auth-signup branded mail", {
      ok: sent.ok,
      status: sent.status,
      linkHost,
      createdNew,
      snippet: sent.snippet.slice(0, 120),
    });

    if (!sent.ok) {
      if (createdNew && userId) {
        await deleteUser(SUPABASE_URL, SERVICE_ROLE, userId);
      }
      return jsonResponse(
        {
          success: false,
          error: deliveryErrorMessage(sent.status, sent.snippet),
        },
        503,
        rateLimitHeaders(rl)
      );
    }

    return jsonResponse(
      {
        success: true,
        checkEmail: true,
        message: "Check your email to confirm your account.",
        user: userPayload,
      },
      200,
      rateLimitHeaders(rl)
    );
  } catch (e) {
    console.error("auth-signup unexpected error", e);
    return jsonResponse(
      { success: false, error: "Something went wrong. Please try again." },
      500,
      rateLimitHeaders(rl)
    );
  }
});
