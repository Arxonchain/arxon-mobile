import { useMemo, useRef, useState, type PointerEvent } from 'react';
import type { ChartPoint } from '@/chainWallet/marketChart';
import type { PricedSymbol } from '@/chainWallet/prices';

const UP = '#3ddc84';
const DOWN = '#ff5c5c';
const FLAT = '#8b9097';

export function LivePriceChart({
  symbol,
  points,
  loading,
  error,
  width = 354,
  height = 150,
  formatUsd,
}: {
  symbol: PricedSymbol | null;
  points: ChartPoint[];
  loading?: boolean;
  error?: string | null;
  width?: number;
  height?: number;
  formatUsd: (usd: number) => string;
}) {
  const wrap = useRef<HTMLDivElement>(null);
  const [cursor, setCursor] = useState<number | null>(null);

  const geometry = useMemo(() => {
    if (points.length < 2) return null;
    const vals = points.map((pt) => pt.p);
    const min = Math.min(...vals);
    const max = Math.max(...vals);
    const pad = Math.max((max - min) * 0.08, Math.abs(max || min || 1) * 0.0025, 1e-8);
    const lo = min - pad;
    const hi = max + pad;
    const span = hi - lo || 1;
    const coords = points.map((pt, i) => {
      const x = (i / (points.length - 1)) * width;
      const y = height - ((pt.p - lo) / span) * (height - 8) - 4;
      return { x, y, ...pt };
    });
    const line = coords.map((pt, i) => `${i === 0 ? 'M' : 'L'}${pt.x.toFixed(2)} ${pt.y.toFixed(2)}`).join(' ');
    const area = `${line} L ${width} ${height} L 0 ${height} Z`;
    const first = points[0].p;
    const last = points[points.length - 1].p;
    const up = last >= first;
    return { coords, line, area, up, last };
  }, [points, width, height]);

  function pick(e: PointerEvent<HTMLDivElement>) {
    if (!geometry || !wrap.current) return;
    const box = wrap.current.getBoundingClientRect();
    const x = ((e.clientX - box.left) / box.width) * width;
    const i = Math.max(0, Math.min(geometry.coords.length - 1, Math.round((x / width) * (geometry.coords.length - 1))));
    setCursor(i);
  }

  const active = cursor != null ? geometry?.coords[cursor] : null;
  const color = !geometry ? FLAT : geometry.up ? UP : DOWN;
  const gid = `live-chart-${symbol ?? 'none'}-${width}-${height}`;

  if (!symbol) {
    return (
      <div style={box(width, height)}>
        <span style={msg}>No market price</span>
      </div>
    );
  }

  if (error && points.length < 2) {
    return (
      <div style={box(width, height)}>
        <span style={msg}>Couldn’t load this chart</span>
      </div>
    );
  }

  if (!geometry) {
    return (
      <div style={box(width, height)}>
        <span style={msg}>{loading ? 'Loading chart…' : 'No chart data'}</span>
      </div>
    );
  }

  return (
    <div
      ref={wrap}
      onPointerDown={(e) => {
        (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);
        pick(e);
      }}
      onPointerMove={(e) => {
        if (cursor != null || e.buttons) pick(e);
      }}
      onPointerUp={() => setCursor(null)}
      onPointerCancel={() => setCursor(null)}
      style={{ width, height, position: 'relative', touchAction: 'none', cursor: 'crosshair' }}
    >
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-hidden style={{ display: 'block' }}>
        <defs>
          <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.28" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={geometry.area} fill={`url(#${gid})`} />
        <path d={geometry.line} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
        {active ? (
          <>
            <line x1={active.x} x2={active.x} y1={0} y2={height} stroke="rgba(255,255,255,0.22)" strokeWidth="1" />
            <circle cx={active.x} cy={active.y} r="4.5" fill="#050505" stroke={color} strokeWidth="2" />
          </>
        ) : null}
      </svg>
      {active ? (
        <span
          style={{
            position: 'absolute',
            left: Math.min(Math.max(active.x - 54, 0), width - 108),
            top: Math.max(active.y - 28, 4),
            minWidth: 108,
            textAlign: 'center',
            fontSize: 12,
            fontWeight: 600,
            color: '#fff',
            background: '#1c2025',
            border: '1px solid #2a3447',
            borderRadius: 8,
            padding: '3px 8px',
            pointerEvents: 'none',
          }}
        >
          {formatUsd(active.p)}
        </span>
      ) : null}
    </div>
  );
}

export function MarketSpark({ points, width = 76, height = 28 }: { points: ChartPoint[]; width?: number; height?: number }) {
  if (points.length < 2) {
    return <span style={{ width, height, display: 'block', flexShrink: 0 }} />;
  }
  const vals = points.map((pt) => pt.p);
  const min = Math.min(...vals);
  const max = Math.max(...vals);
  const pad = Math.max((max - min) * 0.08, Math.abs(max || min || 1) * 0.0025, 1e-8);
  const lo = min - pad;
  const span = max + pad - lo || 1;
  const line = points
    .map((pt, i) => {
      const x = (i / (points.length - 1)) * width;
      const y = height - ((pt.p - lo) / span) * (height - 4) - 2;
      return `${i === 0 ? 'M' : 'L'}${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(' ');
  const up = points[points.length - 1].p >= points[0].p;
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-hidden style={{ display: 'block', flexShrink: 0, pointerEvents: 'none' }}>
      <path d={line} fill="none" stroke={up ? UP : DOWN} strokeWidth="1.6" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

function box(width: number, height: number) {
  return {
    width,
    height,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#0b1118',
    borderRadius: 12,
  } as const;
}

const msg = { color: '#8b9097', fontSize: 13, fontWeight: 500 } as const;
