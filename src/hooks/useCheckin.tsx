import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { usePoints } from './usePoints';
import { toast } from '@/hooks/use-toast';

interface CheckinResult {
  success: boolean;
  streak_day: number;
  points_awarded: number;
  streak_boost: number;
  message: string;
}

export const useCheckin = () => {
  const { user } = useAuth();
  const { triggerConfetti, points, refreshPoints } = usePoints();
  const [canCheckin, setCanCheckin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [todayCheckin, setTodayCheckin] = useState<any>(null);
  const [streakBoost, setStreakBoost] = useState(0);

  const checkTodayCheckin = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      const today = new Date().toISOString().split('T')[0];
      
      const { data, error } = await supabase
        .from('daily_checkins')
        .select('*')
        .eq('user_id', user.id)
        .eq('checkin_date', today)
        .maybeSingle();

      if (error) throw error;

      setTodayCheckin(data);
      setCanCheckin(!data);
      
      // Calculate current streak boost (1% per day, max 30%)
      const currentStreak = points?.daily_streak || 0;
      setStreakBoost(Math.min(currentStreak, 30));
    } catch (error) {
      console.error('Error checking today checkin:', error);
    } finally {
      setLoading(false);
    }
  }, [user, points?.daily_streak]);

  const performCheckin = async () => {
    if (!user || !canCheckin) return;

    try {
      // Use atomic server-side function with type assertion to avoid schema cache issues
      const { data, error } = await supabase
        .rpc('perform_daily_checkin' as any, { p_user_id: user.id });

      if (error) throw error;

      const result = data?.[0] as CheckinResult | undefined;
      
      if (!result?.success) {
        toast({
          title: "Check-in Failed",
          description: result?.message || "Could not complete check-in",
          variant: "destructive"
        });
        return;
      }

      setCanCheckin(false);
      setStreakBoost(result.streak_boost);
      triggerConfetti();

      // Show success with streak info
      const streakEmoji = result.streak_day >= 7 ? '🔥' : result.streak_day >= 3 ? '⚡' : '✨';
      
      toast({
        title: `Day ${result.streak_day} Streak! ${streakEmoji}`,
        description: `+${result.points_awarded} ARX-P | +${result.streak_boost}% mining boost`,
      });

      // Refresh to get updated points
      await refreshPoints();
      
      // Fetch updated check-in record
      const today = new Date().toISOString().split('T')[0];
      const { data: checkinData } = await supabase
        .from('daily_checkins')
        .select('*')
        .eq('user_id', user.id)
        .eq('checkin_date', today)
        .maybeSingle();
      
      setTodayCheckin(checkinData);
    } catch (error: any) {
      console.error('Error performing checkin:', error);
      toast({
        title: "Check-in Failed",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  // Initial fetch
  useEffect(() => {
    checkTodayCheckin();
  }, [checkTodayCheckin]);

  // Real-time subscription removed to reduce backend load and improve responsiveness.
  // The UI refreshes via initial fetch and after performCheckin().

  return {
    canCheckin,
    loading,
    todayCheckin,
    performCheckin,
    currentStreak: points?.daily_streak || 0,
    streakBoost // +1% per day, max 30%
  };
};
