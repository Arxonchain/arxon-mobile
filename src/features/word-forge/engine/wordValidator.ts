import { bonusDefinition, isBonusWord } from '../data/bonusWords';
import { hasWord } from '../data/dictionary';
import { canForm, poolCountMap } from './poolGenerator';

export interface ValidationResult {
  ok: boolean;
  reason?: 'short' | 'unknown' | 'pool' | 'duplicate' | 'rate';
  isBonus?: boolean;
  definition?: string | null;
}

const MIN_LEN = 3;
const SERVER_DELAY_MS = 180;

export function validateWordLocal(
  word: string,
  poolLetters: string[],
  claimed: Set<string>,
): ValidationResult {
  const w = word.toUpperCase().trim();
  if (w.length < MIN_LEN) return { ok: false, reason: 'short' };
  if (claimed.has(w)) return { ok: false, reason: 'duplicate' };
  if (!hasWord(w) && !isBonusWord(w)) return { ok: false, reason: 'unknown' };
  if (!canForm(w, poolCountMap(poolLetters))) return { ok: false, reason: 'pool' };
  return {
    ok: true,
    isBonus: isBonusWord(w),
    definition: bonusDefinition(w),
  };
}

/** Mock authoritative server — same rules, no rate-limit false rejects in preview. */
export async function validateWordServer(
  word: string,
  poolLetters: string[],
  claimed: Set<string>,
): Promise<ValidationResult> {
  await new Promise((r) => setTimeout(r, SERVER_DELAY_MS));
  const w = word.toUpperCase().trim();
  const others = new Set([...claimed].filter((x) => x !== w));
  return validateWordLocal(w, poolLetters, others);
}
