import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { usePoints } from './usePoints';
import { toast } from '@/hooks/use-toast';

const MAX_MINING_HOURS = 8;
const BASE_POINTS_PER_HOUR = 10;
const maxTimeSeconds = MAX_MINING_HOURS * 60 * 60;

/**
 * Hook that runs once on app load to recover and credit any expired mining sessions.
 * This ensures users who had active sessions but left the app get their points.
 * 
 * CRITICAL FIX: Uses backend edge function for reliable crediting to prevent
 * the issue where sessions end but points never get credited due to network failures.
 */
export const useSessionRecovery = () => {
  const { user } = useAuth();
  const { addPoints, points, refreshPoints } = usePoints();
  const hasRunRef = useRef(false);

  useEffect(() => {
    if (!user || hasRunRef.current) return;
    hasRunRef.current = true;

    const recoverExpiredSessions = async () => {
      try {
        // Find all active sessions for this user that are expired (8+ hours old)
        const { data: sessions, error } = await supabase
          .from('mining_sessions')
          .select('id, started_at, arx_mined, is_active, credited_at')
          .eq('user_id', user.id)
          .eq('is_active', true)
          .order('started_at', { ascending: false });

        if (error || !sessions || sessions.length === 0) return;

        // Get user's boost percentages for accurate point calculation
        const referralBonus = points?.referral_bonus_percentage || 0;
        const xPostBoost = (points as any)?.x_post_boost_percentage || 0;
        const streakBoost = Math.min(points?.daily_streak || 0, 30);

        // Fetch X profile boost
        let xProfileBoost = 0;
        const { data: xProfile } = await supabase
          .from('x_profiles')
          .select('boost_percentage')
          .eq('user_id', user.id)
          .maybeSingle();
        if (xProfile) xProfileBoost = xProfile.boost_percentage || 0;

        // Fetch active arena boosts
        let arenaBoost = 0;
        const { data: arenaBoosts } = await supabase
          .from('arena_boosts')
          .select('boost_percentage')
          .eq('user_id', user.id)
          .gte('expires_at', new Date().toISOString());
        if (arenaBoosts) {
          arenaBoost = arenaBoosts.reduce((sum, b) => sum + b.boost_percentage, 0);
        }

        // Fetch active nexus boosts
        let nexusBoost = 0;
        const { data: nexusBoosts } = await supabase
          .from('nexus_boosts')
          .select('boost_percentage')
          .eq('user_id', user.id)
          .eq('claimed', true)
          .gte('expires_at', new Date().toISOString());
        if (nexusBoosts) {
          nexusBoost = nexusBoosts.reduce((sum, b) => sum + b.boost_percentage, 0);
        }

        // Calculate total boost (capped at 500%)
        const totalBoost = Math.min(referralBonus + xProfileBoost + xPostBoost + arenaBoost + nexusBoost + streakBoost, 500);
        const pointsPerHour = Math.min(BASE_POINTS_PER_HOUR * (1 + totalBoost / 100), 60);

        let totalRecovered = 0;
        let sessionsRecovered = 0;

        // Process each session
        for (const session of sessions) {
          const startTime = new Date(session.started_at).getTime();
          const elapsed = Math.floor((Date.now() - startTime) / 1000);

          // Only auto-finalize sessions that are expired (8+ hours)
          if (elapsed >= maxTimeSeconds) {
            // ALWAYS round UP to whole number
            const calculatedPoints = Math.min(480, Math.ceil((maxTimeSeconds / 3600) * pointsPerHour));
            const dbPoints = Math.max(0, Math.ceil(Number(session.arx_mined ?? 0)));
            const finalPoints = Math.max(calculatedPoints, dbPoints);

            // End the session first
            const { data: updated, error: updateError } = await supabase
              .from('mining_sessions')
              .update({
                is_active: false,
                ended_at: new Date().toISOString(),
                arx_mined: finalPoints,
              })
              .eq('id', session.id)
              .eq('is_active', true) // Only update if still active (prevents double-crediting)
              .select('id')
              .maybeSingle();

            if (!updateError && updated && finalPoints > 0) {
              // Use addPoints which calls the secure backend - pass session_id for validation
              const result = await addPoints(finalPoints, 'mining', session.id);
              
              if (result.success) {
                totalRecovered += result.points || finalPoints;
                sessionsRecovered++;
              } else {
                // Points failed but session ended - will be picked up by backfill
                console.warn(`Session ${session.id} recovery failed: ${result.error}`);
              }
            }
          }
        }

        // Show toast if any sessions were recovered
        if (sessionsRecovered > 0) {
          // Refresh points to show updated balance
          await refreshPoints();
          
          toast({
            title: 'Mining Sessions Recovered! 🎉',
            description: `You earned ${Math.ceil(totalRecovered)} ARX-P from ${sessionsRecovered} previous session${sessionsRecovered > 1 ? 's' : ''}`,
          });
        }
      } catch (error) {
        console.error('Session recovery error:', error);
      }
    };

    // Run with a small delay to let auth settle
    const timeout = setTimeout(recoverExpiredSessions, 1000);
    return () => clearTimeout(timeout);
  }, [user, addPoints, points, refreshPoints]);
};
