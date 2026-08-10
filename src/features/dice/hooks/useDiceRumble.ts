/** Dice Roll — Rumble (multiplayer elimination, PvP escrow) lobby + live match state via Supabase Realtime. */
import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { usePoints } from '@/hooks/usePoints';

/** Coalesce bursts of realtime events (e.g. several players rolling at once) into one refetch,
 *  so a run of state updates doesn't fire mid-scroll on lower-end devices. */
function useDebouncedRefetch(fn: () => void, delayMs = 200) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  return useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(fn, delayMs);
  }, [fn, delayMs]);
}

export interface RumbleLobby {
  id: string;
  stake: number;
  maxPlayers: number;
  createdBy: string;
  username: string;
  avatarUrl: string | null;
  playersJoined: number;
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

export type MyRumbleMatch = {
  id: string;
  status: string;
  mode: string;
  stake: number;
  inviteCode?: string | null;
  expiresAt?: string | null;
  maxPlayers?: number;
  createdBy?: string | null;
  pot?: number;
};

export function useDiceRumbleLobby() {
  const { user } = useAuth();
  const { refreshPoints } = usePoints();
  const [lobbies, setLobbies] = useState<RumbleLobby[]>([]);
  const [myMatch, setMyMatch] = useState<MyRumbleMatch | null>(null);
  const [blockingMatch, setBlockingMatch] = useState<MyRumbleMatch | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    if (!user) {
      setLobbies([]);
      setMyMatch(null);
      setBlockingMatch(null);
      setLoading(false);
      return;
    }
    try {
      let mine: MyRumbleMatch | null = null;
      let blocking: MyRumbleMatch | null = null;
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
          maxPlayers: m.max_players,
          createdBy: m.created_by ?? null,
          pot: m.pot,
        }));
        mine = mapped.find((m) => m.mode === 'rumble') ?? null;
        blocking = mapped.find((m) => m.mode !== 'rumble') ?? null;
      } catch {
        /* fall through */
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
            .select('id, status, mode, stake, created_at, invite_code, expires_at, max_players, created_by, pot')
            .in('id', myMatchIds)
            .in('mode', ['duel', 'rumble'])
            .in('status', ['open', 'active'])
            .order('created_at', { ascending: false });
          const rows = myMatches ?? [];
          const rumble = rows.find((m: any) => m.mode === 'rumble');
          const other = rows.find((m: any) => m.mode !== 'rumble');
          if (rumble) {
            mine = {
              id: rumble.id,
              status: rumble.status,
              mode: rumble.mode,
              stake: rumble.stake,
              inviteCode: rumble.invite_code ?? null,
              expiresAt: rumble.expires_at ?? null,
              maxPlayers: rumble.max_players,
              createdBy: rumble.created_by ?? null,
              pot: rumble.pot,
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
              maxPlayers: other.max_players,
              createdBy: other.created_by ?? null,
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
        .select('id, stake, max_players, created_by, created_at, invite_code, expires_at')
        .eq('mode', 'rumble')
        .eq('status', 'open')
        .neq('created_by', user.id)
        .or(`expires_at.gt.${nowIso},expires_at.is.null`)
        .order('created_at', { ascending: false })
        .limit(30);

      const matchIds = (open ?? []).map((m: any) => m.id);
      let countsByMatch: Record<string, number> = {};
      if (matchIds.length) {
        const { data: playerRows } = await (supabase as any).from('dice_match_players').select('match_id').in('match_id', matchIds);
        for (const row of playerRows ?? []) {
          countsByMatch[row.match_id] = (countsByMatch[row.match_id] ?? 0) + 1;
        }
      }

      const creatorIds = Array.from(new Set((open ?? []).map((m: any) => m.created_by as string)));
      const profilesMap = await fetchProfilesMap(creatorIds);

      setLobbies(
        (open ?? []).map((m: any) => ({
          id: m.id,
          stake: m.stake,
          maxPlayers: m.max_players,
          createdBy: m.created_by,
          username: profilesMap[m.created_by]?.username ?? 'Miner',
          avatarUrl: profilesMap[m.created_by]?.avatar_url ?? null,
          playersJoined: countsByMatch[m.id] ?? 1,
          createdAt: m.created_at,
          inviteCode: m.invite_code ?? null,
          expiresAt: m.expires_at ?? null,
        }))
      );
    } catch (err) {
      console.error('Failed to load rumble lobbies', err);
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
    // Note: dice_match_players has no `mode` column to filter on directly, so this leg
    // necessarily also fires for house/duel player rows — debounced above to avoid
    // refetch storms when the table is busy.
    const channel = supabase
      .channel('dice-rumble-lobby')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'dice_matches', filter: 'mode=eq.rumble' }, () => {
        debouncedRefresh();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'dice_match_players' }, () => {
        debouncedRefresh();
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, debouncedRefresh]);

  const createLobby = useCallback(async (stake: number, maxPlayers: number): Promise<ActionResult> => {
    setBusy(true);
    try {
      const { data, error } = await supabase.rpc('create_dice_rumble_lobby' as any, { p_stake: stake, p_max_players: maxPlayers });
      if (error) return { success: false, error: error.message };
      const d = data as any;
      if (!d?.success) return { success: false, error: d?.error || 'Failed to create lobby' };
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

  const joinLobby = useCallback(async (matchId: string): Promise<ActionResult> => {
    setBusy(true);
    try {
      const { data, error } = await supabase.rpc('join_dice_rumble_lobby' as any, { p_match_id: matchId });
      if (error) return { success: false, error: error.message };
      const d = data as any;
      if (!d?.success) return { success: false, error: d?.error || 'Failed to join lobby' };
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

  const cancelLobby = useCallback(async (matchId: string): Promise<ActionResult> => {
    setBusy(true);
    try {
      const { data, error } = await supabase.rpc('cancel_dice_rumble_lobby' as any, { p_match_id: matchId });
      if (error) return { success: false, error: error.message };
      const d = data as any;
      if (!d?.success) return { success: false, error: d?.error || 'Failed to cancel lobby' };
      void refreshPoints();
      await refresh();
      return { success: true };
    } finally {
      setBusy(false);
    }
  }, [refresh, refreshPoints]);

  const leaveLobby = useCallback(async (matchId: string): Promise<ActionResult> => {
    setBusy(true);
    try {
      const { data, error } = await supabase.rpc('leave_dice_rumble_lobby' as any, { p_match_id: matchId });
      if (error) return { success: false, error: error.message };
      const d = data as any;
      if (!d?.success) return { success: false, error: d?.error || 'Failed to leave lobby' };
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
    lobbies,
    myMatch,
    blockingMatch,
    loading,
    busy,
    refresh,
    createLobby,
    joinLobby,
    joinByCode,
    cancelLobby,
    leaveLobby,
    cancelMyOpenMatches,
  };
}

export interface RumblePlayerInfo {
  userId: string;
  seat: number;
  username: string;
  avatarUrl: string | null;
  isMe: boolean;
  eliminatedRound: number | null;
  alive: boolean;
  roll: { die1: number; die2: number; total: number; eliminated: boolean } | null;
}

export interface RumbleRoundSummary {
  round: number;
  rolls: { userId: string; username: string; die1: number; die2: number; total: number; eliminated: boolean }[];
}

export function useDiceRumbleMatch(matchId: string | undefined) {
  const { user } = useAuth();
  const { refreshPoints } = usePoints();
  const [match, setMatch] = useState<any | null>(null);
  const [players, setPlayers] = useState<RumblePlayerInfo[]>([]);
  const [lastRound, setLastRound] = useState<RumbleRoundSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [rolling, setRolling] = useState(false);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    if (!matchId || !user) return;
    const { data: m } = await (supabase as any).from('dice_matches').select('*').eq('id', matchId).maybeSingle();
    if (!m) {
      setError('Lobby not found');
      setLoading(false);
      return;
    }
    setMatch(m);

    const { data: p } = await (supabase as any).from('dice_match_players').select('*').eq('match_id', matchId);
    const ids = (p ?? []).map((row: any) => row.user_id).filter(Boolean);
    const profilesMap = await fetchProfilesMap(ids);

    let currentRolls: any[] = [];
    if (m.status === 'active') {
      const { data: rolls } = await (supabase as any).from('dice_rolls').select('*').eq('match_id', matchId).eq('round', m.current_round);
      currentRolls = rolls ?? [];
    }

    setPlayers(
      (p ?? [])
        .map((row: any) => {
          const r = currentRolls.find((rr) => rr.user_id === row.user_id);
          return {
            userId: row.user_id,
            seat: row.seat,
            username: profilesMap[row.user_id]?.username ?? 'Miner',
            avatarUrl: profilesMap[row.user_id]?.avatar_url ?? null,
            isMe: row.user_id === user.id,
            eliminatedRound: row.eliminated_round,
            alive: row.eliminated_round == null,
            roll: r ? { die1: r.die1, die2: r.die2, total: r.die1 + r.die2, eliminated: false } : null,
          } as RumblePlayerInfo;
        })
        .sort((a: RumblePlayerInfo, b: RumblePlayerInfo) => a.seat - b.seat)
    );

    if (m.status === 'active' || m.status === 'complete') {
      const resolvedRound = m.status === 'complete' ? m.current_round : m.current_round - 1;
      if (resolvedRound >= 1) {
        const { data: rolls } = await (supabase as any).from('dice_rolls').select('*').eq('match_id', matchId).eq('round', resolvedRound);
        if (rolls && rolls.length) {
          const totals = rolls.map((r: any) => r.die1 + r.die2);
          const minTotal = Math.min(...totals);
          setLastRound({
            round: resolvedRound,
            rolls: rolls.map((r: any) => ({
              userId: r.user_id,
              username: profilesMap[r.user_id]?.username ?? 'Miner',
              die1: r.die1,
              die2: r.die2,
              total: r.die1 + r.die2,
              eliminated: r.die1 + r.die2 === minTotal,
            })),
          });
        } else {
          setLastRound(null);
        }
      } else {
        setLastRound(null);
      }
    } else {
      setLastRound(null);
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
      .channel(`dice-rumble-match-${matchId}`)
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
      const { data, error } = await supabase.rpc('roll_dice_rumble' as any, { p_match_id: matchId });
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

  const startNow = useCallback(async () => {
    if (!matchId) return;
    setStarting(true);
    setError(null);
    try {
      const { data, error } = await supabase.rpc('start_dice_rumble_match' as any, { p_match_id: matchId });
      if (error) {
        setError(error.message);
        return;
      }
      const d = data as any;
      if (!d?.success) {
        setError(d?.error || 'Could not start match');
        return;
      }
      await fetchAll();
    } finally {
      setStarting(false);
    }
  }, [matchId, fetchAll]);

  const me = players.find((p) => p.isMe) ?? null;
  const isCreator = match?.created_by === user?.id;
  const alivePlayers = players.filter((p) => p.alive);
  const eliminatedPlayers = players.filter((p) => !p.alive).sort((a, b) => (b.eliminatedRound ?? 0) - (a.eliminatedRound ?? 0));

  return {
    match,
    players,
    me,
    isCreator,
    alivePlayers,
    eliminatedPlayers,
    lastRound,
    loading,
    rolling,
    starting,
    error,
    roll,
    startNow,
    refresh: fetchAll,
  };
}
