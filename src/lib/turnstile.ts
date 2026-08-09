/**
 * Cloudflare Turnstile configuration.
 *
 * Site keys are public (safe in client bundles). The matching SECRET belongs only in
 * Supabase Dashboard → Authentication → Attack Protection — never in this repo.
 *
 * Production auth requires captchaToken whenever Supabase CAPTCHA is enabled.
 * We keep a public fallback so CI/host builds that omit `.env` still embed the key
 * (live arxonchain.xyz previously shipped Turnstile code with an empty site key).
 */
const PUBLIC_FALLBACK_SITE_KEY = '0x4AAAAAAELKREYgfx_ebd18';

export const TURNSTILE_SITE_KEY =
  (import.meta.env.VITE_TURNSTILE_SITE_KEY as string | undefined)?.trim() ||
  PUBLIC_FALLBACK_SITE_KEY;

export function isTurnstileConfigured(): boolean {
  return TURNSTILE_SITE_KEY.length > 0;
}

/**
 * Hostnames that MUST be listed on the Turnstile widget Hostname Management allowlist.
 *
 * Capacitor OTA loads the UI from https://arxon-mobile.pages.dev — that exact hostname
 * must be present (adding only arxonchain.xyz is not enough).
 *
 * `localhost` is required for CAPACITOR_BUNDLE_LOCAL store builds (WebView origin
 * https://localhost). Wildcards are NOT supported in Turnstile hostname fields.
 *
 * Steps (Cloudflare Dashboard):
 * 1. Turnstile → select the widget matching this sitekey
 * 2. Settings → Hostname Management → Add Hostnames
 * 3. Add each entry below (no https://, no path)
 */
export const TURNSTILE_REQUIRED_HOSTNAMES = [
  'arxonchain.xyz',
  'www.arxonchain.xyz',
  'arxon-mobile.pages.dev',
  'localhost',
] as const;
