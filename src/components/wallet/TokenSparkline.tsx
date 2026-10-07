import type { TokenUsd } from '@/chainWallet/prices';

export function TokenSparkline({ quote, width = 64, height = 28 }: { quote: TokenUsd; width?: number; height?: number }) {
  if (quote.noMarket) return null;
  const pts = quote.sparkline;
  if (pts.length < 2) return null;
  const min = Math.min(...pts);
  const max = Math.max(...pts);
  const span = max - min || 1;
  const up = (quote.change24h ?? 0) >= 0;
  const color = up ? 'hsl(155 45% 55%)' : 'hsl(0 70% 62%)';
  const d = pts
    .map((y, i) => {
      const x = (i / (pts.length - 1)) * width;
      const py = height - ((y - min) / span) * (height - 4) - 2;
      return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)} ${py.toFixed(1)}`;
    })
    .join(' ');
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-hidden style={{ display: 'block', flexShrink: 0 }}>
      <path d={d} fill="none" stroke={color} strokeWidth="1.6" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

export function TokenChangePct({ quote }: { quote: TokenUsd }) {
  if (quote.noMarket || quote.change24h == null) return null;
  const up = quote.change24h >= 0;
  const sign = quote.change24h > 0 ? '+' : '';
  return (
    <span
      style={{
        fontSize: 11,
        fontWeight: 800,
        color: up ? 'hsl(155 45% 55%)' : 'hsl(0 70% 62%)',
        minWidth: 52,
        textAlign: 'right',
      }}
    >
      {sign}
      {quote.change24h.toFixed(2)}%
    </span>
  );
}
