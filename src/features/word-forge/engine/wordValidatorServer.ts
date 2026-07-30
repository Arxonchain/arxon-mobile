import { supabase } from '@/integrations/supabase/client';
import { payoutForWord } from './payoutCalculator';
import type { ValidationResult } from './wordValidator';
import { fillsAvailableSlot } from './slotAssignment';
import { validateWordLocal } from './wordValidator';

export interface ServerWordResult extends ValidationResult {
  payout?: number;
  credited?: boolean;
  /** Server unreachable — word valid locally but profile not synced yet */
  syncPending?: boolean;
}

const HARD_REJECT: ValidationResult['reason'][] = ['duplicate', 'short', 'noslot'];

export async function validateAndCreditWord(
  word: string,
  poolLetters: string[],
  claimed: string[],
  level: number,
  attemptId: string,
  streak: number,
  minWordLen: number,
  selectedLetters?: string[],
  slotWords?: string[],
): Promise<ServerWordResult> {
  const local = validateWordLocal(
    word, poolLetters, new Set(claimed), minWordLen, selectedLetters,
  );
  if (!local.ok) return local;

  if (slotWords?.length && !fillsAvailableSlot(word, slotWords, claimed)) {
    return { ok: false, reason: 'noslot' };
  }

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
        slot_words: slotWords ?? [],
        longest_word_len: word.length,
      },
    });

    if (error) {
      return {
        ok: true,
        isBonus: local.isBonus,
        definition: local.definition,
        payout,
        credited: false,
        syncPending: true,
      };
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

    return {
      ok: false,
      reason: 'pool',
      syncPending: false,
    };
  } catch {
    return {
      ok: true,
      isBonus: local.isBonus,
      definition: local.definition,
      payout,
      credited: false,
      syncPending: true,
    };
  }
}
