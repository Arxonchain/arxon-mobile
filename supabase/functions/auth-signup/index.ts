import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import {
  rateLimitHeaders,
  rateLimitResponse,
  RATE_LIMITS,
} from "../_shared/rateLimiter.ts";
import { checkRateLimitDurableKey } from "../_shared/rateLimiterDb.ts";
import { getSignupEmailRejection } from "../_shared/signupEmailPolicy.ts";

/**
 * Branded signup:
 * 1) Admin createUser (no Auth mailer / no *.supabase.co verify link)
 * 2) admin/generate_link → hashed_token
 * 3) Resend HTTP with https://{site}/auth/confirm?token_hash&type=signup
 *
 * Secrets: SUPABASE_SERVICE_ROLE_KEY (auto), RESEND_API_KEY
 * Optional: RESEND_FROM_EMAIL, PUBLIC_SITE_URL, TURNSTILE_SECRET_KEY
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

async function verifyTurnstile(token: string, ip: string): Promise<boolean> {
  const secret = (Deno.env.get("TURNSTILE_SECRET_KEY") || "").trim();
  if (!secret) {
    // Fail closed in production — set ALLOW_SIGNUP_WITHOUT_TURNSTILE=true only for local dev.
    return Deno.env.get("ALLOW_SIGNUP_WITHOUT_TURNSTILE") === "true";
  }
  if (!token) return false;
  const body = new URLSearchParams();
  body.set("secret", secret);
  body.set("response", token);
  if (ip && ip !== "unknown") body.set("remoteip", ip);
  const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  const json = (await res.json().catch(() => null)) as { success?: boolean } | null;
  return !!json?.success;
}

/**
 * Send via Mining App Resend only (Deno.env RESEND_API_KEY on oztccmrhiawleucdluwb).
 * Never call website / arxon-web Resend keys or cross-project relays.
 */
async function sendBrandedEmail(opts: {
  to: string;
  subject: string;
  html: string;
  text: string;
  purpose: string;
}): Promise<{ ok: boolean; status: number; snippet: string }> {
  const resendKey = (Deno.env.get("RESEND_API_KEY") || "").trim();
  const fromEmail =
    (Deno.env.get("RESEND_FROM_EMAIL") || "").trim() ||
    "Arxon <security@arxonchain.xyz>";
  if (!resendKey) {
    return { ok: false, status: 500, snippet: "RESEND_API_KEY missing" };
  }
  if (/supabase\.co\/auth\/v1\/verify/i.test(`${opts.html}\n${opts.text}`)) {
    return { ok: false, status: 400, snippet: "supabase_verify_link_forbidden" };
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
    console.log("auth-signup resend", {
      purpose: opts.purpose,
      status: res.status,
      toDomain: opts.to.split("@")[1] || "?",
    });
    return { ok: res.ok, status: res.status, snippet: raw.slice(0, 300) };
  } finally {
    clearTimeout(timeout);
  }
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

    const captchaOk = await verifyTurnstile(captchaToken, ip);
    if (!captchaOk) {
      return jsonResponse(
        {
          success: false,
          error:
            "Security check failed or expired. Complete the verification again, then retry.",
          code: "captcha_failed",
        },
        400,
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

    const confirmBase = allowedConfirmBase(
      redirectTo || Deno.env.get("PUBLIC_SITE_URL") || "https://arxonchain.xyz/auth/confirm"
    );

    // 1) Create user without sending Auth's default ConfirmationURL email.
    const createRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
      method: "POST",
      headers: {
        apikey: SERVICE_ROLE,
        Authorization: `Bearer ${SERVICE_ROLE}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email,
        password,
        email_confirm: false,
        user_metadata: referralCode ? { referral_code: referralCode } : undefined,
      }),
    });
    const createRaw = await createRes.text().catch(() => "");
    let createJson: Record<string, unknown> | null = null;
    try {
      createJson = createRaw ? JSON.parse(createRaw) : null;
    } catch {
      createJson = null;
    }

    if (!createRes.ok) {
      const msg = String(
        createJson?.msg ||
          createJson?.error_description ||
          createJson?.error ||
          createRaw ||
          "Sign up failed"
      ).toLowerCase();
      if (
        createRes.status === 422 ||
        msg.includes("already") ||
        msg.includes("registered") ||
        msg.includes("exists")
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
      console.error("auth-signup createUser failed", {
        status: createRes.status,
        snippet: createRaw.slice(0, 240),
      });
      return jsonResponse(
        { success: false, error: "Sign up failed. Please try again." },
        400,
        rateLimitHeaders(rl)
      );
    }

    const userId = String(createJson?.id || "");

    // 2) Generate token_hash without sending mail.
    const linkRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/generate_link`, {
      method: "POST",
      headers: {
        apikey: SERVICE_ROLE,
        Authorization: `Bearer ${SERVICE_ROLE}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        type: "signup",
        email,
        password,
        redirect_to: confirmBase,
      }),
    });
    const linkRaw = await linkRes.text().catch(() => "");
    let linkJson: Record<string, unknown> | null = null;
    try {
      linkJson = linkRaw ? JSON.parse(linkRaw) : null;
    } catch {
      linkJson = null;
    }
    const hashedToken = String(linkJson?.hashed_token || "");
    if (!linkRes.ok || !hashedToken) {
      console.error("auth-signup generate_link failed", {
        status: linkRes.status,
        snippet: linkRaw.slice(0, 240),
      });
      if (userId) {
        await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${userId}`, {
          method: "DELETE",
          headers: {
            apikey: SERVICE_ROLE,
            Authorization: `Bearer ${SERVICE_ROLE}`,
          },
        }).catch(() => {});
      }
      return jsonResponse(
        {
          success: false,
          error: "Email delivery is temporarily unavailable. Please try again in a few minutes.",
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
      return jsonResponse(
        { success: false, error: "Server misconfigured" },
        500,
        rateLimitHeaders(rl)
      );
    }

    const html = `<div style="font-family:system-ui,sans-serif;line-height:1.5;color:#111">
  <h2>Confirm your email</h2>
  <p>Follow the link below to confirm this email address and finish signing up for Arxon.</p>
  <p><a href="${verifyUrl.replace(/"/g, "&quot;")}" style="display:inline-block;background:#111;color:#fff;padding:12px 18px;border-radius:8px;text-decoration:none">Confirm email address</a></p>
  <p style="color:#666;font-size:13px;word-break:break-all">If the button does not work, open this link:<br/>${verifyUrl.replace(/</g, "&lt;")}</p>
  <p style="color:#666;font-size:13px">If you did not create an Arxon account, you can ignore this email.</p>
</div>`;
    const text = `Confirm your Arxon email:\n${verifyUrl}\n\nIf you did not create an account, ignore this email.`;

    const sent = await sendBrandedEmail({
      to: email,
      subject: "Confirm your Arxon account",
      html,
      text,
      purpose: "signup_confirm",
    });

    console.log("auth-signup branded mail", {
      ok: sent.ok,
      status: sent.status,
      linkHost,
      snippet: sent.snippet.slice(0, 120),
    });

    if (!sent.ok) {
      if (userId) {
        await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${userId}`, {
          method: "DELETE",
          headers: {
            apikey: SERVICE_ROLE,
            Authorization: `Bearer ${SERVICE_ROLE}`,
          },
        }).catch(() => {});
      }
      return jsonResponse(
        {
          success: false,
          error: "Email delivery is temporarily unavailable. Please try again in a few minutes.",
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
        user: createJson,
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
