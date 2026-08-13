import type { SupabaseClient, User } from "@supabase/supabase-js";
import { getEmailConfirmRedirectUrl } from "./getRedirectUrl";
import { mapAuthError } from "./authErrors";

type SignUpResult = { error: Error | null; user: User | null };

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
 * Sign up via Supabase Auth (Resend SMTP sends the confirmation email).
 * Does NOT fall back to auth-signup — that path auto-confirmed users and skipped emails.
 */
export async function signUpWithFallback(
  supabase: SupabaseClient,
  email: string,
  password: string
): Promise<SignUpResult> {
  const normalizedEmail = email.trim().toLowerCase();
  const timeoutMs = 45_000;

  const signupPromise = supabase.auth.signUp({
    email: normalizedEmail,
    password,
    options: {
      emailRedirectTo: getEmailConfirmRedirectUrl(),
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

    return { error: null, user: result.data?.user ?? null };
  } catch (e) {
    const friendly = mapAuthError(toError(e).message, "signup");
    return { error: new Error(friendly), user: null };
  }
}
