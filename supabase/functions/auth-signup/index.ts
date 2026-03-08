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

    console.log("auth-signup request", { email, ip });

    if (!email || !password) {
      return jsonResponse(
        { success: false, error: "Missing email or password" },
        400,
        rateLimitHeaders(rl)
      );
    }

    // Use the proper environment variable names that Supabase provides
    const SUPABASE_URL = (Deno.env.get("SUPABASE_URL") || "").trim().replace(/\/$/, "");
    const SERVICE_ROLE_KEY = (Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "").trim();
    const SUPABASE_ANON_KEY = (Deno.env.get("SUPABASE_ANON_KEY") || "").trim();

    // Debug log environment state (never log actual keys!)
    console.log("auth-signup env check", {
      hasUrl: !!SUPABASE_URL,
      urlLen: SUPABASE_URL?.length ?? 0,
      hasServiceKey: !!SERVICE_ROLE_KEY,
      serviceKeyLen: SERVICE_ROLE_KEY?.length ?? 0,
      serviceKeySegments: (SERVICE_ROLE_KEY || "").split(".").filter(Boolean).length,
      hasAnonKey: !!SUPABASE_ANON_KEY,
      anonKeyLen: SUPABASE_ANON_KEY?.length ?? 0,
      anonKeySegments: (SUPABASE_ANON_KEY || "").split(".").filter(Boolean).length,
    });

    if (!SUPABASE_URL || !SERVICE_ROLE_KEY || !SUPABASE_ANON_KEY) {
      console.error(
        "auth-signup misconfigured: missing SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, or SUPABASE_ANON_KEY"
      );
      return jsonResponse(
        { success: false, error: "Server misconfigured" },
        500,
        rateLimitHeaders(rl)
      );
    }

    // Validate service role key looks like a JWT (3 segments)
    const serviceSegs = SERVICE_ROLE_KEY.split(".").filter(Boolean).length;
    if (serviceSegs !== 3) {
      console.error("auth-signup misconfigured: SUPABASE_SERVICE_ROLE_KEY is not a valid JWT", { serviceSegs });
      return jsonResponse(
        { success: false, error: "Server misconfigured" },
        500,
        rateLimitHeaders(rl)
      );
    }

    // Validate anon key looks like a JWT (3 segments)
    const anonSegs = SUPABASE_ANON_KEY.split(".").filter(Boolean).length;
    if (anonSegs !== 3) {
      console.error("auth-signup misconfigured: SUPABASE_ANON_KEY is not a valid JWT", { anonSegs });
      return jsonResponse(
        { success: false, error: "Server misconfigured" },
        500,
        rateLimitHeaders(rl)
      );
    }

    // Use Admin API to create + auto-confirm user (bypasses overloaded /signup)
    const adminCreateUrl = `${SUPABASE_URL}/auth/v1/admin/users`;
    const adminRes = await fetch(adminCreateUrl, {
      method: "POST",
      headers: {
        // Both headers use service role key for admin endpoint
        "apikey": SERVICE_ROLE_KEY,
        "Authorization": `Bearer ${SERVICE_ROLE_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, password, email_confirm: true }),
    });

    const adminRaw = await adminRes.text().catch(() => "");
    let adminJson: any = null;
    try {
      adminJson = adminRaw ? JSON.parse(adminRaw) : null;
    } catch {
      adminJson = null;
    }

    console.log("auth-signup admin create result", {
      status: adminRes.status,
      snippet: adminRaw?.slice?.(0, 300) ?? "",
    });

    // Accept: created (200/201), already exists (422/409)
    if (!adminRes.ok && ![400, 409, 422].includes(adminRes.status)) {
      const isTransient = adminRes.status >= 500 || adminRes.status === 429;
      return jsonResponse(
        {
          success: false,
          error: isTransient
            ? "Server busy"
            : (adminJson?.msg || adminJson?.error || "Sign up failed"),
        },
        isTransient ? 503 : adminRes.status,
        rateLimitHeaders(rl)
      );
    }

    // Exchange credentials for session token
    const tokenUrl = `${SUPABASE_URL}/auth/v1/token?grant_type=password`;
    const tokenRes = await fetch(tokenUrl, {
      method: "POST",
      headers: {
        // Token exchange must use the public/anon key.
        "apikey": SUPABASE_ANON_KEY,
        "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, password }),
    });

    const tokenRaw = await tokenRes.text().catch(() => "");
    let tokenJson: any = null;
    try {
      tokenJson = tokenRaw ? JSON.parse(tokenRaw) : null;
    } catch {
      tokenJson = null;
    }

    if (tokenRes.ok && tokenJson?.access_token && tokenJson?.refresh_token) {
      return jsonResponse(
        { success: true, session: tokenJson },
        200,
        rateLimitHeaders(rl)
      );
    }

    console.error("auth-signup token failed", {
      status: tokenRes.status,
      snippet: tokenRaw?.slice?.(0, 300) ?? "",
    });

    const isTransient = tokenRes.status >= 500 || tokenRes.status === 429;
    return jsonResponse(
      {
        success: false,
        error: isTransient
          ? "Server busy"
          : (tokenJson?.error_description || tokenJson?.error || "Sign up failed"),
      },
      isTransient ? 503 : tokenRes.status,
      rateLimitHeaders(rl)
    );
  } catch (e) {
    console.error("auth-signup unexpected error", e);
    return jsonResponse(
      { success: false, error: "Server busy" },
      503,
      rateLimitHeaders(rl)
    );
  }
});
