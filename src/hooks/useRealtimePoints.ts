/**
 * useRealtimePoints.ts — ENH-16
 *
 * Subscribes to realtime changes on user_points for the current user.
 * Call this in MobileDashboard to get live point updates without pull-to-refresh.
 *
 * Usage:
 *   const { latestPoints } = useRealtimePoints();
 *   // latestPoints updates automatically when points change in the DB
 *
 * Already integrated into usePoints() via refreshPoints() —
 * this hook adds the REALTIME subscription layer on top.
 */
import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { usePoints } from '@/hooks/usePoints';

export function useRealtimePoints() {
  const { user }           = useAuth();
  const { refreshPoints }  = usePoints();

  useEffect(() => {
    if (!user) return;

    // Subscribe to changes on user_points for this user
    const channel = supabase
      .channel(`realtime-points-${user.id}`)
      .on(
        'postgres_changes',
        {
          event:  '*',
          schema: 'public',
          table:  'user_points',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          // Refresh local points cache when DB changes
          void refreshPoints();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, refreshPoints]);
}
