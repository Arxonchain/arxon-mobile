import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import confetti from 'canvas-confetti';
import { supabase } from '@/integrations/supabase/client';
import { cacheGet, cacheSet } from '@/lib/localCache';
import { useAuth } from '@/contexts/AuthContext';
import { formatPoints, sanitizeUserPoints } from '@/lib/formatPoints';

interface UserPoints {
  id: string;
  user_id: string;
  total_points: number;
  daily_streak: number;
  last_checkin_date: string | null;
  mining_points: number;
  task_points: number;
  social_points: number;
  referral_points: number;
  referral_bonus_percentage: number; // Boost from referrals only
  x_post_boost_percentage: number; // Boost from X post submissions (social yapping)
}

type PointsContextType = {
  points: UserPoints | null;
  loading: boolean;
  rank: number | null;
  addPoints: (amount: number, type: 'mining' | 'task' | 'social' | 'referral', sessionId?: string) => Promise<{ success: boolean; points?: number; error?: string }>;
  refreshPoints: () => Promise<void>;
  triggerConfetti: () => void;
};

const PointsContext = createContext<PointsContextType | undefined>(undefined);

const pointsCacheKey = (userId: string) => `arxon:points:v3:${userId}`;
const rankCacheKey = (userId: string) => `arxon:rank:v2:${userId}`;

// Rank computation is an expensive global aggregate.
// Under high concurrency, we must NOT run it on every points update.
const RANK_MIN_INTERVAL_MS = 30 * 60_000; // at most once per 30 minutes per user (reduced to save egress)

export const PointsProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();

  const [points, setPoints] = useState<UserPoints | null>(null);
  const [loading, setLoading] = useState(true);
  const [rank, setRank] = useState<number | null>(null);

  const hydratedUserIdRef = useRef<string | null>(null);
  const rankInFlightRef = useRef(false);
  const lastRankAtRef = useRef(0);

  const triggerConfetti = useCallback(() => {
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#6B8CAE', '#8BA4C4', '#A0B8D4', '#C0D0E0'],
    });
  }, []);

  // Calculate user's actual rank using efficient database function
  // This works for ANY number of users (100k+) without row limits
  const calculateRank = useCallback(async () => {
    if (!user) return;

    const now = Date.now();
    if (rankInFlightRef.current) return;
    if (now - lastRankAtRef.current < RANK_MIN_INTERVAL_MS) return;
    rankInFlightRef.current = true;
    lastRankAtRef.current = now;
    
    try {
      // Use the database function that counts users with higher points
      // This bypasses Supabase's default 1000 row limit and works for any user count
      // Use type assertion to avoid schema cache issues in self-hosted deployments
      const { data, error } = await supabase
        .rpc('get_user_rank' as any, { p_user_id: user.id });

      if (error) {
        console.error('Error fetching rank from database function:', error);
        return;
      }

      // The function returns the exact rank (1-indexed)
      const userRank = data as number;
      
      if (userRank && userRank > 0) {
        setRank(userRank);
        cacheSet(rankCacheKey(user.id), userRank);
      }
    } catch (error) {
      console.error('Error calculating rank:', error);
      // Keep existing rank on error
    } finally {
      rankInFlightRef.current = false;
    }
  }, [user]);

  const fetchPoints = useCallback(async () => {
    if (!user) {
      setPoints(null);
      setRank(null);
      setLoading(false);
      return;
    }

    try {
      // Fetch points first
      const { data: pointsData, error: pointsError } = await supabase
        .from('user_points')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (pointsError) throw pointsError;

      // Sanitize points to ensure whole numbers (fixes UI display issues)
      let nextPoints = pointsData ? sanitizeUserPoints(pointsData) as UserPoints : null;

      if (!nextPoints) {
        // Ensure row exists (avoid unique race)
        const { error: ensureError } = await supabase
          .from('user_points')
          .upsert({ user_id: user.id }, { onConflict: 'user_id', ignoreDuplicates: true });

        if (ensureError) throw ensureError;

        const { data: ensured, error: ensuredError } = await supabase
          .from('user_points')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle();

        if (ensuredError) throw ensuredError;
        nextPoints = ensured ? sanitizeUserPoints(ensured) as UserPoints : null;
      }

      // Set sanitized points (whole numbers only)
      setPoints(nextPoints);
      cacheSet(pointsCacheKey(user.id), nextPoints);

      // Rank is non-critical; compute in the background (and throttled).
      void calculateRank();
    } catch (error) {
      // Keep any cached/previous values; don't block UI
      console.error('Error fetching points:', error);
    } finally {
      setLoading(false);
    }
  }, [user, calculateRank]);

  const addPoints = useCallback(
    async (
      amount: number,
      type: 'mining' | 'task' | 'social' | 'referral',
      sessionId?: string
    ): Promise<{ success: boolean; points?: number; error?: string }> => {
      if (!user) return { success: false, error: 'Not authenticated' };

      // Always round up to whole number
      const safeAmount = Math.min(Math.max(Math.ceil(amount), 0), 500);
      if (safeAmount <= 0) return { success: false, error: 'Invalid amount' };

      const applyUserPoints = (userPoints: any) => {
        const next = sanitizeUserPoints(userPoints) as UserPoints;
        setPoints(next);
        cacheSet(pointsCacheKey(user.id), next);

        // Rank is derived from total_points; refresh immediately after a claim.
        lastRankAtRef.current = 0;
        void calculateRank();
      };

      const rpcFallback = async (reason?: string) => {
        try {
          // For mining, mark the session as credited before incrementing (idempotency guard)
          if (type === 'mining' && sessionId) {
            await supabase
              .from('mining_sessions')
              .update({ credited_at: new Date().toISOString() })
              .eq('id', sessionId)
              .is('credited_at', null);
          }

          // Use type assertion to avoid schema cache mismatch in self-hosted deployments
          const { data, error } = await supabase.rpc('increment_user_points' as any, {
            p_user_id: user.id,
            p_amount: safeAmount,
            p_type: type,
          });

          if (error) return { success: false, error: error.message || reason || 'Fallback failed' };
          if (data) applyUserPoints(data);

          if (safeAmount >= 10) triggerConfetti();
          return { success: true, points: safeAmount };
        } catch (err: any) {
          return { success: false, error: err?.message || reason || 'Fallback failed' };
        }
      };

      try {
        // Primary path: secure backend function
        const { data, error } = await supabase.functions.invoke('award-points', {
          body: {
            type,
            amount: safeAmount,
            session_id: sessionId,
          },
        });

        if (error || !data?.success) {
          // Instant fallback: direct RPC (keeps UI responsive if function is down)
          const fallback = await rpcFallback(error?.message || data?.error);
          if (fallback.success) return fallback;

          return {
            success: false,
            error: fallback.error || error?.message || data?.error || 'Backend error',
          };
        }

        // INSTANT UI UPDATE: apply returned points immediately
        if (data?.userPoints) {
          applyUserPoints(data.userPoints);
        } else {
          // Best-effort sync if the function didn't return the row
          const { data: latest } = await supabase
            .from('user_points')
            .select('*')
            .eq('user_id', user.id)
            .maybeSingle();

          if (latest) applyUserPoints(latest);
        }

        const awardedPoints = Math.ceil(Number(data?.points ?? safeAmount));
        if (awardedPoints >= 10) triggerConfetti();

        return { success: true, points: awardedPoints };
      } catch (err: any) {
        const fallback = await rpcFallback(err?.message);
        if (fallback.success) return fallback;

        return {
          success: false,
          error: fallback.error || err?.message || 'Network error',
        };
      }
    },
    [calculateRank, triggerConfetti, user]
  );

  // Hydrate instantly from cache on login (so ARX-P shows immediately), then refresh in background
  useEffect(() => {
    const userId = user?.id;

    if (!userId) {
      hydratedUserIdRef.current = null;
      setPoints(null);
      setRank(null);
      setLoading(false);
      return;
    }

    if (hydratedUserIdRef.current !== userId) {
      hydratedUserIdRef.current = userId;

      const cachedPoints = cacheGet<UserPoints | null>(pointsCacheKey(userId));
      const cachedRank = cacheGet<number>(rankCacheKey(userId));

      if (cachedPoints?.data) {
        // Sanitize cached points to ensure whole numbers
        const sanitized = sanitizeUserPoints(cachedPoints.data) as UserPoints;
        setPoints(sanitized);
        setLoading(false);
      }
      
      // Use cached rank as initial value to avoid showing null
      // Will be recalculated fresh after fetchPoints completes
      if (cachedRank?.data && cachedRank.data > 0) {
        setRank(cachedRank.data);
      }
    }

    // Always refresh in background
    void fetchPoints();
  }, [fetchPoints, user?.id]);

  // Single real-time subscription for user_points (consolidated via provider)
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('user-points-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_points',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          if (payload.eventType === 'UPDATE' || payload.eventType === 'INSERT') {
            // Sanitize realtime payload to ensure whole numbers
            const next = sanitizeUserPoints(payload.new) as UserPoints;
            setPoints(next);
            cacheSet(pointsCacheKey(user.id), next);
            
            // Recalculate rank whenever points change via realtime
            lastRankAtRef.current = 0;
            void calculateRank();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, calculateRank]);

  const value = useMemo<PointsContextType>(
    () => ({
      points,
      loading,
      rank,
      addPoints,
      refreshPoints: fetchPoints,
      triggerConfetti,
    }),
    [addPoints, fetchPoints, loading, points, rank, triggerConfetti]
  );

  return <PointsContext.Provider value={value}>{children}</PointsContext.Provider>;
};

export const usePoints = () => {
  const context = useContext(PointsContext);
  if (context === undefined) {
    throw new Error('usePoints must be used within a PointsProvider');
  }
  return context;
};

