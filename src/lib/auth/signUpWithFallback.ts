import type { SupabaseClient, User } from "@supabase/supabase-js";
import { getEmailConfirmRedirectUrl } from "./getRedirectUrl";

type SignUpResult = { error: Error | null; user: User | null };

function toError(e: unknown, fallback = "Sign up failed"): Error {
  if (e instanceof Error) return e;
  const maybeMsg = (e as any)?.message || (e as any)?.error_description || (e as any)?.error;
  if (typeof maybeMsg === "string" && maybeMsg.trim()) return new Error(maybeMsg);
  // As a last resort, include a compact JSON snapshot so we don't lose the real cause.
  // (Supabase sometimes returns non-Error objects with useful fields.)
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

function looksTransient(msg: string) {
  const m = msg.toLowerCase();
  return (
    m.includes("timeout") ||
    m.includes("timed out") ||
    m.includes("server busy") ||
    m.includes("too many") ||
    m.includes("rate limit") ||
    m.includes("429") ||
    m.includes("503") ||
    m.includes("504") ||
    m.includes("gateway") ||
    m.includes("context deadline") ||
    m.includes("failed to fetch")
  );
}

function looksLikeExistingUser(msg: string) {
  const m = msg.toLowerCase();
  return (
    m.includes("already registered") ||
    m.includes("already exists") ||
    m.includes("user already")
  );
}

/**
 * Simple, direct signup with extended timeout.
 * This is the most reliable approach when backend is under load.
 */
export async function signUpWithFallback(
  supabase: SupabaseClient,
  email: string,
  password: string
): Promise<SignUpResult> {
  const normalizedEmail = email.trim().toLowerCase();

  const invokeAuthSignup = async (): Promise<SignUpResult> => {
    try {
      // Edge function returns: { success: boolean, session?: { access_token, refresh_token, user? }, error?: string }
      const { data, error } = await supabase.functions.invoke("auth-signup", {
        body: { email: normalizedEmail, password },
      });

      if (error) return { error: toError(error, "Sign up failed"), user: null };
      const anyData = data as any;

      if (!anyData?.success || !anyData?.session?.access_token || !anyData?.session?.refresh_token) {
        const msg =
          typeof anyData?.error === "string" && anyData.error.trim()
            ? anyData.error
            : "Sign up failed";
        return { error: new Error(msg), user: null };
      }

      // Persist session locally
      await supabase.auth.setSession({
        access_token: anyData.session.access_token,
        refresh_token: anyData.session.refresh_token,
      });

      const user = (anyData.session.user as User | undefined) ?? null;
      return { error: null, user };
    } catch (e) {
      return { error: toError(e, "Sign up failed"), user: null };
    }
  };

  // Use a promise with timeout that doesn't abort the actual request
  // This prevents the "stuck loading" issue while still allowing the signup to complete
  const timeoutMs = 60_000; // 60 seconds - allows for slow backend
  
  const signupPromise = supabase.auth.signUp({
    email: normalizedEmail,
    password,
    options: {
      emailRedirectTo: getEmailConfirmRedirectUrl(),
    },
  });

  try {
    // Create a timeout that rejects if signup takes too long
    const result = await Promise.race([
      signupPromise,
      new Promise<never>((_, reject) => {
        setTimeout(() => {
          reject(new Error("Connection timed out. Please try again."));
        }, timeoutMs);
      }),
    ]);

    if (result.error) {
      const err = toError(result.error, "Sign up failed");
      
      if (looksLikeExistingUser(err.message)) {
        return { error: new Error("This email is already registered. Try signing in instead."), user: null };
      }
      
      // Check for timeout-like errors from Supabase
      const msg = err.message.toLowerCase();
      if (msg.includes("timeout") || msg.includes("504") || msg.includes("context deadline")) {
        // Try the admin-backed fallback, then surface a friendly message if it fails.
        const fallback = await invokeAuthSignup();
        if (!fallback.error) return fallback;
        return { error: new Error("Server is busy. Please wait a moment and try again."), user: null };
      }

      // Common hard-block config errors
      if (msg.includes("signups not allowed") || msg.includes("signup is disabled") || msg.includes("disable_signup")) {
        return { error: new Error("Signups are currently disabled on the backend."), user: null };
      }

      // If we got a transient/network-style failure, try the admin-backed fallback.
      if (looksTransient(err.message)) {
        const fallback = await invokeAuthSignup();
        if (!fallback.error) return fallback;
      }
      
      return { error: err, user: null };
    }

    return { error: null, user: result.data?.user ?? null };
  } catch (e) {
    const err = toError(e, "Sign up failed");
    const msg = err.message.toLowerCase();
    
    // If our client-side timeout fired, prefer the admin-backed fallback.
    if (msg.includes("timed out") || msg.includes("timeout")) {
      const fallback = await invokeAuthSignup();
      if (!fallback.error) return fallback;
      return { error: new Error("Connection timed out. Please try again."), user: null };
    }
    
    return { error: err, user: null };
  }
}
