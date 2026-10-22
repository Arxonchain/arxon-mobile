import { describe, expect, it } from 'vitest';
import { changeFromPoints, downsample, pricedChartSymbol } from './marketChart';

describe('market charts', () => {
  it('maps wallet coins to a live market', () => {
    expect(pricedChartSymbol('ETH')).toBe('ETH');
    expect(pricedChartSymbol('btc')).toBe('BTC');
    expect(pricedChartSymbol('SOL')).toBe('SOL');
    expect(pricedChartSymbol('USDT')).toBe('USDT');
    expect(pricedChartSymbol('USDC')).toBe('USDC');
    expect(pricedChartSymbol('ARXt')).toBeNull();
    expect(pricedChartSymbol('USDTarx')).toBeNull();
  });

  it('downsamples without dropping the ends', () => {
    const pts = Array.from({ length: 200 }, (_, i) => ({ t: i, p: i }));
    const out = downsample(pts, 10);
    expect(out).toHaveLength(10);
    expect(out[0]).toEqual({ t: 0, p: 0 });
    expect(out[9]).toEqual({ t: 199, p: 199 });
  });

  it('computes range percent from first to last', () => {
    expect(changeFromPoints([{ t: 1, p: 100 }, { t: 2, p: 110 }])).toBeCloseTo(10);
    expect(changeFromPoints([{ t: 1, p: 200 }, { t: 2, p: 100 }])).toBeCloseTo(-50);
    expect(changeFromPoints([{ t: 1, p: 1 }])).toBeNull();
  });
});
