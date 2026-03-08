import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "No auth" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get user from token
    const anonClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!);
    const { data: { user }, error: userError } = await anonClient.auth.getUser(
      authHeader.replace("Bearer ", "")
    );

    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if country already set
    const { data: profile } = await supabase
      .from("profiles")
      .select("country_code")
      .eq("user_id", user.id)
      .maybeSingle();

    if (profile?.country_code) {
      return new Response(JSON.stringify({ country_code: profile.country_code, already_set: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Detect country from IP using free API
    const clientIp =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("cf-connecting-ip") ||
      req.headers.get("x-real-ip") ||
      "";

    let country = "Unknown";
    let countryCode = "XX";

    try {
      // Try ip-api.com (free, no key needed)
      const geoRes = await fetch(`http://ip-api.com/json/${clientIp}?fields=country,countryCode`);
      if (geoRes.ok) {
        const geo = await geoRes.json();
        if (geo.countryCode && geo.countryCode !== "") {
          country = geo.country;
          countryCode = geo.countryCode;
        }
      }
    } catch {
      console.log("Geo lookup failed, using fallback");
    }

    // If IP lookup failed, try accepting from body
    if (countryCode === "XX") {
      try {
        const body = await req.json();
        if (body.country_code && body.country) {
          countryCode = body.country_code;
          country = body.country;
        }
      } catch {
        // no body
      }
    }

    // Update profile
    if (countryCode !== "XX") {
      await supabase
        .from("profiles")
        .update({ country, country_code: countryCode })
        .eq("user_id", user.id);
    }

    return new Response(
      JSON.stringify({ country, country_code: countryCode, updated: countryCode !== "XX" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err?.message || 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
