export type CacheEnvelope<T> = {
  v: 1;
  savedAt: number;
  data: T;
};

export const cacheSet = <T>(key: string, data: T) => {
  try {
    const payload: CacheEnvelope<T> = { v: 1, savedAt: Date.now(), data };
    localStorage.setItem(key, JSON.stringify(payload));
  } catch {
    // ignore storage errors (private mode, quota, etc.)
  }
};

export const cacheGet = <T>(
  key: string,
  opts?: { maxAgeMs?: number }
): { data: T; savedAt: number } | null => {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CacheEnvelope<T>;
    if (!parsed || parsed.v !== 1 || !parsed.savedAt) return null;

    if (opts?.maxAgeMs && Date.now() - parsed.savedAt > opts.maxAgeMs) {
      return null;
    }

    return { data: parsed.data, savedAt: parsed.savedAt };
  } catch {
    return null;
  }
};

/**
 * Remove a specific key from cache
 */
export const cacheRemove = (key: string): void => {
  try {
    localStorage.removeItem(key);
  } catch {
    // ignore errors
  }
};

/**
 * Clear all cache entries matching a prefix
 */
export const cacheClearPrefix = (prefix: string): void => {
  try {
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(prefix)) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach((key) => localStorage.removeItem(key));
  } catch {
    // ignore errors
  }
};

/**
 * Check if a cached value exists and is fresh (not stale)
 */
export const cacheIsFresh = (key: string, maxAgeMs: number): boolean => {
  const cached = cacheGet(key);
  if (!cached) return false;
  return Date.now() - cached.savedAt < maxAgeMs;
};

/**
 * Get cached data with automatic staleness check.
 * Returns data along with whether it's stale.
 */
export const cacheGetWithStaleness = <T>(
  key: string,
  staleAfterMs: number
): { data: T | null; isStale: boolean; age: number } => {
  const cached = cacheGet<T>(key);
  if (!cached) {
    return { data: null, isStale: true, age: Infinity };
  }
  const age = Date.now() - cached.savedAt;
  return {
    data: cached.data,
    isStale: age > staleAfterMs,
    age,
  };
};
