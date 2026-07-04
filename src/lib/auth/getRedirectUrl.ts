/**
 * Returns the appropriate redirect URL for auth callbacks.
 * On native Capacitor, always use the production Pages URL so email links
 * match Supabase allowlist (not capacitor:// or transient WebView origins).
 */
import { Capacitor } from '@capacitor/core';

const PRODUCTION_APP_ORIGIN = 'https://arxon-mobile.pages.dev';

export function getAuthRedirectUrl(path = "/"): string {
  const origin = Capacitor.isNativePlatform()
    ? PRODUCTION_APP_ORIGIN
    : window.location.origin;
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${origin}${normalizedPath}`;
}

/**
 * Returns the password reset redirect URL.
 * IMPORTANT: Route through /auth/confirm so we can reliably exchange PKCE codes,
 * token_hash links, and legacy OTP tokens before showing /reset-password.
 */
export function getPasswordResetRedirectUrl(): string {
  // Route through /auth/confirm; it will detect type=recovery and forward to /reset-password.
  // NOTE: Avoid query-string based redirects (e.g. ?next=...) because some auth configs
  // whitelist only exact callback paths.
  return getAuthRedirectUrl("/auth/confirm");
}

/**
 * Returns the email confirmation redirect URL
 */
export function getEmailConfirmRedirectUrl(): string {
  return getAuthRedirectUrl("/auth/confirm?next=/");
}

/**
 * Returns the magic-link redirect URL for password change flow.
 * The user clicks a magic link → lands on /auth/confirm → goes to /change-password
 */
export function getMagicLinkRedirectUrl(): string {
  // Route through /auth/confirm; it will detect type=magiclink and forward to /change-password.
  // NOTE: Avoid query-string based redirects (e.g. ?next=...) because some auth configs
  // whitelist only exact callback paths.
  return getAuthRedirectUrl("/auth/confirm");
}
