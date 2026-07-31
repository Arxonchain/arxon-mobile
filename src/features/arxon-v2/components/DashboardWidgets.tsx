import { useCallback, useEffect, useId, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { motion, useSpring, animate } from 'framer-motion';
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
      style={{ position: 'relative', touchAction: 'none', userSelect: 'none' }}
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
  weekDays,
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
      padding: '22px 16px 10px',
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
          <p style={{ margin: '5px 0 0', fontSize: 10, color: neon.gold, fontWeight: 700 }}>Rank #{rank}</p>
        )}

        <div style={{ marginTop: 8 }}>
          <WeekEarningsChart
            days={weekDays}
            liveTodayBoost={liveTodayBoost}
            isMiningLive={isMiningLive}
            salesStyle
          />
        </div>

        <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
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

      <style>{`@keyframes chartPulse{0%,100%{opacity:.35;transform:scale(1)}50%{opacity:.7;transform:scale(1.15)}}`}</style>
    </div>
  );
}

const MINING_PILL_CSS = `
@keyframes miningStrokeSpin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
@keyframes miningStrokeHue{0%{filter:hue-rotate(0deg)}100%{filter:hue-rotate(360deg)}}
`;

const MINING_PILL_GRADIENT = 'conic-gradient(from 0deg, #4FD8EB, #a855f7, #ffc93c, #7FE7C4, #ff6b4a, #4FD8EB)';
const DREAM_BLUE = '#B8CCEE';
const STROKE_W = 2;
const PILL_H = 56;
const ORB_SIZE = 50;
const SIDE_PAD = 12;
const GRID_COLS = `1fr ${ORB_SIZE}px 1fr`;
const PILL_FILL = neon.deep;

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

/** SALES-style mining pill — tap center to mine; live points + time remaining */
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
  const mins = Math.floor(Math.max(0, remainingSeconds) / 60);
  const secs = Math.max(0, remainingSeconds) % 60;
  const centerLabel = sessionMaxed ? 'CLAIM' : isMining ? '' : 'MINE';
  const hasBoost = boostPercentage > 0;
  const rateLabel = `${pointsPerHour.toFixed(hasBoost ? 1 : 0)}/hr`;
  const boostLabel = hasBoost ? `+${boostPercentage}%` : '—';

  const orbButton = (
    <motion.button
      type="button"
      whileTap={{ scale: 0.94 }}
      onClick={onToggle}
      disabled={loading}
      aria-label={isMining ? 'Stop or claim mining session' : 'Start mining'}
      style={{
        position: 'relative',
        width: ORB_SIZE,
        height: ORB_SIZE,
        borderRadius: '50%',
        border: 'none',
        cursor: loading ? 'wait' : 'pointer',
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
              {centerLabel}
            </span>
          )}
          {isMining && !sessionMaxed && (
            <ArxonMiningLogo animated keyholeFill="transparent" />
          )}
          {isMining && sessionMaxed && (
            <span style={{ fontSize: 8, fontWeight: 900, letterSpacing: '0.08em', color: neon.cyan }}>
              CLAIM
            </span>
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
              PTS.
            </p>
          </div>

          <div style={{ display: 'flex', justifyContent: 'center', zIndex: 2, pointerEvents: 'none' }}>
            {orbButton}
          </div>

          <div style={{ textAlign: 'center', zIndex: 1 }}>
            <p style={{
              margin: 0, fontSize: 22, fontWeight: 800, color: '#fff', letterSpacing: '-0.5px', lineHeight: 1,
              fontVariantNumeric: 'tabular-nums',
            }}>
              {String(mins).padStart(2, '0')}
              <span style={{ fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.35)', margin: '0 1px' }}>:</span>
              {String(secs).padStart(2, '0')}
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
