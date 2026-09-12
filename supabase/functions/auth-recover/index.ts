import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import {
  rateLimitHeaders,
  rateLimitResponse,
  RATE_LIMITS,
} from "../_shared/rateLimiter.ts";
import { checkRateLimitDurableKey } from "../_shared/rateLimiterDb.ts";
import {
  turnstileFailureMessage,
  verifyTurnstile,
} from "../_shared/verifyTurnstile.ts";

/**
 * Branded password recovery email (no *.supabase.co/auth/v1/verify links).
 * Uses admin generate_link + Mining App RESEND_API_KEY (never website Resend).
 */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type Body = {
  email?: unknown;
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
    console.log("auth-recover resend", {
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
  const rl = await checkRateLimitDurableKey(`auth-recover:${ip}`, RATE_LIMITS.auth);
  if (!rl.allowed) {
    return rateLimitResponse(rl, corsHeaders);
  }

  try {
    const body = (await req.json().catch(() => ({}))) as Body;
    const email =
      typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const captchaToken =
      typeof body.captcha_token === "string" ? body.captcha_token.trim() : "";
    const redirectTo =
      typeof body.redirect_to === "string" ? body.redirect_to.trim() : "";

    if (!email) {
      return jsonResponse(
        { success: false, error: "Missing email" },
        400,
        rateLimitHeaders(rl)
      );
    }

    const captcha = await verifyTurnstile(captchaToken, ip, {
      failClosed: true,
      logPrefix: "auth-recover",
    });
    if (!captcha.ok) {
      return jsonResponse(
        {
          success: false,
          error: turnstileFailureMessage(captcha.code),
          code: captcha.code === "missing_secret" ? "captcha_misconfigured" : "captcha_failed",
        },
        captcha.code === "missing_secret" ? 503 : 400,
        rateLimitHeaders(rl)
      );
    }

    const SUPABASE_URL = (Deno.env.get("SUPABASE_URL") || "").trim().replace(/\/$/, "");
    const SERVICE_ROLE = (Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "").trim();
    if (!SUPABASE_URL || !SERVICE_ROLE) {
      return jsonResponse(
        { success: false, error: "Server misconfigured" },
        500,
        rateLimitHeaders(rl)
      );
    }

    const confirmBase = allowedConfirmBase(
      redirectTo ||
        Deno.env.get("PUBLIC_SITE_URL") ||
        "https://arxonchain.xyz/auth/confirm"
    );

    // Anti-enumeration: always return success-shaped response after work.
    const linkRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/generate_link`, {
      method: "POST",
      headers: {
        apikey: SERVICE_ROLE,
        Authorization: `Bearer ${SERVICE_ROLE}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        type: "recovery",
        email,
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
    if (linkRes.ok && hashedToken) {
      const u = new URL(confirmBase);
      u.searchParams.set("token_hash", hashedToken);
      u.searchParams.set("type", "recovery");
      const verifyUrl = u.toString();

      const html = `<div style="font-family:system-ui,sans-serif;line-height:1.5;color:#111">
  <h2>Reset your password</h2>
  <p>We received a request to reset your Arxon password. Follow the link below to choose a new one.</p>
  <p><a href="${verifyUrl.replace(/"/g, "&quot;")}" style="display:inline-block;background:#111;color:#fff;padding:12px 18px;border-radius:8px;text-decoration:none">Reset password</a></p>
  <p style="color:#666;font-size:13px;word-break:break-all">If the button does not work, open this link:<br/>${verifyUrl.replace(/</g, "&lt;")}</p>
  <p style="color:#666;font-size:13px">If you didn't request this, you can safely ignore this email.</p>
</div>`;
      const text = `Reset your Arxon password:\n${verifyUrl}\n\nIf you didn't request this, ignore this email.`;

      const sent = await sendBrandedEmail({
        to: email,
        subject: "Reset your Arxon password",
        html,
        text,
        purpose: "password_recovery",
      });
      console.log("auth-recover branded mail", {
        ok: sent.ok,
        status: sent.status,
        host: u.host,
        snippet: sent.snippet.slice(0, 120),
      });
    } else {
      console.log("auth-recover generate_link soft-fail", {
        status: linkRes.status,
        snippet: linkRaw.slice(0, 160),
      });
    }

    return jsonResponse(
      {
        success: true,
        message: "If an account exists for that email, a reset link has been sent.",
      },
      200,
      rateLimitHeaders(rl)
    );
  } catch (e) {
    console.error("auth-recover unexpected error", e);
    return jsonResponse(
      { success: false, error: "Something went wrong. Please try again." },
      500,
      rateLimitHeaders(rl)
    );
  }
});
