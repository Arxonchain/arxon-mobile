export interface LevelParams {
  level: number;
  poolSize: number;
  timerSeconds: number;
  minWordsRequired: number;
  bonusWordDensity: number;
  minWordLen: number;
  maxWordLen: number;
  /** Relaxed requirements for tutorial levels 1–3 */
  tutorialMode: boolean;
}

export function poolSize(L: number): number {
  if (L <= 3) return 6;
  return Math.min(16, Math.max(6, 6 + Math.floor(L / 3)));
}

export function timerSeconds(L: number): number {
  if (L <= 3) return 90;
  return Math.min(90, Math.max(40, Math.round(90 - L * 1.5)));
}

/** 3-5 crossword slots per level (varied word lengths) */
export function minWordsRequired(L: number): number {
  if (L <= 2) return 3;
  if (L <= 5) return 4;
  return 5;
}

export function bonusWordDensity(L: number): number {
  return Math.min(0.6, Math.max(0.05, 0.05 + L * 0.004));
}

function wordLenRange(L: number): { min: number; max: number } {
  if (L <= 10) return { min: 3, max: 5 };
  if (L <= 30) return { min: 4, max: 7 };
  if (L <= 60) return { min: 5, max: 8 };
  return { min: 5, max: 9 };
}

export function levelParams(L: number): LevelParams {
  const len = wordLenRange(L);
  return {
    level: L,
    poolSize: poolSize(L),
    timerSeconds: timerSeconds(L),
    minWordsRequired: minWordsRequired(L),
    bonusWordDensity: bonusWordDensity(L),
    minWordLen: len.min,
    maxWordLen: len.max,
    tutorialMode: L <= 3,
  };
}
