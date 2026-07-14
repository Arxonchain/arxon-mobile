import { describe, it, expect } from 'vitest';
import { levelParams } from '../difficultyCurve';
import { payoutForWord, streakMultiplier } from '../payoutCalculator';
import { generateLevel } from '../poolGenerator';
import { validateWordLocal } from '../wordValidator';

describe('difficultyCurve', () => {
  it('levels 1-3 are tutorial-friendly', () => {
    for (let L = 1; L <= 3; L++) {
      const p = levelParams(L);
      expect(p.timerSeconds).toBeGreaterThanOrEqual(90);
      expect(p.minWordsRequired).toBe(2);
      expect(p.tutorialMode).toBe(true);
    }
  });

  it('timer floor is 40s after level 3', () => {
    expect(levelParams(60).timerSeconds).toBeGreaterThanOrEqual(40);
  });

  it('min words capped at 8', () => {
    expect(levelParams(100).minWordsRequired).toBeLessThanOrEqual(8);
  });
});

describe('payoutCalculator', () => {
  it('applies streak multiplier', () => {
    expect(streakMultiplier(2)).toBe(1);
    expect(streakMultiplier(3)).toBe(1.5);
    expect(streakMultiplier(5)).toBe(2);
  });

  it('longer words pay more', () => {
    expect(payoutForWord('CAT', 1)).toBeLessThan(payoutForWord('PLANET', 1));
  });
});

describe('poolGenerator', () => {
  it('always produces solvable levels', () => {
    for (let level = 1; level <= 30; level++) {
      const params = levelParams(level);
      const gen = generateLevel(params, 'test-user', `attempt-${level}`);
      expect(gen.formableCount).toBeGreaterThanOrEqual(gen.effectiveMinWords);
    }
  });
});

describe('wordValidator', () => {
  it('rejects words below min length', () => {
    const r = validateWordLocal('AT', ['A', 'T'], new Set(), 3);
    expect(r.ok).toBe(false);
    expect(r.reason).toBe('short');
  });

  it('accepts valid dictionary words', () => {
    const r = validateWordLocal('CAT', ['C', 'A', 'T'], new Set(), 3);
    expect(r.ok).toBe(true);
  });
});
