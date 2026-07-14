import { isBonusWord } from '../data/bonusWords';

export const BASE_PAYOUT = 10;
export const BONUS_MULTIPLIER = 4;

export function streakMultiplier(streak: number): number {
  if (streak >= 5) return 2;
  if (streak >= 3) return 1.5;
  return 1;
}

export function lengthBonus(word: string): number {
  return 1 + Math.max(0, word.length - 4) * 0.25;
}

export function payoutForWord(word: string, streak = 1): number {
  if (isBonusWord(word)) {
    return Math.ceil(BASE_PAYOUT * BONUS_MULTIPLIER * streakMultiplier(streak));
  }
  return Math.ceil(BASE_PAYOUT * lengthBonus(word) * streakMultiplier(streak));
}

/** Completionist bonus when all formable words on board are found */
export function completionistBonus(formableCount: number): number {
  return Math.min(200, formableCount * 5);
}
