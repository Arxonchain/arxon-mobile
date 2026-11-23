import { useEffect, useId, useState, type ReactNode } from 'react';
import { motion } from 'framer-motion';
import { Target, Trophy, Users, Send, Play, Square } from 'lucide-react';
import { neon } from '@/features/arxon-v2/design/neonTokens';
import { frostWash } from '@/walletFigma/flow/LiveScroll';
import { formatPointsDisplay } from '@/lib/formatPoints';
import { MIN_CLAIM_ARX } from './DashboardWidgets';
import FourTxClaimCard from './FourTxClaimCard';

const SESSION_MAX = 8 * 3600;
const RING = 176;
const STROKE = 22;
const SEGMENTS = 5;
const VISUAL_GAP = 6;
const SHARES = [0.38, 0.22, 0.16, 0.14, 0.10];

function formatSessionTime(seconds: number) {
  const s = Math.min(Math.max(0, Math.floor(seconds)), SESSION_MAX);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
}

export function HomeHeroBalance({ balance }: { balance: number }) {
  return (
    <div
      style={{
        padding: '52px 20px 44px',
        textAlign: 'center',
      }}
    >
      <div data-tour="home-balance">
      <p
        style={{
          margin: 0,
          fontSize: 13,
          fontWeight: 500,
          color: 'rgba(255,255,255,0.62)',
          fontFamily: neon.font,
        }}
      >
        Available Balance
      </p>
      <p
        style={{
          margin: '10px 0 0',
          fontSize: 44,
          fontWeight: 600,
          letterSpacing: '-1.6px',
          lineHeight: 1,
          color: '#fff',
          fontFamily: neon.font,
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {formatPointsDisplay(balance)}
        <span
          style={{
            marginLeft: 8,
            fontSize: 16,
            fontWeight: 500,
            letterSpacing: 0,
            color: 'rgba(255,255,255,0.55)',
          }}
        >
          ARX-P
        </span>
      </p>
      </div>
    </div>
  );
}

const ACTIONS: { id: string; label: string; icon: ReactNode; to: string }[] = [
  { id: 'tasks', label: 'Tasks', icon: <Target size={20} strokeWidth={1.8} />, to: '/tasks' },
  { id: 'leaderboard', label: 'Ranks', icon: <Trophy size={20} strokeWidth={1.8} />, to: '/leaderboard' },
  { id: 'referrals', label: 'Refer', icon: <Users size={20} strokeWidth={1.8} />, to: '/referrals' },
  { id: 'nexus', label: 'Nexus', icon: <Send size={20} strokeWidth={1.8} />, to: '/nexus' },
];

export function HomeRoundActions({
  onOpen,
  taskBadge,
}: {
  onOpen: (path: string) => void;
  taskBadge?: number;
}) {
  return (
    <div
      data-tour="home-actions"
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        padding: '4px 28px 22px',
      }}
    >
      {ACTIONS.map((a) => (
        <motion.button
          key={a.id}
          type="button"
          whileTap={{ scale: 0.94 }}
          onClick={() => onOpen(a.to)}
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 8,
            background: 'none',
            border: 'none',
            padding: 0,
            cursor: 'pointer',
            fontFamily: neon.font,
            color: '#fff',
            position: 'relative',
          }}
        >
          <span
            style={{
              width: 58,
              height: 58,
              borderRadius: 29,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: '#1a1d22',
              border: '1px solid rgba(255,255,255,0.08)',
              boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.08)',
              color: '#fff',
            }}
          >
            {a.icon}
          </span>
          {a.id === 'tasks' && taskBadge ? (
            <span
              style={{
                position: 'absolute',
                top: -2,
                right: 6,
                minWidth: 16,
                height: 16,
                padding: '0 4px',
                borderRadius: 8,
                background: neon.cyan,
                color: '#0c1018',
                fontSize: 9,
                fontWeight: 700,
                lineHeight: '16px',
              }}
            >
              {taskBadge > 9 ? '9+' : taskBadge}
            </span>
          ) : null}
          <span style={{ fontSize: 12, fontWeight: 500, color: 'rgba(255,255,255,0.78)' }}>{a.label}</span>
        </motion.button>
      ))}
    </div>
  );
}

function polar(cx: number, cy: number, r: number, deg: number) {
  const rad = (deg * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function arcPath(cx: number, cy: number, r: number, startDeg: number, endDeg: number) {
  const start = polar(cx, cy, r, startDeg);
  const end = polar(cx, cy, r, endDeg);
  const large = endDeg - startDeg > 180 ? 1 : 0;
  return `M ${start.x} ${start.y} A ${r} ${r} 0 ${large} 1 ${end.x} ${end.y}`;
}

function segmentPaths(cx: number, cy: number, r: number) {
  const gapDeg = (VISUAL_GAP / (2 * Math.PI * r)) * 360;
  const usable = 360 - SEGMENTS * gapDeg;
  const whiteSpan = SHARES[0] * usable;
  let angle = 180 - whiteSpan / 2;
  return SHARES.map((share) => {
    const span = share * usable;
    const start = angle;
    angle += span + gapDeg;
    return { d: arcPath(cx, cy, r, start, start + span), span };
  });
}

function MineRing({ mining }: { mining: boolean }) {
  const uid = useId().replace(/:/g, '');
  const cx = RING / 2;
  const cy = RING / 2;
  const r = (RING - STROKE) / 2;
  const c = 2 * Math.PI * r;
  const paths = segmentPaths(cx, cy, r);
  const whiteLen = (SHARES[0] * (360 - SEGMENTS * ((VISUAL_GAP / c) * 360)) / 360) * c;
  const maskId = `mine-seg-${uid}`;

  return (
    <svg width={RING} height={RING} viewBox={`0 0 ${RING} ${RING}`} aria-hidden>
      <defs>
        <mask id={maskId}>
          <rect width={RING} height={RING} fill="#000" />
          {paths.map((p, i) => (
            <path key={i} d={p.d} fill="none" stroke="#fff" strokeWidth={STROKE} strokeLinecap="butt" />
          ))}
        </mask>
      </defs>
      {paths.map((p, i) => (
        <path
          key={i}
          d={p.d}
          fill="none"
          stroke={!mining && i === 0 ? '#0c1018' : '#cfd6e4'}
          strokeWidth={STROKE}
          strokeLinecap="butt"
        />
      ))}
      {mining && (
        <g mask={`url(#${maskId})`}>
          <g>
            <animateTransform
              attributeName="transform"
              type="rotate"
              from={`0 ${cx} ${cy}`}
              to={`360 ${cx} ${cy}`}
              dur="2.8s"
              repeatCount="indefinite"
            />
            <circle
              cx={cx}
              cy={cy}
              r={r}
              fill="none"
              stroke={neon.cyan}
              strokeWidth={STROKE}
              strokeLinecap="butt"
              strokeDasharray={`${whiteLen} ${Math.max(1, c - whiteLen)}`}
            />
          </g>
        </g>
      )}
    </svg>
  );
}

function MineNetToggle({
  tab,
  onTab,
}: {
  tab: 'mining' | 'testnet';
  onTab: (next: 'mining' | 'testnet') => void;
}) {
  const onRight = tab === 'testnet';
  const width = 300;
  const pad = 3;
  const pillW = (width - pad * 2) / 2;
  const btn = (on: boolean) => ({
    flex: 1,
    height: 34,
    border: 'none' as const,
    background: 'transparent',
    cursor: 'pointer' as const,
    color: on ? '#0c1018' : '#ffffff',
    fontFamily: neon.font,
    fontSize: 13,
    fontWeight: 650,
    lineHeight: '34px',
    padding: 0,
  });
  return (
    <div
      role="tablist"
      aria-label="Mining or Testnet"
      style={{
        position: 'relative',
        width,
        height: 40,
        boxSizing: 'border-box',
        padding: pad,
        borderRadius: 20,
        background: '#050608',
        border: '1px solid rgba(255,255,255,0.08)',
      }}
    >
      <div
        aria-hidden
        style={{
          position: 'absolute',
          top: pad,
          left: onRight ? pad + pillW : pad,
          width: pillW,
          height: 34,
          borderRadius: 17,
          background: '#ffffff',
          boxShadow: '0 4px 12px rgba(0,0,0,0.18)',
          transition: 'left 160ms ease',
        }}
      />
      <div style={{ position: 'relative', zIndex: 1, display: 'flex', height: 34 }}>
        <button type="button" role="tab" aria-selected={!onRight} onClick={() => onTab('mining')} style={btn(!onRight)}>
          Mining
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={onRight}
          data-tour="mine-testnet"
          onClick={() => onTab('testnet')}
          style={btn(onRight)}
        >
          Testnet
        </button>
      </div>
    </div>
  );
}

export function MiningHistoryCard({
  isMining,
  earnedPoints,
  remainingSeconds,
  pointsPerHour,
  boostPercentage,
  onMine,
  onClaim,
  loading,
  claiming,
  sessionMaxed,
  preview = false,
}: {
  isMining: boolean;
  earnedPoints: number;
  remainingSeconds: number;
  pointsPerHour: number;
  boostPercentage: number;
  onMine: () => void;
  onClaim: () => void;
  loading?: boolean;
  claiming?: boolean;
  sessionMaxed?: boolean;
  preview?: boolean;
}) {
  const [tab, setTab] = useState<'mining' | 'testnet'>('mining');

  useEffect(() => {
    const showTestnet = () => setTab('testnet');
    window.addEventListener('arxon-tour-show-testnet', showTestnet);
    return () => window.removeEventListener('arxon-tour-show-testnet', showTestnet);
  }, []);

  const pts = Math.floor(Math.max(0, earnedPoints));
  const canClaim = !!sessionMaxed || pts >= MIN_CLAIM_ARX;
  const miningLive = isMining && !sessionMaxed;
  const rateValue = pointsPerHour.toFixed(boostPercentage > 0 ? 1 : 0);
  const controlBusy = !!(loading || claiming);

  return (
    <div
      style={{
        borderRadius: 32,
        ...frostWash,
        border: '1px solid rgba(61,109,255,0.32)',
        boxShadow: '0 10px 28px rgba(0,0,0,0.18)',
        padding: '14px 16px 22px',
        boxSizing: 'border-box',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 14 }}>
        <MineNetToggle tab={tab} onTab={setTab} />
      </div>

      {tab === 'mining' ? (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            minWidth: 0,
          }}
        >
          <div style={{ position: 'relative', width: RING, height: RING, flexShrink: 0 }}>
            <MineRing mining={miningLive} />
            <div
              style={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <motion.button
                type="button"
                data-tour="mining-start"
                whileTap={controlBusy ? undefined : { scale: 0.94 }}
                onClick={canClaim ? onClaim : onMine}
                disabled={controlBusy}
                aria-label={canClaim ? 'Claim points' : isMining ? 'Stop mining' : 'Start mining'}
                style={{
                  width: 58,
                  height: 58,
                  borderRadius: 29,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: canClaim ? neon.cyan : '#0c1018',
                  border: 'none',
                  boxShadow: '0 6px 16px rgba(12,16,24,0.18)',
                  color: canClaim ? '#0c1018' : '#fff',
                  fontSize: 12,
                  fontWeight: 700,
                  fontFamily: neon.font,
                  padding: 0,
                  cursor: controlBusy ? 'wait' : 'pointer',
                  opacity: controlBusy ? 0.7 : 1,
                }}
              >
                {canClaim ? (
                  claiming ? '…' : 'Claim'
                ) : isMining ? (
                  <Square size={18} strokeWidth={2} fill="currentColor" />
                ) : (
                  <Play size={18} strokeWidth={2} fill="currentColor" />
                )}
              </motion.button>
            </div>
          </div>

          <div
            style={{
              flex: 1,
              minWidth: 0,
              fontFamily: neon.font,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              gap: 8,
            }}
          >
            <div>
              <p style={{ margin: 0, fontSize: 11, fontWeight: 500, color: '#5c6370' }}>
                Mining /hr
              </p>
              <p style={{ margin: '2px 0 0', fontSize: 14, fontWeight: 650, color: '#0c1018', lineHeight: 1.2 }}>
                {rateValue}
              </p>
            </div>
            <div>
              <p style={{ margin: 0, fontSize: 11, fontWeight: 500, color: '#5c6370' }}>
                Point mining
              </p>
              <p
                style={{
                  margin: '2px 0 0',
                  fontSize: 20,
                  fontWeight: 650,
                  color: '#0c1018',
                  letterSpacing: '-0.4px',
                  lineHeight: 1.15,
                  fontVariantNumeric: 'tabular-nums',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {earnedPoints.toFixed(2)}
                <span style={{ marginLeft: 4, fontSize: 11, fontWeight: 500, color: '#5c6370' }}>
                  ARX-P
                </span>
              </p>
            </div>
            <div>
              <p style={{ margin: 0, fontSize: 11, fontWeight: 500, color: '#5c6370' }}>
                Time
              </p>
              <p
                style={{
                  margin: '2px 0 0',
                  fontSize: 15,
                  fontWeight: 650,
                  color: '#0c1018',
                  fontVariantNumeric: 'tabular-nums',
                  letterSpacing: '-0.2px',
                  lineHeight: 1.2,
                }}
              >
                {formatSessionTime(remainingSeconds)}
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div style={{ padding: '4px 2px 0' }}>
          <FourTxClaimCard preview={preview} />
        </div>
      )}
    </div>
  );
}
