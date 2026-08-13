import type { SupabaseClient, User } from "@supabase/supabase-js";
import { getEmailConfirmRedirectUrl } from "./getRedirectUrl";
import { mapAuthError } from "./authErrors";

type SignUpResult = { error: Error | null; user: User | null };

const ALREADY_REGISTERED =
  "An account already exists with this email — please log in.";

function toError(e: unknown, fallback = "Sign up failed"): Error {
  if (e instanceof Error) return e;
  const maybeMsg = (e as any)?.message || (e as any)?.error_description || (e as any)?.error;
  if (typeof maybeMsg === "string" && maybeMsg.trim()) return new Error(maybeMsg);
  try {
    if (e && typeof e === "object") {
      const anyE = e as any;
      const snapshot = {
        name: anyE?.name,
        status: anyE?.status,
        code: anyE?.code,
        message: anyE?.message,
        error: anyE?.error,
        error_description: anyE?.error_description,
      };
      const str = JSON.stringify(snapshot);
      if (str && str !== "{}") return new Error(str);
    }
  } catch {
    // ignore
  }
  return new Error(fallback);
}

/**
 * Sign up via Supabase Auth (Resend SMTP / send-email hook delivers confirmation).
 * Does NOT fall back to admin auto-confirm — that skipped confirmation emails.
 */
export async function signUpWithFallback(
  supabase: SupabaseClient,
  email: string,
  password: string,
  referralCode?: string,
  captchaToken?: string
): Promise<SignUpResult> {
  const normalizedEmail = email.trim().toLowerCase();
  const timeoutMs = 45_000;

  const token = typeof captchaToken === "string" ? captchaToken.trim() : "";
  const signupPromise = supabase.auth.signUp({
    email: normalizedEmail,
    password,
    options: {
      emailRedirectTo: getEmailConfirmRedirectUrl(),
      data: referralCode ? { referral_code: referralCode.trim().toUpperCase() } : undefined,
      // Only send when present — empty/undefined must not become a bogus captcha payload.
      ...(token ? { captchaToken: token } : {}),
    },
  });

  try {
    const result = await Promise.race([
      signupPromise,
      new Promise<never>((_, reject) => {
        setTimeout(() => {
          reject(new Error("Connection timed out. Please try again."));
        }, timeoutMs);
      }),
    ]);

    if (result.error) {
      const friendly = mapAuthError(toError(result.error).message, "signup");
      return { error: new Error(friendly), user: null };
    }

    const user = result.data?.user ?? null;
    const session = result.data?.session ?? null;

    // Supabase anti-enumeration: existing email often returns 200 with empty identities.
    const identities = (user as { identities?: unknown[] } | null)?.identities;
    if (user && Array.isArray(identities) && identities.length === 0) {
      if (session) {
        await supabase.auth.signOut({ scope: "local" }).catch(() => {});
      }
      return { error: new Error(ALREADY_REGISTERED), user: null };
    }

    // Confirmation required: never keep a session from signup.
    if (session && !user?.email_confirmed_at) {
      await supabase.auth.signOut({ scope: "local" }).catch(() => {});
    }

    return { error: null, user };
  } catch (e) {
    const friendly = mapAuthError(toError(e).message, "signup");
    return { error: new Error(friendly), user: null };
  }
}
