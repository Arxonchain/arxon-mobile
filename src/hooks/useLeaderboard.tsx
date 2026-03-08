import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { cacheGet, cacheSet } from '@/lib/localCache';
import { throttle } from '@/lib/requestDeduplication';
import { formatPoints } from '@/lib/formatPoints';

interface LeaderboardEntry {
  user_id: string;
  total_points: number;
  daily_streak: number;
  username?: string;
  avatar_url?: string;
  rank: number;
}

// Leaderboard feels "broken" without periodic refresh.
// Keep a lightweight poll *only while tab is visible*.
// NOTE: if 100k users sit on the leaderboard page simultaneously, any polling cadence will be expensive.
const POLL_MS = 120_000; // 2 minutes (reduced from 10s to save egress)
const WAKE_THROTTLE_MS = 5000; // Prevent rapid fire on visibility + focus events

export const useLeaderboard = (limit: number = 100) => {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const mountedRef = useRef(true);
  const inFlightRef = useRef(false);

  const cacheKey = `arxon:leaderboard:miners:v6:${limit}`;

  const fetchLeaderboard = useCallback(async () => {
    if (inFlightRef.current) return;
    inFlightRef.current = true;

    try {
      // Fetch both sources in parallel
      const [minerRes, arenaRes] = await Promise.all([
        supabase
          .from('leaderboard_view')
          .select('user_id, username, avatar_url, total_points, daily_streak')
          .limit(limit * 2), // fetch more so merging doesn't miss anyone
        supabase
          .from('arena_team_leaderboard')
          .select('user_id, username, avatar_url, total_staked, net_profit')
          .limit(limit * 2),
      ]);

      if (!mountedRef.current) return;

      // Build a map of arena scores keyed by user_id
      // Arena score = total_staked + net_profit (same logic as Arena page)
      const arenaScoreMap = new Map<string, number>();
      for (const entry of arenaRes.data || []) {
        if (!entry.user_id) continue;
        const score = Math.floor(
          Math.max(0, Number(entry.total_staked || 0) + Number(entry.net_profit || 0))
        );
        arenaScoreMap.set(entry.user_id, score);
      }

      // Merge: for every miner entry, add their arena score on top
      // Also include arena-only users who may not appear in leaderboard_view
      const minerMap = new Map<string, any>();
      for (const entry of minerRes.data || []) {
        if (!entry.user_id) continue;
        minerMap.set(entry.user_id, entry);
      }

      // Add arena users not in miner map (they may have 0 mining points)
      for (const entry of arenaRes.data || []) {
        if (!entry.user_id || minerMap.has(entry.user_id)) continue;
        minerMap.set(entry.user_id, {
          user_id: entry.user_id,
          username: entry.username,
          avatar_url: entry.avatar_url,
          total_points: 0,
          daily_streak: 0,
        });
      }

      const merged = Array.from(minerMap.values()).map((entry) => {
        const miningPts = formatPoints(entry.total_points);
        const arenaScore = arenaScoreMap.get(entry.user_id) || 0;
        return {
          user_id: entry.user_id || '',
          total_points: miningPts + arenaScore, // combined total
          daily_streak: entry.daily_streak || 0,
          username: entry.username || `Miner${(entry.user_id || '').slice(0, 4)}`,
          avatar_url: entry.avatar_url || undefined,
        };
      });

      // Sort by combined total descending, then assign ranks
      merged.sort((a, b) => b.total_points - a.total_points);

      const leaderboardWithRanks: LeaderboardEntry[] = merged
        .slice(0, limit)
        .map((entry, index) => ({ ...entry, rank: index + 1 }));

      setLeaderboard(leaderboardWithRanks);
      cacheSet(cacheKey, leaderboardWithRanks);
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
    } finally {
      inFlightRef.current = false;
      if (mountedRef.current) setLoading(false);
    }
  }, [cacheKey, limit]);

  useEffect(() => {
    mountedRef.current = true;

    const cached = cacheGet<LeaderboardEntry[]>(cacheKey, { maxAgeMs: 5 * 60_000 });
    if (cached?.data?.length) {
      // Sanitize cached data to ensure whole numbers
      const sanitizedCache = cached.data.map(entry => ({
        ...entry,
        total_points: formatPoints(entry.total_points),
      }));
      setLeaderboard(sanitizedCache);
      setLoading(false);
    } else {
      // Don't hard-block UI; we'll render quickly even if fresh fetch is in progress.
      setLoading(false);
    }

    void fetchLeaderboard();

    const interval = window.setInterval(() => {
      if (document.visibilityState === 'visible') {
        void fetchLeaderboard();
      }
    }, POLL_MS);

    // Throttled wake handler to prevent duplicate fetches from visibility + focus firing together
    const throttledFetch = throttle(() => {
      if (document.visibilityState === 'visible') {
        void fetchLeaderboard();
      }
    }, WAKE_THROTTLE_MS);

    document.addEventListener('visibilitychange', throttledFetch);
    window.addEventListener('focus', throttledFetch);

    return () => {
      mountedRef.current = false;
      window.clearInterval(interval);
      document.removeEventListener('visibilitychange', throttledFetch);
      window.removeEventListener('focus', throttledFetch);
    };
  }, [cacheKey, fetchLeaderboard]);

  return { leaderboard, loading };
};
