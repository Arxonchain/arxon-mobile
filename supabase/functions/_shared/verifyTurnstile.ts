/**
 * Cloudflare Turnstile server-side verification.
 * @see https://developers.cloudflare.com/turnstile/get-started/server-side-validation/
 */

export type TurnstileVerifyCode =
  | "ok"
  | "missing_secret"
  | "missing_token"
  | "invalid_token"
  | "expired"
  | "duplicate"
  | "verify_error";

export type TurnstileVerifyResult = {
  ok: boolean;
  code: TurnstileVerifyCode;
  /** Raw Cloudflare error-codes (safe to log). */
  errorCodes: string[];
};

type SiteVerifyResponse = {
  success?: boolean;
  "error-codes"?: string[];
};

function resolveSecret(): string {
  return (
    (Deno.env.get("TURNSTILE_SECRET_KEY") || "").trim() ||
    (Deno.env.get("TURNSTILE_SECRET") || "").trim()
  );
}

function mapErrorCodes(codes: string[]): TurnstileVerifyCode {
  if (codes.includes("timeout-or-duplicate")) return "duplicate";
  if (codes.includes("invalid-input-response")) return "invalid_token";
  if (codes.some((c) => c.includes("timeout"))) return "expired";
  return "invalid_token";
}

/** User-facing copy keyed by verify result code. */
export function turnstileFailureMessage(code: TurnstileVerifyCode): string {
  switch (code) {
    case "missing_token":
      return "Complete the security check below, then tap Create Account.";
    case "duplicate":
      return "Security check already used. Complete a fresh verification, then try again.";
    case "expired":
      return "Security check expired. Complete the verification again, then tap Create Account.";
    case "missing_secret":
      return "Signup is temporarily unavailable. Please try again in a few minutes.";
    default:
      return "Security check failed. Complete the verification again, then tap Create Account.";
  }
}

/**
 * Verify a Turnstile token with Cloudflare siteverify.
 *
 * When no secret is configured:
 * - failClosed=true (signup): reject unless ALLOW_SIGNUP_WITHOUT_TURNSTILE=true
 * - failClosed=false (recover): accept (legacy; prefer setting the secret)
 */
export async function verifyTurnstile(
  token: string,
  ip: string,
  opts: { failClosed?: boolean; logPrefix?: string } = {},
): Promise<TurnstileVerifyResult> {
  const failClosed = opts.failClosed ?? true;
  const logPrefix = opts.logPrefix ?? "turnstile";
  const secret = resolveSecret();
  const trimmed = (token || "").trim();

  if (!secret) {
    const allowDev = Deno.env.get("ALLOW_SIGNUP_WITHOUT_TURNSTILE") === "true";
    if (!failClosed || allowDev) {
      console.warn(`${logPrefix}: TURNSTILE_SECRET_KEY not set — skipping verification`);
      return { ok: true, code: "ok", errorCodes: [] };
    }
    console.error(`${logPrefix}: TURNSTILE_SECRET_KEY missing — rejecting (fail closed)`);
    return { ok: false, code: "missing_secret", errorCodes: ["missing-input-secret"] };
  }

  if (!trimmed) {
    return { ok: false, code: "missing_token", errorCodes: ["missing-input-response"] };
  }

  const body = new URLSearchParams();
  body.set("secret", secret);
  body.set("response", trimmed);
  if (ip && ip !== "unknown") body.set("remoteip", ip);

  try {
    const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });
    const json = (await res.json().catch(() => null)) as SiteVerifyResponse | null;
    const errorCodes = Array.isArray(json?.["error-codes"]) ? json!["error-codes"]! : [];

    if (json?.success) {
      return { ok: true, code: "ok", errorCodes: [] };
    }

    const code = mapErrorCodes(errorCodes);
    console.warn(`${logPrefix}: siteverify failed`, {
      code,
      errorCodes,
      httpStatus: res.status,
      tokenLen: trimmed.length,
    });
    return { ok: false, code, errorCodes };
  } catch (e) {
    console.error(`${logPrefix}: siteverify request failed`, e);
    return { ok: false, code: "verify_error", errorCodes: ["internal-error"] };
  }
}
