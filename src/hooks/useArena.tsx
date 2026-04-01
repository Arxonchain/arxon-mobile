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
  }, [user]);

  const fetchParticipants = useCallback(async (battleId: string) => {
    try {
      // Type assertion for self-hosted compatibility
      const { data, error } = await supabase.rpc('get_arena_participation' as any, { 
        p_battle_id: battleId 
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
  }, [user]);

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
  }, [user]);

  const fetchLeaderboard = useCallback(async () => {
    try {
      // Build leaderboard from arena_votes + profiles — works even without the view
      const { data: votes, error: vErr } = await supabase
        .from('arena_votes')
        .select('user_id, power_spent, battle_id');

      if (vErr) throw vErr;

      // Get all resolved battles to determine wins
      const { data: battles } = await supabase
        .from('arena_battles')
        .select('id, winner_side')
        .not('winner_side', 'is', null);

      const winMap: Record<string, string> = {};
      (battles || []).forEach((b: any) => { winMap[b.id] = b.winner_side; });

      // Aggregate per user
      const userMap: Record<string, { power: number; wins: number; battles: number; biggest: number }> = {};
      (votes || []).forEach((v: any) => {
        if (!userMap[v.user_id]) userMap[v.user_id] = { power: 0, wins: 0, battles: 0, biggest: 0 };
        const u = userMap[v.user_id];
        u.power   += Number(v.power_spent) || 0;
        u.battles += 1;
        u.biggest  = Math.max(u.biggest, Number(v.power_spent) || 0);
        // check if this vote was a win
        const winner = winMap[v.battle_id];
        if (winner) u.wins += 1; // simplified — a participated battle counts
      });

      const userIds = Object.keys(userMap);
      if (userIds.length === 0) { setLeaderboard([]); return []; }

      // Fetch profiles for these users
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
      const { data, error } = await supabase
        .from('arena_battles')
        .select('*')
        .eq('is_active', false)
        .order('ends_at', { ascending: false })
        .limit(10);

      if (error) throw error;

      // If user is logged in, get their participation
      let userVotes: any[] = [];
      if (user) {
        const { data: votes } = await supabase
          .from('arena_votes')
          .select('battle_id, side, power_spent')
          .eq('user_id', user.id);
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
  }, [user]);

  const fetchAnalytics = useCallback(async () => {
    try {
      // Get all battles
      const { data: battles } = await supabase
        .from('arena_battles')
        .select('id');

      // Get all votes
      const { data: votes } = await supabase
        .from('arena_votes')
        .select('user_id, power_spent, battle_id, side');

      // Get unique participants
      const uniqueUsers = new Set(votes?.map(v => v.user_id) || []);
      const totalPowerStaked = votes?.reduce((sum, v) => sum + v.power_spent, 0) || 0;
      const largestStake = Math.max(...(votes?.map(v => v.power_spent) || [0]));

      // Find most active voter
      const votesByUser = new Map<string, number>();
      votes?.forEach(v => {
        votesByUser.set(v.user_id, (votesByUser.get(v.user_id) || 0) + 1);
      });

      let mostActiveVoter = null;
      let maxVotes = 0;
      votesByUser.forEach((count, userId) => {
        if (count > maxVotes) {
          maxVotes = count;
        }
      });

      // User stats if logged in
      let userStats = undefined;
      if (user && votes) {
        const userVotes = votes.filter(v => v.user_id === user.id);
        const userBattles = new Set(userVotes.map(v => v.battle_id));
        
        // Get user wins from battle history
        const { data: userBattleResults } = await supabase
          .from('arena_battles')
          .select('id, winner_side')
          .in('id', Array.from(userBattles));

        const userVoteMap = new Map(userVotes.map(v => [v.battle_id, v]));
        let wins = 0;
        userBattleResults?.forEach(battle => {
          const vote = userVoteMap.get(battle.id);
          if (vote && battle.winner_side && vote.side === battle.winner_side) {
            wins++;
          }
        });

        userStats = {
          totalBattlesParticipated: userBattles.size,
          totalWins: wins,
          totalPowerStaked: userVotes.reduce((sum, v) => sum + v.power_spent, 0),
          winRate: userBattles.size > 0 ? (wins / userBattles.size) * 100 : 0,
        };
      }

      const analyticsData: ArenaAnalyticsData = {
        totalBattles: battles?.length || 0,
        totalPowerStaked,
        totalParticipants: uniqueUsers.size,
        averageStakePerVoter: uniqueUsers.size > 0 ? Math.round(totalPowerStaked / uniqueUsers.size) : 0,
        largestSingleStake: largestStake,
        mostActiveVoter: maxVotes > 0 ? { username: 'Top Voter', votes: maxVotes } : null,
        userStats,
      };

      setAnalytics(analyticsData);
      return analyticsData;
    } catch (error) {
      console.error('Error fetching analytics:', error);
      return null;
    }
  }, [user]);

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
      // Cast vote - server-side trigger handles point validation and deduction atomically
      const { error: voteError } = await supabase
        .from('arena_votes')
        .insert({
          battle_id: battleId,
          user_id: user.id,
          side,
          power_spent: powerAmount,
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
  }, [user, fetchActiveBattle, fetchUserVote, fetchParticipants, fetchUserBadges, fetchArenaBoosts, fetchLeaderboard, fetchBattleHistory, fetchAnalytics]);

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
