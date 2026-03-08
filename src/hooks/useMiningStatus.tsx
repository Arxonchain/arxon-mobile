import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { cacheGet } from '@/lib/localCache';
import { useAuth } from '@/contexts/AuthContext';

const MAX_MINING_HOURS = 8;
const maxTimeSeconds = MAX_MINING_HOURS * 60 * 60;

type ActiveMiningSessionCache = {
  id: string;
  started_at: string;
  arx_mined?: number | null;
  is_active: boolean;
};

const activeSessionCacheKey = (userId: string) => `arxon:mining_active_session:v1:${userId}`;

function getActiveSessionCache(userId: string) {
  const cached = cacheGet<ActiveMiningSessionCache | null>(activeSessionCacheKey(userId), {
    maxAgeMs: 9 * 60 * 60_000,
  });
  return cached?.data ?? null;
}

/**
 * Lightweight hook to check if user is currently mining.
 * Uses cache first for instant response, then verifies with DB.
 * This is much lighter than the full useMining hook.
 */
export const useMiningStatus = () => {
  const { user } = useAuth();
  const [isMining, setIsMining] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setIsMining(false);
      setLoading(false);
      return;
    }

    // Hydrate from cache first for instant UI
    const cachedActive = getActiveSessionCache(user.id);
    if (cachedActive?.is_active) {
      const startTime = new Date(cachedActive.started_at).getTime();
      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      
      // Only consider active if not expired
      if (elapsed < maxTimeSeconds) {
        setIsMining(true);
      }
    }
    setLoading(false);

    // Verify with database in background
    const checkActiveSession = async () => {
      try {
        const { data: sessions, error } = await supabase
          .from('mining_sessions')
          .select('id, started_at, is_active')
          .eq('user_id', user.id)
          .eq('is_active', true)
          .order('started_at', { ascending: false })
          .limit(1);

        if (error) throw error;

        if (sessions && sessions.length > 0) {
          const session = sessions[0];
          const startTime = new Date(session.started_at).getTime();
          const elapsed = Math.floor((Date.now() - startTime) / 1000);
          
          // Active if not expired
          setIsMining(elapsed < maxTimeSeconds);
        } else {
          setIsMining(false);
        }
      } catch (error) {
        console.error('Error checking mining status:', error);
        // Keep cached value on error
      }
    };

    checkActiveSession();

    // Subscribe to mining session changes for real-time updates
    const channel = supabase
      .channel('mining-status-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'mining_sessions',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const newData = payload.new as any;
          if (payload.eventType === 'INSERT' && newData?.is_active) {
            setIsMining(true);
          } else if (payload.eventType === 'UPDATE') {
            if (!newData?.is_active) {
              setIsMining(false);
            } else {
              const startTime = new Date(newData.started_at).getTime();
              const elapsed = Math.floor((Date.now() - startTime) / 1000);
              setIsMining(elapsed < maxTimeSeconds);
            }
          } else if (payload.eventType === 'DELETE') {
            setIsMining(false);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  return { isMining, loading };
};
