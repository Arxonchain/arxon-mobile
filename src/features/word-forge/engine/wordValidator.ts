import { bonusDefinition, isBonusWord } from '../data/bonusWords';
import { hasWord } from '../data/dictionary';
import { canForm, poolCountMap } from './poolGenerator';

export interface ValidationResult {
  ok: boolean;
  reason?: 'short' | 'unknown' | 'pool' | 'duplicate' | 'rate';
  isBonus?: boolean;
  definition?: string | null;
}

export function validateWordLocal(
  word: string,
  poolLetters: string[],
  claimed: Set<string>,
  minLen = 3,
): ValidationResult {
  const w = word.toUpperCase().trim();
  if (w.length < minLen) return { ok: false, reason: 'short' };
  if (claimed.has(w)) return { ok: false, reason: 'duplicate' };
  if (!hasWord(w) && !isBonusWord(w)) return { ok: false, reason: 'unknown' };
  if (!canForm(w, poolCountMap(poolLetters))) return { ok: false, reason: 'pool' };
  return {
    ok: true,
    isBonus: isBonusWord(w),
    definition: bonusDefinition(w),
  };
}

export function reasonMessage(reason?: ValidationResult['reason'], minLen = 3): string {
  switch (reason) {
    case 'short': return `Need ${minLen}+ letters`;
    case 'unknown': return 'Not in dictionary';
    case 'duplicate': return 'Already found';
    case 'pool': return 'Letters not in pool';
    case 'rate': return 'Could not verify — try again';
    default: return 'Invalid word';
  }
}
