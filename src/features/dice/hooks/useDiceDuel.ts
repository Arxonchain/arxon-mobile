/** Dice Roll — 1v1 Duel (PvP escrow, best of 3) lobby + live match state, synced via Supabase Realtime. */
import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { usePoints } from '@/hooks/usePoints';

/** Coalesce bursts of realtime events (e.g. several rolls landing at once) into one refetch,
 *  so a run of state updates doesn't fire mid-scroll on lower-end devices. */
function useDebouncedRefetch(fn: () => void, delayMs = 200) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  return useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(fn, delayMs);
  }, [fn, delayMs]);
}

export interface DuelChallenge {
  id: string;
  stake: number;
  pot: number;
  createdBy: string;
  username: string;
  avatarUrl: string | null;
  createdAt: string;
  inviteCode?: string | null;
  expiresAt?: string | null;
}

type ActionResult =
  | { success: true; matchId?: string; inviteCode?: string; expiresAt?: string }
  | { success: false; error: string };

async function fetchProfilesMap(userIds: string[]) {
  if (!userIds.length) return {} as Record<string, { username: string; avatar_url: string | null }>;
  const { data } = await supabase.from('profiles').select('user_id, username, avatar_url').in('user_id', userIds);
  const map: Record<string, { username: string; avatar_url: string | null }> = {};
  for (const p of data ?? []) map[p.user_id] = { username: p.username, avatar_url: p.avatar_url };
  return map;
}

export type MyDiceMatch = {
  id: string;
  status: string;
  mode: string;
  stake: number;
  inviteCode?: string | null;
  expiresAt?: string | null;
  createdBy?: string | null;
  maxPlayers?: number;
  pot?: number;
};

export function useDiceDuelLobby() {
  const { user } = useAuth();
  const { refreshPoints } = usePoints();
  const [challenges, setChallenges] = useState<DuelChallenge[]>([]);
  const [myMatch, setMyMatch] = useState<MyDiceMatch | null>(null);
  const [blockingMatch, setBlockingMatch] = useState<MyDiceMatch | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    if (!user) {
      setChallenges([]);
      setMyMatch(null);
      setBlockingMatch(null);
      setLoading(false);
      return;
    }
    try {
      // Prefer SECURITY DEFINER list (bypasses RLS bugs + runs expire)
      let mine: MyDiceMatch | null = null;
      let blocking: MyDiceMatch | null = null;
      try {
        const { data: listed } = await supabase.rpc('list_my_open_dice_matches' as any);
        const rows = ((listed as any)?.matches ?? []) as any[];
        const mapped = rows.map((m: any) => ({
          id: m.id as string,
          status: m.status as string,
          mode: m.mode as string,
          stake: Number(m.stake) || 0,
          inviteCode: m.invite_code ?? null,
          expiresAt: m.expires_at ?? null,
          createdBy: m.created_by ?? null,
          maxPlayers: m.max_players,
          pot: m.pot,
        }));
        mine = mapped.find((m) => m.mode === 'duel') ?? null;
        blocking = mapped.find((m) => m.mode !== 'duel') ?? null;
      } catch {
        /* fall through to table query */
      }

      if (!mine && !blocking) {
        const { data: myRows } = await (supabase as any)
          .from('dice_match_players')
          .select('match_id')
          .eq('user_id', user.id);
        const myMatchIds = (myRows ?? []).map((r: any) => r.match_id);
        if (myMatchIds.length) {
          const { data: myMatches } = await (supabase as any)
            .from('dice_matches')
            .select('id, status, mode, stake, created_at, invite_code, expires_at, created_by, max_players, pot')
            .in('id', myMatchIds)
            .in('mode', ['duel', 'rumble'])
            .in('status', ['open', 'active'])
            .order('created_at', { ascending: false });
          const rows = myMatches ?? [];
          const duel = rows.find((m: any) => m.mode === 'duel');
          const other = rows.find((m: any) => m.mode !== 'duel');
          if (duel) {
            mine = {
              id: duel.id,
              status: duel.status,
              mode: duel.mode,
              stake: duel.stake,
              inviteCode: duel.invite_code ?? null,
              expiresAt: duel.expires_at ?? null,
              createdBy: duel.created_by ?? null,
              maxPlayers: duel.max_players,
              pot: duel.pot,
            };
          }
          if (other) {
            blocking = {
              id: other.id,
              status: other.status,
              mode: other.mode,
              stake: other.stake,
              inviteCode: other.invite_code ?? null,
              expiresAt: other.expires_at ?? null,
              createdBy: other.created_by ?? null,
              maxPlayers: other.max_players,
              pot: other.pot,
            };
          }
        }
      }

      setMyMatch(mine);
      setBlockingMatch(blocking);

      const nowIso = new Date().toISOString();
      const { data: open } = await (supabase as any)
        .from('dice_matches')
        .select('id, stake, pot, created_by, created_at, invite_code, expires_at')
        .eq('mode', 'duel')
        .eq('status', 'open')
        .neq('created_by', user.id)
        .or(`expires_at.gt.${nowIso},expires_at.is.null`)
        .order('created_at', { ascending: false })
        .limit(30);

      const creatorIds = Array.from(new Set((open ?? []).map((m: any) => m.created_by as string)));
      const profilesMap = await fetchProfilesMap(creatorIds);

      setChallenges(
        (open ?? []).map((m: any) => ({
          id: m.id,
          stake: m.stake,
          pot: m.pot,
          createdBy: m.created_by,
          username: profilesMap[m.created_by]?.username ?? 'Miner',
          avatarUrl: profilesMap[m.created_by]?.avatar_url ?? null,
          createdAt: m.created_at,
          inviteCode: m.invite_code ?? null,
          expiresAt: m.expires_at ?? null,
        }))
      );
    } catch (err) {
      console.error('Failed to load duel lobby', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const debouncedRefresh = useDebouncedRefetch(() => void refresh());

  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel('dice-duel-lobby')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'dice_matches', filter: 'mode=eq.duel' }, () => {
        debouncedRefresh();
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, debouncedRefresh]);

  const createChallenge = useCallback(async (stake: number): Promise<ActionResult> => {
    setBusy(true);
    try {
      const { data, error } = await supabase.rpc('create_dice_duel_match' as any, { p_stake: stake });
      if (error) return { success: false, error: error.message };
      const d = data as any;
      if (!d?.success) return { success: false, error: d?.error || 'Failed to create challenge' };
      void refreshPoints();
      await refresh();
      return {
        success: true,
        matchId: d.match_id as string,
        inviteCode: d.invite_code as string | undefined,
        expiresAt: d.expires_at as string | undefined,
      };
    } finally {
      setBusy(false);
    }
  }, [refresh, refreshPoints]);

  const joinChallenge = useCallback(async (matchId: string): Promise<ActionResult> => {
    setBusy(true);
    try {
      const { data, error } = await supabase.rpc('join_dice_duel_match' as any, { p_match_id: matchId });
      if (error) return { success: false, error: error.message };
      const d = data as any;
      if (!d?.success) return { success: false, error: d?.error || 'Failed to join challenge' };
      void refreshPoints();
      await refresh();
      return { success: true, matchId: (d.match_id as string) ?? matchId };
    } finally {
      setBusy(false);
    }
  }, [refresh, refreshPoints]);

  const joinByCode = useCallback(async (code: string): Promise<ActionResult> => {
    setBusy(true);
    try {
      const { data, error } = await supabase.rpc('join_dice_match_by_code' as any, {
        p_invite_code: code.trim().toUpperCase(),
      });
      if (error) return { success: false, error: error.message };
      const d = data as any;
      if (!d?.success) return { success: false, error: d?.error || 'Failed to join with code' };
      void refreshPoints();
      await refresh();
      return { success: true, matchId: d.match_id as string };
    } finally {
      setBusy(false);
    }
  }, [refresh, refreshPoints]);

  const cancelChallenge = useCallback(async (matchId: string): Promise<ActionResult> => {
    setBusy(true);
    try {
      const { data, error } = await supabase.rpc('cancel_dice_duel_match' as any, { p_match_id: matchId });
      if (error) return { success: false, error: error.message };
      const d = data as any;
      if (!d?.success) return { success: false, error: d?.error || 'Failed to cancel challenge' };
      void refreshPoints();
      await refresh();
      return { success: true };
    } finally {
      setBusy(false);
    }
  }, [refresh, refreshPoints]);

  const cancelMyOpenMatches = useCallback(async (): Promise<ActionResult> => {
    setBusy(true);
    try {
      const { data, error } = await supabase.rpc('cancel_my_open_dice_matches' as any);
      if (error) return { success: false, error: error.message };
      const d = data as any;
      if (!d?.success) return { success: false, error: d?.error || 'Failed to clear stuck matches' };
      void refreshPoints();
      await refresh();
      return { success: true };
    } finally {
      setBusy(false);
    }
  }, [refresh, refreshPoints]);

  return {
    challenges,
    myMatch,
    blockingMatch,
    loading,
    busy,
    refresh,
    createChallenge,
    joinChallenge,
    joinByCode,
    cancelChallenge,
    cancelMyOpenMatches,
  };
}

export interface DuelPlayerInfo {
  userId: string;
  seat: number;
  roundsWon: number;
  username: string;
  avatarUrl: string | null;
  isMe: boolean;
}

export interface DuelRoundResult {
  round: number;
  myDie1: number;
  myDie2: number;
  myTotal: number;
  oppDie1: number;
  oppDie2: number;
  oppTotal: number;
  result: 'me' | 'opponent' | 'tie';
}

export function useDiceDuelMatch(matchId: string | undefined) {
  const { user } = useAuth();
  const { refreshPoints } = usePoints();
  const [match, setMatch] = useState<any | null>(null);
  const [players, setPlayers] = useState<DuelPlayerInfo[]>([]);
  const [myCurrentRoll, setMyCurrentRoll] = useState<{ die1: number; die2: number } | null>(null);
  const [oppHasRolled, setOppHasRolled] = useState(false);
  const [lastRound, setLastRound] = useState<DuelRoundResult | null>(null);
  const [waitingForOpponent, setWaitingForOpponent] = useState(false);
  const [loading, setLoading] = useState(true);
  const [rolling, setRolling] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    if (!matchId || !user) return;
    const { data: m } = await (supabase as any).from('dice_matches').select('*').eq('id', matchId).maybeSingle();
    if (!m) {
      setError('Match not found');
      setLoading(false);
      return;
    }
    setMatch(m);

    const { data: p } = await (supabase as any).from('dice_match_players').select('*').eq('match_id', matchId);
    const ids = (p ?? []).map((row: any) => row.user_id).filter(Boolean);
    const profilesMap = await fetchProfilesMap(ids);

    setPlayers(
      (p ?? [])
        .map((row: any) => ({
          userId: row.user_id,
          seat: row.seat,
          roundsWon: row.rounds_won,
          username: profilesMap[row.user_id]?.username ?? 'Miner',
          avatarUrl: profilesMap[row.user_id]?.avatar_url ?? null,
          isMe: row.user_id === user.id,
        }))
        .sort((a: DuelPlayerInfo, b: DuelPlayerInfo) => a.seat - b.seat)
    );

    if (m.status === 'active' || m.status === 'complete') {
      const resolvedRound = m.status === 'complete' ? m.current_round : m.current_round - 1;
      if (resolvedRound >= 1) {
        const { data: rolls } = await (supabase as any).from('dice_rolls').select('*').eq('match_id', matchId).eq('round', resolvedRound);
        const myR = (rolls ?? []).find((r: any) => r.user_id === user.id);
        const oppR = (rolls ?? []).find((r: any) => r.user_id !== user.id);
        if (myR && oppR) {
          const myTotal = myR.die1 + myR.die2;
          const oppTotal = oppR.die1 + oppR.die2;
          setLastRound({
            round: resolvedRound,
            myDie1: myR.die1,
            myDie2: myR.die2,
            myTotal,
            oppDie1: oppR.die1,
            oppDie2: oppR.die2,
            oppTotal,
            result: myTotal > oppTotal ? 'me' : oppTotal > myTotal ? 'opponent' : 'tie',
          });
        } else {
          setLastRound(null);
        }
      } else {
        setLastRound(null);
      }
    }

    if (m.status === 'active') {
      const { data: myRoll } = await (supabase as any)
        .from('dice_rolls')
        .select('die1, die2')
        .eq('match_id', matchId)
        .eq('round', m.current_round)
        .eq('user_id', user.id)
        .maybeSingle();
      setMyCurrentRoll(myRoll ? { die1: myRoll.die1, die2: myRoll.die2 } : null);
      setWaitingForOpponent(!!myRoll);

      const oppRow = (p ?? []).find((row: any) => row.user_id && row.user_id !== user.id);
      if (oppRow) {
        const { data: oppRoll } = await (supabase as any)
          .from('dice_rolls')
          .select('id')
          .eq('match_id', matchId)
          .eq('round', m.current_round)
          .eq('user_id', oppRow.user_id)
          .maybeSingle();
        setOppHasRolled(!!oppRoll);
      } else {
        setOppHasRolled(false);
      }
    } else {
      setMyCurrentRoll(null);
      setOppHasRolled(false);
      setWaitingForOpponent(false);
    }

    setLoading(false);
  }, [matchId, user]);

  useEffect(() => {
    void fetchAll();
  }, [fetchAll]);

  const debouncedFetchAll = useDebouncedRefetch(() => void fetchAll(), 150);

  useEffect(() => {
    if (!matchId) return;
    const channel = supabase
      .channel(`dice-duel-match-${matchId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'dice_matches', filter: `id=eq.${matchId}` }, () => {
        debouncedFetchAll();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'dice_match_players', filter: `match_id=eq.${matchId}` }, () => {
        debouncedFetchAll();
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'dice_rolls', filter: `match_id=eq.${matchId}` }, () => {
        debouncedFetchAll();
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [matchId, debouncedFetchAll]);

  const roll = useCallback(async () => {
    if (!matchId) return;
    setRolling(true);
    setError(null);
    try {
      const { data, error } = await supabase.rpc('roll_dice_duel' as any, { p_match_id: matchId });
      if (error) {
        setError(error.message);
        return;
      }
      const d = data as any;
      if (!d?.success) {
        setError(d?.error || 'Roll failed');
        return;
      }
      if (!d.waiting) void refreshPoints();
      await fetchAll();
    } finally {
      setRolling(false);
    }
  }, [matchId, fetchAll, refreshPoints]);

  const me = players.find((p) => p.isMe) ?? null;
  const opponent = players.find((p) => !p.isMe) ?? null;
  const isCreator = match?.created_by === user?.id;

  return {
    match,
    players,
    me,
    opponent,
    myCurrentRoll,
    oppHasRolled,
    lastRound,
    waitingForOpponent,
    loading,
    rolling,
    error,
    isCreator,
    roll,
    refresh: fetchAll,
  };
}
