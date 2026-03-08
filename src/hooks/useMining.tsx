import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { cacheGet, cacheSet } from '@/lib/localCache';
import { BackendUnavailableError } from '@/lib/backendHealth';
import { useAuth } from '@/contexts/AuthContext';
import { usePoints } from './usePoints';
import { toast } from '@/hooks/use-toast';

const MAX_MINING_HOURS = 8;
const BASE_POINTS_PER_HOUR = 10;

interface MiningSettings {
  publicMiningEnabled: boolean;
  claimingEnabled: boolean;
  blockReward: number;
  consensusMode: string;
}

interface ArenaBoost {
  boost_percentage: number;
  expires_at: string;
}

interface NexusBoost {
  boost_percentage: number;
  expires_at: string;
}

type UseMiningOptions = {
  /** UI tick interval; lower is smoother but more CPU. */
  tickMs?: number;
};

const miningSettingsCacheKey = 'arxon:mining_settings:v2';
const xProfileBoostCacheKey = (userId: string) => `arxon:x_profile_boost:v2:${userId}`;
const arenaBoostsCacheKey = (userId: string) => `arxon:arena_boosts:v2:${userId}`;
const nexusBoostsCacheKey = (userId: string) => `arxon:nexus_boosts:v2:${userId}`;

type ActiveMiningSessionCache = {
  id: string;
  started_at: string;
  arx_mined?: number | null;
  is_active: boolean;
};

const activeSessionCacheKey = (userId: string) => `arxon:mining_active_session:v1:${userId}`;

function setActiveSessionCache(userId: string, session: ActiveMiningSessionCache) {
  cacheSet(activeSessionCacheKey(userId), session);
}

function clearActiveSessionCache(userId: string) {
  cacheSet(activeSessionCacheKey(userId), null);
}

function getActiveSessionCache(userId: string) {
  const cached = cacheGet<ActiveMiningSessionCache | null>(activeSessionCacheKey(userId), {
    // A session can run up to 8 hours; keep a bit of buffer.
    maxAgeMs: 9 * 60 * 60_000,
  });
  return cached?.data ?? null;
}

export const useMining = (options?: UseMiningOptions) => {
  const tickMs = Math.min(Math.max(options?.tickMs ?? 1000, 100), 5000);

  const { user } = useAuth();
  const { addPoints, triggerConfetti, points, refreshPoints } = usePoints();

  const [isMining, setIsMining] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [earnedPoints, setEarnedPoints] = useState(0); // Fractional points for display
  const [loading, setLoading] = useState(true);
  const [settingsLoading, setSettingsLoading] = useState(true);
  const [miningSettings, setMiningSettings] = useState<MiningSettings>({
    publicMiningEnabled: true,
    claimingEnabled: false,
    blockReward: 1000,
    consensusMode: 'PoW',
  });
  const [xProfileBoost, setXProfileBoost] = useState(0);
  const [arenaBoosts, setArenaBoosts] = useState<ArenaBoost[]>([]);
  const [nexusBoosts, setNexusBoosts] = useState<NexusBoost[]>([]);

  const lastDbPointsRef = useRef(0);
  const lastDbWriteAtRef = useRef(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const initialLoadRef = useRef(true);
  const sessionStartTimeRef = useRef<number | null>(null);
  const endingRef = useRef(false);
  const claimInProgressRef = useRef(false);

  // Fetch X profile boost
  const fetchXProfileBoost = useCallback(async () => {
    if (!user) {
      setXProfileBoost(0);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('x_profiles')
        .select('boost_percentage')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!error && data) {
        const next = data.boost_percentage || 0;
        setXProfileBoost(next);
        cacheSet(xProfileBoostCacheKey(user.id), next);
      }
    } catch (err) {
      console.error('Error fetching X profile boost:', err);
    }
  }, [user]);

  // Fetch arena boosts
  const fetchArenaBoosts = useCallback(async () => {
    if (!user) {
      setArenaBoosts([]);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('arena_boosts')
        .select('boost_percentage, expires_at')
        .eq('user_id', user.id)
        .gte('expires_at', new Date().toISOString());

      if (!error && data) {
        setArenaBoosts(data);
        cacheSet(arenaBoostsCacheKey(user.id), data);
      }
    } catch (err) {
      console.error('Error fetching arena boosts:', err);
    }
  }, [user]);

  // Fetch nexus boosts
  const fetchNexusBoosts = useCallback(async () => {
    if (!user) {
      setNexusBoosts([]);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('nexus_boosts')
        .select('boost_percentage, expires_at')
        .eq('user_id', user.id)
        .eq('claimed', true)
        .gte('expires_at', new Date().toISOString());

      if (!error && data) {
        setNexusBoosts(data);
        cacheSet(nexusBoostsCacheKey(user.id), data);
      }
    } catch (err) {
      console.error('Error fetching nexus boosts:', err);
    }
  }, [user]);

  // Calculate all boost sources separately
  const referralBonus = points?.referral_bonus_percentage || 0;
  const xPostBoost = (points as any)?.x_post_boost_percentage || 0;
  const totalArenaBoost = arenaBoosts.reduce((sum, b) => sum + b.boost_percentage, 0);
  const totalNexusBoost = nexusBoosts.reduce((sum, b) => sum + b.boost_percentage, 0);
  const streakBoost = Math.min(points?.daily_streak || 0, 30);

  // Total boost = referral + X scan + X posts + arena + nexus + streak (cap 500%)
  const rawTotalBoost = referralBonus + xProfileBoost + xPostBoost + totalArenaBoost + totalNexusBoost + streakBoost;
  const totalBoostPercentage = Math.min(rawTotalBoost, 500);

  // Rate caps: 10/hr base, 60/hr max
  const pointsPerHour = BASE_POINTS_PER_HOUR * (1 + totalBoostPercentage / 100);
  const cappedPointsPerHour = Math.min(pointsPerHour, 60);
  const pointsPerSecond = cappedPointsPerHour / 3600;

  useEffect(() => {
    if (!import.meta.env.DEV) return;
    console.log('Mining rate updated:', {
      referralBonus,
      xProfileBoost,
      xPostBoost,
      totalArenaBoost,
      totalNexusBoost,
      streakBoost,
      rawTotalBoost,
      totalBoostPercentage,
      cappedPointsPerHour,
      pointsPerSecond,
    });
  }, [
    referralBonus,
    xProfileBoost,
    xPostBoost,
    totalArenaBoost,
    totalNexusBoost,
    streakBoost,
    rawTotalBoost,
    totalBoostPercentage,
    cappedPointsPerHour,
    pointsPerSecond,
  ]);

  const maxTimeSeconds = MAX_MINING_HOURS * 60 * 60;
  const remainingTime = Math.max(0, maxTimeSeconds - elapsedTime);

  // Fetch mining settings
  const fetchMiningSettings = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('mining_settings')
        .select('public_mining_enabled, claiming_enabled, block_reward, consensus_mode')
        .limit(1)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        const next: MiningSettings = {
          publicMiningEnabled: data.public_mining_enabled,
          claimingEnabled: data.claiming_enabled,
          blockReward: data.block_reward,
          consensusMode: data.consensus_mode,
        };
        setMiningSettings(next);
        cacheSet(miningSettingsCacheKey, next);
      }
    } catch (error) {
      console.error('Error fetching mining settings:', error);
    } finally {
      setSettingsLoading(false);
    }
  }, []);

  const endSession = useCallback(
    async (id: string, finalPoints: number) => {
      // Round DOWN to prevent over-rewarding
      const pointsToCredit = Math.max(0, Math.floor(finalPoints));

      try {
        // First, end the session in DB
        await supabase
          .from('mining_sessions')
          .update({
            is_active: false,
            ended_at: new Date().toISOString(),
            arx_mined: pointsToCredit,
          })
          .eq('id', id);

        if (user) {
          clearActiveSessionCache(user.id);
        }

        // Try to credit points if any
        let credited = false;
        let creditedPoints = 0;
        
        if (pointsToCredit > 0) {
          // Attempt 1: Edge function
          try {
            const result = await addPoints(pointsToCredit, 'mining', id);
            credited = result.success;
            creditedPoints = result.points || pointsToCredit;
          } catch (edgeError) {
            console.warn('Edge function failed for endSession, will try direct RPC:', edgeError);
          }

          // Attempt 2: Direct RPC fallback for INSTANT credit
          if (!credited && user) {
            try {
              // Mark session as credited first
              await supabase
                .from('mining_sessions')
                .update({ credited_at: new Date().toISOString() })
                .eq('id', id)
                .is('credited_at', null);

              // Use RPC directly for instant credit (type assertion for self-hosted compatibility)
              const { data: rpcResult, error: rpcError } = await supabase.rpc('increment_user_points' as any, {
                p_user_id: user.id,
                p_amount: pointsToCredit,
                p_type: 'mining',
              });

              if (!rpcError && rpcResult) {
                credited = true;
                creditedPoints = pointsToCredit;
              } else {
                console.error('Direct RPC failed in endSession:', rpcError);
              }
            } catch (rpcError) {
              console.error('Direct RPC fallback error in endSession:', rpcError);
            }
          }

          // INSTANT UI UPDATE: Refresh points immediately
          await refreshPoints();
          
          if (!credited) {
            console.error('All point crediting methods failed for session:', id);
          }
        }

        setIsMining(false);
        setSessionId(null);
        setElapsedTime(0);
        setEarnedPoints(0);
        lastDbPointsRef.current = 0;
        lastDbWriteAtRef.current = 0;
        sessionStartTimeRef.current = null;
        endingRef.current = false;

        if (credited && creditedPoints > 0) {
          toast({
            title: 'Mining Session Complete! 🎉',
            description: `You earned ${Math.ceil(creditedPoints)} ARX-P points`,
          });
        } else if (pointsToCredit > 0 && !credited) {
          toast({
            title: 'Session Ended',
            description: 'Points will be credited automatically. Please refresh.',
            variant: 'default',
          });
        }
      } catch (error) {
        console.error('Error ending session:', error);
        // Allow another attempt if we failed to end
        endingRef.current = false;
      }
    },
    [addPoints, refreshPoints, user]
  );

  const finalizeSessionSilently = useCallback(
    async (session: { id: string; started_at: string; arx_mined?: number | null }) => {
      const startTime = new Date(session.started_at).getTime();
      const elapsedSeconds = Math.max(0, Math.floor((Date.now() - startTime) / 1000));
      const effectiveSeconds = Math.min(elapsedSeconds, maxTimeSeconds);

      // Round DOWN to prevent over-rewarding
      const calculatedPoints = Math.min(480, Math.floor((effectiveSeconds / 3600) * cappedPointsPerHour));
      const dbPoints = Math.max(0, Math.floor(Number(session.arx_mined ?? 0)));
      const finalPoints = Math.max(calculatedPoints, dbPoints);

      const { data: updated, error: updateError } = await supabase
        .from('mining_sessions')
        .update({
          is_active: false,
          ended_at: new Date().toISOString(),
          arx_mined: finalPoints,
        })
        .eq('id', session.id)
        .eq('is_active', true)
        .select('id')
        .maybeSingle();

      if (updateError) throw updateError;
      if (!updated) return 0;

      if (finalPoints > 0 && user) {
        // Try edge function first
        let credited = false;
        try {
          const result = await addPoints(finalPoints, 'mining', session.id);
          credited = result.success;
        } catch {
          // Edge function failed, try direct RPC
        }

        // Fallback to direct RPC for instant credit
        if (!credited) {
          try {
            await supabase
              .from('mining_sessions')
              .update({ credited_at: new Date().toISOString() })
              .eq('id', session.id)
              .is('credited_at', null);

            await supabase.rpc('increment_user_points' as any, {
              p_user_id: user.id,
              p_amount: finalPoints,
              p_type: 'mining',
            });
          } catch (rpcError) {
            console.error('Direct RPC fallback error in finalizeSessionSilently:', rpcError);
          }
        }

        // INSTANT UI UPDATE: Refresh points immediately
        await refreshPoints();
      }

      return finalPoints;
    },
    [addPoints, cappedPointsPerHour, maxTimeSeconds, refreshPoints, user]
  );

  const checkActiveSession = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      const { data: sessions, error } = await supabase
        .from('mining_sessions')
        .select('id, started_at, arx_mined, is_active')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .order('started_at', { ascending: false })
        .limit(5);

      if (error) throw error;

      if (sessions && sessions.length > 0) {
        const latestSession = sessions[0];

        // Keep cross-page cache hot
        setActiveSessionCache(user.id, latestSession as any);

        if (sessions.length > 1) {
          const duplicates = sessions.slice(1);
          await Promise.allSettled(duplicates.map((s) => finalizeSessionSilently(s as any)));
        }

        const startTime = new Date(latestSession.started_at).getTime();
        const elapsed = Math.floor((Date.now() - startTime) / 1000);

        if (elapsed >= maxTimeSeconds) {
          const calculatedPoints = Math.min(480, Math.floor((maxTimeSeconds / 3600) * cappedPointsPerHour));
          await endSession(latestSession.id, calculatedPoints);
        } else {
          const calculatedPoints = Math.min(480, (elapsed / 3600) * cappedPointsPerHour);
          const dbPoints = latestSession.arx_mined || 0;
          const resumePoints = Math.max(calculatedPoints, dbPoints);

          setSessionId(latestSession.id);
          setIsMining(true);
          setElapsedTime(elapsed);
          setEarnedPoints(resumePoints);
          lastDbPointsRef.current = Math.floor(resumePoints);
          sessionStartTimeRef.current = startTime;
          endingRef.current = false;

          if (calculatedPoints > dbPoints) {
            void supabase
              .from('mining_sessions')
              .update({ arx_mined: Math.floor(calculatedPoints) })
              .eq('id', latestSession.id);
          }
        }
      } else {
        // If a session is in optimistic "pending" mode, the DB insert may not have
        // completed yet; don't clear cache during that short window.
        const cachedActive = getActiveSessionCache(user.id);
        const isRecentPending =
          cachedActive?.id?.startsWith('pending-') &&
          Date.now() - new Date(cachedActive.started_at).getTime() < 30_000;

        if (!isRecentPending) {
          clearActiveSessionCache(user.id);
        }
      }
    } catch (error) {
      console.error('Error checking active session:', error);
    } finally {
      setLoading(false);
      initialLoadRef.current = false;
    }
  }, [user, maxTimeSeconds, cappedPointsPerHour, finalizeSessionSilently, endSession]);

  const startMining = async () => {
    if (!user) {
      toast({
        title: 'Login Required',
        description: 'Please sign in to start mining',
        variant: 'destructive',
      });
      return;
    }

    if (isMining && sessionId) {
      // Already active locally; avoid creating duplicate sessions.
      return;
    }

    // If admin has explicitly disabled mining (and we already know it), block.
    if (!settingsLoading && !miningSettings.publicMiningEnabled) {
      toast({
        title: 'Mining Disabled',
        description: 'Public mining is currently disabled',
        variant: 'destructive',
      });
      return;
    }

    // Instant UX: start the UI immediately, then sync/create the session in background.
    const optimisticStartAt = Date.now();
    const pendingId = `pending-${optimisticStartAt}`;

    setSessionId(pendingId);
    setIsMining(true);
    setElapsedTime(0);
    setEarnedPoints(0);
    lastDbPointsRef.current = 0;
    lastDbWriteAtRef.current = 0;
    sessionStartTimeRef.current = optimisticStartAt;
    endingRef.current = false;

    setActiveSessionCache(user.id, {
      id: pendingId,
      started_at: new Date(optimisticStartAt).toISOString(),
      arx_mined: 0,
      is_active: true,
    });

    try {
      // 1) If there is already an active session (from another page/device), resume it.
      const { data: existingSessions, error: existingError } = await supabase
        .from('mining_sessions')
        .select('id, started_at, arx_mined, is_active')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .order('started_at', { ascending: false })
        .limit(5);

      if (existingError) throw existingError;

      if (existingSessions && existingSessions.length > 0) {
        const latestSession = existingSessions[0];
        setActiveSessionCache(user.id, latestSession as any);

        // End duplicates if any (multi-device safety), but do NOT end the latest.
        if (existingSessions.length > 1) {
          const duplicates = existingSessions.slice(1);
          await Promise.allSettled(duplicates.map((s) => finalizeSessionSilently(s as any)));
        }

        const startTime = new Date(latestSession.started_at).getTime();
        const elapsed = Math.max(0, Math.floor((Date.now() - startTime) / 1000));
        const effectiveElapsed = Math.min(elapsed, maxTimeSeconds);

        const calculatedPoints = Math.min(480, (effectiveElapsed / 3600) * cappedPointsPerHour);
        const dbPoints = latestSession.arx_mined || 0;
        const resumePoints = Math.max(calculatedPoints, dbPoints);

        setSessionId(latestSession.id);
        setIsMining(true);
        setElapsedTime(effectiveElapsed);
        setEarnedPoints(resumePoints);
        lastDbPointsRef.current = Math.floor(resumePoints);
        sessionStartTimeRef.current = startTime;
        endingRef.current = false;
        return;
      }

      // 2) Otherwise create a new session.
      const { data, error } = await supabase
        .from('mining_sessions')
        .insert({
          user_id: user.id,
          is_active: true,
          arx_mined: 0,
        })
        .select('id, started_at')
        .single();

      if (error) throw error;

      setActiveSessionCache(user.id, {
        id: data.id,
        started_at: data.started_at,
        arx_mined: 0,
        is_active: true,
      });

      const startTime = new Date(data.started_at).getTime();
      setSessionId(data.id);
      setIsMining(true);
      setElapsedTime(0);
      setEarnedPoints(0);
      lastDbPointsRef.current = 0;
      lastDbWriteAtRef.current = 0;
      sessionStartTimeRef.current = startTime;
      endingRef.current = false;

      toast({
        title: 'Mining Started! ⛏️',
        description: "You're now earning ARX-P points",
      });
      triggerConfetti();
    } catch (error) {
      console.error('Error starting mining:', error);

      clearActiveSessionCache(user.id);
      setIsMining(false);
      setSessionId(null);
      setElapsedTime(0);
      setEarnedPoints(0);
      lastDbPointsRef.current = 0;
      lastDbWriteAtRef.current = 0;
      sessionStartTimeRef.current = null;
      endingRef.current = false;

      const description =
        error instanceof BackendUnavailableError ? error.message : 'Failed to start mining session';

      toast({
        title: error instanceof BackendUnavailableError ? 'Service Unavailable' : 'Error',
        description,
        variant: 'destructive',
      });
    }
  };

  const stopMining = async () => {
    if (!sessionId) return;

    // If we're still in optimistic "pending" mode, try to resolve the real session first.
    if (sessionId.startsWith('pending-')) {
      if (!user) return;

      try {
        const { data: sessions } = await supabase
          .from('mining_sessions')
          .select('id, started_at, arx_mined, is_active')
          .eq('user_id', user.id)
          .eq('is_active', true)
          .order('started_at', { ascending: false })
          .limit(1);

        const real = sessions?.[0] as any;
        if (real?.id) {
          setActiveSessionCache(user.id, real);
          const startTime = new Date(real.started_at).getTime();
          sessionStartTimeRef.current = startTime;

          const elapsed = Math.max(0, Math.floor((Date.now() - startTime) / 1000));
          const effectiveElapsed = Math.min(elapsed, maxTimeSeconds);
          const calculatedPoints = Math.min(480, (effectiveElapsed / 3600) * cappedPointsPerHour);
          const dbPoints = Number(real.arx_mined || 0);
          const finalPoints = Math.max(calculatedPoints, dbPoints);

          setSessionId(real.id);
          setIsMining(true);
          setElapsedTime(effectiveElapsed);
          setEarnedPoints(finalPoints);

          await endSession(real.id, finalPoints);
          return;
        }
      } catch {
        // ignore; we'll just cancel locally below
      }

      clearActiveSessionCache(user.id);
      setIsMining(false);
      setSessionId(null);
      setElapsedTime(0);
      setEarnedPoints(0);
      lastDbPointsRef.current = 0;
      lastDbWriteAtRef.current = 0;
      sessionStartTimeRef.current = null;
      endingRef.current = false;
      return;
    }

    const pointsToClaim = Math.floor(earnedPoints);
    await endSession(sessionId, pointsToClaim);
  };

  // Claim current earned points without stopping mining
  const claimPoints = async () => {
    if (!sessionId || !user) return;

    // Prevent double-click / rapid fire claims
    if (claimInProgressRef.current) {
      toast({
        title: 'Claim in Progress',
        description: 'Please wait for the current claim to finish.',
        variant: 'destructive',
      });
      return;
    }

    if (sessionId.startsWith('pending-')) {
      toast({
        title: 'Starting Mining…',
        description: 'Please wait a moment, then try claiming again.',
        variant: 'destructive',
      });
      return;
    }

    claimInProgressRef.current = true;

    try {
      // Fetch the ACTUAL session from the database to prevent claiming more than mined
      const { data: dbSession, error: fetchError } = await supabase
        .from('mining_sessions')
        .select('id, started_at, arx_mined, is_active')
        .eq('id', sessionId)
        .eq('is_active', true)
        .maybeSingle();

      if (fetchError || !dbSession) {
        toast({
          title: 'Claim Failed',
          description: 'Session not found or already claimed.',
          variant: 'destructive',
        });
        claimInProgressRef.current = false;
        return;
      }

      // Calculate server-authoritative points based on actual elapsed time
      const serverStart = new Date(dbSession.started_at).getTime();
      const serverElapsed = Math.min(Math.max(0, Math.floor((Date.now() - serverStart) / 1000)), maxTimeSeconds);
      const serverCalculatedPoints = Math.min(480, Math.floor((serverElapsed / 3600) * cappedPointsPerHour));

      // Use the LESSER of client earnedPoints and server-calculated to prevent over-reward
      const pointsToClaim = Math.max(0, Math.min(Math.floor(earnedPoints), serverCalculatedPoints));

      // MINIMUM 10 ARX-P threshold before any claim is allowed
      if (pointsToClaim < 10) {
        toast({
          title: 'Not Enough Mined',
          description: `You need at least 10 ARX-P to claim. Currently mined: ~${pointsToClaim} ARX-P`,
          variant: 'destructive',
        });
        claimInProgressRef.current = false;
        return;
      }

      // First, end the current session in DB to lock it
      const { error: endError } = await supabase
        .from('mining_sessions')
        .update({
          is_active: false,
          ended_at: new Date().toISOString(),
          arx_mined: pointsToClaim,
        })
        .eq('id', sessionId)
        .eq('is_active', true);

      if (endError) {
        console.error('Failed to end session for claim:', endError);
        toast({
          title: 'Claim Failed',
          description: 'Could not process session. Please try again.',
          variant: 'destructive',
        });
        return;
      }

      // Try edge function first, then fallback to direct RPC for instant credit
      let credited = false;
      let creditedPoints = 0;
      
      // Attempt 1: Edge function (secure, but may not be deployed on production)
      try {
        const result = await addPoints(pointsToClaim, 'mining', sessionId);
        credited = result.success;
        creditedPoints = result.points || pointsToClaim;
      } catch (edgeError) {
        console.warn('Edge function failed, will try direct RPC:', edgeError);
      }

      // Attempt 2: Direct RPC fallback for INSTANT credit (if edge function fails)
      if (!credited) {
        try {
          // Mark session as credited first
          await supabase
            .from('mining_sessions')
            .update({ credited_at: new Date().toISOString() })
            .eq('id', sessionId)
            .is('credited_at', null);

          // Use RPC directly for instant credit (type assertion for self-hosted compatibility)
          const { data: rpcResult, error: rpcError } = await supabase.rpc('increment_user_points' as any, {
            p_user_id: user.id,
            p_amount: pointsToClaim,
            p_type: 'mining',
          });

          if (!rpcError && rpcResult) {
            credited = true;
            creditedPoints = pointsToClaim;
          } else {
            console.error('Direct RPC failed:', rpcError);
          }
        } catch (rpcError) {
          console.error('Direct RPC fallback error:', rpcError);
        }
      }

      // Show appropriate toast
      if (credited) {
        toast({
          title: 'Points Claimed! 🎉',
          description: `+${Math.floor(creditedPoints)} ARX-P added to your balance`,
        });
        triggerConfetti();
      } else {
        console.error('All point crediting methods failed for session:', sessionId);
        toast({
          title: 'Claim Issue',
          description: 'Points will be credited automatically. Please refresh.',
          variant: 'destructive',
        });
      }

      // Force-refresh balance IMMEDIATELY
      await refreshPoints();

      // CRITICAL: Create a NEW session instead of reusing the old one
      const { data: newSession, error: newSessionError } = await supabase
        .from('mining_sessions')
        .insert({
          user_id: user.id,
          is_active: true,
          arx_mined: 0,
        })
        .select('id, started_at')
        .single();

      if (newSessionError || !newSession) {
        console.error('Failed to create new session after claim:', newSessionError);
        setIsMining(false);
        setSessionId(null);
        setElapsedTime(0);
        setEarnedPoints(0);
        lastDbPointsRef.current = 0;
        lastDbWriteAtRef.current = 0;
        sessionStartTimeRef.current = null;
        clearActiveSessionCache(user.id);
        return;
      }

      // Update local state with new session
      const startTime = new Date(newSession.started_at).getTime();
      setSessionId(newSession.id);
      setElapsedTime(0);
      setEarnedPoints(0);
      lastDbPointsRef.current = 0;
      lastDbWriteAtRef.current = 0;
      sessionStartTimeRef.current = startTime;

      setActiveSessionCache(user.id, {
        id: newSession.id,
        started_at: newSession.started_at,
        arx_mined: 0,
        is_active: true,
      });

    } catch (error) {
      console.error('Error claiming points:', error);
      toast({
        title: error instanceof BackendUnavailableError ? 'Service Unavailable' : 'Claim Failed',
        description: error instanceof BackendUnavailableError ? error.message : 'Please try again',
        variant: 'destructive',
      });
    } finally {
      claimInProgressRef.current = false;
    }
  };

  // Track if session has reached max time (waiting for manual claim)
  const [sessionMaxed, setSessionMaxed] = useState(false);

  // Timer and points calculation - computed from server start time for accuracy.
  const recomputeFromStartTime = useCallback(() => {
    if (!isMining || !sessionId || !sessionStartTimeRef.current) return;

    // While a session is "pending" (optimistic UI), never write to the DB.
    const isPending = sessionId.startsWith('pending-');

    const startTime = sessionStartTimeRef.current;
    const elapsedMs = Date.now() - startTime;
    const newElapsed = Math.floor(elapsedMs / 1000);

    // When max time reached, DON'T auto-end - let user manually claim
    if (newElapsed >= maxTimeSeconds) {
      setElapsedTime(maxTimeSeconds);
      const finalPoints = Math.min(480, Math.floor((maxTimeSeconds / 3600) * cappedPointsPerHour));
      setEarnedPoints(finalPoints);
      setSessionMaxed(true);
      
      // Update DB with final points (but don't end session)
      if (!isPending && !endingRef.current) {
        const wholePoints = Math.floor(finalPoints);
        if (wholePoints > lastDbPointsRef.current) {
          lastDbPointsRef.current = wholePoints;
          void supabase.from('mining_sessions').update({ arx_mined: wholePoints }).eq('id', sessionId);
        }
      }
      return;
    }

    setSessionMaxed(false);
    setElapsedTime(newElapsed);

    const secondsElapsed = elapsedMs / 1000;
    const fractionalPoints = Math.max(0, Math.min(480, (secondsElapsed / 3600) * cappedPointsPerHour));
    setEarnedPoints(fractionalPoints);

    if (isPending) return;

    const wholePoints = Math.min(480, Math.floor(fractionalPoints));
    if (wholePoints > lastDbPointsRef.current) {
      lastDbPointsRef.current = wholePoints;

      // Hard throttle (safety): never write more often than every 15s.
      const now = Date.now();
      if (now - lastDbWriteAtRef.current > 15_000) {
        lastDbWriteAtRef.current = now;
        void supabase.from('mining_sessions').update({ arx_mined: wholePoints }).eq('id', sessionId);
      }
    }
  }, [isMining, sessionId, maxTimeSeconds, cappedPointsPerHour]);

  useEffect(() => {
    if (!isMining || !sessionId || !sessionStartTimeRef.current) return;

    // Run once immediately
    recomputeFromStartTime();

    intervalRef.current = setInterval(() => {
      recomputeFromStartTime();
    }, tickMs);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      intervalRef.current = null;
    };
  }, [isMining, sessionId, recomputeFromStartTime, tickMs]);

  // When the tab wakes up from background throttling, recompute.
  useEffect(() => {
    const handleWake = () => {
      if (document.visibilityState !== 'visible') return;

      recomputeFromStartTime();

      if (!isMining) {
        void checkActiveSession();
      }
    };

    document.addEventListener('visibilitychange', handleWake);
    window.addEventListener('focus', handleWake);

    return () => {
      document.removeEventListener('visibilitychange', handleWake);
      window.removeEventListener('focus', handleWake);
    };
  }, [recomputeFromStartTime, checkActiveSession, isMining]);

  // Initial fetch
  useEffect(() => {
    if (!user) {
      setLoading(false);
      setSettingsLoading(false);
      return;
    }

    // Hydrate from cache first for instant UI
    const cachedSettings = cacheGet<MiningSettings>(miningSettingsCacheKey, { maxAgeMs: 10 * 60_000 });
    if (cachedSettings?.data) {
      setMiningSettings(cachedSettings.data);
      setSettingsLoading(false);
    }

    const cachedXBoost = cacheGet<number>(xProfileBoostCacheKey(user.id), { maxAgeMs: 10 * 60_000 });
    if (cachedXBoost?.data !== undefined) setXProfileBoost(cachedXBoost.data);

    const cachedArena = cacheGet<ArenaBoost[]>(arenaBoostsCacheKey(user.id), { maxAgeMs: 2 * 60_000 });
    if (cachedArena?.data) setArenaBoosts(cachedArena.data);

    // Hydrate active session instantly (so Dashboard reflects Mining immediately)
    const cachedActive = getActiveSessionCache(user.id);
    if (cachedActive?.is_active) {
      const startTime = new Date(cachedActive.started_at).getTime();
      const elapsed = Math.max(0, Math.floor((Date.now() - startTime) / 1000));

      setSessionId(cachedActive.id);
      setIsMining(true);
      setElapsedTime(elapsed);
      setEarnedPoints(Math.max(Number(cachedActive.arx_mined ?? 0), 0));
      sessionStartTimeRef.current = startTime;
      endingRef.current = false;

      // Avoid showing spinners when we already know the user is mining.
      setLoading(false);
    } else {
      // Don't block the Start button/UI while background checks run.
      setLoading(false);
    }

    Promise.all([fetchMiningSettings(), fetchXProfileBoost(), fetchArenaBoosts(), fetchNexusBoosts(), checkActiveSession()]).catch(
      () => {}
    );
  }, [user, checkActiveSession, fetchMiningSettings, fetchXProfileBoost, fetchArenaBoosts, fetchNexusBoosts]);

  // Real-time subscription for X profile boost changes
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('x-profile-boost-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'x_profiles',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          if (payload.new) {
            const next = (payload.new as any).boost_percentage || 0;
            setXProfileBoost(next);
            cacheSet(xProfileBoostCacheKey(user.id), next);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  // Real-time subscription for arena boost changes
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('arena-boost-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'arena_boosts',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          void fetchArenaBoosts();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, fetchArenaBoosts]);

  // Real-time subscription for nexus boost changes
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('nexus-boost-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'nexus_boosts',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          void fetchNexusBoosts();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, fetchNexusBoosts]);

  // Real-time subscription for mining sessions
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('mining-session-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'mining_sessions',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const session = payload.new as any;

          // Keep the local "active session" cache in sync across pages.
          if (session?.id && typeof session?.is_active === 'boolean' && session?.started_at) {
            if (session.is_active) {
              setActiveSessionCache(user.id, session);
            } else {
              clearActiveSessionCache(user.id);
            }
          }

          // If we were in optimistic pending mode, switch to the real DB session as soon as it exists.
          if ((payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') && session?.is_active) {
            if (!sessionId || sessionId.startsWith('pending-') || sessionId === session.id) {
              const startTime = new Date(session.started_at).getTime();
              const elapsed = Math.max(0, Math.floor((Date.now() - startTime) / 1000));

              setSessionId(session.id);
              setIsMining(true);
              setElapsedTime(elapsed);
              setEarnedPoints(Math.max(Number(session.arx_mined ?? 0), 0));
              sessionStartTimeRef.current = startTime;
              endingRef.current = false;
            }
          }

          if (payload.eventType === 'UPDATE') {
            if (!session.is_active && session.id === sessionId) {
              setIsMining(false);
              setSessionId(null);
              setElapsedTime(0);
              setEarnedPoints(0);
              lastDbPointsRef.current = 0;
              lastDbWriteAtRef.current = 0;
              sessionStartTimeRef.current = null;
              endingRef.current = false;
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, sessionId]);

  // Use refs to track current values for the realtime callback
  const isMiningRef = useRef(isMining);
  const sessionIdRef = useRef(sessionId);
  const earnedPointsRef = useRef(earnedPoints);

  useEffect(() => {
    isMiningRef.current = isMining;
  }, [isMining]);

  useEffect(() => {
    sessionIdRef.current = sessionId;
  }, [sessionId]);

  useEffect(() => {
    earnedPointsRef.current = earnedPoints;
  }, [earnedPoints]);

  // Real-time subscription for mining settings (admin controls)
  useEffect(() => {
    const channel = supabase
      .channel('mining-settings-changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'mining_settings',
        },
        async (payload) => {
          const newSettings = payload.new as any;

          const next: MiningSettings = {
            publicMiningEnabled: newSettings.public_mining_enabled,
            claimingEnabled: newSettings.claiming_enabled,
            blockReward: newSettings.block_reward,
            consensusMode: newSettings.consensus_mode,
          };

          setMiningSettings(next);
          cacheSet(miningSettingsCacheKey, next);

          if (!newSettings.public_mining_enabled && isMiningRef.current && sessionIdRef.current) {
            toast({
              title: 'Mining Disabled',
              description: 'Public mining has been disabled by admin. Your session has ended.',
              variant: 'destructive',
            });

            await endSession(sessionIdRef.current, earnedPointsRef.current);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [endSession]);

  const formatTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs
      .toString()
      .padStart(2, '0')}`;
  };

  return {
    isMining,
    loading,
    settingsLoading,
    elapsedTime,
    remainingTime,
    earnedPoints: Math.max(0, earnedPoints),
    maxTimeSeconds,
    startMining,
    stopMining,
    claimPoints,
    formatTime,
    referralBonus,
    xProfileBoost,
    xPostBoost,
    totalArenaBoost,
    totalNexusBoost,
    streakBoost,
    totalBoostPercentage,
    pointsPerHour: cappedPointsPerHour,
    pointsPerSecond,
    miningSettings,
    sessionMaxed, // New: indicates session reached max time, waiting for manual claim
  };
};
