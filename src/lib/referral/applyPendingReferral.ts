import { supabase } from "@/integrations/supabase/client";

const MAX_ATTEMPTS = 5;
const RETRY_DELAY_MS = 800;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Reads a pending referral code from localStorage (or sessionStorage as fallback),
 * validates it, and inserts a row into the referrals table.
 *
 * Safe to call multiple times — clears the code on success or if already referred.
 * Retries up to MAX_ATTEMPTS times so transient network errors don't silently drop referrals.
 *
 * IMPORTANT: Must only be called AFTER the user has a valid session (after email confirmation).
 */
export async function applyPendingReferralCode(): Promise<void> {
  let code: string | null = null;
  try {
    // Try localStorage first (persists across tabs/email confirmation redirects),
    // fall back to sessionStorage for backwards compatibility
    code =
      localStorage.getItem("arxon_referral_code") ||
      sessionStorage.getItem("arxon_referral_code");
  } catch {
    return;
  }

  if (!code || !code.trim()) return;
  code = code.trim().toUpperCase();

  // Need an authenticated user — if no session yet, bail (caller must retry after session exists)
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
    _clearCode();
    return;
  }

  // Find the referrer by code
  const { data: referrerProfile } = await supabase
    .from("profiles")
    .select("user_id")
    .eq("referral_code", code)
    .maybeSingle();

  if (!referrerProfile) {
    // Invalid code — clear it so we don't retry forever
    _clearCode();
    return;
  }

  // Can't refer yourself
  if (referrerProfile.user_id === user.id) {
    _clearCode();
    return;
  }

  // Insert with retries — the on_new_referral trigger sets points_awarded = 100 instantly
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const { error } = await supabase.from("referrals").insert({
      referrer_id: referrerProfile.user_id,
      referred_id: user.id,
      referral_code_used: code,
      points_awarded: 0, // trigger sets this to 100 immediately on insert
    });

    if (!error) {
      _clearCode();
      console.log("[referral] Applied referral code:", code);
      return;
    }

    // 23505 = unique_violation — row already inserted concurrently, treat as success
    if ((error as any).code === "23505") {
      _clearCode();
      return;
    }

    console.warn(
      `[referral] Insert attempt ${attempt + 1} failed:`,
      error.message
    );
    await sleep(RETRY_DELAY_MS * (attempt + 1));
  }
}

function _clearCode() {
  try {
    localStorage.removeItem("arxon_referral_code");
    sessionStorage.removeItem("arxon_referral_code");
  } catch {}
}
