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

async function invokeBody(
  error: unknown,
  data: unknown
): Promise<{ message: string; code?: string; success?: boolean; user?: User | null }> {
  if (data && typeof data === "object") {
    const d = data as Record<string, unknown>;
    if (d.error || d.message || d.success === true || d.success === false) {
      return {
        message: String(d.error || d.message || "Sign up failed"),
        code: typeof d.code === "string" ? d.code : undefined,
        success: d.success === true,
        user: (d.user as User) ?? null,
      };
    }
  }
  const ctx = (error as { context?: Response })?.context;
  if (ctx && typeof ctx.json === "function") {
    try {
      const body = (await ctx.json()) as Record<string, unknown>;
      return {
        message: String(body?.error || body?.message || toError(error).message),
        code: typeof body?.code === "string" ? body.code : undefined,
        success: body?.success === true,
        user: (body?.user as User) ?? null,
      };
    } catch {
      /* ignore */
    }
  }
  return { message: toError(error).message };
}

/**
 * Sign up only via branded auth-signup (admin create + Resend to the address
 * the user typed). Never fall back to GoTrue SMTP — that path returns success
 * without delivering mail.
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

  const brandedPromise = supabase.functions.invoke("auth-signup", {
    body: {
      email: normalizedEmail,
      password,
      referral_code: ref || undefined,
      captcha_token: token || undefined,
      redirect_to: getEmailConfirmRedirectUrl(),
    },
  });

  try {
    const { data, error } = await Promise.race([
      brandedPromise,
      new Promise<never>((_, reject) => {
        setTimeout(() => {
          reject(new Error("Connection timed out. Please try again."));
        }, timeoutMs);
      }),
    ]);

    const parsed = await invokeBody(error, data);
    if (!error && parsed.success) {
      await supabase.auth.signOut({ scope: "local" }).catch(() => {});
      return { error: null, user: parsed.user ?? null };
    }

    const raw = parsed.message || error?.message || "Sign up failed";
    if (parsed.code === "already_registered" || /already exists|already registered|please log in/i.test(raw)) {
      return { error: new Error(ALREADY_REGISTERED), user: null };
    }

    return { error: new Error(mapAuthError(raw, "signup")), user: null };
  } catch (e) {
    return { error: new Error(mapAuthError(toError(e).message, "signup")), user: null };
  }
}
