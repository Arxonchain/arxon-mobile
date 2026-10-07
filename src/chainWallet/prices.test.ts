import { describe, expect, it } from 'vitest';

import {
  emptyPriceMap,
  formatPct,
  formatUsd,
  noMarketQuote,
  quoteFor,
  usdFromAmount,
} from './prices';

describe('token USD quotes', () => {
  it('formats fiat and percent', () => {
    expect(formatUsd(1234.5)).toBe('$1,234.50');
    expect(formatUsd(1)).toBe('$1.00');
    expect(formatUsd(null)).toBeNull();
    expect(formatPct(2.34)).toBe('+2.34%');
    expect(formatPct(-1.2)).toBe('-1.20%');
    expect(formatPct(0)).toBe('0.00%');
  });

  it('multiplies crypto amount by live USD', () => {
    expect(usdFromAmount('0.04', 2500)).toBe(100);
    expect(usdFromAmount('12.5', 1)).toBe(12.5);
    expect(usdFromAmount('—', 1)).toBeNull();
    expect(usdFromAmount('1', null)).toBeNull();
  });

  it('never invents a tARX / ARX market', () => {
    const prices = emptyPriceMap();
    prices.ETH.usd = 3000;
    expect(quoteFor('tARX', prices)).toEqual(noMarketQuote());
    expect(quoteFor('ARX', prices)).toEqual(noMarketQuote());
    expect(quoteFor('ETH', prices).usd).toBe(3000);
    expect(quoteFor('USDC', prices).noMarket).toBe(false);
  });
});
