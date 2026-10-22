import { cacheGet, cacheSet } from '@/lib/localCache';
import { CG_IDS, type PricedSymbol } from './prices';

export type ChartRange = '1H' | '1D' | '1W' | '1M' | '1Y' | 'All';

export type ChartPoint = { t: number; p: number };

export const CHART_RANGES: ChartRange[] = ['1H', '1D', '1W', '1M', '1Y', 'All'];

const RANGE_DAYS: Record<ChartRange, string> = {
  '1H': '1',
  '1D': '1',
  '1W': '7',
  '1M': '30',
  '1Y': '365',
  All: 'max',
};

export const RANGE_SUFFIX: Record<ChartRange, string> = {
  '1H': '1H',
  '1D': 'Today',
  '1W': '1W',
  '1M': '1M',
  '1Y': '1Y',
  All: 'All',
};

const CHART_TTL_MS = 120_000;
const MAX_POINTS = 72;

export function pricedChartSymbol(raw: string | undefined | null): PricedSymbol | null {
  if (!raw) return null;
  const key = raw.toUpperCase().replace(/[^A-Z]/g, '');
  if (key === 'ETH') return 'ETH';
  if (key === 'BTC') return 'BTC';
  if (key === 'SOL') return 'SOL';
  if (key === 'USDT') return 'USDT';
  if (key === 'USDC') return 'USDC';
  return null;
}

export function downsample(points: ChartPoint[], max = MAX_POINTS): ChartPoint[] {
  if (points.length <= max) return points;
  const last = points.length - 1;
  const step = last / (max - 1);
  const out: ChartPoint[] = [];
  for (let i = 0; i < max; i += 1) {
    out.push(points[Math.round(i * step)]);
  }
  return out;
}

export function changeFromPoints(points: ChartPoint[]): number | null {
  if (points.length < 2) return null;
  const start = points[0].p;
  const end = points[points.length - 1].p;
  if (!Number.isFinite(start) || !Number.isFinite(end) || start === 0) return null;
  return ((end - start) / start) * 100;
}

function sliceHour(points: ChartPoint[]): ChartPoint[] {
  const cut = Date.now() - 60 * 60 * 1000;
  const hour = points.filter((pt) => pt.t >= cut);
  if (hour.length >= 2) return hour;
  return points.slice(-Math.max(12, Math.floor(points.length / 24)));
}

export async function loadMarketChart(symbol: PricedSymbol, range: ChartRange): Promise<ChartPoint[]> {
  const id = CG_IDS[symbol];
  const key = `arxon.chart.v1.${id}.${range}`;
  const hit = cacheGet<ChartPoint[]>(key, { maxAgeMs: CHART_TTL_MS });
  if (hit?.data && hit.data.length >= 2) return hit.data;

  const url = `https://api.coingecko.com/api/v3/coins/${id}/market_chart?vs_currency=usd&days=${RANGE_DAYS[range]}`;
  const res = await fetch(url);
  if (!res.ok) {
    if (hit?.data?.length) return hit.data;
    throw new Error(`chart ${res.status}`);
  }
  const json = (await res.json()) as { prices?: [number, number][] };
  const raw = Array.isArray(json.prices) ? json.prices : [];
  let points = raw
    .map(([t, p]) => ({ t: Number(t), p: Number(p) }))
    .filter((pt) => Number.isFinite(pt.t) && Number.isFinite(pt.p));
  if (range === '1H') points = sliceHour(points);
  points = downsample(points);
  if (points.length >= 2) cacheSet(key, points);
  return points;
}
