/**
 * Map Cloudflare Turnstile client error codes to actionable copy.
 * @see https://developers.cloudflare.com/turnstile/troubleshooting/client-side-errors/error-codes/
 */

import { TURNSTILE_REQUIRED_HOSTNAMES } from '@/lib/turnstile';

export function currentPageHostname(): string {
  if (typeof window === 'undefined') return '(unknown)';
  return window.location.hostname || '(unknown)';
}

/** True when the widget reported domain-not-authorized (110200). */
export function isTurnstileHostnameError(errorCode?: string | null): boolean {
  return String(errorCode ?? '').trim() === '110200';
}

/** True for iframe/network-style Turnstile failures. */
export function isTurnstileNetworkError(errorCode?: string | null): boolean {
  const code = String(errorCode ?? '').trim();
  return (
    code === '200500' ||
    code === 'script_load_failed' ||
    code === 'timeout'
  );
}

/**
 * User-facing message for Turnstile widget failures.
 * 110200 cannot be fixed in-app — admin must add the page hostname in Cloudflare.
 */
export function turnstileErrorMessage(errorCode?: string | null): string {
  const code = String(errorCode ?? '').trim();
  const host = currentPageHostname();

  if (code === '110200') {
    return (
      `This page's hostname is not authorized for Cloudflare Turnstile (${host}). ` +
      `Admin: Cloudflare Dashboard → Turnstile → your widget → Hostname Management → add ` +
      `"${host}"` +
      (host === 'arxon-mobile.pages.dev'
        ? ''
        : ` (OTA app requires arxon-mobile.pages.dev)`) +
      `. Also keep: ${TURNSTILE_REQUIRED_HOSTNAMES.join(', ')}.`
    );
  }

  if (code === '110100' || code === '110110' || code === '400020') {
    return `Invalid Turnstile site key (${code}). Check the widget sitekey in Cloudflare and the app build.`;
  }

  if (code === '400070') {
    return 'Turnstile site key is disabled in the Cloudflare dashboard.';
  }

  if (code === '200500' || code === 'script_load_failed') {
    return (
      'Your mobile network may be blocking Cloudflare security checks (challenges.cloudflare.com). ' +
      'Try Wi‑Fi or another network, then Retry. You can also open https://arxon-mobile.pages.dev in your phone browser on the same connection.'
    );
  }

  if (code === '110600' || code === '110620' || code === 'timeout') {
    return 'Verification timed out. Tap Retry, then complete the check again.';
  }

  if (code === '200100') {
    return 'Device clock or cache problem. Check that the date/time is automatic, then Retry.';
  }

  if (code) {
    return (
      `Verification failed (${code}). If this keeps happening, your network may block Cloudflare challenges — try Wi‑Fi, then Retry.`
    );
  }

  return 'Verification failed. Check your connection, then Retry.';
}
