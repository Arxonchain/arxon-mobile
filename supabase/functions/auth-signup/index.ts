import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import {
  checkRateLimit,
  rateLimitHeaders,
  rateLimitResponse,
  RATE_LIMITS,
} from "../_shared/rateLimiter.ts";

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

function mapSignupError(status: number, payload: Record<string, unknown> | null): {
  message: string;
  httpStatus: number;
} {
  const raw =
    (typeof payload?.msg === "string" && payload.msg) ||
    (typeof payload?.error_description === "string" && payload.error_description) ||
    (typeof payload?.error === "string" && payload.error) ||
    "Sign up failed";

  const lower = raw.toLowerCase();

  if (status === 429 || lower.includes("rate limit") || lower.includes("too many")) {
    return { message: "Too many signup attempts. Please wait a minute and try again.", httpStatus: 429 };
  }
  if (lower.includes("already registered") || lower.includes("already exists") || lower.includes("user already")) {
    return { message: "This email is already registered. Try signing in instead.", httpStatus: 422 };
  }
  if (status >= 500) {
    return { message: "Our servers are temporarily overloaded. Please try again shortly.", httpStatus: 503 };
  }

  return { message: raw, httpStatus: status };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ success: false, error: "Method not allowed" }, 405);
  }

  const ip = (req.headers.get("x-forwarded-for") ?? "unknown")
    .split(",")[0]
    .trim();
  const rl = checkRateLimit(`auth-signup:${ip}`, RATE_LIMITS.auth);
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

    console.log("auth-signup request", { email, ip });

    if (!email || !password) {
      return jsonResponse(
        { success: false, error: "Missing email or password" },
        400,
        rateLimitHeaders(rl)
      );
    }

    const SUPABASE_URL = (Deno.env.get("SUPABASE_URL") || "").trim().replace(/\/$/, "");
    const SUPABASE_ANON_KEY = (Deno.env.get("SUPABASE_ANON_KEY") || "").trim();
    const SITE_URL = (Deno.env.get("PUBLIC_SITE_URL") || "https://arxonchain.xyz")
      .trim()
      .replace(/\/+$/, "");

    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      console.error("auth-signup misconfigured: missing SUPABASE_URL or SUPABASE_ANON_KEY");
      return jsonResponse(
        { success: false, error: "Server misconfigured" },
        500,
        rateLimitHeaders(rl)
      );
    }

    const anonSegs = SUPABASE_ANON_KEY.split(".").filter(Boolean).length;
    if (anonSegs !== 3) {
      console.error("auth-signup misconfigured: SUPABASE_ANON_KEY is not a valid JWT", { anonSegs });
      return jsonResponse(
        { success: false, error: "Server misconfigured" },
        500,
        rateLimitHeaders(rl)
      );
    }

    // Standard signup so Supabase Auth sends the confirmation email via Custom SMTP (Resend).
    // GoTrue expects redirect_to as a query param (not nested options like supabase-js).
    const signupUrl =
      `${SUPABASE_URL}/auth/v1/signup?redirect_to=${encodeURIComponent(`${SITE_URL}/auth/confirm`)}`;
    const signupRes = await fetch(signupUrl, {
      method: "POST",
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email,
        password,
        data: referralCode ? { referral_code: referralCode } : undefined,
      }),
    });

    const signupRaw = await signupRes.text().catch(() => "");
    let signupJson: Record<string, unknown> | null = null;
    try {
      signupJson = signupRaw ? JSON.parse(signupRaw) : null;
    } catch {
      signupJson = null;
    }

    console.log("auth-signup result", {
      status: signupRes.status,
      snippet: signupRaw?.slice?.(0, 300) ?? "",
    });

    if (signupRes.ok) {
      return jsonResponse(
        {
          success: true,
          checkEmail: true,
          message: "Check your email to confirm your account.",
          user: signupJson?.user ?? null,
        },
        200,
        rateLimitHeaders(rl)
      );
    }

    const mapped = mapSignupError(signupRes.status, signupJson);
    return jsonResponse(
      { success: false, error: mapped.message },
      mapped.httpStatus,
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
