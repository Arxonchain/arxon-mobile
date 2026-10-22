import { describe, expect, it } from 'vitest';
import { DEFAULT_FX, formatDisplay } from './displayCurrency';

describe('display currency', () => {
  it('formats USD without a US prefix', () => {
    const text = formatDisplay(1234.5, 'USD', DEFAULT_FX);
    expect(text).not.toMatch(/US/i);
    expect(text).toContain('1,234.50');
  });

  it('converts a USD total into each listed currency', () => {
    expect(formatDisplay(10, 'EUR', { ...DEFAULT_FX, EUR: 0.5 })).toMatch(/5\.00/);
    expect(formatDisplay(10, 'GBP', { ...DEFAULT_FX, GBP: 0.8 })).toMatch(/8\.00/);
    expect(formatDisplay(1, 'NGN', { ...DEFAULT_FX, NGN: 1500 })).toMatch(/1,500/);
    expect(formatDisplay(2, 'ZAR', { ...DEFAULT_FX, ZAR: 18 })).toMatch(/36/);
  });
});
