import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import {
  rateLimitHeaders,
  rateLimitResponse,
  RATE_LIMITS,
} from "../_shared/rateLimiter.ts";
import { checkRateLimitDurableKey } from "../_shared/rateLimiterDb.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const ip = (req.headers.get("x-forwarded-for") ?? "unknown").split(",")[0].trim();
  const rl = await checkRateLimitDurableKey(`verify-recaptcha:${ip}`, RATE_LIMITS.auth);
  if (!rl.allowed) {
    return rateLimitResponse(rl, corsHeaders);
  }

  try {
    const secret = Deno.env.get("RECAPTCHA_SECRET_KEY");
    if (!secret) {
      console.error("Missing RECAPTCHA_SECRET_KEY secret");
      return new Response(JSON.stringify({ success: false, error: "Server misconfigured" }), {
        status: 500,
        headers: { ...corsHeaders, ...rateLimitHeaders(rl), "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const token = typeof body?.token === "string" ? body.token : "";

    if (!token) {
      return new Response(JSON.stringify({ success: false, error: "Missing token" }), {
        status: 400,
        headers: { ...corsHeaders, ...rateLimitHeaders(rl), "Content-Type": "application/json" },
      });
    }

    const params = new URLSearchParams();
    params.set("secret", secret);
    params.set("response", token);

    const verifyRes = await fetch("https://www.google.com/recaptcha/api/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params.toString(),
    });

    const verifyJson = await verifyRes.json();

    const success = Boolean(verifyJson?.success);
    const hostname = verifyJson?.hostname ?? null;
    const challengeTs = verifyJson?.challenge_ts ?? null;
    const errorCodes = verifyJson?.["error-codes"] ?? null;

    console.log("reCAPTCHA verify result", {
      success,
      hostname,
      challengeTs,
      errorCodes,
    });

    return new Response(
      JSON.stringify({
        success,
        hostname,
        challenge_ts: challengeTs,
        errorCodes,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, ...rateLimitHeaders(rl), "Content-Type": "application/json" },
      },
    );
  } catch (e) {
    console.error("verify-recaptcha error", e);
    return new Response(JSON.stringify({ success: false, error: "Unexpected error" }), {
      status: 500,
      headers: { ...corsHeaders, ...rateLimitHeaders(rl), "Content-Type": "application/json" },
    });
  }
});
