import { useCallback, useEffect, useState } from 'react';

const KEY = 'arxon.market.favs';
const EVENT = 'arxon-market-favs';

function readFavs(): string[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is string => typeof item === 'string').map((item) => item.toUpperCase());
  } catch {
    return [];
  }
}

function writeFavs(next: string[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
    window.dispatchEvent(new Event(EVENT));
  } catch {
    // private mode / quota
  }
}

export function useMarketFavs() {
  const [favs, setFavs] = useState<string[]>(() => (typeof localStorage === 'undefined' ? [] : readFavs()));

  useEffect(() => {
    const sync = () => setFavs(readFavs());
    window.addEventListener(EVENT, sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener(EVENT, sync);
      window.removeEventListener('storage', sync);
    };
  }, []);

  const has = useCallback((symbol: string) => favs.includes(symbol.toUpperCase()), [favs]);

  const toggle = useCallback((symbol: string) => {
    const key = symbol.toUpperCase();
    setFavs((prev) => {
      const next = prev.includes(key) ? prev.filter((item) => item !== key) : [...prev, key];
      writeFavs(next);
      return next;
    });
  }, []);

  return { favs, has, toggle };
}
