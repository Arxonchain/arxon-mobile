/**
 * Stale-While-Revalidate Cache Utility
 * Provides instant UI with cached data while fetching fresh data in background.
 * This is safe - only affects display speed, not data integrity.
 */

import { cacheGet, cacheSet } from './localCache';

export interface SWROptions {
  /** Maximum age before cache is considered stale (ms). Default: 30s */
  staleAfterMs?: number;
  /** Maximum age before cache is completely expired (ms). Default: 5min */
  expireAfterMs?: number;
  /** Callback when fresh data arrives */
  onFreshData?: (data: unknown) => void;
}

export interface SWRResult<T> {
  /** Cached data (if available) */
  data: T | null;
  /** Whether the cached data is stale */
  isStale: boolean;
  /** Whether cache was expired/missing */
  needsFetch: boolean;
}

/**
 * Gets data from cache with stale-while-revalidate semantics.
 * Returns cached data immediately if available, along with staleness info.
 */
export function swrGet<T>(
  key: string,
  options: SWROptions = {}
): SWRResult<T> {
  const { staleAfterMs = 30_000, expireAfterMs = 5 * 60_000 } = options;

  const cached = cacheGet<T>(key);
  
  if (!cached) {
    return { data: null, isStale: true, needsFetch: true };
  }

  const age = Date.now() - cached.savedAt;
  const isStale = age > staleAfterMs;
  const isExpired = age > expireAfterMs;

  if (isExpired) {
    return { data: null, isStale: true, needsFetch: true };
  }

  return {
    data: cached.data,
    isStale,
    needsFetch: isStale,
  };
}

/**
 * Sets data in cache
 */
export function swrSet<T>(key: string, data: T): void {
  cacheSet(key, data);
}

/**
 * Creates a SWR-enabled fetch function.
 * Returns cached data immediately while fetching fresh data in background.
 */
export function createSWRFetcher<T>(
  key: string,
  fetchFn: () => Promise<T>,
  options: SWROptions = {}
): () => Promise<{ cached: T | null; fresh: Promise<T> }> {
  return async () => {
    const { data: cached, needsFetch } = swrGet<T>(key, options);

    // Always start fresh fetch if stale/expired
    const freshPromise = needsFetch
      ? fetchFn().then((freshData) => {
          swrSet(key, freshData);
          options.onFreshData?.(freshData);
          return freshData;
        })
      : Promise.resolve(cached as T);

    return { cached, fresh: freshPromise };
  };
}

/**
 * Batch multiple SWR keys together for efficient checking.
 * Useful for components that need multiple cached values.
 */
export function swrGetMultiple<T extends Record<string, unknown>>(
  keys: { [K in keyof T]: string },
  options: SWROptions = {}
): { [K in keyof T]: SWRResult<T[K]> } {
  const results = {} as { [K in keyof T]: SWRResult<T[K]> };

  for (const [propKey, cacheKey] of Object.entries(keys)) {
    results[propKey as keyof T] = swrGet(cacheKey as string, options);
  }

  return results;
}
