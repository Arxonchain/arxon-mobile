import { cacheGet, cacheSet } from '@/lib/localCache';

export type PricedSymbol = 'ETH' | 'USDC' | 'USDT';
export type WalletSymbol = PricedSymbol | 'tARX' | 'ARX';

export type TokenUsd = {
  usd: number | null;
  change24h: number | null;
  sparkline: number[];
  noMarket: boolean;
};

export type PriceMap = Record<PricedSymbol, TokenUsd> & {
  tARX: TokenUsd;
  ARX: TokenUsd;
};

const CACHE_KEY = 'arxon.tokenUsd.v1';
export const PRICE_TTL_MS = 60_000;

const CG_IDS: Record<PricedSymbol, string> = {
  ETH: 'ethereum',
  USDC: 'usd-coin',
  USDT: 'tether',
};

const NO_MARKET: TokenUsd = { usd: null, change24h: null, sparkline: [], noMarket: true };

function emptyPriced(): TokenUsd {
  return { usd: null, change24h: null, sparkline: [], noMarket: false };
}

export function noMarketQuote(): TokenUsd {
  return { ...NO_MARKET };
}

export function emptyPriceMap(): PriceMap {
  return {
    ETH: emptyPriced(),
    USDC: emptyPriced(),
    USDT: emptyPriced(),
    tARX: noMarketQuote(),
    ARX: noMarketQuote(),
  };
}

export function formatUsd(n: number | null | undefined): string | null {
  if (n == null || !Number.isFinite(n)) return null;
  return n.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function formatPct(n: number | null | undefined): string | null {
  if (n == null || !Number.isFinite(n)) return null;
  const sign = n > 0 ? '+' : '';
  return `${sign}${n.toFixed(2)}%`;
}

export function usdFromAmount(amount: string | null | undefined, usd: number | null | undefined): number | null {
  if (usd == null || !Number.isFinite(usd)) return null;
  if (amount == null) return null;
  const n = Number(amount);
  if (!Number.isFinite(n)) return null;
  return n * usd;
}

export function quoteFor(symbol: string, prices: PriceMap | null | undefined): TokenUsd {
  const key = symbol.toUpperCase();
  if (key === 'ETH' || key === 'USDC' || key === 'USDT') return prices?.[key] ?? emptyPriced();
  return noMarketQuote();
}

function spark24h(points: number[] | undefined): number[] {
  if (!points?.length) return [];
  const slice = points.length > 24 ? points.slice(-24) : points;
  return slice.filter((n) => Number.isFinite(n));
}

type CgMarket = {
  id?: string;
  current_price?: number;
  price_change_percentage_24h?: number;
  sparkline_in_7d?: { price?: number[] };
};

function parseMarkets(rows: CgMarket[]): PriceMap {
  const next = emptyPriceMap();
  const byId = new Map(rows.map((row) => [row.id, row]));
  (Object.keys(CG_IDS) as PricedSymbol[]).forEach((sym) => {
    const row = byId.get(CG_IDS[sym]);
    if (!row) return;
    const usd = Number(row.current_price);
    const change = Number(row.price_change_percentage_24h);
    next[sym] = {
      usd: Number.isFinite(usd) ? usd : null,
      change24h: Number.isFinite(change) ? change : null,
      sparkline: spark24h(row.sparkline_in_7d?.price),
      noMarket: false,
    };
  });
  return next;
}

export function readCachedPrices(): { data: PriceMap; savedAt: number } | null {
  const hit = cacheGet<PriceMap>(CACHE_KEY);
  if (!hit?.data) return null;
  return hit;
}

export async function loadTokenPrices(now = Date.now()): Promise<PriceMap> {
  const cached = readCachedPrices();
  if (cached && now - cached.savedAt < PRICE_TTL_MS) {
    return { ...emptyPriceMap(), ...cached.data, tARX: noMarketQuote(), ARX: noMarketQuote() };
  }

  try {
    const url =
      'https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=ethereum,usd-coin,tether&sparkline=true&price_change_percentage=24h';
    const res = await fetch(url);
    if (!res.ok) throw new Error(`prices ${res.status}`);
    const json = (await res.json()) as CgMarket[];
    const next = parseMarkets(Array.isArray(json) ? json : []);
    cacheSet(CACHE_KEY, next);
    return next;
  } catch {
    if (cached?.data) {
      return { ...emptyPriceMap(), ...cached.data, tARX: noMarketQuote(), ARX: noMarketQuote() };
    }
    return emptyPriceMap();
  }
}
