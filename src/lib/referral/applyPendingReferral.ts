import { supabase } from "@/integrations/supabase/client";

/**
 * Reads a pending referral code from sessionStorage, validates it,
 * and inserts a row into the referrals table.
 *
 * Safe to call multiple times — it clears the code on success or
 * if the user already has a referral, preventing duplicate inserts.
 */
export async function applyPendingReferralCode(): Promise<void> {
  let code: string | null = null;
  try {
    // Try localStorage first (persists across tabs/email confirmation redirects),
    // fall back to sessionStorage for backwards compatibility
    code = localStorage.getItem("arxon_referral_code") || sessionStorage.getItem("arxon_referral_code");
  } catch {
    return;
  }

  if (!code || !code.trim()) return;
  code = code.trim().toUpperCase();

  // Need an authenticated user
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  // Check if user already has a referral (don't apply twice)
  const { data: existing } = await supabase
    .from("referrals")
    .select("id")
    .eq("referred_id", user.id)
    .maybeSingle();

  if (existing) {
    // Already referred — clear the pending code
    try {
      localStorage.removeItem("arxon_referral_code");
      sessionStorage.removeItem("arxon_referral_code");
    } catch {}
    return;
  }

  // Find the referrer by code
  const { data: referrerProfile } = await supabase
    .from("profiles")
    .select("user_id")
    .eq("referral_code", code)
    .maybeSingle();

  if (!referrerProfile) {
    // Invalid code — clear it
    try {
      localStorage.removeItem("arxon_referral_code");
      sessionStorage.removeItem("arxon_referral_code");
    } catch {}
    return;
  }

  // Can't refer yourself
  if (referrerProfile.user_id === user.id) {
    try {
      localStorage.removeItem("arxon_referral_code");
      sessionStorage.removeItem("arxon_referral_code");
    } catch {}
    return;
  }

  // Insert referral record — the on_new_referral trigger handles points + boost
  const { error } = await supabase.from("referrals").insert({
    referrer_id: referrerProfile.user_id,
    referred_id: user.id,
    referral_code_used: code,
    points_awarded: 0, // trigger will set this to 100
  });

  if (!error) {
    try {
      localStorage.removeItem("arxon_referral_code");
      sessionStorage.removeItem("arxon_referral_code");
    } catch {}
    console.log("[referral] Applied referral code:", code);
  }
}
