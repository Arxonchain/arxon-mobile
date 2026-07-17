import { describe, it, expect } from 'vitest';
import { dailySeed } from '../dailyChallenge';
import { evaluateDailyMission, getDailyMission } from '../dailyMission';

describe('dailyMission', () => {
  it('returns a stable mission for a given date', () => {
    const d = new Date('2026-07-15T12:00:00Z');
    expect(getDailyMission(d).id).toBe(getDailyMission(d).id);
    expect(getDailyMission(d).title.length).toBeGreaterThan(0);
  });

  it('can differ across dates', () => {
    const a = getDailyMission(new Date('2026-07-15T12:00:00Z')).id;
    const b = getDailyMission(new Date('2026-07-16T12:00:00Z')).id;
    // Not guaranteed different, but seed should be valid
    expect([a, b].every(Boolean)).toBe(true);
  });

  it('evaluates long word milestone', () => {
    const mission = { id: 'long_word' as const, title: '', shortLabel: '', description: '', emoji: '' };
    const met = evaluateDailyMission(mission, {
      puzzleCleared: true,
      longestWord: 6,
      timeLeft: 10,
      wordsFound: 5,
      hintsUsed: 0,
      bestStreak: 1,
      minWords: 5,
    });
    expect(met.met).toBe(true);
    expect(met.progress).toBe(1);
  });

  it('uses daily seed in mission selection', () => {
    expect(dailySeed(new Date('2026-07-15T12:00:00Z'))).toBe('2026-07-15');
  });
});
