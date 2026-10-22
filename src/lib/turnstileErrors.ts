/**
 * User-facing Turnstile copy. Public OTA must never show admin / hostname dumps.
 * @see https://developers.cloudflare.com/turnstile/troubleshooting/client-side-errors/error-codes/
 */

export function currentPageHostname(): string {
  if (typeof window === 'undefined') return '(unknown)';
  return window.location.hostname || '(unknown)';
}

export function isTurnstileHostnameError(errorCode?: string | null): boolean {
  return String(errorCode ?? '').trim() === '110200';
}

export function isTurnstileNetworkError(errorCode?: string | null): boolean {
  const code = String(errorCode ?? '').trim();
  return code === '200500' || code === 'script_load_failed' || code === 'timeout';
}

export function turnstileErrorMessage(errorCode?: string | null): string {
  const code = String(errorCode ?? '').trim();

  if (code === '110200') {
    return 'Security check could not start. Check your connection and try again.';
  }
  if (code === '110100' || code === '110110' || code === '400020' || code === '400070') {
    return 'Security check is unavailable. Try again in a moment.';
  }
  if (code === '200500' || code === 'script_load_failed') {
    return 'Security check could not load. Switch to Wi‑Fi, then retry.';
  }
  if (code === '110600' || code === '110620' || code === 'timeout') {
    return 'Security check timed out. Tap retry, then complete it again.';
  }
  if (code === '200100') {
    return 'Check that the phone date and time are automatic, then retry.';
  }
  return 'Security check failed. Check your connection, then retry.';
}
