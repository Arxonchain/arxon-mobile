import { isBonusWord } from '../data/bonusWords';

export const FLAT_PAYOUT = 10;
export const BONUS_MULTIPLIER = 4;

export function payoutForWord(word: string): number {
  return isBonusWord(word) ? FLAT_PAYOUT * BONUS_MULTIPLIER : FLAT_PAYOUT;
}
