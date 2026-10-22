import { useCallback, useEffect, useState } from 'react';

export const DISPLAY_CURRENCIES = [
  ['USD', 'US Dollar'],
  ['EUR', 'Euro'],
  ['GBP', 'British Pound'],
  ['NGN', 'Nigerian Naira'],
  ['ZAR', 'South African Rand'],
] as const;

export type DisplayCode = (typeof DISPLAY_CURRENCIES)[number][0];

const CURRENCY_KEY = 'arxon.currency';
const FX_KEY = 'arxon.fx.v1';
const FX_TTL_MS = 60 * 60 * 1000;
const EVENT = 'arxon-currency';

const LOCALES: Record<string, string> = {
  USD: 'en-US',
  EUR: 'en-IE',
  GBP: 'en-GB',
  NGN: 'en-NG',
  ZAR: 'en-ZA',
};

/** Offline fallbacks so a picked currency still converts before FX loads. */
export const DEFAULT_FX: Record<string, number> = {
  USD: 1,
  EUR: 0.92,
  GBP: 0.79,
  NGN: 1550,
  ZAR: 18.5,
};

export function isDisplayCode(value: string): value is DisplayCode {
  return DISPLAY_CURRENCIES.some(([id]) => id === value);
}

export function readDisplayCurrency(): DisplayCode {
  try {
    const saved = localStorage.getItem(CURRENCY_KEY);
    return saved && isDisplayCode(saved) ? saved : 'USD';
  } catch {
    return 'USD';
  }
}

export function writeDisplayCurrency(code: DisplayCode) {
  try {
    localStorage.setItem(CURRENCY_KEY, code);
  } catch {
    /* session still updates through the event */
  }
  window.dispatchEvent(new Event(EVENT));
}

export function formatDisplay(usdAmount: number, code: string, rates: Record<string, number> = DEFAULT_FX) {
  const n = usdAmount * (rates[code] ?? 1);
  if (!Number.isFinite(n)) return formatDisplay(0, code, rates);
  try {
    return n.toLocaleString(LOCALES[code] || 'en-US', {
      style: 'currency',
      currency: code,
      currencyDisplay: 'narrowSymbol',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  } catch {
    return `${code} ${n.toFixed(2)}`;
  }
}

function readCachedFx(): Record<string, number> | null {
  try {
    const raw = localStorage.getItem(FX_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { at?: number; rates?: Record<string, number> };
    if (!parsed?.rates || typeof parsed.at !== 'number') return null;
    if (Date.now() - parsed.at > FX_TTL_MS) return { ...DEFAULT_FX, ...parsed.rates };
    return { ...DEFAULT_FX, ...parsed.rates };
  } catch {
    return null;
  }
}

export async function loadFxRates(): Promise<Record<string, number>> {
  const cached = readCachedFx();
  if (cached && cached !== DEFAULT_FX) {
    try {
      const raw = localStorage.getItem(FX_KEY);
      const parsed = raw ? (JSON.parse(raw) as { at?: number }) : null;
      if (parsed?.at && Date.now() - parsed.at < FX_TTL_MS) return cached;
    } catch {
      /* fetch fresh */
    }
  }

  try {
    const res = await fetch(
      'https://api.coingecko.com/api/v3/simple/price?ids=tether&vs_currencies=usd,eur,gbp,ngn,zar',
    );
    if (!res.ok) throw new Error(`fx ${res.status}`);
    const json = (await res.json()) as { tether?: Record<string, number> };
    const t = json.tether ?? {};
    const usd = Number(t.usd) || 1;
    const rates: Record<string, number> = {
      USD: 1,
      EUR: (Number(t.eur) || DEFAULT_FX.EUR * usd) / usd,
      GBP: (Number(t.gbp) || DEFAULT_FX.GBP * usd) / usd,
      NGN: (Number(t.ngn) || DEFAULT_FX.NGN * usd) / usd,
      ZAR: (Number(t.zar) || DEFAULT_FX.ZAR * usd) / usd,
    };
    try {
      localStorage.setItem(FX_KEY, JSON.stringify({ at: Date.now(), rates }));
    } catch {
      /* cache is optional */
    }
    return rates;
  } catch {
    return cached ?? DEFAULT_FX;
  }
}

export function useDisplayCurrency() {
  const [code, setCode] = useState<DisplayCode>(readDisplayCurrency);
  const [rates, setRates] = useState<Record<string, number>>(() => readCachedFx() ?? DEFAULT_FX);

  useEffect(() => {
    const sync = () => setCode(readDisplayCurrency());
    window.addEventListener(EVENT, sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener(EVENT, sync);
      window.removeEventListener('storage', sync);
    };
  }, []);

  useEffect(() => {
    void loadFxRates().then(setRates);
  }, []);

  const format = useCallback((usdAmount: number) => formatDisplay(usdAmount, code, rates), [code, rates]);

  return { code, rates, format, setCode: writeDisplayCurrency };
}
