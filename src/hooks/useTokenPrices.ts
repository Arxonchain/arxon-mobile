import { useCallback, useEffect, useState } from 'react';

import {
  emptyPriceMap,
  loadTokenPrices,
  noMarketQuote,
  PRICE_TTL_MS,
  readCachedPrices,
  type PriceMap,
} from '@/chainWallet/prices';

export function useTokenPrices() {
  const [prices, setPrices] = useState<PriceMap>(() => {
    const cached = readCachedPrices();
    return cached?.data
      ? { ...emptyPriceMap(), ...cached.data, tARX: noMarketQuote(), ARX: noMarketQuote() }
      : emptyPriceMap();
  });

  const refresh = useCallback(async () => {
    setPrices(await loadTokenPrices(Date.now(), { force: true }));
  }, []);

  useEffect(() => {
    void refresh();
    const t = window.setInterval(() => void refresh(), PRICE_TTL_MS);
    return () => window.clearInterval(t);
  }, [refresh]);

  return { prices, refresh };
}
