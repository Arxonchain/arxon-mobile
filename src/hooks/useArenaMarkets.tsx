import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { usePoints } from './usePoints';
import { toast } from 'sonner';

export interface ArenaMarket {
  id: string;
  title: string;
  description: string | null;
  side_a_name: string;
  side_a_image: string | null;
  side_a_color: string;
  side_b_name: string;
  side_b_image: string | null;
  side_b_color: string;
  side_a_power: number;
  side_b_power: number;
  // Third option support (e.g., Draw)
  side_c_name: string | null;
  side_c_image: string | null;
  side_c_color: string | null;
  side_c_power: number;
  starts_at: string;
  ends_at: string;
  is_active: boolean;
  winner_side: string | null;
  winner_boost_percentage: number;
  prize_pool: number;
  bonus_percentage: number;
  category: string;
  resolution_source: string | null;
  total_participants: number;
  // AI predictions
  ai_side_a_probability: number;
  ai_side_b_probability: number;
  ai_prediction_text: string | null;
  ai_confidence: string;
  ai_last_updated: string | null;
}

export interface MarketVote {
  id: string;
  battle_id: string;
  user_id: string;
  side: 'a' | 'b' | 'c';
  power_spent: number;
  locked_until: string;
  created_at: string;
  early_stake_multiplier: number;
}

export interface EarningsLeaderboardEntry {
  user_id: string;
  username: string | null;
  avatar_url: string | null;
  club: 'alpha' | 'omega' | null;
  current_win_streak: number;
  best_win_streak: number;
  total_battles: number;
  total_wins: number;
  total_staked: number;
  total_earned: number;
  total_bonus_earned: number;
  total_pool_share_earned: number;
  total_streak_bonus: number;
  net_profit: number;
  win_rate: number;
}

export interface UserMarketPosition {
  marketId: string;
  side: 'a' | 'b';
  staked: number;
  potentialWin: number;
}

export type MarketStatus = 'live' | 'upcoming' | 'ended';

export const useArenaMarkets = () => {
  const { user } = useAuth();
  const { points } = usePoints();
  
  const [liveMarkets, setLiveMarkets] = useState<ArenaMarket[]>([]);
  const [upcomingMarkets, setUpcomingMarkets] = useState<ArenaMarket[]>([]);
  const [endedMarkets, setEndedMarkets] = useState<ArenaMarket[]>([]);
  const [userPositions, setUserPositions] = useState<Map<string, MarketVote>>(new Map());
  const [earningsLeaderboard, setEarningsLeaderboard] = useState<EarningsLeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [voting, setVoting] = useState(false);
  const [selectedMarket, setSelectedMarket] = useState<ArenaMarket | null>(null);

  // Fetch all markets categorized by status
  const fetchMarkets = useCallback(async () => {
    try {
      const now = new Date().toISOString();
      
      // Fetch all battles
      const { data: allMarkets, error } = await supabase
        .from('arena_battles')
        .select('*')
        .order('ends_at', { ascending: true });

      if (error) throw error;

      const markets = (allMarkets || []) as ArenaMarket[];
      
      // Categorize markets
      const live: ArenaMarket[] = [];
      const upcoming: ArenaMarket[] = [];
      const ended: ArenaMarket[] = [];

      markets.forEach((market) => {
        const startsAt = new Date(market.starts_at);
        const endsAt = new Date(market.ends_at);
        const nowDate = new Date();

        // IMPORTANT: A resolved market should always show in history,
        // even if is_active/ends_at were not updated correctly in production.
        if (market.winner_side) {
          ended.push(market);
          return;
        }

        if (startsAt > nowDate) {
          upcoming.push(market);
          return;
        }

        if (endsAt > nowDate && market.is_active) {
          live.push(market);
          return;
        }

        ended.push(market);
      });

      // Sort: live by ending soonest, upcoming by starting soonest, ended by most recent
      live.sort((a, b) => new Date(a.ends_at).getTime() - new Date(b.ends_at).getTime());
      upcoming.sort((a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime());
      ended.sort((a, b) => new Date(b.ends_at).getTime() - new Date(a.ends_at).getTime());

      setLiveMarkets(live);
      setUpcomingMarkets(upcoming);
      setEndedMarkets(ended); // show full history (UI/search already filters)

      return { live, upcoming, ended };
    } catch (error) {
      console.error('Error fetching markets:', error);
      return { live: [], upcoming: [], ended: [] };
    }
  }, []);

  // Fetch user's positions in all markets
  const fetchUserPositions = useCallback(async () => {
    if (!user) {
      setUserPositions(new Map());
      return;
    }

    try {
      const { data: votes, error } = await supabase
        .from('arena_votes')
        .select('*')
        .eq('user_id', user.id);

      if (error) throw error;

      const positionsMap = new Map<string, MarketVote>();
      (votes || []).forEach((vote: any) => {
        positionsMap.set(vote.battle_id, vote as MarketVote);
      });

      setUserPositions(positionsMap);
    } catch (error) {
      console.error('Error fetching user positions:', error);
    }
  }, [user]);

  // Fetch earnings leaderboard (uses arena_team_leaderboard view which includes active participants)
  const fetchEarningsLeaderboard = useCallback(async () => {
    try {
      // Use the arena_team_leaderboard view which shows all arena members with their stakes
      // This view joins arena_members, profiles, and arena_votes to show participants
      // even before battles resolve (unlike arena_earnings_leaderboard which only shows resolved data)
      const { data, error } = await supabase
        .from('arena_team_leaderboard' as any)
        .select('*')
        .limit(100);

      if (error) {
        // Fallback to arena_earnings_leaderboard if new view doesn't exist
        console.warn('arena_team_leaderboard error, falling back to arena_earnings_leaderboard:', error.message);
        const { data: fallbackData, error: fallbackError } = await supabase
          .from('arena_earnings_leaderboard')
          .select('*')
          .limit(100);
        
        if (fallbackError) throw fallbackError;
        const sanitized = (fallbackData || []).map((e: any) => ({
          ...e,
          total_staked: Math.floor(Number(e.total_staked) || 0),
          total_earned: Math.floor(Number(e.total_earned) || 0),
          net_profit: Math.floor(Number(e.net_profit) || 0),
          total_bonus_earned: Math.floor(Number(e.total_bonus_earned) || 0),
          total_pool_share_earned: Math.floor(Number(e.total_pool_share_earned) || 0),
          total_streak_bonus: Math.floor(Number(e.total_streak_bonus) || 0),
        }));
        setEarningsLeaderboard(sanitized as unknown as EarningsLeaderboardEntry[]);
        return;
      }
      
      const sanitizedData = (data || []).map((e: any) => ({
        ...e,
        total_staked: Math.floor(Number(e.total_staked) || 0),
        total_earned: Math.floor(Number(e.total_earned) || 0),
        net_profit: Math.floor(Number(e.net_profit) || 0),
        total_bonus_earned: Math.floor(Number(e.total_bonus_earned) || 0),
        total_pool_share_earned: Math.floor(Number(e.total_pool_share_earned) || 0),
        total_streak_bonus: Math.floor(Number(e.total_streak_bonus) || 0),
      }));
      setEarningsLeaderboard(sanitizedData as unknown as EarningsLeaderboardEntry[]);
    } catch (error) {
      console.error('Error fetching earnings leaderboard:', error);
    }
  }, []);

  // Calculate potential returns for a stake
  // Matches actual payout logic in resolve-arena-battle:
  // Winners get: stake back + proportional share of loser pool + proportional share of prize pool
  // No artificial multipliers or bonus percentages applied
  const calculatePotentialReturns = useCallback((
    market: ArenaMarket,
    side: 'a' | 'b' | 'c',
    stakeAmount: number
  ) => {
    // Get my pool and other pools
    let myPool: number;
    let otherPools: number;
    
    if (side === 'a') {
      myPool = market.side_a_power;
      otherPools = market.side_b_power + (market.side_c_power || 0);
    } else if (side === 'c') {
      myPool = market.side_c_power || 0;
      otherPools = market.side_a_power + market.side_b_power;
    } else {
      myPool = market.side_b_power;
      otherPools = market.side_a_power + (market.side_c_power || 0);
    }
    
    const newMyPool = myPool + stakeAmount;
    const totalStakes = newMyPool + otherPools;
    const prizePool = market.prize_pool || 0;

    // TOTAL POOL = all stakes + prize pool (this is the max that can ever be distributed)
    const totalPool = totalStakes + prizePool;

    // Your weight in the winning pool (proportional to your stake)
    const myShare = newMyPool > 0 ? stakeAmount / newMyPool : 0;

    // Realistic payout: proportional share of pools
    const stakeReturn = stakeAmount; // You get your stake back
    const loserPoolShare = Math.floor(myShare * otherPools); // Share of losers' stakes
    const prizePoolShare = Math.floor(myShare * prizePool); // Share of prize pool

    // Raw net profit (what you gain beyond getting stake back)
    const rawNetProfit = loserPoolShare + prizePoolShare;

    // CRITICAL: Cap displayed profit based on pool fill ratio
    // When pools are empty, your "share" is 100% which is misleading
    // because more people WILL join. Scale max displayed multiplier with participation.
    const poolFillRatio = totalStakes > 0 ? Math.min(totalStakes / Math.max(prizePool, 1), 1) : 0;
    // Empty pool: max 2x profit. Full pool: up to 10x profit.
    const maxDisplayMultiplier = 2 + (poolFillRatio * 8);
    const cappedNetProfit = Math.min(rawNetProfit, Math.floor(stakeAmount * maxDisplayMultiplier));

    const totalWin = stakeReturn + cappedNetProfit;
    const totalLoss = stakeAmount;

    // Display multiplier = totalWin / stake
    const multiplier = stakeAmount > 0 ? Math.round((totalWin / stakeAmount) * 10) / 10 : 1;

    const netProfit = cappedNetProfit;

    return {
      multiplier,
      bonusPercentage: 0,
      stakeReturn,
      bonusFromPrizePool: prizePoolShare,
      loserPoolShare,
      multiplierBonus: 0,
      totalWin,
      netProfit,
      totalLoss,
      isUnderdog: newMyPool < otherPools,
      myPoolPercentage: totalStakes > 0 ? Math.round((newMyPool / totalStakes) * 100) : 33,
      winChance: totalStakes > 0 ? Math.round((newMyPool / totalStakes) * 100) : 33,
    };
  }, []);

  // Place a vote on a market
  const placeVote = async (marketId: string, side: 'a' | 'b' | 'c', amount: number): Promise<boolean> => {
    console.log('[Arena placeVote] START', { marketId, side, amount, userId: user?.id });
    
    if (!user) {
      console.log('[Arena placeVote] FAIL: no user');
      toast.error('Please sign in to cast your vote');
      return false;
    }

    // Look in all market arrays - client state can be stale
    const market = liveMarkets.find(m => m.id === marketId)
      || upcomingMarkets.find(m => m.id === marketId)
      || endedMarkets.find(m => m.id === marketId);

    if (!market) {
      console.log('[Arena placeVote] FAIL: market not found in any array', { 
        liveCount: liveMarkets.length, upcomingCount: upcomingMarkets.length, endedCount: endedMarkets.length 
      });
      toast.error('This market is not available for voting');
      return false;
    }

    // Check timing based on real clock, not stale categorization
    const now = new Date();
    const startsAt = new Date(market.starts_at);
    const endsAt = new Date(market.ends_at);

    if (startsAt > now) {
      console.log('[Arena placeVote] FAIL: not started yet', { startsAt: startsAt.toISOString(), now: now.toISOString() });
      toast.error('Voting has not started yet. Please wait until the market goes live.');
      return false;
    }

    if (endsAt < now || market.winner_side) {
      console.log('[Arena placeVote] FAIL: market ended', { endsAt: endsAt.toISOString(), winner: market.winner_side });
      toast.error('This market has ended. Voting is closed.');
      return false;
    }

    if (!points || points.total_points < amount) {
      console.log('[Arena placeVote] FAIL: insufficient points', { available: points?.total_points, needed: amount });
      toast.error(`Insufficient ARX-P points (have ${points?.total_points || 0}, need ${amount})`);
      return false;
    }

    if (amount < 1000) {
      toast.error('Minimum stake is 1,000 ARX-P');
      return false;
    }

    if (amount > 100000) {
      toast.error('Maximum stake is 100,000 ARX-P');
      return false;
    }

    // Check if user already has a position in this market
    if (userPositions.has(marketId)) {
      console.log('[Arena placeVote] FAIL: already voted on this market');
      toast.error('You already voted on this prediction');
      return false;
    }

    setVoting(true);

    try {
      console.log('[Arena] Placing vote:', { marketId, side, amount, userId: user.id });
      
      const { data: voteData, error: voteError } = await supabase
        .from('arena_votes')
        .insert({
          battle_id: marketId,
          user_id: user.id,
          side,
          power_spent: amount,
        })
        .select()
        .single();

      if (voteError) {
        console.error('[Arena] Vote insert failed:', voteError);
        throw voteError;
      }

      console.log('[Arena] Vote inserted successfully:', voteData);
      toast.success('Vote cast successfully! +25% mining boost activated 🚀');
      
      // Refresh data
      await Promise.all([
        fetchMarkets(),
        fetchUserPositions(),
      ]);

      return true;
    } catch (error: any) {
      console.error('[Arena] Error casting vote:', error);
      const msg = error?.message || error?.details || 'Failed to cast vote';
      toast.error(msg);
      return false;
    } finally {
      setVoting(false);
    }
  };

  // Initial data load
  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await Promise.all([
        fetchMarkets(),
        fetchUserPositions(),
        fetchEarningsLeaderboard(),
      ]);
      setLoading(false);
    };

    init();
  }, [fetchMarkets, fetchUserPositions, fetchEarningsLeaderboard]);

  // Timer to check for upcoming markets transitioning to live
  useEffect(() => {
    const checkMarketTransitions = () => {
      const now = new Date();
      
      // Check if any upcoming market should now be live
      const shouldTransition = upcomingMarkets.some(market => {
        const startsAt = new Date(market.starts_at);
        return startsAt <= now;
      });

      if (shouldTransition) {
        fetchMarkets();
      }
    };

    // Check every second for precise transitions
    const interval = setInterval(checkMarketTransitions, 1000);
    
    return () => clearInterval(interval);
  }, [upcomingMarkets, fetchMarkets]);

  // Real-time subscription for market updates and leaderboard
  useEffect(() => {
    const channel = supabase
      .channel('arena-markets-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'arena_battles',
        },
        () => {
          fetchMarkets();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'arena_votes',
        },
        () => {
          fetchMarkets();
          fetchEarningsLeaderboard(); // Refresh leaderboard when new votes come in
          if (user) fetchUserPositions();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'arena_members',
        },
        () => {
          fetchEarningsLeaderboard(); // Refresh leaderboard when members change
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'arena_earnings',
        },
        () => {
          fetchEarningsLeaderboard(); // Refresh leaderboard when earnings are distributed
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchMarkets, fetchUserPositions, fetchEarningsLeaderboard, user]);

  return {
    liveMarkets,
    upcomingMarkets,
    endedMarkets,
    userPositions,
    earningsLeaderboard,
    loading,
    voting,
    selectedMarket,
    setSelectedMarket,
    placeVote,
    calculatePotentialReturns,
    refreshMarkets: fetchMarkets,
    refreshLeaderboard: fetchEarningsLeaderboard,
    availablePoints: points?.total_points || 0,
  };
};
