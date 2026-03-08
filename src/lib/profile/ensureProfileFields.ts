import { supabase } from "@/integrations/supabase/client";

type EnsureProfileFieldsResult = {
  referral_code?: string;
  nexus_address?: string;
};

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Ensures the current user's profile has a referral_code and nexus_address.
 *
 * Why this exists:
 * - Some accounts can end up with a valid profile row but missing derived fields.
 * - The UI relies on these fields (Referrals + Nexus pages).
 *
 * This runs client-side but only writes to the CURRENT user's profile (RLS-safe).
 */
export async function ensureProfileFields(
  userId: string,
  opts?: { usernameHint?: string | null }
): Promise<EnsureProfileFieldsResult | null> {
  const { data: profile, error } = await supabase
    .from("profiles")
    .select("user_id, username, referral_code, nexus_address")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    // Don't throw: callers should keep UI responsive.
    return null;
  }

  // If the profile row doesn't exist (rare), create it.
  if (!profile) {
    await supabase.from("profiles").insert({ user_id: userId });
  }

  const next: EnsureProfileFieldsResult = {};
  const nowIso = new Date().toISOString();

  // Referral code: generate + set if missing.
  if (!profile?.referral_code) {
    for (let attempt = 0; attempt < 5; attempt++) {
      const { data: generated } = await supabase.rpc("generate_referral_code" as any);
      const code = String(generated || "").trim();
      if (!code) continue;

      const { error: updateError } = await supabase
        .from("profiles")
        .update({ referral_code: code, updated_at: nowIso })
        .eq("user_id", userId);

      if (!updateError) {
        next.referral_code = code;
        break;
      }

      await sleep(150);
    }
  }

  // Nexus address: generate + set if missing.
  if (!profile?.nexus_address) {
    const username = profile?.username ?? opts?.usernameHint ?? "user";
    for (let attempt = 0; attempt < 5; attempt++) {
      const { data: generated } = await supabase.rpc("generate_nexus_address" as any, {
        p_username: username,
      });
      const address = String(generated || "").trim();
      if (!address) continue;

      const { error: updateError } = await supabase
        .from("profiles")
        .update({ nexus_address: address, updated_at: nowIso })
        .eq("user_id", userId);

      if (!updateError) {
        next.nexus_address = address;
        break;
      }

      await sleep(150);
    }
  }

  return Object.keys(next).length ? next : null;
}
