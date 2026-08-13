/** Map raw Supabase/auth errors to user-friendly messages. */
export function mapAuthError(message: string, context: "signin" | "signup" | "reset" = "signin"): string {
  const m = message.toLowerCase();

  if (m.includes("invalid login") || m.includes("invalid credentials")) {
    return "Invalid email or password. Please try again.";
  }
  if (m.includes("email not confirmed")) {
    return "Please check your email and confirm your account first.";
  }
  if (
    m.includes("already registered") ||
    m.includes("already exists") ||
    m.includes("user already") ||
    m.includes("please log in")
  ) {
    return "An account already exists with this email — please log in.";
  }
  if (m.includes("captcha") || m.includes("timeout-or-duplicate") || m.includes("invalid-input-response")) {
    return "Security check failed or expired. Complete the verification again, then retry.";
  }
  if (m.includes("signups not allowed") || m.includes("signup is disabled") || m.includes("disable_signup")) {
    return "Signups are currently disabled. Please try again later.";
  }
  if (m.includes("rate limit") || m.includes("too many") || m.includes("429")) {
    return "Too many attempts. Please wait a minute and try again.";
  }
  if (m.includes("password") && (m.includes("weak") || m.includes("short"))) {
    return message;
  }
  if (m.includes("network") || m.includes("failed to fetch") || m.includes("edge function")) {
    return "Connection failed. Please check your internet and try again.";
  }
  if (
    m.includes("timed out") ||
    m.includes("timeout") ||
    m.includes("504") ||
    m.includes("context deadline")
  ) {
    if (context === "signup") {
      return "The request took too long. Your account may still have been created — check your email, then try signing in.";
    }
    return "Connection timed out. Please try again.";
  }
  if (m.includes("server busy") || m.includes("503") || m.includes("502") || m.includes("gateway")) {
    return "Our servers are temporarily overloaded. Please wait a moment and try again.";
  }
  if (context === "reset" && m.includes("user not found")) {
    return "If an account exists for this email, a reset link has been sent.";
  }

  return message || "Something went wrong. Please try again.";
}
