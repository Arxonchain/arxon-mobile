import { useEffect, useState } from 'react';
import {
  changeFromPoints,
  loadMarketChart,
  type ChartPoint,
  type ChartRange,
} from '@/chainWallet/marketChart';
import type { PricedSymbol } from '@/chainWallet/prices';

export function useMarketChart(symbol: PricedSymbol | null, range: ChartRange) {
  const [points, setPoints] = useState<ChartPoint[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!symbol) {
      setPoints([]);
      setError(null);
      setLoading(false);
      return;
    }
    let alive = true;
    setLoading(true);
    setError(null);
    void loadMarketChart(symbol, range)
      .then((next) => {
        if (!alive) return;
        setPoints(next);
        setLoading(false);
      })
      .catch((e) => {
        if (!alive) return;
        setError(e instanceof Error ? e.message : 'Could not load chart.');
        setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [symbol, range]);

  return { points, loading, error, change: changeFromPoints(points) };
}
