/**
 * Parse https App Link / Universal Link URLs for auth confirm & password reset.
 * Used when Capacitor fires appUrlOpen / getLaunchUrl (HashRouter cannot see path URLs).
 */

const AUTH_APP_LINK_HOSTS = new Set([
  'arxonchain.xyz',
  'www.arxonchain.xyz',
  'arxon-mobile.pages.dev',
]);

/** sessionStorage key: implicit-flow hash body (access_token=… without leading #) */
export const AUTH_CALLBACK_HASH_STORAGE_KEY = 'arxon:authCallbackHash';

export type AuthAppLinkTarget = {
  /** In-app path for HashRouter navigate(), e.g. /auth/confirm?token_hash=… */
  pathWithSearch: string;
  /** Implicit Supabase hash fragment (no leading #), if present on the https URL */
  implicitHash?: string;
};

export function parseAuthAppLink(urlOrPath: string): AuthAppLinkTarget | null {
  try {
    const raw = urlOrPath.trim();
    if (!raw) return null;

    let url: URL;
    if (/^https?:\/\//i.test(raw) || raw.startsWith('//')) {
      url = new URL(raw);
    } else if (raw.startsWith('/') || raw.startsWith('#/')) {
      // Relative / already-hash paths — only accept auth routes
      const asPath = raw.startsWith('#') ? raw.slice(1) : raw;
      const fake = new URL(asPath, 'https://arxon-mobile.pages.dev');
      url = fake;
    } else {
      return null;
    }

    if (url.protocol === 'https:' || url.protocol === 'http:') {
      if (!AUTH_APP_LINK_HOSTS.has(url.hostname)) return null;
    }

    const pathname = (url.pathname || '/').replace(/\/+$/, '') || '/';
    if (pathname !== '/auth/confirm' && pathname !== '/reset-password') {
      return null;
    }

    // Supabase implicit tokens live in the https URL fragment (#access_token=…),
    // which is NOT a HashRouter route (#/auth/confirm).
    const frag = url.hash.startsWith('#') ? url.hash.slice(1) : '';
    const implicitHash =
      frag && !frag.startsWith('/') && (frag.includes('access_token') || frag.includes('error'))
        ? frag
        : undefined;

    return {
      pathWithSearch: `${pathname}${url.search}`,
      implicitHash,
    };
  } catch {
    return null;
  }
}

export function stashAuthCallbackHash(implicitHash: string | undefined): void {
  if (!implicitHash) return;
  try {
    sessionStorage.setItem(AUTH_CALLBACK_HASH_STORAGE_KEY, implicitHash);
  } catch {
    /* private mode / unavailable */
  }
}

export function takeStashedAuthCallbackHash(): string | null {
  try {
    const v = sessionStorage.getItem(AUTH_CALLBACK_HASH_STORAGE_KEY);
    if (v) sessionStorage.removeItem(AUTH_CALLBACK_HASH_STORAGE_KEY);
    return v;
  } catch {
    return null;
  }
}
