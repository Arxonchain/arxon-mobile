import { describe, it, expect } from 'vitest';
import { computeRoundStars } from '../roundStars';

describe('computeRoundStars', () => {
  it('awards 3 stars on fast clear', () => {
    expect(computeRoundStars(true, 5, 5, 0.6)).toBe(3);
  });

  it('awards partial stars on failed attempt with progress', () => {
    expect(computeRoundStars(false, 3, 5, 0)).toBe(1);
    expect(computeRoundStars(false, 4, 5, 0)).toBe(2);
  });

  it('awards zero stars when no words formed', () => {
    expect(computeRoundStars(false, 0, 5, 0)).toBe(0);
  });
});
