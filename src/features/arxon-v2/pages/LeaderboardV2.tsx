import { useCallback, useEffect, useState, type CSSProperties } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { usePoints } from '@/hooks/usePoints';
import { formatPointsDisplay } from '@/lib/formatPoints';
import { useAuth } from '@/hooks/useAuth';
import { useAdmin } from '@/hooks/useAdmin';
import { fetchGlobalLeaderboard } from '@/lib/fetchGlobalLeaderboard';
import { mobileTopPaddingPage } from '@/lib/mobileLayout';
import { frostWash, sheetGlass } from '@/walletFigma/flow/LiveScroll';
import { usePullRefresh } from '@/walletFigma/flow/pullRefresh';
import { MineLoad } from '../components/MineLoad';
import { MinerAvatar } from '../components/MinerAvatar';
import { V2Page } from '../design/Kit';
import { neon } from '../design/neonTokens';

interface Entry {
  user_id: string;
  username: string | null;
  total_points: number;
  avatar_url: string | null;
}

const ARENA = '#accafe';
const INK = '#0c1018';
const MUTED = '#5c6370';
const SOFT = '#8c8f99';

const frostCard: CSSProperties = {
  ...frostWash,
  borderRadius: 16,
  border: '1px solid rgba(61,109,255,0.32)',
  boxShadow: '0 10px 28px rgba(0,0,0,0.18)',
  boxSizing: 'border-box',
};

function YouCard({ rank, points }: { rank: number | null; points: number }) {
  return (
    <div
      style={{
        ...frostCard,
        padding: '12px 14px',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ margin: 0, fontSize: 11, fontWeight: 650, color: MUTED, fontFamily: neon.font }}>
          You
        </p>
        <p
          style={{
            margin: '2px 0 0',
            fontSize: 12,
            fontWeight: 600,
            color: MUTED,
            fontVariantNumeric: 'tabular-nums',
            fontFamily: neon.font,
          }}
        >
          {formatPointsDisplay(points)} ARX-P
        </p>
      </div>
      <p
        style={{
          margin: 0,
          fontSize: 22,
          fontWeight: 750,
          color: INK,
          letterSpacing: '-0.6px',
          lineHeight: 1,
          fontVariantNumeric: 'tabular-nums',
          fontFamily: neon.font,
        }}
      >
        {rank ? `#${rank}` : '—'}
      </p>
    </div>
  );
}

function PodiumFirst({
  entry,
  isMe,
  onOpen,
}: {
  entry: Entry;
  isMe: boolean;
  onOpen?: () => void;
}) {
  return (
    <motion.button
      type="button"
      whileTap={onOpen ? { scale: 0.98 } : undefined}
      onClick={onOpen}
      style={{
        width: '100%',
        ...frostCard,
        padding: '12px 12px 10px',
        textAlign: 'center',
        cursor: onOpen ? 'pointer' : 'default',
        fontFamily: neon.font,
      }}
    >
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          minWidth: 28,
          height: 18,
          padding: '0 7px',
          borderRadius: 9,
          background: INK,
          color: '#fff',
          fontSize: 11,
          fontWeight: 750,
        }}
      >
        1
      </span>
      <div style={{ display: 'flex', justifyContent: 'center', marginTop: 8 }}>
        <MinerAvatar url={entry.avatar_url} size={40} />
      </div>
      <p
        style={{
          margin: '8px 0 0',
          fontSize: 14,
          fontWeight: 750,
          color: INK,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {isMe ? 'You' : entry.username || 'Miner'}
      </p>
      <p
        style={{
          margin: '3px 0 0',
          fontSize: 12,
          fontWeight: 650,
          color: MUTED,
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {formatPointsDisplay(entry.total_points)} ARX-P
      </p>
    </motion.button>
  );
}

function PodiumSide({
  place,
  entry,
  isMe,
  onOpen,
}: {
  place: 2 | 3;
  entry: Entry;
  isMe: boolean;
  onOpen?: () => void;
}) {
  return (
    <motion.button
      type="button"
      whileTap={onOpen ? { scale: 0.98 } : undefined}
      onClick={onOpen}
      style={{
        width: '100%',
        minHeight: 72,
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        ...sheetGlass,
        borderRadius: 16,
        padding: '12px 12px',
        cursor: onOpen ? 'pointer' : 'default',
        fontFamily: neon.font,
        color: '#fff',
        boxSizing: 'border-box',
        textAlign: 'left',
      }}
    >
      <span
        style={{
          width: 22,
          height: 22,
          borderRadius: 11,
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: place === 2 ? ARENA : 'rgba(255,255,255,0.14)',
          color: place === 2 ? INK : '#fff',
          fontSize: 11,
          fontWeight: 750,
        }}
      >
        {place}
      </span>
      <MinerAvatar url={entry.avatar_url} size={36} />
      <span style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 3 }}>
        <span
          style={{
            fontSize: 13,
            fontWeight: 650,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {isMe ? 'You' : entry.username || 'Miner'}
        </span>
        <span
          style={{
            fontSize: 11,
            fontWeight: 600,
            color: SOFT,
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {formatPointsDisplay(entry.total_points)} ARX-P
        </span>
      </span>
    </motion.button>
  );
}

function RankRow({
  place,
  entry,
  isMe,
  onOpen,
}: {
  place: number;
  entry: Entry;
  isMe: boolean;
  onOpen?: () => void;
}) {
  return (
    <motion.button
      type="button"
      whileTap={onOpen ? { scale: 0.99 } : undefined}
      onClick={onOpen}
      style={{
        width: '100%',
        height: 44,
        minHeight: 44,
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '0 4px',
        border: 'none',
        background: 'none',
        color: '#fff',
        cursor: onOpen ? 'pointer' : 'default',
        fontFamily: neon.font,
        textAlign: 'left',
        boxSizing: 'border-box',
      }}
    >
      <span
        style={{
          width: 28,
          flexShrink: 0,
          fontSize: 12,
          fontWeight: 750,
          color: isMe ? ARENA : SOFT,
          fontVariantNumeric: 'tabular-nums',
          textAlign: 'center',
        }}
      >
        {place}
      </span>
      <MinerAvatar url={entry.avatar_url} size={28} />
      <span
        style={{
          flex: 1,
          minWidth: 0,
          fontSize: 13,
          fontWeight: 650,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {isMe ? 'You' : entry.username || 'Miner'}
      </span>
      <span
        style={{
          display: 'flex',
          alignItems: 'baseline',
          gap: 4,
          flexShrink: 0,
          whiteSpace: 'nowrap',
        }}
      >
        <span style={{ fontSize: 13, fontWeight: 650, fontVariantNumeric: 'tabular-nums' }}>
          {formatPointsDisplay(entry.total_points)}
        </span>
        <span style={{ fontSize: 11, fontWeight: 600, color: SOFT }}>ARX-P</span>
      </span>
    </motion.button>
  );
}

export default function LeaderboardV2() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isAdmin } = useAdmin();
  const { points, rank, refreshPoints } = usePoints();
  const [leaders, setLeaders] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [rlsBlocked, setRlsBlocked] = useState(false);

  const loadBoard = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    const { entries, blocked } = await fetchGlobalLeaderboard(100);
    setRlsBlocked(blocked);
    setLeaders(blocked ? [] : entries);
    setLoading(false);
  }, []);

  const pull = usePullRefresh(async () => {
    await Promise.all([refreshPoints(), loadBoard(true)]);
  }, { threshold: 28 });

  useEffect(() => {
    void loadBoard();
  }, [loadBoard]);

  const totalPts = Math.round(points?.total_points ?? 0);
  const userRank = rank ?? null;
  const first = leaders[0];
  const second = leaders[1];
  const third = leaders[2];
  const rest = leaders.slice(3);
  const open = (entry: Entry) => {
    if (entry.user_id === user?.id) return undefined;
    return () => navigate(`/profile/${entry.user_id}`);
  };

  return (
    <V2Page pull={pull}>
      <div style={{ padding: `${mobileTopPaddingPage()} 16px 10px` }}>
        <h1
          style={{
            margin: 0,
            fontSize: 22,
            fontWeight: 750,
            color: '#fff',
            letterSpacing: '-0.5px',
            lineHeight: 1.15,
            fontFamily: neon.font,
          }}
        >
          Ranks
        </h1>
      </div>

      <div style={{ padding: '0 16px 8px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div data-tour="ranks-you">
        <MineLoad waiting={loading} extra={pull.busy} frost kind="card" radius={16}>
          <YouCard rank={userRank} points={totalPts} />
        </MineLoad>
        </div>

        {rlsBlocked && !loading && (
          <p
            style={{
              margin: 0,
              padding: '12px 14px',
              borderRadius: 16,
              border: '1px solid rgba(255,255,255,0.14)',
              fontSize: 12,
              color: SOFT,
              textAlign: 'center',
              fontFamily: neon.font,
              lineHeight: 1.4,
            }}
          >
            Rankings are updating.
            {isAdmin ? ' Public read on user_points is off.' : ''}
          </p>
        )}

        <MineLoad waiting={loading} extra={pull.busy} frost kind="card" radius={16}>
          {first ? (
            <PodiumFirst entry={first} isMe={first.user_id === user?.id} onOpen={open(first)} />
          ) : (
            <div style={{ height: 118 }} />
          )}
        </MineLoad>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, width: '100%' }}>
          <MineLoad waiting={loading} extra={pull.busy} kind="card" radius={16}>
            {second ? (
              <PodiumSide place={2} entry={second} isMe={second.user_id === user?.id} onOpen={open(second)} />
            ) : (
              <div style={{ height: 72 }} />
            )}
          </MineLoad>
          <MineLoad waiting={loading} extra={pull.busy} kind="card" radius={16}>
            {third ? (
              <PodiumSide place={3} entry={third} isMe={third.user_id === user?.id} onOpen={open(third)} />
            ) : (
              <div style={{ height: 72 }} />
            )}
          </MineLoad>
        </div>

        {(rest.length > 0 || loading) && (
          <MineLoad waiting={loading} extra={pull.busy} kind="rows" rowCount={8} radius={18} radiusBottom={0}>
            <div
              style={{
                ...sheetGlass,
                borderRadius: '18px 18px 0 0',
                borderBottom: 'none',
                padding: '4px 10px 0',
                boxSizing: 'border-box',
                overflow: 'hidden',
                minHeight: rest.length ? undefined : 240,
              }}
            >
              {rest.map((entry, i) => (
                <RankRow
                  key={entry.user_id}
                  place={i + 4}
                  entry={entry}
                  isMe={entry.user_id === user?.id}
                  onOpen={open(entry)}
                />
              ))}
            </div>
          </MineLoad>
        )}

        {!loading && !first && !rlsBlocked && (
          <p
            style={{
              margin: '8px 0',
              fontSize: 13,
              color: SOFT,
              textAlign: 'center',
              fontFamily: neon.font,
            }}
          >
            No rankings yet
          </p>
        )}
      </div>
    </V2Page>
  );
}
