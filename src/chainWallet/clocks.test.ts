import { describe, expect, it } from 'vitest';

import { formatClockMs, inBlockText, provedText, type TxClocks } from './clocks';

describe('clock labels', () => {
  it('uses ms under 1s and seconds otherwise', () => {
    expect(formatClockMs(0)).toBe('0ms');
    expect(formatClockMs(412)).toBe('412ms');
    expect(formatClockMs(999)).toBe('999ms');
    expect(formatClockMs(1000)).toBe('1s');
    expect(formatClockMs(3200)).toBe('3s');
    expect(formatClockMs(8500)).toBe('9s');
  });

  it('keeps prove and in-block as separate labels', () => {
    const clocks: TxClocks = {
      tapAt: 1_000,
      provedAt: 4_000,
      sentAt: 4_100,
      inBlockAt: 12_100,
    };
    expect(provedText(clocks)).toBe('Proved 3s');
    expect(inBlockText(clocks)).toBe('In block 8s');
  });

  it('omits labels when clocks are missing', () => {
    expect(provedText(undefined)).toBeNull();
    expect(inBlockText({ tapAt: 1, provedAt: 2 })).toBeNull();
    expect(inBlockText({ tapAt: 1, sentAt: 2, inBlockAt: undefined })).toBeNull();
  });
});
