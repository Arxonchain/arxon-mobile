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

const POLL_MS = 120_000;
const WAKE_THROTTLE_MS = 5000;

export const useLeaderboard = (limit: number = 100) => {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const mountedRef = useRef(true);
  const inFlightRef = useRef(false);

  const cacheKey = `arxon:leaderboard:miners:v7:${limit}`;

  const fetchLeaderboard = useCallback(async () => {
    if (inFlightRef.current) return;
    inFlightRef.current = true;

    try {
      const { data, error } = await supabase
        .from('leaderboard_view')
        .select('user_id, username, avatar_url, total_points, daily_streak')
        .order('total_points', { ascending: false })
        .limit(limit);

      if (error) throw error;
      if (!mountedRef.current) return;

      const leaderboardWithRanks: LeaderboardEntry[] = (data || []).map((entry, index) => ({
        user_id: entry.user_id || '',
        total_points: formatPoints(entry.total_points),
        daily_streak: entry.daily_streak || 0,
        username: entry.username || `Miner${(entry.user_id || '').slice(0, 4)}`,
        avatar_url: entry.avatar_url || undefined,
        rank: index + 1,
      }));

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
      const sanitizedCache = cached.data.map((entry) => ({
        ...entry,
        total_points: formatPoints(entry.total_points),
      }));
      setLeaderboard(sanitizedCache);
      setLoading(false);
    } else {
      setLoading(false);
    }

    void fetchLeaderboard();

    const interval = window.setInterval(() => {
      if (document.visibilityState === 'visible') {
        void fetchLeaderboard();
      }
    }, POLL_MS);

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
