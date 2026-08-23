import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { requireAdminOrService, adminAuthResponse } = await import("../_shared/adminAuth.ts");
    const { enqueueDistributeRewardsJob } = await import("../_shared/backgroundJobs.ts");
    const { runDistributeRewards } = await import("../_shared/runDistributeRewards.ts");

    const auth = await requireAdminOrService(req);
    if (!auth.ok) return adminAuthResponse(auth);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const db = createClient(supabaseUrl, supabaseServiceKey);

    const body = await req.json().catch(() => ({}));
    const { action, dry_run = true, queue = false } = body;

    if (!action) {
      return new Response(
        JSON.stringify({ error: "action required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const payload = {
      action,
      dry_run: dry_run !== false,
      emails: body.emails as string[] | undefined,
    };

    if (queue && !dry_run) {
      const queued = await enqueueDistributeRewardsJob(
        auth.supabase,
        payload,
        supabaseUrl,
        supabaseServiceKey,
      );
      if (queued.error) throw new Error(queued.error);
      return new Response(
        JSON.stringify({
          success: true,
          queued: true,
          job_id: queued.jobId,
          action,
          dry_run: false,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const result = await runDistributeRewards(db, payload);
    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Distribute rewards error:", message);
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
