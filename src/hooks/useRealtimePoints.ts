/**
 * useRealtimePoints.ts — ENH-16 (deprecated)
 *
 * Realtime user_points is handled once globally by PointsProvider (usePoints).
 * This hook is kept as a no-op so existing imports do not create duplicate channels.
 */
export function useRealtimePoints() {
  // PointsProvider already subscribes to user_points for the signed-in user.
}
