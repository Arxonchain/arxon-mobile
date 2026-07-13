export interface LevelParams {
  level: number;
  poolSize: number;
  timerSeconds: number;
  minWordsRequired: number;
  bonusWordDensity: number;
  shapeTier: 1 | 2 | 3;
  minWordLen: number;
  maxWordLen: number;
}

export function poolSize(L: number): number {
  return Math.min(16, Math.max(6, 6 + Math.floor(L / 3)));
}

export function timerSeconds(L: number): number {
  return Math.min(90, Math.max(30, Math.round(90 - L * 1.5)));
}

export function minWordsRequired(L: number): number {
  return Math.min(12, Math.max(3, 3 + Math.floor(L / 8)));
}

export function bonusWordDensity(L: number): number {
  return Math.min(0.6, Math.max(0.05, 0.05 + L * 0.004));
}

export function shapeTier(L: number): 1 | 2 | 3 {
  if (L <= 10) return 1;
  if (L <= 25) return 2;
  return 3;
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
    shapeTier: shapeTier(L),
    minWordLen: len.min,
    maxWordLen: len.max,
  };
}
