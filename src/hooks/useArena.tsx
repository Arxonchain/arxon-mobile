import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { usePoints } from './usePoints';
import { toast } from 'sonner';

export interface ArenaBattle {
  id: string;
  title: string;
  description: string | null;
  side_a_name: string;
  side_a_image: string | null;
  side_a_color: string;
  side_b_name: string;
  side_b_image: string | null;
  side_b_color: string;
  banner_image: string | null;
  side_a_power: number;
  side_b_power: number;
  starts_at: string;
  ends_at: string;
  is_active: boolean;
  winner_side: string | null;
  winner_boost_percentage: number;
  category: string | null;
  prize_pool: number | null;
}

export interface ArenaVote {
  id: string;
  battle_id: string;
  user_id: string;
  side: 'a' | 'b';
  power_spent: number;
  locked_until: string;
  created_at: string;
}

export interface ArenaParticipant {
  user_id: string;
  power_spent: number;
  created_at: string;
  username: string | null;
  avatar_url: string | null;
}

export interface UserBadge {
  id: string;
  badge_type: string;
  badge_name: string;
  description: string | null;
  battle_id: string | null;
  earned_at: string;
}

export interface ArenaBoost {
  id: string;
  battle_id: string;
  boost_percentage: number;
  expires_at: string;
}

export interface LeaderboardEntry {
  user_id: string;
  username: string | null;
  avatar_url: string | null;
  total_power_staked: number;
  total_wins: number;
  total_battles: number;
  biggest_stake: number;
  club?: string | null;
}

export interface BattleHistoryEntry extends ArenaBattle {
  user_participated?: boolean;
  user_voted_side?: 'a' | 'b' | null;
  user_won?: boolean;
  user_stake?: number;
}

export interface ArenaAnalyticsData {
  totalBattles: number;
  totalPowerStaked: number;
  totalParticipants: number;
  averageStakePerVoter: number;
  largestSingleStake: number;
  mostActiveVoter: { username: string; votes: number } | null;
  userStats?: {
    totalBattlesParticipated: number;
    totalWins: number;
    totalPowerStaked: number;
    winRate: number;
  };
}

export const useArena = () => {
  const { user } = useAuth();
  const { points } = usePoints();
  const [activeBattle, setActiveBattle] = useState<ArenaBattle | null>(null);
  const [userVote, setUserVote] = useState<ArenaVote | null>(null);
  const [participants, setParticipants] = useState<ArenaParticipant[]>([]);
  const [userBadges, setUserBadges] = useState<UserBadge[]>([]);
  const [arenaBoosts, setArenaBoosts] = useState<ArenaBoost[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [battleHistory, setBattleHistory] = useState<BattleHistoryEntry[]>([]);
  const [analytics, setAnalytics] = useState<ArenaAnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [voting, setVoting] = useState(false);

  const fetchActiveBattle = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('arena_battles')
        .select('*')
        .eq('is_active', true)
        .gte('ends_at', new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      setActiveBattle(data);
      return data;
    } catch (error) {
      console.error('Error fetching active battle:', error);
      return null;
    }
  }, []);

  const fetchUserVote = useCallback(async (battleId: string) => {
    if (!user) return null;

    try {
      const { data, error } = await supabase
        .from('arena_votes')
        .select('*')
        .eq('battle_id', battleId)
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;
      setUserVote(data as ArenaVote | null);
      return data as ArenaVote | null;
    } catch (error) {
      console.error('Error fetching user vote:', error);
      return null;
    }
  }, [user?.id]);

  const fetchParticipants = useCallback(async (battleId: string) => {
    try {
      // Type assertion for self-hosted compatibility
      const { data, error } = await supabase.rpc('get_arena_participation' as any, { 
        p_battle_id: battleId,
        p_limit: 100,
      });

      if (error) throw error;

      const formatted = (data || []).map((item: any) => ({
        user_id: item.user_id,
        power_spent: item.power_spent,
        created_at: item.created_at,
        username: item.username,
        avatar_url: item.avatar_url,
      }));

      setParticipants(formatted);
      return formatted;
    } catch (error) {
      console.error('Error fetching participants:', error);
      return [];
    }
  }, []);

  const fetchUserBadges = useCallback(async () => {
    if (!user) return [];

    try {
      const { data, error } = await supabase
        .from('user_badges')
        .select('*')
        .eq('user_id', user.id)
        .order('earned_at', { ascending: false });

      if (error) throw error;
      setUserBadges(data || []);
      return data || [];
    } catch (error) {
      console.error('Error fetching badges:', error);
      return [];
    }
  }, [user?.id]);

  const fetchArenaBoosts = useCallback(async () => {
    if (!user) return [];

    try {
      const { data, error } = await supabase
        .from('arena_boosts')
        .select('*')
        .eq('user_id', user.id)
        .gte('expires_at', new Date().toISOString());

      if (error) throw error;
      setArenaBoosts(data || []);
      return data || [];
    } catch (error) {
      console.error('Error fetching arena boosts:', error);
      return [];
    }
  }, [user?.id]);

  const fetchLeaderboard = useCallback(async () => {
    try {
      // Prefer earnings aggregate (world-readable) over raw arena_votes (own-only under RLS)
      const { data: earnings, error: eErr } = await supabase
        .from('arena_earnings')
        .select('user_id, stake_amount, total_earned, is_winner');

      if (eErr) throw eErr;

      const userMap: Record<string, { power: number; wins: number; battles: number; biggest: number }> = {};
      (earnings || []).forEach((row: any) => {
        if (!userMap[row.user_id]) userMap[row.user_id] = { power: 0, wins: 0, battles: 0, biggest: 0 };
        const u = userMap[row.user_id];
        u.power += Number(row.stake_amount) || 0;
        u.battles += 1;
        u.biggest = Math.max(u.biggest, Number(row.stake_amount) || 0);
        if (row.is_winner) u.wins += 1;
      });

      const userIds = Object.keys(userMap);
      if (userIds.length === 0) { setLeaderboard([]); return []; }

      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, username, avatar_url')
        .in('user_id', userIds);

      const profileMap: Record<string, any> = {};
      (profiles || []).forEach((p: any) => { profileMap[p.user_id] = p; });

      const leaderboardData: LeaderboardEntry[] = userIds.map(uid => ({
        user_id:           uid,
        username:          profileMap[uid]?.username || null,
        avatar_url:        profileMap[uid]?.avatar_url || null,
        total_power_staked: Math.floor(userMap[uid].power),
        total_wins:         userMap[uid].wins,
        total_battles:      userMap[uid].battles,
        biggest_stake:      Math.floor(userMap[uid].biggest),
      })).sort((a, b) => b.total_power_staked - a.total_power_staked).slice(0, 50);

      setLeaderboard(leaderboardData);
      return leaderboardData;
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
      return [];
    }
  }, []);

  const fetchBattleHistory = useCallback(async () => {
    try {
      // Fetch ALL battles — upcoming, live, and ended
      const { data, error } = await supabase
        .from('arena_battles')
        .select('*')
        .order('starts_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      let userVotes: any[] = [];
      if (user && data?.length) {
        const battleIds = data.map((b: { id: string }) => b.id);
        const { data: votes } = await supabase
          .from('arena_votes')
          .select('battle_id, side, power_spent')
          .eq('user_id', user.id)
          .in('battle_id', battleIds);
        userVotes = votes || [];
      }

      const historyWithParticipation = (data || []).map((battle: any) => {
        const userVote = userVotes.find(v => v.battle_id === battle.id);
        return {
          ...battle,
          user_participated: !!userVote,
          user_voted_side: userVote?.side || null,
          user_won: userVote ? userVote.side === battle.winner_side : false,
          user_stake: userVote?.power_spent || 0,
        };
      });

      setBattleHistory(historyWithParticipation);
      return historyWithParticipation;
    } catch (error) {
      console.error('Error fetching battle history:', error);
      return [];
    }
  }, [user?.id]);

  const fetchAnalytics = useCallback(async () => {
    try {
      const { data, error } = await supabase.rpc('get_arena_analytics');

      if (error) throw error;

      const payload = data as {
        total_battles?: number;
        total_power_staked?: number;
        total_participants?: number;
        average_stake_per_voter?: number;
        largest_single_stake?: number;
        most_active_voter?: { username: string; votes: number } | null;
        user_stats?: {
          total_battles_participated: number;
          total_wins: number;
          total_power_staked: number;
          win_rate: number;
        } | null;
      } | null;

      const analyticsData: ArenaAnalyticsData = {
        totalBattles: Number(payload?.total_battles) || 0,
        totalPowerStaked: Number(payload?.total_power_staked) || 0,
        totalParticipants: Number(payload?.total_participants) || 0,
        averageStakePerVoter: Number(payload?.average_stake_per_voter) || 0,
        largestSingleStake: Number(payload?.largest_single_stake) || 0,
        mostActiveVoter: payload?.most_active_voter ?? null,
        userStats: payload?.user_stats
          ? {
              totalBattlesParticipated: Number(payload.user_stats.total_battles_participated) || 0,
              totalWins: Number(payload.user_stats.total_wins) || 0,
              totalPowerStaked: Number(payload.user_stats.total_power_staked) || 0,
              winRate: Number(payload.user_stats.win_rate) || 0,
            }
          : undefined,
      };

      setAnalytics(analyticsData);
      return analyticsData;
    } catch (error) {
      console.error('Error fetching analytics:', error);
      return null;
    }
  }, []);

  const castVote = async (battleId: string, side: 'a' | 'b', powerAmount: number) => {
    if (!user) {
      toast.error('Please sign in to vote');
      return false;
    }

    if (!points || points.total_points < powerAmount) {
      toast.error('Insufficient ARX-P points');
      return false;
    }

    if (powerAmount < 1000) {
      toast.error('Minimum stake is 1,000 ARX-P');
      return false;
    }

    if (powerAmount > 100000) {
      toast.error('Maximum stake is 100,000 ARX-P');
      return false;
    }

    setVoting(true);

    try {
      const { error: voteError } = await supabase.rpc('cast_arena_vote', {
        p_battle_id: battleId,
        p_side: side,
        p_amount: powerAmount,
      });

      if (voteError) throw voteError;

      toast.success('Points staked successfully!');
      
      // Refresh data
      await Promise.all([
        fetchActiveBattle(),
        fetchUserVote(battleId),
        fetchParticipants(battleId),
        fetchLeaderboard(),
        fetchAnalytics(),
      ]);

      return true;
    } catch (error: any) {
      console.error('Error casting vote:', error);
      // Handle specific error messages from trigger
      if (error.message?.includes('Insufficient points')) {
        toast.error('Insufficient ARX-P points');
      } else if (error.message?.includes('Minimum stake')) {
        toast.error('Minimum stake is 100 ARX-P');
      } else {
        toast.error(error.message || 'Failed to cast vote');
      }
      return false;
    } finally {
      setVoting(false);
    }
  };

  const getTotalArenaBoost = useCallback(() => {
    return arenaBoosts.reduce((total, boost) => total + boost.boost_percentage, 0);
  }, [arenaBoosts]);

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      const battle = await fetchActiveBattle();
      
      await Promise.all([
        battle ? fetchUserVote(battle.id) : Promise.resolve(),
        battle ? fetchParticipants(battle.id) : Promise.resolve(),
        fetchUserBadges(),
        fetchArenaBoosts(),
        fetchLeaderboard(),
        fetchBattleHistory(),
        fetchAnalytics(),
      ]);

      setLoading(false);
    };

    init();
  }, [user?.id, fetchActiveBattle, fetchUserVote, fetchParticipants, fetchUserBadges, fetchArenaBoosts, fetchLeaderboard, fetchBattleHistory, fetchAnalytics]);

  // Real-time subscription for battle updates
  useEffect(() => {
    if (!activeBattle) return;

    const channel = supabase
      .channel('arena-battle-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'arena_battles',
          filter: `id=eq.${activeBattle.id}`,
        },
        (payload) => {
          if (payload.new) {
            setActiveBattle(payload.new as ArenaBattle);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'arena_votes',
          filter: `battle_id=eq.${activeBattle.id}`,
        },
        () => {
          // Refresh participants when new vote comes in
          fetchParticipants(activeBattle.id);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeBattle?.id, fetchParticipants]);

  return {
    activeBattle,
    userVote,
    participants,
    userBadges,
    arenaBoosts,
    leaderboard,
    battleHistory,
    analytics,
    loading,
    voting,
    castVote,
    getTotalArenaBoost,
    refreshBattle: fetchActiveBattle,
    refreshParticipants: () => activeBattle && fetchParticipants(activeBattle.id),
    refreshLeaderboard: fetchLeaderboard,
    refreshAnalytics: fetchAnalytics,
  };
};
