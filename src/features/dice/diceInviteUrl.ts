import { Capacitor } from '@capacitor/core';

/** Build a shareable in-app path that works for BrowserRouter (web) and HashRouter (native). */
export function buildDiceInviteUrl(lobbyPath: string, code: string): string {
  const path = lobbyPath.startsWith('/') ? lobbyPath : `/${lobbyPath}`;
  const qs = `?code=${encodeURIComponent(code.trim().toUpperCase())}`;
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  if (Capacitor.isNativePlatform()) {
    return `${origin}/#${path}${qs}`;
  }
  return `${origin}${path}${qs}`;
}
