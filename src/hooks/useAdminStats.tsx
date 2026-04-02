import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface AdminStats {
  totalUsers: number;
  activeMiners: number;
  totalMiningPoints: number;
  totalPoints: number;
  totalReferrals: number;
  claimingEnabled: boolean;
  blockReward: number;
  totalMinersEver: number;
  totalTaskPoints: number;
  totalSocialPoints: number;
  totalReferralPoints: number;
  totalCheckinPoints: number;
  totalArenaEarnings: number;
  totalSessions: number;
  totalSessionsArxMined: number;
  avgPointsPerUser: number;
  todaySignups: number;
  todayMiningPoints: number;
}

export const useAdminStats = () => {
  return useQuery({
    queryKey: ["admin-global-stats"],
    queryFn: async (): Promise<AdminStats> => {

      // Total users
      const { count: totalUsers } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true });

      // Active miners (last 8 hours only)
      const eightHoursAgo = new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString();
      const { count: activeMiners } = await supabase
        .from("mining_sessions")
        .select("*", { count: "exact", head: true })
        .eq("is_active", true)
        .gte("started_at", eightHoursAgo);

      // Mining session stats via RPC (no full table scan)
      const { data: sessionAgg } = await supabase
        .rpc("get_mining_session_stats" as any);
      const totalMinersEver = Number(sessionAgg?.[0]?.unique_miners || 0);
      const totalSessions = Number(sessionAgg?.[0]?.total_sessions || 0);
      const totalSessionsArxMined = Number(sessionAgg?.[0]?.total_arx_mined || 0);

      // Today's mining points (today only, not all time)
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const { data: todaySessions } = await supabase
        .from("mining_sessions")
        .select("arx_mined")
        .gte("started_at", todayStart.toISOString());
      const todayMiningPoints = todaySessions?.reduce(
        (sum, s) => sum + Number(s.arx_mined || 0), 0
      ) || 0;

      // User points — aggregated in batches
      let allPointsData: {
        mining_points: number;
        total_points: number;
        task_points: number;
        social_points: number;
        referral_points: number;
      }[] = [];
      let offset = 0;
      const batchSize = 1000;
      let hasMore = true;
      while (hasMore) {
        const { data: batch } = await supabase
          .from("user_points")
          .select("mining_points, total_points, task_points, social_points, referral_points")
          .range(offset, offset + batchSize - 1);
        if (batch && batch.length > 0) {
          allPointsData = [...allPointsData, ...batch];
          offset += batchSize;
          hasMore = batch.length === batchSize;
        } else {
          hasMore = false;
        }
      }
      const totalMiningPoints = allPointsData.reduce(
        (sum, p) => sum + Number(p.mining_points || 0), 0
      );
      const totalPoints = allPointsData.reduce(
        (sum, p) => sum + Number(p.total_points || 0), 0
      );
      const totalTaskPoints = allPointsData.reduce(
        (sum, p) => sum + Number(p.task_points || 0), 0
      );
      const totalSocialPoints = allPointsData.reduce(
        (sum, p) => sum + Number(p.social_points || 0), 0
      );
      const totalReferralPoints = allPointsData.reduce(
        (sum, p) => sum + Number(p.referral_points || 0), 0
      );
      const avgPointsPerUser =
        allPointsData.length > 0
          ? Math.round(totalPoints / allPointsData.length)
          : 0;

      // Referrals count
      const { count: totalReferrals } = await supabase
        .from("referrals")
        .select("*", { count: "exact", head: true });

      // Arena earnings
      const { data: arenaEarnings } = await supabase
        .from("arena_earnings")
        .select("total_earned");
      const totalArenaEarnings =
        arenaEarnings?.reduce(
          (sum, e) => sum + Number(e.total_earned || 0), 0
        ) || 0;

      // Check-in points
      const { data: checkins } = await supabase
        .from("daily_checkins")
        .select("points_awarded");
      const totalCheckinPoints =
        checkins?.reduce(
          (sum, c) => sum + Number(c.points_awarded || 0), 0
        ) || 0;

      // Today's signups
      const { count: todaySignups } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true })
        .gte("created_at", todayStart.toISOString());

      // Mining settings
      const { data: settings } = await supabase
        .from("mining_settings")
        .select("claiming_enabled, block_reward")
        .limit(1)
        .maybeSingle();

      return {
        totalUsers: totalUsers ?? 0,
        activeMiners: activeMiners ?? 0,
        totalMiningPoints,
        totalPoints,
        totalReferrals: totalReferrals ?? 0,
        claimingEnabled: settings?.claiming_enabled ?? false,
        blockReward: settings?.block_reward || 1000,
        totalMinersEver,
        totalTaskPoints,
        totalSocialPoints,
        totalReferralPoints,
        totalCheckinPoints,
        totalArenaEarnings,
        totalSessions,
        totalSessionsArxMined,
        avgPointsPerUser,
        todaySignups: todaySignups || 0,
        todayMiningPoints,
      };
    },
    refetchInterval: 60000,       // was 10s → now 60s
    staleTime: 30000,             // was 3s → now 30s
    gcTime: 120000,
    refetchOnWindowFocus: false,  // stop refetching on every tab switch
  });
};

export const formatNumber = (num: number) => {
  if (num >= 1000000) return `${(num / 1000000).toFixed(2)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toLocaleString();
};
