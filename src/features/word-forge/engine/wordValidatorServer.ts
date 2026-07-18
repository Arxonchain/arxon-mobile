import { supabase } from '@/integrations/supabase/client';
import { payoutForWord } from './payoutCalculator';
import type { ValidationResult } from './wordValidator';
import { validateWordLocal } from './wordValidator';

export interface ServerWordResult extends ValidationResult {
  payout?: number;
  credited?: boolean;
}

const HARD_REJECT: ValidationResult['reason'][] = ['duplicate', 'short'];

function localCreditFallback(local: ValidationResult, payout: number): ServerWordResult {
  return {
    ok: true,
    isBonus: local.isBonus,
    definition: local.definition,
    payout,
    credited: false,
  };
}

export async function validateAndCreditWord(
  word: string,
  poolLetters: string[],
  claimed: string[],
  level: number,
  attemptId: string,
  streak: number,
  minWordLen: number,
  selectedLetters?: string[],
): Promise<ServerWordResult> {
  const local = validateWordLocal(
    word, poolLetters, new Set(claimed), minWordLen, selectedLetters,
  );
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

    if (error) {
      // Edge function unreachable — word already passed local checks; credit via client path
      return localCreditFallback(local, payout);
    }

    if (data?.ok) {
      return {
        ok: true,
        isBonus: local.isBonus,
        definition: local.definition,
        payout: data.payout ?? payout,
        credited: data.credited ?? true,
      };
    }

    const reason = data?.reason as ValidationResult['reason'] | undefined;
    if (reason && HARD_REJECT.includes(reason)) {
      return { ok: false, reason };
    }

    // Server dictionary miss, 401 body, RPC error, etc. — trust local gameplay validation
    return localCreditFallback(local, payout);
  } catch {
    return localCreditFallback(local, payout);
  }
}
