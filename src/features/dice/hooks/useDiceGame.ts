/** Dice Roll — client hook wrapping the House-mode + Daily Free Roll RPCs (Phase 1). */
import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { usePoints } from '@/hooks/usePoints';
import {
  DICE_DAILY_FREE_ROLLS,
  DICE_DAILY_HOUSE_MATCHES,
  DICE_DAILY_HOUSE_WIN_CAP,
} from '../diceTokens';

export interface DiceDailyState {
  freeRollsUsed: number;
  freeRollsLeft: number;
  houseMatchesPlayed: number;
  houseMatchesLeft: number;
  houseNetWon: number;
}

export interface DiceFreeRollResult {
  die1: number;
  die2: number;
  total: number;
  reward: number;
  rollsLeft: number;
}

export interface DiceRoundResult {
  round: number;
  user_die1: number;
  user_die2: number;
  user_total: number;
  bot_die1: number;
  bot_die2: number;
  bot_total: number;
  result: 'user' | 'bot' | 'tie';
  user_wins_after: number;
  bot_wins_after: number;
}

export interface DiceHouseMatchResult {
  matchId: string;
  stake: number;
  pot: number;
  rounds: DiceRoundResult[];
  userWins: number;
  botWins: number;
  won: boolean;
  payout: number;
  netChange: number;
  balance: number;
}

const DEFAULT_DAILY: DiceDailyState = {
  freeRollsUsed: 0,
  freeRollsLeft: DICE_DAILY_FREE_ROLLS,
  houseMatchesPlayed: 0,
  houseMatchesLeft: DICE_DAILY_HOUSE_MATCHES,
  houseNetWon: 0,
};

export interface DiceHistoryEntry {
  id: string;
  kind: 'house' | 'free_roll';
  stake: number | null;
  pot: number | null;
  won: boolean;
  net: number;
  at: string;
}

export interface DiceSummary {
  lifetimeNet: number;
  lifetimeWon: number;
  lifetimeStaked: number;
  wins: number;
  houseMatches: number;
  freeRollsClaimed: number;
  history: DiceHistoryEntry[];
}

const DEFAULT_SUMMARY: DiceSummary = {
  lifetimeNet: 0,
  lifetimeWon: 0,
  lifetimeStaked: 0,
  wins: 0,
  houseMatches: 0,
  freeRollsClaimed: 0,
  history: [],
};

export function useDiceGame() {
  const { user } = useAuth();
  const { refreshPoints } = usePoints();
  const [daily, setDaily] = useState<DiceDailyState>(DEFAULT_DAILY);
  const [loadingDaily, setLoadingDaily] = useState(true);
  const [summary, setSummary] = useState<DiceSummary>(DEFAULT_SUMMARY);
  const [loadingSummary, setLoadingSummary] = useState(true);

  const refreshSummary = useCallback(async () => {
    if (!user) {
      setSummary(DEFAULT_SUMMARY);
      setLoadingSummary(false);
      return;
    }
    try {
      const { data, error } = await supabase.rpc('get_dice_summary' as any, { p_limit: 20 });
      if (error) throw error;
      const d = data as any;
      if (d?.success) {
        setSummary({
          lifetimeNet: Number(d.lifetime_net ?? 0),
          lifetimeWon: Number(d.lifetime_won ?? 0),
          lifetimeStaked: Number(d.lifetime_staked ?? 0),
          wins: d.wins ?? 0,
          houseMatches: d.house_matches ?? 0,
          freeRollsClaimed: d.free_rolls_claimed ?? 0,
          history: (d.history ?? []).map((h: any) => ({
            id: h.id,
            kind: h.kind,
            stake: h.stake,
            pot: h.pot,
            won: h.won,
            net: Number(h.net),
            at: h.at,
          })),
        });
      }
    } catch (err) {
      console.error('Failed to load dice summary', err);
    } finally {
      setLoadingSummary(false);
    }
  }, [user]);

  useEffect(() => {
    void refreshSummary();
  }, [refreshSummary]);

  const refreshDaily = useCallback(async () => {
    if (!user) {
      setDaily(DEFAULT_DAILY);
      setLoadingDaily(false);
      return;
    }
    try {
      const { data, error } = await supabase.rpc('get_dice_daily_state' as any);
      if (error) throw error;
      const d = data as any;
      if (d?.success) {
        setDaily({
          freeRollsUsed: d.free_rolls_used ?? 0,
          freeRollsLeft: d.free_rolls_left ?? DICE_DAILY_FREE_ROLLS,
          houseMatchesPlayed: d.house_matches_played ?? 0,
          houseMatchesLeft: d.house_matches_left ?? DICE_DAILY_HOUSE_MATCHES,
          houseNetWon: d.house_net_won ?? 0,
        });
      }
    } catch (err) {
      console.error('Failed to load dice daily state', err);
    } finally {
      setLoadingDaily(false);
    }
  }, [user]);

  useEffect(() => {
    void refreshDaily();
  }, [refreshDaily]);

  const claimFreeRoll = useCallback(async (): Promise<
    { success: true; result: DiceFreeRollResult } | { success: false; error: string }
  > => {
    const { data, error } = await supabase.rpc('claim_dice_free_roll' as any);
    if (error) return { success: false, error: error.message };
    const d = data as any;
    if (!d?.success) return { success: false, error: d?.error || 'Roll failed' };

    setDaily((prev) => ({ ...prev, freeRollsUsed: prev.freeRollsUsed + 1, freeRollsLeft: d.rolls_left }));
    void refreshPoints();
    void refreshSummary();

    return {
      success: true,
      result: { die1: d.die1, die2: d.die2, total: d.total, reward: d.reward, rollsLeft: d.rolls_left },
    };
  }, [refreshPoints, refreshSummary]);

  const playHouseMatch = useCallback(async (
    stake: number,
  ): Promise<{ success: true; result: DiceHouseMatchResult } | { success: false; error: string }> => {
    const { data, error } = await supabase.rpc('play_dice_house_match' as any, { p_stake: stake });
    if (error) return { success: false, error: error.message };
    const d = data as any;
    if (!d?.success) return { success: false, error: d?.error || 'Match failed' };

    setDaily((prev) => ({
      ...prev,
      houseMatchesPlayed: prev.houseMatchesPlayed + 1,
      houseMatchesLeft: Math.max(0, prev.houseMatchesLeft - 1),
      houseNetWon: prev.houseNetWon + d.net_change,
    }));
    void refreshPoints();
    void refreshSummary();

    return {
      success: true,
      result: {
        matchId: d.match_id,
        stake: d.stake,
        pot: d.pot,
        rounds: d.rounds ?? [],
        userWins: d.user_wins,
        botWins: d.bot_wins,
        won: d.won,
        payout: d.payout,
        netChange: d.net_change,
        balance: d.balance,
      },
    };
  }, [refreshPoints, refreshSummary]);

  return {
    daily,
    loadingDaily,
    refreshDaily,
    summary,
    loadingSummary,
    refreshSummary,
    claimFreeRoll,
    playHouseMatch,
    houseWinCapReached: daily.houseNetWon >= DICE_DAILY_HOUSE_WIN_CAP,
  };
}
