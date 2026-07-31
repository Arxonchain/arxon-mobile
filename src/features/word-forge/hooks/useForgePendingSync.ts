import { supabase } from '@/integrations/supabase/client';
import { validateAndCreditWord } from '../engine/wordValidatorServer';

export interface PendingWordCredit {
  word: string;
  poolLetters: string[];
  claimed: string[];
  level: number;
  attemptId: string;
  streak: number;
  minWordLen: number;
  slotWords: string[];
}

const KEY = 'word-forge-pending-credits';

function loadQueue(): PendingWordCredit[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveQueue(queue: PendingWordCredit[]): void {
  try {
    if (queue.length === 0) localStorage.removeItem(KEY);
    else localStorage.setItem(KEY, JSON.stringify(queue));
  } catch { /* ignore */ }
}

export function queuePendingWordCredit(entry: PendingWordCredit): void {
  const queue = loadQueue();
  if (queue.some((q) => q.attemptId === entry.attemptId && q.word === entry.word)) return;
  queue.push(entry);
  saveQueue(queue);
}

export async function flushPendingWordCredits(
  onCredited?: () => void,
): Promise<number> {
  const queue = loadQueue();
  if (queue.length === 0) return 0;

  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return 0;

  let credited = 0;
  const remaining: PendingWordCredit[] = [];

  for (const entry of queue) {
    const result = await validateAndCreditWord(
      entry.word,
      entry.poolLetters,
      entry.claimed,
      entry.level,
      entry.attemptId,
      entry.streak,
      entry.minWordLen,
      undefined,
      entry.slotWords,
    );
    if (result.ok && result.credited !== false && !result.syncPending) {
      credited += 1;
    } else if (result.syncPending || (result.ok && result.credited === false)) {
      remaining.push(entry);
    }
  }

  saveQueue(remaining);
  if (credited > 0) onCredited?.();
  return credited;
}

export function pendingCreditCount(): number {
  return loadQueue().length;
}
