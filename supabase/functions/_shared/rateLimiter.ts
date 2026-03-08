/**
 * Simple in-memory rate limiter for Edge Functions.
 * Tracks request counts per key (e.g., user ID, IP) within sliding windows.
 * 
 * NOTE: This is per-isolate memory, so it won't persist across cold starts.
 * For strict rate limiting at scale, use Redis or a database-backed solution.
 * This provides "best effort" protection against rapid bursts.
 */

interface RateLimitEntry {
  count: number;
  windowStart: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();

// Clean up old entries periodically to prevent memory leaks
const CLEANUP_INTERVAL = 60_000; // 1 minute
let lastCleanup = Date.now();

function cleanup(windowMs: number): void {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL) return;
  
  lastCleanup = now;
  const cutoff = now - windowMs * 2; // Keep entries for 2x window duration
  
  for (const [key, entry] of rateLimitStore.entries()) {
    if (entry.windowStart < cutoff) {
      rateLimitStore.delete(key);
    }
  }
}

export interface RateLimitConfig {
  /** Maximum requests allowed within the window */
  maxRequests: number;
  /** Window duration in milliseconds */
  windowMs: number;
}

export interface RateLimitResult {
  /** Whether the request is allowed */
  allowed: boolean;
  /** Remaining requests in current window */
  remaining: number;
  /** When the window resets (Unix timestamp ms) */
  resetAt: number;
  /** How many ms until reset */
  retryAfterMs: number;
}

/**
 * Check if a request should be rate limited.
 * 
 * @param key - Unique identifier (user ID, IP, etc.)
 * @param config - Rate limit configuration
 * @returns Rate limit result
 */
export function checkRateLimit(
  key: string,
  config: RateLimitConfig
): RateLimitResult {
  const { maxRequests, windowMs } = config;
  const now = Date.now();
  
  // Cleanup old entries occasionally
  cleanup(windowMs);
  
  let entry = rateLimitStore.get(key);
  
  // Reset window if expired
  if (!entry || now - entry.windowStart >= windowMs) {
    entry = { count: 0, windowStart: now };
    rateLimitStore.set(key, entry);
  }
  
  const resetAt = entry.windowStart + windowMs;
  const retryAfterMs = Math.max(0, resetAt - now);
  
  // Check if within limit
  if (entry.count >= maxRequests) {
    return {
      allowed: false,
      remaining: 0,
      resetAt,
      retryAfterMs,
    };
  }
  
  // Increment counter and allow
  entry.count++;
  
  return {
    allowed: true,
    remaining: Math.max(0, maxRequests - entry.count),
    resetAt,
    retryAfterMs,
  };
}

/**
 * Creates rate limit headers for HTTP responses.
 */
export function rateLimitHeaders(result: RateLimitResult): Record<string, string> {
  return {
    'X-RateLimit-Remaining': String(result.remaining),
    'X-RateLimit-Reset': String(Math.ceil(result.resetAt / 1000)),
    ...(result.allowed ? {} : { 'Retry-After': String(Math.ceil(result.retryAfterMs / 1000)) }),
  };
}

/**
 * Returns a 429 Too Many Requests response with proper headers.
 */
export function rateLimitResponse(
  result: RateLimitResult,
  corsHeaders: Record<string, string> = {}
): Response {
  return new Response(
    JSON.stringify({
      error: 'Too many requests',
      retryAfterMs: result.retryAfterMs,
    }),
    {
      status: 429,
      headers: {
        ...corsHeaders,
        ...rateLimitHeaders(result),
        'Content-Type': 'application/json',
      },
    }
  );
}

// Common presets for different function types
export const RATE_LIMITS = {
  /** Standard API calls: 60 requests per minute */
  standard: { maxRequests: 60, windowMs: 60_000 } as RateLimitConfig,
  /** Expensive operations (scans, etc.): 10 per minute */
  expensive: { maxRequests: 10, windowMs: 60_000 } as RateLimitConfig,
  /** Authentication: 10 per minute */
  auth: { maxRequests: 10, windowMs: 60_000 } as RateLimitConfig,
  /** Batch operations: 5 per minute */
  batch: { maxRequests: 5, windowMs: 60_000 } as RateLimitConfig,
} as const;
