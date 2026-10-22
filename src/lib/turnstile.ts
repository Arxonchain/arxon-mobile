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

export function isTurnstileLocalHost(): boolean {
  if (typeof window === 'undefined') return false;
  const host = window.location.hostname;
  return host === 'localhost' || host === '127.0.0.1' || host === '0.0.0.0';
}

/** Play Store / public OTA / website — never the USB laptop preview. */
export function isPublicTurnstileHost(): boolean {
  if (typeof window === 'undefined') return false;
  const host = window.location.hostname;
  return (
    host === 'arxon-mobile.pages.dev' ||
    host === 'arxonchain.xyz' ||
    host === 'www.arxonchain.xyz' ||
    (host === 'localhost' && window.location.protocol === 'https:')
  );
}

/**
 * Debug APK USB live reload (`http://127.0.0.1:8080`). Play Store OTA is
 * `https://arxon-mobile.pages.dev` and must not use this branch.
 */
export function isUsbLiveOrigin(): boolean {
  if (typeof window === 'undefined') return false;
  const host = window.location.hostname;
  if (host === '127.0.0.1' || host === '0.0.0.0') return true;
  return host === 'localhost' && window.location.protocol === 'http:';
}

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

export const TURNSTILE_OTA_BRIDGE_ORIGIN = 'https://arxon-mobile.pages.dev';
export const TURNSTILE_OTA_BRIDGE_URL = `${TURNSTILE_OTA_BRIDGE_ORIGIN}/turnstile-bridge.html`;
