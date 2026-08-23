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

const mapAdminStats = (data: Record<string, unknown>): AdminStats => ({
  totalUsers: Number(data.totalUsers || 0),
  activeMiners: Number(data.activeMiners || 0),
  totalMiningPoints: Number(data.totalMiningPoints || 0),
  totalPoints: Number(data.totalPoints || 0),
  totalReferrals: Number(data.totalReferrals || 0),
  claimingEnabled: Boolean(data.claimingEnabled),
  blockReward: Number(data.blockReward || 1000),
  totalMinersEver: Number(data.totalMinersEver || 0),
  totalTaskPoints: Number(data.totalTaskPoints || 0),
  totalSocialPoints: Number(data.totalSocialPoints || 0),
  totalReferralPoints: Number(data.totalReferralPoints || 0),
  totalCheckinPoints: Number(data.totalCheckinPoints || 0),
  totalArenaEarnings: Number(data.totalArenaEarnings || 0),
  totalSessions: Number(data.totalSessions || 0),
  totalSessionsArxMined: Number(data.totalSessionsArxMined || 0),
  avgPointsPerUser: Number(data.avgPointsPerUser || 0),
  todaySignups: Number(data.todaySignups || 0),
  todayMiningPoints: Number(data.todayMiningPoints || 0),
});

export const useAdminStats = () => {
  return useQuery({
    queryKey: ["admin-global-stats"],
    queryFn: async (): Promise<AdminStats> => {
      const { data, error } = await supabase.rpc("get_admin_global_stats" as any);
      if (error) throw error;
      return mapAdminStats((data || {}) as Record<string, unknown>);
    },
    refetchInterval: 60000,
    staleTime: 30000,
    gcTime: 120000,
    refetchOnWindowFocus: false,
  });
};

export const formatNumber = (num: number) => {
  if (num >= 1000000) return `${(num / 1000000).toFixed(2)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toLocaleString();
};
