import type { SupabaseClient, User } from "@supabase/supabase-js";
import { getEmailConfirmRedirectUrl } from "./getRedirectUrl";
import { mapAuthError } from "./authErrors";
import { getSignupEmailRejection } from "./signupEmailPolicy";

type SignUpResult = { error: Error | null; user: User | null };

const ALREADY_REGISTERED =
  "An account already exists with this email — please log in.";

function toError(e: unknown, fallback = "Sign up failed"): Error {
  if (e instanceof Error) return e;
  const maybeMsg = (e as any)?.message || (e as any)?.error_description || (e as any)?.error;
  if (typeof maybeMsg === "string" && maybeMsg.trim()) return new Error(maybeMsg);
  return new Error(fallback);
}

/**
 * Sign up via GoTrue (same Turnstile path as sign-in).
 * Captcha is verified by Supabase Auth Attack Protection — not the auth-signup edge function.
 * Disposable domains are blocked client-side and by auth.users INSERT trigger.
 */
export async function signUpWithFallback(
  supabase: SupabaseClient,
  email: string,
  password: string,
  referralCode?: string,
  captchaToken?: string
): Promise<SignUpResult> {
  const normalizedEmail = email.trim().toLowerCase();
  const emailReject = getSignupEmailRejection(normalizedEmail);
  if (emailReject) {
    return { error: new Error(emailReject), user: null };
  }

  const timeoutMs = 45_000;
  const token = typeof captchaToken === "string" ? captchaToken.trim() : "";
  const ref = referralCode ? referralCode.trim().toUpperCase() : "";

  const signUpPromise = supabase.auth.signUp({
    email: normalizedEmail,
    password,
    options: {
      emailRedirectTo: getEmailConfirmRedirectUrl(),
      ...(token ? { captchaToken: token } : {}),
      ...(ref ? { data: { referral_code: ref } } : {}),
    },
  });

  try {
    const { data, error } = await Promise.race([
      signUpPromise,
      new Promise<never>((_, reject) => {
        setTimeout(() => {
          reject(new Error("Connection timed out. Please try again."));
        }, timeoutMs);
      }),
    ]);

    if (error) {
      const msg = error.message || "Sign up failed";
      if (/already exists|already registered|user already/i.test(msg)) {
        return { error: new Error(ALREADY_REGISTERED), user: null };
      }
      const friendly = mapAuthError(msg, "signup");
      return { error: new Error(friendly), user: null };
    }

    // GoTrue may return an empty identities array for existing emails (no leak).
    const identities = data.user?.identities;
    if (Array.isArray(identities) && identities.length === 0) {
      return { error: new Error(ALREADY_REGISTERED), user: null };
    }

    // No local session after signup — email confirmation required.
    await supabase.auth.signOut({ scope: "local" }).catch(() => {});
    return { error: null, user: data.user ?? null };
  } catch (e) {
    const friendly = mapAuthError(toError(e).message, "signup");
    return { error: new Error(friendly), user: null };
  }
}
