/** Dev-only preview routes — no auth, no app shell. */

export function normalizeAppPath(raw: string): string {
  const trimmed = raw.replace(/\/$/, '');
  return trimmed || '/';
}

/** Resolve the in-app path from pathname and optional HashRouter hash. */
export function resolveAppPath(
  pathname = typeof window !== 'undefined' ? window.location.pathname : '/',
  hash = typeof window !== 'undefined' ? window.location.hash : '',
): string {
  const hashPath = hash.startsWith('#/')
    ? normalizeAppPath(hash.slice(1).split('?')[0] ?? '/')
    : null;

  if (hashPath && hashPath !== '/') return hashPath;
  return normalizeAppPath(pathname || '/');
}

export function isDevPublicPath(path: string): boolean {
  return path === '/dev' || path.startsWith('/dev/');
}
