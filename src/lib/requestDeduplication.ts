/**
 * Request Deduplication Utility
 * Prevents duplicate concurrent requests for the same resource
 * This is safe - only affects network efficiency, not business logic
 */

type InflightRequest<T> = Promise<T>;

const inflightRequests = new Map<string, InflightRequest<unknown>>();

/**
 * Deduplicates concurrent requests with the same key.
 * If a request with the same key is already in flight, returns that promise.
 * Otherwise, executes the request and caches it until complete.
 */
export async function deduplicatedRequest<T>(
  key: string,
  requestFn: () => Promise<T>
): Promise<T> {
  // Check if there's already an in-flight request
  const existing = inflightRequests.get(key);
  if (existing) {
    return existing as Promise<T>;
  }

  // Create new request and track it
  const request = requestFn().finally(() => {
    // Clean up after request completes (success or error)
    inflightRequests.delete(key);
  });

  inflightRequests.set(key, request);
  return request;
}

/**
 * Creates a debounced version of an async function.
 * Useful for preventing rapid successive calls (e.g., on visibility change + focus)
 */
export function createDebouncedFetch<T>(
  fetchFn: () => Promise<T>,
  delayMs: number = 1000
): () => void {
  let timeoutId: number | null = null;
  let lastCallTime = 0;

  return () => {
    const now = Date.now();
    
    // If called too soon after last call, debounce
    if (now - lastCallTime < delayMs) {
      if (timeoutId) window.clearTimeout(timeoutId);
      timeoutId = window.setTimeout(() => {
        lastCallTime = Date.now();
        void fetchFn();
      }, delayMs);
    } else {
      // Execute immediately
      lastCallTime = now;
      void fetchFn();
    }
  };
}

/**
 * Throttles a function to only execute once per interval.
 * Unlike debounce, this guarantees execution at the leading edge.
 */
export function throttle<T extends (...args: unknown[]) => unknown>(
  fn: T,
  intervalMs: number
): (...args: Parameters<T>) => void {
  let lastExecution = 0;
  let pendingArgs: Parameters<T> | null = null;
  let timeoutId: number | null = null;

  return (...args: Parameters<T>) => {
    const now = Date.now();
    const timeSinceLastExecution = now - lastExecution;

    if (timeSinceLastExecution >= intervalMs) {
      // Execute immediately
      lastExecution = now;
      fn(...args);
    } else {
      // Schedule for later
      pendingArgs = args;
      if (!timeoutId) {
        timeoutId = window.setTimeout(() => {
          if (pendingArgs) {
            lastExecution = Date.now();
            fn(...pendingArgs);
            pendingArgs = null;
          }
          timeoutId = null;
        }, intervalMs - timeSinceLastExecution);
      }
    }
  };
}
