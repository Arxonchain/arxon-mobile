import { supabase } from '@/integrations/supabase/client';
import { payoutForWord } from './payoutCalculator';
import type { ValidationResult } from './wordValidator';
import { validateWordLocal } from './wordValidator';

export interface ServerWordResult extends ValidationResult {
  payout?: number;
  credited?: boolean;
}

export async function validateAndCreditWord(
  word: string,
  poolLetters: string[],
  claimed: string[],
  level: number,
  attemptId: string,
  streak: number,
  minWordLen: number,
): Promise<ServerWordResult> {
  const local = validateWordLocal(word, poolLetters, new Set(claimed), minWordLen);
  if (!local.ok) return local;

  const payout = payoutForWord(word, streak + 1);

  try {
    const { data, error } = await supabase.functions.invoke('validate-word-forge', {
      body: {
        word: word.toUpperCase(),
        pool_letters: poolLetters.map((l) => l.toUpperCase()),
        claimed_words: claimed,
        level,
        attempt_id: attemptId,
        streak,
        payout,
      },
    });

    if (error || !data?.ok) {
      // Fallback to local validation when edge function unavailable (dev/offline)
      if (import.meta.env.DEV) {
        return { ...local, payout, credited: false };
      }
      return { ok: false, reason: 'rate' };
    }

    return {
      ok: true,
      isBonus: local.isBonus,
      definition: local.definition,
      payout: data.payout ?? payout,
      credited: data.credited ?? true,
    };
  } catch {
    if (import.meta.env.DEV) {
      return { ...local, payout, credited: false };
    }
    return { ok: false, reason: 'rate' };
  }
}
