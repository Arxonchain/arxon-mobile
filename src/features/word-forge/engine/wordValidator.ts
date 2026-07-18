import { bonusDefinition, isBonusWord } from '../data/bonusWords';
import { hasWord, PLAYER_MIN_WORD_LEN } from '../data/dictionary';
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
  minLen = PLAYER_MIN_WORD_LEN,
  /** Letters from the swipe path — when set, pool check uses only those tiles */
  selectedLetters?: string[],
): ValidationResult {
  const w = word.toUpperCase().trim();
  if (w.length < minLen) return { ok: false, reason: 'short' };
  if (claimed.has(w)) return { ok: false, reason: 'duplicate' };
  if (!hasWord(w) && !isBonusWord(w)) return { ok: false, reason: 'unknown' };

  const poolSource = selectedLetters?.length
    ? selectedLetters.map((l) => l.toUpperCase())
    : poolLetters.map((l) => l.toUpperCase());

  if (selectedLetters?.length && poolSource.join('') !== w) {
    return { ok: false, reason: 'pool' };
  }

  if (!canForm(w, poolCountMap(poolSource))) return { ok: false, reason: 'pool' };
  return {
    ok: true,
    isBonus: isBonusWord(w),
    definition: bonusDefinition(w),
  };
}

export function reasonMessage(reason?: ValidationResult['reason'], minLen = PLAYER_MIN_WORD_LEN): string {
  switch (reason) {
    case 'short': return `Need ${minLen}+ letters`;
    case 'unknown': return 'Not in dictionary';
    case 'duplicate': return 'Already found';
    case 'pool': return 'Letters not in pool';
    case 'rate': return 'Could not verify — try again';
    default: return 'Invalid word';
  }
}
