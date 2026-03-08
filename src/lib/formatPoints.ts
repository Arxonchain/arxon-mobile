/**
 * Format points for display - always whole numbers.
 * Handles edge cases like NaN, null, undefined, and very large numbers.
 * 
 * CRITICAL: This ensures UI always shows clean whole numbers,
 * preventing the display bugs where users see wrong point values.
 */
export function formatPoints(value: number | null | undefined): number {
  // Handle null/undefined
  if (value === null || value === undefined) {
    return 0;
  }

  // Handle NaN or non-numeric
  if (typeof value !== 'number' || isNaN(value)) {
    return 0;
  }

  // Handle Infinity
  if (!isFinite(value)) {
    return 0;
  }

  // Ensure non-negative
  const nonNegative = Math.max(0, value);

  // Round up to whole number (ceiling)
  const rounded = Math.ceil(nonNegative);

  // Cap at reasonable maximum to prevent display issues
  const capped = Math.min(rounded, 1_000_000_000);

  return capped;
}

/**
 * Format points for display with comma separators.
 * Example: 1234567 -> "1,234,567"
 */
export function formatPointsDisplay(value: number | null | undefined): string {
  const points = formatPoints(value);
  return points.toLocaleString('en-US');
}

/**
 * Format points with appropriate suffix for large numbers.
 * Example: 1234567 -> "1.23M"
 */
export function formatPointsCompact(value: number | null | undefined): string {
  const points = formatPoints(value);
  
  if (points >= 1_000_000) {
    return `${(points / 1_000_000).toFixed(2)}M`;
  }
  if (points >= 1_000) {
    return `${(points / 1_000).toFixed(1)}K`;
  }
  return points.toLocaleString('en-US');
}

/**
 * Validate and sanitize points from any source (API, cache, etc.)
 * Returns a clean object with all point values as whole numbers.
 */
export function sanitizeUserPoints<T>(data: T): T {
  if (!data || typeof data !== 'object') {
    return data;
  }

  const pointFields = [
    'total_points',
    'mining_points', 
    'task_points',
    'social_points',
    'referral_points',
  ];

  // Create a shallow copy to avoid mutating the original
  const result = { ...data } as T & Record<string, number>;

  for (const field of pointFields) {
    if (field in result && typeof (result as Record<string, unknown>)[field] === 'number') {
      (result as Record<string, number>)[field] = formatPoints((result as Record<string, number>)[field]);
    }
  }

  return result;
}
