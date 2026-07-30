/** Star rating for a round — full 3 on pass (time-based), partial 0–2 on fail. */
export function computeRoundStars(
  passed: boolean,
  wordsFormed: number,
  wordsRequired: number,
  timeRatio: number,
): number {
  if (passed) {
    if (timeRatio >= 0.5) return 3;
    if (timeRatio >= 0.22) return 2;
    return 1;
  }

  if (wordsRequired <= 0 || wordsFormed <= 0) return 0;

  const progress = wordsFormed / wordsRequired;
  if (progress >= 0.66) return 2;
  if (progress >= 0.34 || wordsFormed >= 1) return 1;
  return 0;
}
