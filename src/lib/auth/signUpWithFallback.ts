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
  return new Error(fallback);
}

/**
 * Sign up via auth-signup edge function.
 * That path creates the user + emails a branded /auth/confirm?token_hash link
 * (never *.supabase.co/auth/v1/verify).
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

  const invokePromise = supabase.functions.invoke("auth-signup", {
    body: {
      email: normalizedEmail,
      password,
      referral_code: referralCode ? referralCode.trim().toUpperCase() : undefined,
      captcha_token: token || undefined,
      redirect_to: getEmailConfirmRedirectUrl(),
    },
  });

  try {
    const result = await Promise.race([
      invokePromise,
      new Promise<never>((_, reject) => {
        setTimeout(() => {
          reject(new Error("Connection timed out. Please try again."));
        }, timeoutMs);
      }),
    ]);

    if (result.error) {
      const ctx = (result.error as any)?.context;
      let serverMsg = "";
      try {
        if (ctx && typeof ctx.json === "function") {
          const j = await ctx.json();
          serverMsg = j?.error || j?.message || "";
        } else if (typeof result.error.message === "string") {
          serverMsg = result.error.message;
        }
      } catch {
        serverMsg = result.error.message || "";
      }
      if (/already exists|already registered/i.test(serverMsg)) {
        return { error: new Error(ALREADY_REGISTERED), user: null };
      }
      const friendly = mapAuthError(serverMsg || toError(result.error).message, "signup");
      return { error: new Error(friendly), user: null };
    }

    const data = result.data as {
      success?: boolean;
      error?: string;
      code?: string;
      user?: User | null;
    } | null;

    if (!data?.success) {
      if (data?.code === "already_registered" || /already exists|already registered/i.test(data?.error || "")) {
        return { error: new Error(ALREADY_REGISTERED), user: null };
      }
      const friendly = mapAuthError(data?.error || "Sign up failed", "signup");
      return { error: new Error(friendly), user: null };
    }

    // No local session after signup — email confirmation required.
    await supabase.auth.signOut({ scope: "local" }).catch(() => {});
    return { error: null, user: data.user ?? null };
  } catch (e) {
    const friendly = mapAuthError(toError(e).message, "signup");
    return { error: new Error(friendly), user: null };
  }
}
