import { useCallback, useEffect, useId, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { motion, useSpring, animate } from 'framer-motion';
import {
  Target, Trophy, Users, Send, Pickaxe, Swords, Gift, CheckCircle2,
  Sparkles, RotateCcw, Gamepad2, Activity, Dices,
} from 'lucide-react';
import { FORGE_UI } from '@/features/word-forge/data/uiAssets';
import { getArenaPoolStats } from '@/lib/arenaPoolStats';
import { neon } from '../design/neonTokens';

export interface DayEarning {
  date: string;
  label: string;
  shortDate: string;
  amount: number;
  isToday: boolean;
}

function smoothLinePath(pts: { x: number; y: number }[]) {
  if (pts.length < 2) return pts.length ? `M ${pts[0].x} ${pts[0].y}` : '';
  let d = `M ${pts[0].x} ${pts[0].y}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(i - 1, 0)];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[Math.min(i + 2, pts.length - 1)];
    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
  }
  return d;
}

function angularLinePath(pts: { x: number; y: number }[]) {
  if (!pts.length) return '';
  return pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
}

function WeekEarningsChart({
  days,
  liveTodayBoost = 0,
  isMiningLive = false,
  compact = false,
  narrow = false,
  salesStyle = false,
  showLabels = true,
}: {
  days: DayEarning[];
  liveTodayBoost?: number;
  isMiningLive?: boolean;
  compact?: boolean;
  narrow?: boolean;
  salesStyle?: boolean;
  showLabels?: boolean;
}) {
  const uid = useId().replace(/:/g, '');
  const svgRef = useRef<SVGSVGElement>(null);
  const [activeIdx, setActiveIdx] = useState<number | null>(null);
  const [scrubbing, setScrubbing] = useState(false);
  const [pulse, setPulse] = useState(0);

  const amounts = useMemo(
    () => days.map((d, i) => (d.isToday ? d.amount + liveTodayBoost : d.amount)),
    [days, liveTodayBoost],
  );

  const max = Math.max(...amounts, 1);
  const w = salesStyle ? 320 : narrow ? 236 : compact ? 300 : 320;
  const h = salesStyle ? 96 : compact || narrow ? 68 : 72;
  const padX = salesStyle ? 6 : 12;
  const padY = salesStyle ? 6 : 10;
  const chartW = w - padX * 2;
  const chartH = h - padY * 2;
  const slotW = chartW / Math.max(days.length, 1);

  const points = useMemo(() => {
    if (salesStyle) {
      return amounts.map((v, i) => ({
        x: padX + slotW * i + slotW / 2,
        y: padY + chartH - (v / max) * chartH * 0.94,
        v,
        day: days[i],
      }));
    }
    const step = chartW / Math.max(days.length - 1, 1);
    return amounts.map((v, i) => ({
      x: padX + i * step,
      y: padY + chartH - (v / max) * chartH,
      v,
      day: days[i],
    }));
  }, [amounts, days, max, chartW, chartH, padX, padY, salesStyle, slotW]);

  const linePath = salesStyle ? angularLinePath(points) : smoothLinePath(points);
  const areaPath = points.length
    ? `${linePath} L ${points[points.length - 1].x} ${padY + chartH} L ${points[0].x} ${padY + chartH} Z`
    : '';

  const todayIdx = days.findIndex((d) => d.isToday);
  const defaultIdx = todayIdx >= 0 ? todayIdx : points.length - 1;
  const hover = activeIdx ?? defaultIdx;
  const hoverPt = points[hover];
  const weekTotal = amounts.reduce((s, v) => s + v, 0);
  const hoverPct = weekTotal > 0 ? (hoverPt.v / weekTotal) * 100 : 0;

  const resolveIdxFromClientX = useCallback((clientX: number) => {
    const svg = svgRef.current;
    if (!svg || !points.length) return;
    const rect = svg.getBoundingClientRect();
    const x = ((clientX - rect.left) / rect.width) * w;
    let best = 0;
    let bestDist = Infinity;
    points.forEach((p, i) => {
      const dist = Math.abs(p.x - x);
      if (dist < bestDist) { bestDist = dist; best = i; }
    });
    setActiveIdx(best);
  }, [points, w]);

  const tooltipLeft = hoverPt
    ? `${Math.min(salesStyle ? 92 : 88, Math.max(12, (hoverPt.x / w) * 100))}%`
    : '50%';
  const tooltipMargin = salesStyle ? 24 : narrow ? 30 : compact ? 36 : 44;
  const svgHeight = salesStyle ? 96 : narrow ? 56 : compact ? 60 : 64;

  useEffect(() => {
    if (!isMiningLive) return;
    const t = setInterval(() => setPulse((p) => p + 1), 1200);
    return () => clearInterval(t);
  }, [isMiningLive]);

  const barPulse = isMiningLive ? 0.15 + Math.sin(pulse * 0.8) * 0.08 : 0;

  const dayLabels = (
    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: salesStyle ? 4 : 6, padding: '0 2px' }}>
      {days.map((d, i) => (
        <button
          key={d.date}
          type="button"
          onClick={() => setActiveIdx(i)}
          style={{
            flex: 1, background: 'none', border: 'none', cursor: 'pointer', padding: '2px 0',
            fontSize: salesStyle ? 7 : 8, fontWeight: 800, letterSpacing: '0.08em',
            color: i === hover ? neon.cyan : d.isToday ? 'rgba(127,231,196,0.7)' : 'rgba(232,252,255,0.28)',
            textShadow: i === hover ? `0 0 8px ${neon.cyanGlow}` : undefined,
            fontFamily: neon.font,
          }}
        >
          {d.label}
        </button>
      ))}
    </div>
  );

  return (
    <div
      style={{ position: 'relative', touchAction: 'pan-y', userSelect: 'none' }}
      onPointerUp={() => setScrubbing(false)}
      onPointerLeave={() => { if (!scrubbing) setActiveIdx(null); }}
    >
      {/* Floating tooltip */}
      {hoverPt && (
        <motion.div
          key={hover}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          style={{
            position: 'absolute',
            top: 0,
            left: tooltipLeft,
            transform: 'translateX(-50%)',
            zIndex: 3,
            padding: salesStyle ? '5px 10px' : narrow ? '6px 10px' : '8px 12px',
            borderRadius: salesStyle ? 8 : 12,
            background: salesStyle ? 'rgba(8,18,32,0.92)' : 'rgba(255,255,255,0.96)',
            border: salesStyle ? '1px solid rgba(255,255,255,0.35)' : '1px solid rgba(79,216,235,0.45)',
            boxShadow: salesStyle
              ? '0 4px 20px rgba(0,0,0,0.45), 0 0 16px rgba(79,216,235,0.25)'
              : '0 8px 28px rgba(0,0,0,0.35), 0 0 20px rgba(79,216,235,0.2)',
            pointerEvents: 'none',
            minWidth: salesStyle ? 88 : narrow ? 96 : 108,
            textAlign: 'center',
          }}
        >
          {salesStyle ? (
            <p style={{ margin: 0, fontSize: 12, fontWeight: 800, color: '#fff', letterSpacing: '-0.3px' }}>
              +{Math.round(hoverPt.v).toLocaleString()}
            </p>
          ) : (
            <>
              <p style={{ margin: 0, fontSize: 8, fontWeight: 800, letterSpacing: '0.12em', color: 'rgba(10,22,40,0.45)', textTransform: 'uppercase' }}>
                {hoverPt.day.label} · {hoverPt.day.shortDate}
              </p>
              <p style={{ margin: '3px 0 0', fontSize: 15, fontWeight: 900, color: '#0a1628', letterSpacing: '-0.5px' }}>
                +{Math.round(hoverPt.v).toLocaleString()}
                <span style={{ fontSize: 9, fontWeight: 800, color: neon.cyan, marginLeft: 4 }}>ARX-P</span>
              </p>
              <p style={{ margin: '2px 0 0', fontSize: 8, fontWeight: 700, color: 'rgba(10,22,40,0.5)' }}>
                {hoverPct.toFixed(0)}% of week
                {hoverPt.day.isToday && isMiningLive && (
                  <span style={{ color: neon.teal, marginLeft: 4 }}>· live</span>
                )}
              </p>
            </>
          )}
        </motion.div>
      )}

      <svg
        ref={svgRef}
        viewBox={`0 0 ${w} ${h}`}
        style={{ width: '100%', height: svgHeight, display: 'block', marginTop: tooltipMargin }}
        onPointerDown={(e) => { setScrubbing(true); resolveIdxFromClientX(e.clientX); }}
        onPointerMove={(e) => { if (scrubbing || e.buttons === 1) resolveIdxFromClientX(e.clientX); }}
        onMouseMove={(e) => { if (!scrubbing) resolveIdxFromClientX(e.clientX); }}
        onMouseLeave={() => { if (!scrubbing) setActiveIdx(null); }}
      >
        <defs>
          <linearGradient id={`area-${uid}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={salesStyle ? 'rgba(79,216,235,0.55)' : 'rgba(127,231,196,0.55)'} />
            <stop offset="45%" stopColor={salesStyle ? 'rgba(59,130,246,0.28)' : 'rgba(79,216,235,0.32)'} />
            <stop offset="100%" stopColor="rgba(79,216,235,0)" />
          </linearGradient>
          <linearGradient id={`bar-${uid}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={salesStyle ? 'rgba(79,216,235,0.55)' : 'rgba(180,255,240,1)'} />
            <stop offset="55%" stopColor={salesStyle ? 'rgba(30,80,130,0.35)' : 'rgba(79,216,235,0.92)'} />
            <stop offset="100%" stopColor={salesStyle ? 'rgba(10,30,50,0.15)' : 'rgba(20,80,110,0.55)'} />
          </linearGradient>
          <filter id={`glow-${uid}`}>
            <feGaussianBlur stdDeviation={salesStyle ? '2.5' : '2'} result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
          {salesStyle && (
            <marker id={`arrow-${uid}`} markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
              <path d="M0,0 L6,3 L0,6 Z" fill="rgba(127,231,196,0.95)" />
            </marker>
          )}
        </defs>

        {!salesStyle && [0.25, 0.5, 0.75].map((g) => (
          <line key={g} x1={padX} y1={padY + chartH * (1 - g)} x2={w - padX} y2={padY + chartH * (1 - g)}
            stroke="rgba(255,255,255,0.04)" strokeWidth="0.5" strokeDasharray="2 4" />
        ))}

        {points.map((p, i) => {
          const barH = padY + chartH - p.y;
          const isActive = i === hover;
          const isToday = days[i]?.isToday;
          const barW = salesStyle ? slotW * 0.34 : chartW / days.length * 0.55;
          const minBarH = salesStyle ? chartH * 0.08 : 0;
          const drawH = Math.max(barH, minBarH);
          const drawY = padY + chartH - drawH;
          return (
            <rect
              key={`bar-${i}`}
              x={p.x - barW / 2}
              y={drawY}
              width={barW}
              height={drawH}
              rx={salesStyle ? 2 : 3}
              fill={`url(#bar-${uid})`}
              opacity={salesStyle
                ? (isActive ? 0.85 : 0.42 + (p.v / max) * 0.25)
                : (isActive ? 0.98 + (isToday ? barPulse : 0) : 0.5 + (p.v / max) * 0.35)}
              style={{ transition: 'opacity 0.25s ease' }}
            />
          );
        })}

        {areaPath && <path d={areaPath} fill={`url(#area-${uid})`} opacity={salesStyle ? 0.9 : 1} />}
        {linePath && (
          <path
            d={linePath}
            fill="none"
            stroke={salesStyle ? 'rgba(180,240,255,0.95)' : 'rgba(255,255,255,0.92)'}
            strokeWidth={salesStyle ? 2.2 : 2}
            strokeLinecap="round"
            strokeLinejoin={salesStyle ? 'miter' : 'round'}
            filter={`url(#glow-${uid})`}
            markerEnd={salesStyle ? `url(#arrow-${uid})` : undefined}
          />
        )}

        {!salesStyle && hoverPt && (
          <line
            x1={hoverPt.x} y1={padY}
            x2={hoverPt.x} y2={padY + chartH}
            stroke="rgba(79,216,235,0.35)"
            strokeWidth="1"
            strokeDasharray="3 3"
          />
        )}

        {points.map((p, i) => {
          const isHover = i === hover;
          const isToday = days[i]?.isToday;
          if (salesStyle && !isHover) return null;
          return (
            <g key={`pt-${i}`}>
              {(isHover || isToday) && (
                <circle
                  cx={p.x} cy={p.y} r={isHover ? 9 : 6}
                  fill="rgba(79,216,235,0.25)"
                  style={isToday && isMiningLive ? { animation: 'chartPulse 1.2s ease-in-out infinite' } : undefined}
                />
              )}
              {(isHover || (!salesStyle && isToday)) && (
                <circle
                  cx={p.x} cy={p.y} r={isHover ? 4 : 2.5}
                  fill="#fff"
                  style={{ filter: 'drop-shadow(0 0 10px rgba(79,216,235,0.95))' }}
                />
              )}
              {!salesStyle && !isHover && (
                <circle cx={p.x} cy={p.y} r={2.5} fill="rgba(255,255,255,0.65)" />
              )}
            </g>
          );
        })}
      </svg>

      {showLabels && dayLabels}
    </div>
  );
}

export function BalanceGlassCard({
  balance,
  weekDelta,
  weekDeltaPct,
  rank,
  weekDays: _weekDays,
  todayPts,
  weekPts,
  streak,
  liveTodayBoost = 0,
  isMiningLive = false,
}: {
  balance: number;
  weekDelta: number;
  weekDeltaPct: number;
  rank?: number | null;
  weekDays: DayEarning[];
  todayPts: number;
  weekPts: number;
  streak: number;
  liveTodayBoost?: number;
  isMiningLive?: boolean;
}) {
  const displayBalance = useSpring(balance, { stiffness: 80, damping: 18 });
  const [displayVal, setDisplayVal] = useState(balance);

  useEffect(() => {
    const ctrl = animate(displayBalance, balance, {
      duration: 0.8,
      ease: [0.22, 1, 0.36, 1],
      onUpdate: (v) => setDisplayVal(Math.round(v)),
    });
    return () => ctrl.stop();
  }, [balance, displayBalance]);

  const deltaSign = weekDelta >= 0 ? '+' : '';
  const pctSign = weekDeltaPct >= 0 ? '+' : '';
  const liveWeekTotal = weekPts + (isMiningLive ? liveTodayBoost : 0);

  return (
    <div style={{
      borderRadius: 24,
      padding: '16px 16px 12px',
      position: 'relative',
      overflow: 'hidden',
      background: 'linear-gradient(155deg, rgba(9,22,40,0.98) 0%, rgba(5,14,28,0.99) 50%, rgba(4,10,22,1) 100%)',
      border: '1px solid rgba(79,216,235,0.2)',
      boxShadow: '0 20px 48px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.06), 0 0 36px rgba(79,216,235,0.06)',
    }}>
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        backgroundImage: 'radial-gradient(circle at 18% 22%, rgba(255,255,255,0.04) 1px, transparent 1px)',
        backgroundSize: '20px 20px',
        opacity: 0.3,
      }} />
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        background: `
          radial-gradient(ellipse 90% 70% at 100% 0%, rgba(79,216,235,0.18) 0%, transparent 55%),
          radial-gradient(ellipse 60% 50% at 0% 100%, rgba(59,130,246,0.06) 0%, transparent 50%)
        `,
      }} />

      <div style={{ position: 'relative', zIndex: 1, paddingTop: 4 }}>
        <p style={{ margin: 0, fontSize: 10, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'rgba(232,252,255,0.42)' }}>
          Available Balance
        </p>
        <p style={{
          margin: '8px 0 0', fontSize: 34, fontWeight: 900, letterSpacing: '-1.5px', lineHeight: 1.05,
          color: neon.text, textShadow: '0 0 28px rgba(79,216,235,0.25)',
        }}>
          {displayVal.toLocaleString()}
          <span style={{ fontSize: 13, fontWeight: 800, color: neon.cyan, marginLeft: 6 }}>ARX-P</span>
        </p>
        <p style={{ margin: '7px 0 0', fontSize: 11, fontWeight: 600, lineHeight: 1.4, color: 'rgba(232,252,255,0.65)' }}>
          {deltaSign}{Math.round(weekDelta).toLocaleString()}
          <span style={{ color: neon.cyan, marginLeft: 4 }}>({pctSign}{weekDeltaPct.toFixed(1)}%)</span>
          <span style={{ color: 'rgba(232,252,255,0.3)', marginLeft: 4, fontSize: 10 }}>vs last week</span>
        </p>
        {rank && (
          <p style={{ margin: '4px 0 0', fontSize: 10, color: neon.gold, fontWeight: 700 }}>Rank #{rank}</p>
        )}

        <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
          {[
            { l: 'Today', v: `+${Math.round(todayPts + (isMiningLive ? liveTodayBoost : 0)).toLocaleString()}`, c: neon.cyan },
            { l: 'Week', v: `+${Math.round(liveWeekTotal).toLocaleString()}`, c: neon.teal },
            { l: 'Streak', v: `${streak}d`, c: neon.gold },
          ].map((s) => (
            <div key={s.l} style={{
              flex: 1,
              padding: '6px 6px',
              borderRadius: 12,
              textAlign: 'center',
              background: 'rgba(255,255,255,0.02)',
              border: '1px solid rgba(255,255,255,0.06)',
            }}>
              <p style={{ margin: 0, fontSize: 7, fontWeight: 800, letterSpacing: '0.1em', color: 'rgba(232,252,255,0.32)', textTransform: 'uppercase' }}>{s.l}</p>
              <p style={{ margin: '3px 0 0', fontSize: 11, fontWeight: 900, color: s.c }}>{s.v}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

const MINING_PILL_CSS = `
@keyframes miningStrokeSpin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
@keyframes miningStrokeHue{0%{filter:hue-rotate(0deg)}100%{filter:hue-rotate(360deg)}}
@keyframes mining-claim-pulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.65;transform:scale(.96)}}
`;

const MINING_PILL_GRADIENT = 'conic-gradient(from 0deg, #4FD8EB, #a855f7, #ffc93c, #7FE7C4, #ff6b4a, #4FD8EB)';
const DREAM_BLUE = '#B8CCEE';
const STROKE_W = 2;
const PILL_H = 56;
const ORB_SIZE = 50;
const SIDE_PAD = 12;
const GRID_COLS = `1fr ${ORB_SIZE}px 1fr`;
const PILL_FILL = neon.deep;

const SESSION_MAX_SECONDS = 8 * 3600;

function formatSessionTime(seconds: number) {
  const s = Math.min(Math.max(0, Math.floor(seconds)), SESSION_MAX_SECONDS);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
}

const STROKE_MASK: CSSProperties = {
  WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
  WebkitMaskComposite: 'xor',
  maskComposite: 'exclude',
};

/** Hollow outline only — never fills the interior */
function StrokeOutline({
  shape,
  mining,
  animate = 'hue',
  spinMs = 8,
}: {
  shape: 'pill' | 'circle';
  mining: boolean;
  animate?: 'spin' | 'hue';
  spinMs?: number;
}) {
  const radius = shape === 'pill' ? 999 : '50%';

  if (!mining) {
    return (
      <div
        aria-hidden
        style={{
          position: 'absolute',
          inset: 0,
          borderRadius: radius,
          border: `${STROKE_W}px solid ${neon.cyan}`,
          pointerEvents: 'none',
          boxSizing: 'border-box',
        }}
      />
    );
  }

  return (
    <div
      aria-hidden
      style={{
        position: 'absolute',
        inset: 0,
        borderRadius: radius,
        padding: STROKE_W,
        background: MINING_PILL_GRADIENT,
        animation: animate === 'spin'
          ? `miningStrokeSpin ${spinMs}s linear infinite`
          : `miningStrokeHue ${spinMs}s linear infinite`,
        pointerEvents: 'none',
        boxSizing: 'border-box',
        ...STROKE_MASK,
      }}
    />
  );
}

/** Arxon pill-stack logo — multicolour fill when mining */
function ArxonMiningLogo({ animated = false, keyholeFill = DREAM_BLUE }: { animated?: boolean; keyholeFill?: string }) {
  const gradId = useId().replace(/:/g, '');
  const pillFill = animated ? `url(#arxonLogoGrad-${gradId})` : DREAM_BLUE;

  return (
    <svg
      viewBox="0 0 200 200"
      style={{
        width: '58%',
        height: '58%',
        display: 'block',
        animation: animated ? 'miningStrokeHue 4s linear infinite' : undefined,
      }}
      aria-hidden
    >
      <defs>
        <linearGradient id={`arxonLogoGrad-${gradId}`} x1="0" y1="0" x2="200" y2="200" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#4FD8EB" />
          <stop offset="22%" stopColor="#a855f7" />
          <stop offset="44%" stopColor="#ffc93c" />
          <stop offset="66%" stopColor="#7FE7C4" />
          <stop offset="88%" stopColor="#ff6b4a" />
          <stop offset="100%" stopColor="#4FD8EB" />
        </linearGradient>
      </defs>
      <rect x="62" y="48" width="76" height="28" rx="14" fill={pillFill} />
      <rect x="26" y="90" width="74" height="28" rx="14" fill={pillFill} />
      <rect x="108" y="90" width="74" height="28" rx="14" fill={pillFill} />
      <rect x="14" y="132" width="172" height="34" rx="17" fill={pillFill} />
      <circle cx="100" cy="147" r="6.5" fill={keyholeFill} />
      <rect x="96.5" y="151.5" width="7" height="8.5" rx="1.5" fill={keyholeFill} />
    </svg>
  );
}

/** Minimum ARX-P before the center orb can claim (matches useMining). */
export const MIN_CLAIM_ARX = 10;

/** SALES-style mining pill — tap center to start mining; claim lives in the session card below */
export function MiningPillWidget({
  isMining,
  earnedPoints,
  remainingSeconds,
  pointsPerHour,
  boostPercentage,
  onToggle,
  loading = false,
  sessionMaxed = false,
}: {
  isMining: boolean;
  earnedPoints: number;
  remainingSeconds: number;
  pointsPerHour: number;
  boostPercentage: number;
  onToggle: () => void;
  loading?: boolean;
  sessionMaxed?: boolean;
}) {
  const pts = Math.floor(Math.max(0, earnedPoints));
  const timeLabel = formatSessionTime(remainingSeconds);
  const timeFontSize = timeLabel.length > 7 ? 17 : 22;
  const hasBoost = boostPercentage > 0;
  const rateLabel = `${pointsPerHour.toFixed(hasBoost ? 1 : 0)}/hr`;
  const boostLabel = hasBoost ? `+${boostPercentage}%` : '—';
  const orbDisabled = loading || (isMining && !sessionMaxed);

  const orbButton = (
    <motion.button
      type="button"
      whileTap={orbDisabled ? undefined : { scale: 0.94 }}
      onClick={onToggle}
      disabled={orbDisabled}
      aria-label={sessionMaxed ? 'Session complete — claim below' : isMining ? 'Mining in progress' : 'Start mining'}
      style={{
        position: 'relative',
        width: ORB_SIZE,
        height: ORB_SIZE,
        borderRadius: '50%',
        border: 'none',
        cursor: orbDisabled ? (isMining ? 'default' : 'wait') : 'pointer',
        padding: 0,
        background: 'transparent',
        opacity: loading ? 0.7 : 1,
        pointerEvents: 'auto',
      }}
    >
      <div style={{ position: 'relative', width: '100%', height: '100%' }}>
        {isMining && <StrokeOutline shape="circle" mining animate="spin" spinMs={10} />}
        <div style={{
          position: 'absolute',
          inset: isMining ? STROKE_W : 0,
          borderRadius: '50%',
          background: isMining ? 'transparent' : DREAM_BLUE,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          {!isMining && (
            <span style={{
              fontSize: 9, fontWeight: 900, letterSpacing: '0.1em',
              color: '#041018', textTransform: 'uppercase',
            }}>
              MINE
            </span>
          )}
          {isMining && (
            <ArxonMiningLogo animated keyholeFill="transparent" />
          )}
        </div>
      </div>
    </motion.button>
  );

  return (
    <div style={{ position: 'relative', width: '100%' }}>
      <style>{MINING_PILL_CSS}</style>

      <div style={{ position: 'relative', borderRadius: 999 }}>
        <StrokeOutline shape="pill" mining={isMining} animate="hue" spinMs={5} />
        <div style={{
          position: 'relative',
          display: 'grid',
          gridTemplateColumns: GRID_COLS,
          alignItems: 'center',
          height: PILL_H,
          margin: STROKE_W,
          padding: `0 ${SIDE_PAD}px`,
          borderRadius: 999,
          background: PILL_FILL,
        }}>
          <div style={{ textAlign: 'center', zIndex: 1 }}>
            <p style={{
              margin: 0, fontSize: 22, fontWeight: 800, color: '#fff', letterSpacing: '-0.5px', lineHeight: 1,
              fontVariantNumeric: 'tabular-nums',
            }}>
              {pts.toLocaleString()}
            </p>
            <p style={{
              margin: '2px 0 0', fontSize: 7, fontWeight: 600, letterSpacing: '0.12em',
              color: 'rgba(255,255,255,0.45)', textTransform: 'uppercase',
            }}>
              ARX-P
            </p>
          </div>

          <div style={{ display: 'flex', justifyContent: 'center', zIndex: 2, pointerEvents: 'none' }}>
            {orbButton}
          </div>

          <div style={{ textAlign: 'center', zIndex: 1 }}>
            <p style={{
              margin: 0, fontSize: timeFontSize, fontWeight: 800, color: '#fff', letterSpacing: '-0.5px', lineHeight: 1,
              fontVariantNumeric: 'tabular-nums',
            }}>
              {timeLabel}
            </p>
            <p style={{
              margin: '2px 0 0', fontSize: 7, fontWeight: 600, letterSpacing: '0.12em',
              color: 'rgba(255,255,255,0.45)', textTransform: 'uppercase',
            }}>
              {isMining ? 'TIME LEFT' : 'READY'}
            </p>
          </div>
        </div>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: GRID_COLS,
        alignItems: 'start',
        marginTop: 3,
        padding: `0 ${SIDE_PAD}px`,
      }}>
        <div style={{ textAlign: 'center' }}>
          <p style={{
            margin: 0, fontSize: 10, fontWeight: 800, color: neon.cyan,
            fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.2px', lineHeight: 1.15,
          }}>
            {rateLabel}
          </p>
          <p style={{
            margin: '1px 0 0', fontSize: 6, fontWeight: 600, letterSpacing: '0.1em',
            color: 'rgba(255,255,255,0.38)', textTransform: 'uppercase',
          }}>
            rate/hr
          </p>
        </div>
        <div aria-hidden />
        <div style={{ textAlign: 'center' }}>
          <p style={{
            margin: 0, fontSize: 10, fontWeight: 800,
            color: hasBoost ? neon.gold : 'rgba(255,255,255,0.35)',
            fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.2px', lineHeight: 1.15,
          }}>
            {boostLabel}
          </p>
          <p style={{
            margin: '1px 0 0', fontSize: 6, fontWeight: 600, letterSpacing: '0.1em',
            color: 'rgba(255,255,255,0.38)', textTransform: 'uppercase',
          }}>
            boost
          </p>
        </div>
      </div>
    </div>
  );
}

/** Glass session card revealed under the mining pill while a session is live */
export function MiningLiveSessionCard({
  earnedPoints,
  remainingSeconds,
  pointsPerHour,
  boostPercentage,
  onClaim,
  claiming = false,
  sessionMaxed = false,
}: {
  earnedPoints: number;
  remainingSeconds: number;
  pointsPerHour: number;
  boostPercentage: number;
  onClaim: () => void;
  claiming?: boolean;
  sessionMaxed?: boolean;
}) {
  const pts = Math.floor(Math.max(0, earnedPoints));
  const canClaim = sessionMaxed || pts >= MIN_CLAIM_ARX;
  const progress = Math.min(1, pts / MIN_CLAIM_ARX);

  return (
    <motion.div
      initial={{ opacity: 0, y: -8, height: 0 }}
      animate={{ opacity: 1, y: 0, height: 'auto' }}
      exit={{ opacity: 0, y: -6 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      style={{ overflow: 'hidden', marginTop: 10 }}
    >
      <div style={{
        borderRadius: 20,
        padding: '16px 16px 14px',
        position: 'relative',
        overflow: 'hidden',
        background: 'linear-gradient(160deg, rgba(12,36,58,0.72) 0%, rgba(6,16,32,0.82) 55%, rgba(4,10,22,0.9) 100%)',
        border: `1px solid ${canClaim ? 'rgba(79,216,235,0.4)' : 'rgba(79,216,235,0.2)'}`,
        boxShadow: `0 14px 36px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.08), 0 0 28px ${canClaim ? 'rgba(79,216,235,0.12)' : 'rgba(79,216,235,0.05)'}`,
        backdropFilter: 'blur(18px)',
        WebkitBackdropFilter: 'blur(18px)',
      }}>
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          background: 'radial-gradient(ellipse 80% 60% at 100% 0%, rgba(79,216,235,0.14), transparent 55%)',
        }} />

        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
            <div>
              <p style={{
                margin: 0, fontSize: 9, fontWeight: 800, letterSpacing: '0.16em',
                textTransform: 'uppercase', color: neon.cyan,
              }}>
                {sessionMaxed ? 'Session ready' : 'Live mining'}
              </p>
              <p style={{
                margin: '6px 0 0', fontSize: 28, fontWeight: 900, letterSpacing: '-1px',
                color: neon.text, fontVariantNumeric: 'tabular-nums',
                textShadow: `0 0 20px ${neon.cyanGlow}`,
              }}>
                {earnedPoints.toFixed(2)}
                <span style={{ fontSize: 11, fontWeight: 800, color: neon.cyan, marginLeft: 6 }}>ARX-P</span>
              </p>
            </div>
            <div style={{ textAlign: 'right' }}>
              <p style={{ margin: 0, fontSize: 16, fontWeight: 800, color: neon.text, fontVariantNumeric: 'tabular-nums' }}>
                {formatSessionTime(remainingSeconds)}
              </p>
              <p style={{ margin: '3px 0 0', fontSize: 8, fontWeight: 700, letterSpacing: '0.1em', color: 'rgba(232,252,255,0.4)', textTransform: 'uppercase' }}>
                {sessionMaxed ? 'Maxed' : 'Time left'}
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            <div style={{
              flex: 1, padding: '7px 8px', borderRadius: 12, textAlign: 'center',
              background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)',
            }}>
              <p style={{ margin: 0, fontSize: 7, fontWeight: 800, letterSpacing: '0.1em', color: 'rgba(232,252,255,0.35)', textTransform: 'uppercase' }}>Rate</p>
              <p style={{ margin: '3px 0 0', fontSize: 12, fontWeight: 900, color: neon.cyan }}>
                {pointsPerHour.toFixed(boostPercentage > 0 ? 1 : 0)}/hr
              </p>
            </div>
            <div style={{
              flex: 1, padding: '7px 8px', borderRadius: 12, textAlign: 'center',
              background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)',
            }}>
              <p style={{ margin: 0, fontSize: 7, fontWeight: 800, letterSpacing: '0.1em', color: 'rgba(232,252,255,0.35)', textTransform: 'uppercase' }}>Boost</p>
              <p style={{ margin: '3px 0 0', fontSize: 12, fontWeight: 900, color: boostPercentage > 0 ? neon.gold : 'rgba(255,255,255,0.35)' }}>
                {boostPercentage > 0 ? `+${boostPercentage}%` : '—'}
              </p>
            </div>
            <div style={{
              flex: 1, padding: '7px 8px', borderRadius: 12, textAlign: 'center',
              background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)',
            }}>
              <p style={{ margin: 0, fontSize: 7, fontWeight: 800, letterSpacing: '0.1em', color: 'rgba(232,252,255,0.35)', textTransform: 'uppercase' }}>To claim</p>
              <p style={{ margin: '3px 0 0', fontSize: 12, fontWeight: 900, color: canClaim ? neon.teal : neon.textMuted }}>
                {canClaim ? 'Ready' : `${Math.max(0, MIN_CLAIM_ARX - pts)}`}
              </p>
            </div>
          </div>

          {!canClaim && (
            <div style={{
              marginTop: 12, height: 4, borderRadius: 99, overflow: 'hidden',
              background: 'rgba(255,255,255,0.06)',
            }}>
              <div style={{
                width: `${progress * 100}%`, height: '100%',
                background: `linear-gradient(90deg, ${neon.cyan}, ${neon.teal})`,
                boxShadow: `0 0 10px ${neon.cyanGlow}`,
                transition: 'width 0.4s ease',
              }} />
            </div>
          )}

          <motion.button
            type="button"
            whileTap={canClaim && !claiming ? { scale: 0.98 } : undefined}
            onClick={onClaim}
            disabled={!canClaim || claiming}
            style={{
              width: '100%', marginTop: 14, padding: '13px 0', borderRadius: 14, border: 'none',
              cursor: canClaim && !claiming ? 'pointer' : 'default',
              fontFamily: neon.font, fontSize: 12, fontWeight: 900, letterSpacing: '0.08em',
              textTransform: 'uppercase',
              background: canClaim
                ? `linear-gradient(135deg, ${neon.cyan}, ${neon.teal})`
                : 'rgba(255,255,255,0.06)',
              color: canClaim ? '#041018' : 'rgba(255,255,255,0.35)',
              boxShadow: canClaim ? `0 8px 24px ${neon.cyan}35` : 'none',
              opacity: claiming ? 0.7 : 1,
              animation: canClaim && !claiming ? 'mining-claim-pulse 1.8s ease-in-out infinite' : undefined,
            }}
          >
            {claiming ? 'Claiming…' : canClaim ? 'Claim ARX-P' : `Mine ${MIN_CLAIM_ARX} to claim`}
          </motion.button>
        </div>
      </div>
      <style>{MINING_PILL_CSS}</style>
    </motion.div>
  );
}

export type ExploreBoxItem = {
  id: string;
  eyebrow: string;
  title: string;
  cta: string;
  badge?: string;
  variant: 'tasks' | 'leaderboard' | 'referrals' | 'nexus';
  onClick: () => void;
};

const EXPLORE_BASE = {
  background: 'linear-gradient(165deg, rgba(10,28,48,0.96) 0%, rgba(5,14,28,0.98) 55%, rgba(3,8,18,1) 100%)',
  border: '1px solid rgba(79,216,235,0.22)',
  accent: neon.cyan,
} as const;

const EXPLORE_BOX_CSS = `
@keyframes exploreShimmer{0%{transform:translateX(-120%) skewX(-12deg)}100%{transform:translateX(220%) skewX(-12deg)}}
@keyframes exploreOrbit{0%{transform:rotate(0deg)}100%{transform:rotate(360deg)}}
`;

function ExploreBoxDecor({ variant }: { variant: ExploreBoxItem['variant'] }) {
  if (variant === 'tasks') {
    return (
      <>
        <div style={{
          position: 'absolute', top: 8, right: 8, width: 40, height: 40, opacity: 0.35,
          backgroundImage: 'radial-gradient(circle, rgba(79,216,235,0.5) 1px, transparent 1px)',
          backgroundSize: '8px 8px',
        }} />
        <div style={{
          position: 'absolute', bottom: 0, left: 16, right: 16, height: 2, borderRadius: 2,
          background: `linear-gradient(90deg, transparent, ${neon.gold}88, transparent)`,
        }} />
      </>
    );
  }
  if (variant === 'leaderboard') {
    return (
      <>
        <div style={{
          position: 'absolute', top: -6, right: -6, width: 48, height: 48, borderRadius: '50%',
          border: '1px dashed rgba(255,201,60,0.25)', animation: 'exploreOrbit 18s linear infinite',
        }} />
        <div style={{
          position: 'absolute', top: 0, left: 0, width: 4, height: '100%',
          background: `linear-gradient(180deg, ${neon.gold}, transparent)`,
          borderRadius: '4px 0 0 4px', opacity: 0.7,
        }} />
      </>
    );
  }
  if (variant === 'referrals') {
    return (
      <>
        {[0, 1, 2].map((i) => (
          <div key={i} style={{
            position: 'absolute',
            top: 14 + i * 14,
            right: 16 + i * 6,
            width: 8 + i * 4,
            height: 8 + i * 4,
            borderRadius: '50%',
            border: `1px solid rgba(127,231,196,${0.35 + i * 0.15})`,
            background: `rgba(127,231,196,${0.06 + i * 0.04})`,
          }} />
        ))}
        <div style={{
          position: 'absolute', bottom: 12, right: 12, width: 40, height: 40, borderRadius: '50%',
          background: `radial-gradient(circle, rgba(127,231,196,0.12) 0%, transparent 70%)`,
        }} />
      </>
    );
  }
  return (
    <>
      <div style={{
        position: 'absolute', inset: 0, opacity: 0.12,
        backgroundImage: `repeating-linear-gradient(135deg, ${neon.purple} 0, ${neon.purple} 1px, transparent 1px, transparent 10px)`,
      }} />
      <div style={{
        position: 'absolute', top: '18%', right: '-10%', width: 80, height: 80, borderRadius: '50%',
        background: `radial-gradient(circle, rgba(168,85,247,0.2) 0%, transparent 68%)`,
      }} />
    </>
  );
}

function ExploreBoxIcon({ variant }: { variant: ExploreBoxItem['variant'] }) {
  const shell: CSSProperties = {
    width: 36, height: 36, borderRadius: 11, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
    background: 'rgba(79,216,235,0.1)', border: '1px solid rgba(79,216,235,0.28)',
    boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.08), 0 3px 10px rgba(79,216,235,0.1)',
  };

  if (variant === 'leaderboard') {
    return (
      <div style={{ ...shell, borderRadius: 11, overflow: 'hidden', padding: 0 }}>
        <img src={FORGE_UI.leaderboardKing} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center 40%' }} />
      </div>
    );
  }

  const icons = {
    tasks: <Target size={17} color={neon.gold} strokeWidth={1.8} />,
    referrals: <Users size={17} color={neon.teal} strokeWidth={1.8} />,
    nexus: <Send size={16} color={neon.purple} strokeWidth={1.8} style={{ transform: 'rotate(-8deg)' }} />,
    leaderboard: <Trophy size={17} color={neon.gold} strokeWidth={1.8} />,
  };

  return <div style={shell}>{icons[variant]}</div>;
}

function ExploreBox({ item }: { item: ExploreBoxItem }) {
  return (
    <motion.button
      type="button"
      whileTap={{ scale: 0.98 }}
      onClick={item.onClick}
      style={{
        position: 'relative',
        overflow: 'hidden',
        borderRadius: 18,
        cursor: 'pointer',
        padding: 0,
        textAlign: 'left',
        fontFamily: neon.font,
        background: EXPLORE_BASE.background,
        border: EXPLORE_BASE.border,
        boxShadow: '0 8px 20px rgba(0,0,0,0.32), inset 0 1px 0 rgba(255,255,255,0.06)',
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <style>{EXPLORE_BOX_CSS}</style>
      <ExploreBoxDecor variant={item.variant} />
      <div style={{
        position: 'absolute', top: 0, left: 0, width: '45%', height: '100%', pointerEvents: 'none',
        background: 'linear-gradient(105deg, rgba(79,216,235,0.1) 0%, transparent 72%)',
      }} />
      <div style={{
        position: 'absolute', top: 0, left: -40, width: 40, height: '100%', pointerEvents: 'none',
        background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.07), transparent)',
        animation: 'exploreShimmer 4.5s ease-in-out infinite',
      }} />

      <div style={{
        position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column',
        padding: '11px 11px 10px',
      }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 9 }}>
          <ExploreBoxIcon variant={item.variant} />
          <div style={{ flex: 1, minWidth: 0 }}>
            {item.badge && (
              <span style={{
                display: 'inline-block', marginBottom: 4,
                fontSize: 7, fontWeight: 900, padding: '2px 6px', borderRadius: 6,
                background: 'rgba(79,216,235,0.14)', border: '1px solid rgba(79,216,235,0.35)', color: neon.cyan,
              }}>
                {item.badge}
              </span>
            )}
            <p style={{
              margin: 0, fontSize: 7, fontWeight: 800, letterSpacing: '0.14em',
              textTransform: 'uppercase', color: 'rgba(232,252,255,0.45)', lineHeight: 1.25,
            }}>
              {item.eyebrow}
            </p>
            <h3 style={{
              margin: '4px 0 0', fontSize: 14, fontWeight: 900, color: neon.text,
              lineHeight: 1.15, letterSpacing: '-0.25px',
            }}>
              {item.title}
            </h3>
          </div>
        </div>

        <div style={{
          marginTop: 10,
          width: '100%',
          padding: '8px 10px',
          borderRadius: 11,
          textAlign: 'center',
          fontSize: 9,
          fontWeight: 800,
          letterSpacing: '0.04em',
          background: 'linear-gradient(180deg, rgba(79,216,235,0.2) 0%, rgba(79,216,235,0.08) 100%)',
          border: '1px solid rgba(79,216,235,0.28)',
          color: neon.text,
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.1)',
        }}>
          {item.cta}
        </div>
      </div>
    </motion.button>
  );
}

/** 2-column grid — equal-height rows, content-fit cards */
export function ExploreQuadGrid({ items }: { items: ExploreBoxItem[] }) {
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(2, 1fr)',
      alignItems: 'start',
      gap: 10,
      padding: '2px 0 6px',
    }}>
      {items.map((item) => (
        <ExploreBox key={item.id} item={item} />
      ))}
    </div>
  );
}

export interface DashBattle {
  id: string;
  title: string;
  banner_image: string | null;
  side_a_name: string;
  side_b_name: string;
  side_c_name?: string | null;
  side_a_power?: number;
  side_b_power?: number;
  side_c_power?: number | null;
  starts_at: string;
  ends_at: string;
  winner_side?: string | null;
}

function battleCountdown(endsAt: string) {
  const s = Math.max(0, Math.floor((new Date(endsAt).getTime() - Date.now()) / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m left`;
  return `${s}s left`;
}

function PoolSplitBar({ pctA, pctB, pctC, hasSideC }: { pctA: number; pctB: number; pctC: number; hasSideC: boolean }) {
  if (hasSideC) {
    return (
      <div style={{ display: 'flex', height: 5, borderRadius: 99, overflow: 'hidden', background: 'rgba(255,255,255,0.06)' }}>
        <div style={{ width: `${pctA}%`, background: `linear-gradient(90deg, ${neon.cyan}, ${neon.cyan}aa)` }} />
        <div style={{ width: `${pctC}%`, background: `linear-gradient(90deg, ${neon.gold}, ${neon.gold}aa)` }} />
        <div style={{ width: `${pctB}%`, background: `linear-gradient(90deg, ${neon.purple}, ${neon.purple}aa)` }} />
      </div>
    );
  }
  return (
    <div style={{ display: 'flex', height: 5, borderRadius: 99, overflow: 'hidden', background: 'rgba(255,255,255,0.06)' }}>
      <div style={{ width: `${pctA}%`, background: `linear-gradient(90deg, ${neon.cyan}, ${neon.teal})` }} />
      <div style={{ width: `${pctB}%`, background: `linear-gradient(90deg, ${neon.purple}, #7c3aed)` }} />
    </div>
  );
}

export function LiveBattleCard({ battle, onClick }: { battle: DashBattle; onClick: () => void }) {
  const { pctA, pctB, pctC, hasSideC } = getArenaPoolStats(battle);
  const [bannerHidden, setBannerHidden] = useState(false);
  const [countdown, setCountdown] = useState(() => battleCountdown(battle.ends_at));

  useEffect(() => {
    setCountdown(battleCountdown(battle.ends_at));
    const id = window.setInterval(() => setCountdown(battleCountdown(battle.ends_at)), 30000);
    return () => window.clearInterval(id);
  }, [battle.ends_at]);

  return (
    <motion.button
      type="button"
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      style={{
        minWidth: 228,
        maxWidth: 228,
        flexShrink: 0,
        borderRadius: 18,
        overflow: 'hidden',
        cursor: 'pointer',
        padding: 0,
        textAlign: 'left',
        fontFamily: neon.font,
        background: 'linear-gradient(165deg, rgba(14,8,28,0.98) 0%, rgba(6,4,16,0.99) 100%)',
        border: '1px solid rgba(168,85,247,0.28)',
        boxShadow: '0 12px 32px rgba(0,0,0,0.45), 0 0 24px rgba(168,85,247,0.08), inset 0 1px 0 rgba(255,255,255,0.06)',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <div style={{ height: 82, position: 'relative', flexShrink: 0, background: `linear-gradient(135deg, rgba(88,28,135,0.5), rgba(12,20,40,0.9))` }}>
        {battle.banner_image && !bannerHidden && (
          <img
            src={battle.banner_image}
            alt=""
            onError={() => setBannerHidden(true)}
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
          />
        )}
        <div style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(180deg, rgba(0,0,0,0.08) 0%, rgba(4,6,14,0.55) 55%, rgba(6,4,16,0.98) 100%)',
        }} />
        <div style={{
          position: 'absolute', top: 8, left: 8, display: 'flex', alignItems: 'center', gap: 5,
          padding: '3px 8px', borderRadius: 8,
          background: 'rgba(220,38,38,0.85)', border: '1px solid rgba(255,100,100,0.4)',
          boxShadow: '0 0 12px rgba(255,68,68,0.35)',
        }}>
          <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#fff', animation: 'livePulse 1.2s ease-in-out infinite' }} />
          <span style={{ fontSize: 7, fontWeight: 900, letterSpacing: '0.12em', color: '#fff' }}>LIVE</span>
        </div>
        <span style={{
          position: 'absolute', top: 8, right: 8, fontSize: 8, fontWeight: 700,
          padding: '3px 7px', borderRadius: 8,
          background: 'rgba(0,0,0,0.45)', border: '1px solid rgba(255,255,255,0.12)', color: neon.textMuted,
          fontVariantNumeric: 'tabular-nums',
        }}>
          {countdown}
        </span>
      </div>

      <div style={{ padding: '10px 11px 11px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        <p style={{
          margin: 0, fontSize: 12, fontWeight: 800, color: neon.text, lineHeight: 1.25,
          overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
        }}>
          {battle.title || 'Arena Battle'}
        </p>

        <PoolSplitBar pctA={pctA} pctB={pctB} pctC={pctC} hasSideC={hasSideC} />

        <div style={{
          display: 'grid',
          gridTemplateColumns: hasSideC ? '1fr 1fr 1fr' : '1fr 1fr',
          gap: 6,
        }}>
          {[
            { name: battle.side_a_name, pct: pctA, color: neon.cyan },
            ...(hasSideC ? [{ name: battle.side_c_name || 'Draw', pct: pctC, color: neon.gold }] : []),
            { name: battle.side_b_name, pct: pctB, color: neon.purple },
          ].map((side) => (
            <div key={side.name} style={{ minWidth: 0 }}>
              <p style={{
                margin: 0, fontSize: 8, fontWeight: 600, color: neon.textMuted,
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>
                {side.name}
              </p>
              <p style={{ margin: '2px 0 0', fontSize: 12, fontWeight: 900, color: side.color, fontVariantNumeric: 'tabular-nums' }}>
                {side.pct}%
              </p>
            </div>
          ))}
        </div>
      </div>
      <style>{'@keyframes livePulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.45;transform:scale(.85)}}'}</style>
    </motion.button>
  );
}

export function LiveBattleStrip({
  battles,
  onBattleClick,
  onViewAll,
}: {
  battles: DashBattle[];
  onBattleClick?: (id: string) => void;
  onViewAll?: () => void;
}) {
  if (battles.length === 0) {
    return (
      <div style={{
        borderRadius: 18, padding: '22px 16px', textAlign: 'center',
        background: 'rgba(255,255,255,0.02)', border: '1px dashed rgba(168,85,247,0.22)',
      }}>
        <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: neon.textMuted }}>No live battles right now</p>
        {onViewAll && (
          <button type="button" onClick={onViewAll} style={{
            marginTop: 10, padding: '7px 14px', borderRadius: 10, border: '1px solid rgba(168,85,247,0.35)',
            background: 'rgba(168,85,247,0.12)', color: neon.purple, fontSize: 9, fontWeight: 800, cursor: 'pointer', fontFamily: neon.font,
          }}>
            Browse Arena
          </button>
        )}
      </div>
    );
  }

  return (
    <div
      className="scrollbar-none"
      style={{ display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 4, WebkitOverflowScrolling: 'touch' }}
    >
      {battles.map((b) => (
        <LiveBattleCard
          key={b.id}
          battle={b}
          onClick={() => (onBattleClick ? onBattleClick(b.id) : onViewAll?.())}
        />
      ))}
    </div>
  );
}

export type ActivityKind =
  | 'mining'
  | 'mining_active'
  | 'task'
  | 'arena'
  | 'nexus'
  | 'referral'
  | 'social'
  | 'checkin'
  | 'campaign'
  | 'restoration'
  | 'game'
  | 'dice'
  | 'other';

export interface ActivityFeedItem {
  id: string;
  kind: ActivityKind;
  label: string;
  sub: string;
  val: string | null;
  accent: string;
  time: string;
  isCredit?: boolean;
}

/** Brand light-blue tint blended into primary copy (62% text + 38% cyan) */
const ACTIVITY_TEXT = '#b8eff8';

export function inferActivityKind(category?: string, description?: string): ActivityKind {
  const cat = (category || '').toLowerCase();
  const desc = (description || '').toLowerCase();
  if (cat === 'mining' || desc.includes('mining') || desc.includes('mined')) return 'mining';
  if (cat === 'task' || desc.includes('task') || desc.includes('mission')) return 'task';
  if (cat.startsWith('arena') || desc.includes('arena') || desc.includes('battle') || desc.includes('stake')) return 'arena';
  if (cat.startsWith('nexus') || desc.includes('nexus') || desc.includes('transfer') || desc.includes('sent')) return 'nexus';
  if (cat === 'referral' || desc.includes('referral') || desc.includes('invite')) return 'referral';
  if (cat === 'social') return 'social';
  if (cat === 'checkin' || desc.includes('check-in') || desc.includes('check in')) return 'checkin';
  if (cat === 'campaign') return 'campaign';
  if (cat === 'restoration') return 'restoration';
  if (cat.startsWith('dice') || desc.includes('dice roll')) return 'dice';
  if (cat === 'game') return 'game';
  return 'other';
}

export function activityAccent(kind: ActivityKind, isCredit: boolean): string {
  if (!isCredit) return '#ff6b4a';
  switch (kind) {
    case 'mining':
    case 'mining_active':
      return neon.teal;
    case 'task':
      return neon.gold;
    case 'arena':
      return neon.purple;
    case 'nexus':
      return neon.cyan;
    case 'referral':
      return '#fbbf24';
    case 'restoration':
      return neon.cyan;
    case 'dice':
      return neon.purple;
    default:
      return neon.teal;
  }
}

function ActivityKindIcon({ kind, size = 16 }: { kind: ActivityKind; size?: number }) {
  const props = { size, strokeWidth: 2.2 };
  switch (kind) {
    case 'mining':
    case 'mining_active':
      return <Pickaxe {...props} />;
    case 'task':
      return <Target {...props} />;
    case 'arena':
      return <Swords {...props} />;
    case 'nexus':
      return <Send {...props} />;
    case 'referral':
      return <Gift {...props} />;
    case 'social':
      return <Users {...props} />;
    case 'checkin':
      return <CheckCircle2 {...props} />;
    case 'campaign':
      return <Sparkles {...props} />;
    case 'restoration':
      return <RotateCcw {...props} />;
    case 'game':
      return <Gamepad2 {...props} />;
    case 'dice':
      return <Dices {...props} />;
    default:
      return <Activity {...props} />;
  }
}

function ActivityFeedRow({
  item,
  isLast,
  onClick,
  liveEarn,
}: {
  item: ActivityFeedItem;
  isLast: boolean;
  onClick?: () => void;
  liveEarn?: number;
}) {
  const isLive = item.kind === 'mining_active';
  const displayVal = isLive && liveEarn != null
    ? `+${liveEarn.toFixed(2)}`
    : (item.val ?? '—');

  return (
    <motion.button
      type="button"
      whileTap={{ scale: 0.99 }}
      onClick={onClick}
      style={{
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        gap: 9,
        padding: '7px 0',
        border: 'none',
        borderBottom: isLast ? 'none' : '1px solid rgba(255,255,255,0.04)',
        background: 'transparent',
        cursor: onClick ? 'pointer' : 'default',
        fontFamily: neon.font,
        textAlign: 'left',
      }}
    >
      <div style={{
        width: 26,
        height: 26,
        borderRadius: 8,
        flexShrink: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: ACTIVITY_TEXT,
        background: `${neon.cyan}10`,
        border: `1px solid ${neon.cyan}22`,
        position: 'relative',
      }}>
        <ActivityKindIcon kind={item.kind} size={13} />
        {isLive && (
          <div style={{
            position: 'absolute', top: -1, right: -1, width: 6, height: 6, borderRadius: '50%',
            background: neon.cyan, border: '1.5px solid rgba(6,12,24,0.95)',
            animation: 'activityPulse 1.4s ease-in-out infinite',
          }} />
        )}
      </div>

      <div style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'baseline', gap: 6 }}>
        <p style={{
          margin: 0,
          flex: 1,
          minWidth: 0,
          fontSize: 12,
          fontWeight: 500,
          lineHeight: 1.2,
          color: ACTIVITY_TEXT,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}>
          {item.label}
          <span style={{ opacity: 0.6, fontWeight: 400 }}>
            {' · '}{isLive ? 'live' : item.sub}
          </span>
        </p>

        <span style={{
          flexShrink: 0,
          fontSize: 12,
          fontWeight: 500,
          lineHeight: 1.2,
          color: ACTIVITY_TEXT,
          fontVariantNumeric: 'tabular-nums',
          whiteSpace: 'nowrap',
        }}>
          {displayVal}
          <span style={{ opacity: 0.55, fontWeight: 400, fontSize: 10, marginLeft: 3 }}>
            ARX-P
          </span>
        </span>
      </div>
    </motion.button>
  );
}

export function RecentActivityFeed({
  items,
  isMiningLive = false,
  liveEarn,
  onItemClick,
  onEmptyAction,
}: {
  items: ActivityFeedItem[];
  isMiningLive?: boolean;
  liveEarn?: number;
  onItemClick?: () => void;
  onEmptyAction?: () => void;
}) {
  const feedItems = useMemo(() => {
    if (!isMiningLive || liveEarn == null) return items;
    const hasLive = items.some((it) => it.kind === 'mining_active');
    if (hasLive) return items;
    const liveRow: ActivityFeedItem = {
      id: '__live_mining__',
      kind: 'mining_active',
      label: 'Mining Session',
      sub: 'In progress',
      val: null,
      accent: neon.teal,
      time: new Date().toISOString(),
      isCredit: true,
    };
    return [liveRow, ...items].slice(0, 5);
  }, [items, isMiningLive, liveEarn]);

  const netPositive = useMemo(
    () => feedItems.reduce((sum, it) => {
      if (!it.val || it.isCredit === false) return sum;
      const n = Number(it.val.replace(/[+,\s]/g, ''));
      return sum + (Number.isFinite(n) ? n : 0);
    }, isMiningLive && liveEarn ? liveEarn : 0),
    [feedItems, isMiningLive, liveEarn],
  );

  if (feedItems.length === 0) {
    return (
      <div style={{
        borderRadius: 18,
        padding: '24px 18px',
        textAlign: 'center',
        background: 'linear-gradient(165deg, rgba(12,28,48,0.55) 0%, rgba(6,14,28,0.75) 100%)',
        border: '1px dashed rgba(79,216,235,0.22)',
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04)',
      }}>
        <div style={{
          width: 44, height: 44, borderRadius: 14, margin: '0 auto 12px',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: `${neon.teal}12`, border: `1px solid ${neon.teal}35`, color: neon.teal,
        }}>
          <Pickaxe size={20} strokeWidth={2.2} />
        </div>
        <p style={{ margin: 0, fontSize: 13, fontWeight: 500, color: ACTIVITY_TEXT }}>No activity yet</p>
        <p style={{ margin: '6px 0 0', fontSize: 11, fontWeight: 400, color: ACTIVITY_TEXT, lineHeight: 1.45 }}>
          Mine, complete tasks, or join Arena battles to build your feed.
        </p>
        {onEmptyAction && (
          <button type="button" onClick={onEmptyAction} style={{
            marginTop: 14, padding: '8px 16px', borderRadius: 10,
            border: `1px solid ${neon.cyan}47`,
            background: `${neon.cyan}1a`,
            color: ACTIVITY_TEXT, fontSize: 10, fontWeight: 500, cursor: 'pointer', fontFamily: neon.font,
          }}>
            Start Mining
          </button>
        )}
      </div>
    );
  }

  return (
    <div style={{
      borderRadius: 18,
      overflow: 'hidden',
      background: 'linear-gradient(165deg, rgba(14,32,54,0.88) 0%, rgba(8,18,36,0.94) 100%)',
      border: '1px solid rgba(79,216,235,0.18)',
      boxShadow: '0 10px 28px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.06)',
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '7px 12px 6px',
        borderBottom: '1px solid rgba(255,255,255,0.05)',
      }}>
        <span style={{ fontSize: 9, fontWeight: 500, color: ACTIVITY_TEXT, opacity: 0.75, letterSpacing: '0.03em' }}>
          {feedItems.length} recent{isMiningLive ? ' · live' : ''}
        </span>
        {netPositive > 0 && (
          <span style={{
            fontSize: 9, fontWeight: 500, color: ACTIVITY_TEXT, opacity: 0.75,
            fontVariantNumeric: 'tabular-nums',
          }}>
            +{Math.round(netPositive).toLocaleString()} ARX-P
          </span>
        )}
      </div>

      <div style={{ padding: '2px 12px 8px' }}>
        {feedItems.map((item, i) => (
          <ActivityFeedRow
            key={item.id}
            item={item}
            isLast={i === feedItems.length - 1}
            onClick={onItemClick}
            liveEarn={item.kind === 'mining_active' ? liveEarn : undefined}
          />
        ))}
      </div>
      <style>{'@keyframes activityPulse{0%,100%{opacity:1}50%{opacity:.45}}'}</style>
    </div>
  );
}

/** Compact explore card — staggered path layout */
export function ExploreFlowBanner({
  eyebrow, title, cta, onClick, image, icon3d, accent = neon.cyan, badge, align,
}: {
  eyebrow: string; title: string; cta: string; onClick: () => void;
  image?: string; icon3d?: ReactNode; accent?: string; badge?: string;
  align: 'left' | 'right';
}) {
  const visualSide = align === 'left' ? 'right' : 'left';
  return (
    <motion.button
      type="button"
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      style={{
        width: '100%',
        borderRadius: 18,
        overflow: 'hidden',
        cursor: 'pointer',
        border: `1px solid ${accent}32`,
        padding: 0,
        textAlign: 'left',
        position: 'relative',
        minHeight: 96,
        boxShadow: `0 12px 32px -12px ${accent}22, 0 4px 20px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.07)`,
        background: 'linear-gradient(135deg, rgba(12,32,58,0.94) 0%, rgba(6,16,32,0.97) 55%, rgba(4,10,22,0.99) 100%)',
      }}
    >
      <div style={{
        position: 'absolute', inset: 0,
        background: `radial-gradient(ellipse 65% 70% at ${visualSide === 'right' ? '88%' : '12%'} 35%, ${accent}18, transparent 58%)`,
      }} />
      {image && (
        <div style={{
          position: 'absolute',
          ...(visualSide === 'right' ? { right: -2 } : { left: -2 }),
          top: '50%', transform: 'translateY(-50%)',
          width: 68, height: 68, opacity: 0.88,
        }}>
          <img src={image} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain', filter: `drop-shadow(0 0 18px ${accent}66)` }} />
        </div>
      )}
      {icon3d && !image && (
        <div style={{
          position: 'absolute',
          ...(visualSide === 'right' ? { right: 12 } : { left: 12 }),
          top: '50%', transform: 'translateY(-50%)',
        }}>{icon3d}</div>
      )}
      <div style={{
        position: 'relative', zIndex: 1, padding: '14px 14px 13px',
        paddingRight: image || icon3d ? (visualSide === 'right' ? 72 : 14) : 14,
        paddingLeft: image || icon3d ? (visualSide === 'left' ? 72 : 14) : 14,
      }}>
        {badge && (
          <span style={{
            position: 'absolute', top: 10, right: 10,
            fontSize: 7, fontWeight: 900, padding: '2px 6px', borderRadius: 6,
            background: `${accent}22`, border: `1px solid ${accent}44`, color: accent,
          }}>{badge}</span>
        )}
        <p style={{ margin: 0, fontSize: 7, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: accent }}>{eyebrow}</p>
        <h3 style={{ margin: '4px 0 0', fontSize: 16, fontWeight: 800, color: neon.text, lineHeight: 1.15 }}>{title}</h3>
        <span style={{
          marginTop: 10, display: 'inline-flex', alignItems: 'center', gap: 4,
          padding: '7px 12px', borderRadius: 10, fontSize: 10, fontWeight: 800,
          background: `linear-gradient(135deg, ${accent}, rgba(79,216,235,0.6))`,
          color: '#0a1628', boxShadow: `0 4px 14px ${accent}33, inset 0 1px 0 rgba(255,255,255,0.3)`,
        }}>
          {cta} →
        </span>
      </div>
    </motion.button>
  );
}

const EXPLORE_CARD_W = '72%';
const EXPLORE_CARD_MAX = 252;
const PATH_H = 90;
const PATH_VB_W = 400;
const CARD_OVERLAP = 38;

/** Smooth curved connector — one dot at destination card edge only (reference image 2) */
function ExplorePathSegment({ fromAlign, accent }: { fromAlign: 'left' | 'right'; accent: string }) {
  const uid = useId().replace(/:/g, '');
  const h = PATH_H;
  const cardW = PATH_VB_W * 0.72;
  const rightStart = PATH_VB_W - cardW;

  // Shared bend — right→left (Leaderboard→Wallet, Referrals→Nexus) is the reference
  const exitInset = 0.66;
  const entryInset = 0.76;
  const dropCtrl = h * 0.72;
  const entryCtrl = h * 0.15;

  let sx: number;
  let endX: number;

  if (fromAlign === 'right') {
    sx = rightStart + cardW * exitInset;
    endX = cardW * entryInset;
  } else {
    sx = cardW * (1 - exitInset);
    endX = rightStart + cardW * (1 - entryInset);
  }

  const d = `M ${sx} 0 C ${sx} ${dropCtrl}, ${endX} ${entryCtrl}, ${endX} ${h}`;

  return (
    <div style={{
      position: 'relative', width: '100%', height: PATH_H, zIndex: 1,
      pointerEvents: 'none',
    }}>
      <svg
        viewBox={`0 0 ${PATH_VB_W} ${h}`}
        preserveAspectRatio="none"
        style={{ width: '100%', height: PATH_H, display: 'block', overflow: 'visible' }}
      >
        <defs>
          <filter id={`curve-glow-${uid}`}>
            <feGaussianBlur stdDeviation="2.2" result="b" />
            <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>
        <path
          d={d}
          fill="none"
          stroke={accent}
          strokeWidth="1.5"
          vectorEffect="non-scaling-stroke"
          strokeLinecap="round"
          opacity={0.82}
          filter={`url(#curve-glow-${uid})`}
        />
      </svg>
      <div style={{
        position: 'absolute',
        left: `${(endX / PATH_VB_W) * 100}%`,
        top: PATH_H,
        width: 9,
        height: 9,
        marginLeft: -4.5,
        marginTop: -4.5,
        borderRadius: '50%',
        background: accent,
        boxShadow: `0 0 12px ${accent}, 0 0 4px ${accent}`,
      }} />
    </div>
  );
}

/** Full explore section — staggered cards + continuous bent path */
export function ExploreStaggerFlow({
  items,
}: {
  items: Array<{
    eyebrow: string; title: string; cta: string; accent: string; align: 'left' | 'right';
    badge?: string; image?: string; icon3d?: ReactNode; onClick: () => void;
  }>;
}) {
  return (
    <div style={{ position: 'relative', width: '100%', padding: '10px 0 14px' }}>
      {items.map((item, i) => (
        <div key={item.title}>
          <div style={{
            display: 'flex',
            justifyContent: item.align === 'left' ? 'flex-start' : 'flex-end',
            position: 'relative',
            zIndex: 2,
            marginTop: i > 0 ? -CARD_OVERLAP : 0,
          }}>
            <div style={{ width: EXPLORE_CARD_W, maxWidth: EXPLORE_CARD_MAX }}>
              <ExploreFlowBanner {...item} />
            </div>
          </div>
          {i < items.length - 1 && (
            <ExplorePathSegment fromAlign={item.align} accent={item.accent} />
          )}
        </div>
      ))}
    </div>
  );
}

export function FlowConnector({ accent = neon.cyan }: { accent?: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: '2px 0', position: 'relative', height: 36 }}>
      <div style={{
        width: 2, height: '100%',
        background: `linear-gradient(180deg, ${accent}, ${accent}22, transparent)`,
        borderRadius: 2,
        boxShadow: `0 0 16px ${accent}55`,
      }} />
      <div style={{
        position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
        width: 8, height: 8, borderRadius: '50%',
        background: accent, boxShadow: `0 0 12px ${accent}`,
      }} />
    </div>
  );
}

export function CreamyBannerButton({ children, onClick, accent = neon.gold }: { children: ReactNode; onClick: () => void; accent?: string }) {
  return (
    <motion.button
      type="button"
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      style={{
        width: '100%', padding: '18px 24px', borderRadius: 22, border: 'none', cursor: 'pointer',
        position: 'relative', overflow: 'hidden',
        background: `linear-gradient(135deg, ${accent} 0%, rgba(255,180,60,0.95) 45%, rgba(255,140,40,0.9) 100%)`,
        boxShadow: `0 12px 32px rgba(0,0,0,0.45), 0 0 40px ${accent}33, inset 0 2px 0 rgba(255,255,255,0.45), inset 0 -4px 12px rgba(0,0,0,0.15)`,
        color: '#2a1500', fontSize: 15, fontWeight: 900, letterSpacing: '0.06em', textTransform: 'uppercase',
        fontFamily: neon.font,
      }}
    >
      <span style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: '50%',
        background: 'linear-gradient(180deg, rgba(255,255,255,0.35), transparent)', pointerEvents: 'none',
      }} />
      <span style={{ position: 'relative' }}>{children}</span>
    </motion.button>
  );
}

export function buildWeekDaysFromAmounts(amounts: number[], anchor = new Date()): DayEarning[] {
  const dayNames = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
  const todayKey = `${anchor.getFullYear()}-${String(anchor.getMonth() + 1).padStart(2, '0')}-${String(anchor.getDate()).padStart(2, '0')}`;
  return amounts.map((amount, i) => {
    const d = new Date(anchor);
    d.setDate(d.getDate() - (6 - i));
    const date = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    return {
      date,
      label: dayNames[d.getDay()],
      shortDate: d.toLocaleDateString([], { month: 'short', day: 'numeric' }),
      amount,
      isToday: date === todayKey,
    };
  });
}

export function mockPreviewWeekDays(): DayEarning[] {
  return buildWeekDaysFromAmounts([1240, 980, 1560, 2100, 1890, 2640, 2840]);
}
