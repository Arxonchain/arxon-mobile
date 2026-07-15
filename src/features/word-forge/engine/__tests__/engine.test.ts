import { describe, it, expect } from 'vitest';
import { mergeForgeProgress } from '../../hooks/useForgeProgress';
import { levelParams } from '../difficultyCurve';
import { payoutForWord, streakMultiplier } from '../payoutCalculator';
import { generateLevel, canForm, poolCountMap } from '../poolGenerator';
import { assignSlots } from '../slotAssignment';
import { validateWordLocal } from '../wordValidator';

describe('mergeForgeProgress', () => {
  it('keeps the highest bestLevel and cumulative stats from either device', () => {
    const local = mergeForgeProgress(
      {
        version: 2, bestLevel: 8, currentLevel: 8, totalWords: 120, sessionHigh: 90,
        hintsLeft: 2, shufflesLeft: 1, bestStreak: 5, longestWord: 'PLANET',
        dailyCompletedDate: '2026-07-14', dailyStreak: 3, tutorialCompleted: true, unlockedSkins: 2,
      },
      {
        version: 2, bestLevel: 12, currentLevel: 10, totalWords: 200, sessionHigh: 150,
        hintsLeft: 3, shufflesLeft: 2, bestStreak: 7, longestWord: 'STELLAR',
        dailyCompletedDate: '2026-07-15', dailyStreak: 4, tutorialCompleted: false, unlockedSkins: 3,
      },
    );
    expect(local.bestLevel).toBe(12);
    expect(local.currentLevel).toBe(10);
    expect(local.totalWords).toBe(200);
    expect(local.dailyStreak).toBe(4);
    expect(local.longestWord).toBe('STELLAR');
    expect(local.dailyCompletedDate).toBe('2026-07-15');
  });
});

describe('difficultyCurve', () => {
  it('levels 1-3 are tutorial-friendly', () => {
    for (let L = 1; L <= 3; L++) {
      const p = levelParams(L);
      expect(p.timerSeconds).toBeGreaterThanOrEqual(90);
      expect(p.tutorialMode).toBe(true);
    }
  });

  it('timer floor is 40s after level 3', () => {
    expect(levelParams(60).timerSeconds).toBeGreaterThanOrEqual(40);
  });

  it('requires 3-5 slot words per level', () => {
    for (const L of [1, 2, 3, 5, 6, 20, 100]) {
      const n = levelParams(L).minWordsRequired;
      expect(n).toBeGreaterThanOrEqual(3);
      expect(n).toBeLessThanOrEqual(5);
    }
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
  it('always produces solvable levels with formable slot words', () => {
    for (let level = 1; level <= 30; level++) {
      const params = levelParams(level);
      const gen = generateLevel(params, 'test-user', `attempt-${level}`);
      expect(gen.formableCount).toBeGreaterThanOrEqual(gen.effectiveMinWords);
      expect(gen.slotWords.length).toBe(gen.effectiveMinWords);
      const pool = poolCountMap(gen.poolLetters);
      for (const w of gen.slotWords) {
        expect(canForm(w, pool)).toBe(true);
      }
    }
  });

  it('slot words come in varied lengths on standard levels', () => {
    const gen = generateLevel(levelParams(10), 'test-user', 'attempt-x');
    const lengths = new Set(gen.slotWords.map((w) => w.length));
    expect(gen.slotWords.length).toBeGreaterThanOrEqual(4);
    expect(lengths.size).toBeGreaterThanOrEqual(2);
  });
});

describe('slotAssignment', () => {
  const slots = ['CAT', 'FISH', 'LUNCH'];

  it('fills the exact slot when the target word is found', () => {
    const r = assignSlots(slots, ['FISH']);
    expect(r.rows[1].filledBy).toBe('FISH');
    expect(r.filledCount).toBe(1);
  });

  it('fills a same-length slot without reshaping boxes', () => {
    const r = assignSlots(slots, ['DOG']);
    expect(r.rows[0].filledBy).toBe('DOG');
    expect(r.rows[0].target).toBe('CAT');
    expect(r.rows[1].filledBy).toBeNull();
    expect(r.rows[1].target.length).toBe(4);
  });

  it('routes words that fit no slot to extras', () => {
    const r = assignSlots(slots, ['DOG', 'RAT', 'PLANETS']);
    expect(r.rows[0].filledBy).toBe('DOG');
    expect(r.extraWords).toEqual(['RAT', 'PLANETS']);
    expect(r.filledCount).toBe(1);
  });

  it('completes when all slots are filled regardless of extras', () => {
    const r = assignSlots(slots, ['CAT', 'WISH', 'MUNCH', 'BONUS']);
    expect(r.filledCount).toBe(3);
    expect(r.extraWords).toEqual(['BONUS']);
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
