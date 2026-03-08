import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const secret = Deno.env.get("RECAPTCHA_SECRET_KEY");
    if (!secret) {
      console.error("Missing RECAPTCHA_SECRET_KEY secret");
      return new Response(JSON.stringify({ success: false, error: "Server misconfigured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const token = typeof body?.token === "string" ? body.token : "";

    if (!token) {
      return new Response(JSON.stringify({ success: false, error: "Missing token" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
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
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (e) {
    console.error("verify-recaptcha error", e);
    return new Response(JSON.stringify({ success: false, error: "Unexpected error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
