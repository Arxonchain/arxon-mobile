/** Turnstile tokens expire in ~5 minutes; reject stale tokens before submit. */
export const CAPTCHA_TOKEN_MAX_AGE_MS = 4 * 60 * 1000;

export function isCaptchaTokenStale(verifiedAtMs: number | null): boolean {
  if (verifiedAtMs == null || verifiedAtMs <= 0) return true;
  return Date.now() - verifiedAtMs > CAPTCHA_TOKEN_MAX_AGE_MS;
}

export function captchaStaleMessage(): string {
  return "Security check expired. Complete the verification again, then tap Create Account.";
}
