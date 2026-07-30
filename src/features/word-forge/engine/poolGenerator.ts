import { bonusWordsInRange } from '../data/bonusWords';
import { wordsInRange } from '../data/dictionary';
import type { LevelParams } from './difficultyCurve';
import { gridLayoutForCount, type GridLayout } from './gridLayout';
import { hashSeed, mulberry32, pick, shuffle } from './seedHash';

export interface LetterTile {
  id: string;
  letter: string;
  gridIndex: number;
}

export interface LevelGeneration {
  params: LevelParams;
  /** May be lower than params.minWordsRequired when fallback pool used */
  effectiveMinWords: number;
  seed: number;
  grid: GridLayout;
  tiles: LetterTile[];
  targetWords: string[];
  /** Fixed crossword slots for the round — varied lengths, all formable from the pool */
  slotWords: string[];
  poolLetters: string[];
  hintBonus?: string;
  formableCount: number;
}

function letterCounts(letters: string[]): Map<string, number> {
  const m = new Map<string, number>();
  for (const ch of letters) {
    const u = ch.toUpperCase();
    m.set(u, (m.get(u) ?? 0) + 1);
  }
  return m;
}

export function canForm(word: string, pool: Map<string, number>): boolean {
  const need = letterCounts(word.split(''));
  for (const [ch, n] of need) {
    if ((pool.get(ch) ?? 0) < n) return false;
  }
  return true;
}

export function countFormableWords(
  letters: string[],
  minLen: number,
  maxLen: number,
): number {
  const pool = letterCounts(letters);
  const dict = wordsInRange(minLen, maxLen);
  let count = 0;
  for (const w of dict) {
    if (canForm(w, pool)) count++;
  }
  return count;
}

function trimToSize(letters: string[], targetSize: number): string[] {
  const bag = [...letters];
  const counts = letterCounts(bag);
  while (bag.length > targetSize) {
    let removed = false;
    for (let i = bag.length - 1; i >= 0; i--) {
      const ch = bag[i];
      if ((counts.get(ch) ?? 0) > 1) {
        counts.set(ch, (counts.get(ch) ?? 0) - 1);
        bag.splice(i, 1);
        removed = true;
        break;
      }
    }
    if (!removed) break;
  }
  return bag;
}

function padFromSeedWords(
  rng: () => number,
  bag: string[],
  seedWords: string[],
  targetSize: number,
): string[] {
  const out = [...bag];
  while (out.length < targetSize) {
    const w = pick(rng, seedWords);
    out.push(w[Math.floor(rng() * w.length)]);
  }
  return out.slice(0, targetSize);
}

/**
 * Choose the fixed crossword slot words for a round: sampled from the words
 * actually formable from the pool, round-robin across word lengths so the
 * board mixes 3s, 4s, 5s etc. Sorted shortest-first for stable display.
 */
function chooseSlotWords(rng: () => number, formable: string[], count: number): string[] {
  const byLen = new Map<number, string[]>();
  for (const w of formable) {
    const arr = byLen.get(w.length) ?? [];
    arr.push(w);
    byLen.set(w.length, arr);
  }
  const buckets = [...byLen.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([, words]) => shuffle(rng, words));

  const out: string[] = [];
  let cursor = 0;
  while (out.length < count) {
    const nonEmpty = buckets.filter((b) => b.length > 0);
    if (nonEmpty.length === 0) break;
    out.push(nonEmpty[cursor % nonEmpty.length].pop()!);
    cursor++;
  }
  return out.sort((a, b) => a.length - b.length || a.localeCompare(b));
}

function buildSolvablePool(
  rng: () => number,
  params: LevelParams,
  bonusRoll: boolean,
): { letters: string[]; slotWords: string[]; hintBonus?: string; effectiveMinWords: number; formableCount: number } {
  const dict = wordsInRange(params.minWordLen, params.maxWordLen);
  const want = params.minWordsRequired;
  const minFormable = want + 2;
  const seedTarget = Math.min(6, Math.max(3, Math.ceil(want / 2) + 2));

  let best: { letters: string[]; formable: string[]; bonusSeed?: string } | null = null;

  for (let attempt = 0; attempt < 100; attempt++) {
    const seedWords: string[] = [];
    const used = new Set<string>();
    let bonusSeed: string | undefined;

    if (bonusRoll) {
      const bonus = bonusWordsInRange(params.minWordLen, params.maxWordLen);
      if (bonus.length) {
        bonusSeed = pick(rng, bonus);
        seedWords.push(bonusSeed);
        used.add(bonusSeed);
      }
    }

    let guard = 0;
    while (seedWords.length < seedTarget && guard++ < 300) {
      const w = pick(rng, dict);
      if (used.has(w)) continue;
      seedWords.push(w);
      used.add(w);
    }

    let bag = seedWords.flatMap((w) => w.split(''));
    bag = trimToSize(bag, params.poolSize);
    bag = padFromSeedWords(rng, bag, seedWords, params.poolSize);
    const letters = shuffle(rng, bag);

    const pool = letterCounts(letters);
    const formable = dict.filter((w) => canForm(w, pool));
    if (!best || formable.length > best.formable.length) best = { letters, formable, bonusSeed };

    if (formable.length >= minFormable) {
      const slotWords = chooseSlotWords(rng, formable, want);
      if (slotWords.length === want) {
        const hintBonus = bonusSeed && formable.includes(bonusSeed) ? bonusSeed : undefined;
        return { letters, slotWords, hintBonus, effectiveMinWords: want, formableCount: formable.length };
      }
    }
  }

  // Fallback — use the richest pool seen and shrink the slot count to fit
  if (best && best.formable.length > 0) {
    const count = Math.max(1, Math.min(want, best.formable.length - 1 || 1));
    const slotWords = chooseSlotWords(rng, best.formable, count);
    return {
      letters: best.letters,
      slotWords,
      effectiveMinWords: slotWords.length,
      formableCount: best.formable.length,
    };
  }

  // Last resort — single rich word, require 1 word
  const fallback = pick(rng, dict.filter((w) => w.length >= 4));
  const letters = shuffle(rng, padFromSeedWords(rng, fallback.split(''), [fallback], params.poolSize));
  const formable = countFormableWords(letters, params.minWordLen, params.maxWordLen);
  return {
    letters,
    slotWords: [fallback],
    effectiveMinWords: 1,
    formableCount: formable,
  };
}

export function generateLevel(
  params: LevelParams,
  userId: string,
  attemptId: string,
): LevelGeneration {
  const seed = hashSeed(userId, params.level, attemptId);
  const rng = mulberry32(seed);
  const grid = gridLayoutForCount(params.poolSize);
  const bonusRoll = rng() < params.bonusWordDensity;

  const { letters, slotWords, hintBonus, effectiveMinWords, formableCount } = buildSolvablePool(rng, params, bonusRoll);

  const tiles: LetterTile[] = letters.map((letter, i) => ({
    id: `${seed}-${i}`,
    letter,
    gridIndex: i,
  }));

  return {
    params,
    effectiveMinWords,
    seed,
    grid,
    tiles,
    targetWords: slotWords,
    slotWords,
    poolLetters: letters,
    hintBonus,
    formableCount,
  };
}

export function poolCountMap(letters: string[]): Map<string, number> {
  return letterCounts(letters);
}
