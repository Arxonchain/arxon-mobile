import { bonusWordsInRange } from '../data/bonusWords';
import { wordsInRange } from '../data/dictionary';
import type { ThemeSkin } from '../data/themes';
import { themeForLevel } from '../data/themes';
import type { TileShapeId } from '../data/tileTextures';
import { shapeForIndex } from '../data/tileTextures';
import type { LevelParams } from './difficultyCurve';
import { gridLayoutForCount, type GridLayout } from './gridLayout';
import { hashSeed, mulberry32, pick, shuffle } from './seedHash';
import type { TileTextureId } from '../data/tileTextures';

export interface LetterTile {
  id: string;
  letter: string;
  gridIndex: number;
  textureId: TileTextureId;
  shapeId: TileShapeId;
}

export interface LevelGeneration {
  params: LevelParams;
  seed: number;
  grid: GridLayout;
  theme: ThemeSkin;
  tiles: LetterTile[];
  targetWords: string[];
  poolLetters: string[];
  hintBonus?: string;
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

function countFormableWords(
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

function buildSolvablePool(
  rng: () => number,
  params: LevelParams,
  bonusRoll: boolean,
): { letters: string[]; targetWords: string[]; hintBonus?: string } {
  const dict = wordsInRange(params.minWordLen, params.maxWordLen);
  const minFormable = params.minWordsRequired + 2;
  const seedTarget = Math.min(6, Math.max(3, Math.ceil(params.minWordsRequired / 2) + 1));

  for (let attempt = 0; attempt < 100; attempt++) {
    const seedWords: string[] = [];
    const used = new Set<string>();

    if (bonusRoll) {
      const bonus = bonusWordsInRange(params.minWordLen, params.maxWordLen);
      if (bonus.length) {
        const bw = pick(rng, bonus);
        seedWords.push(bw);
        used.add(bw);
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

    const formable = countFormableWords(letters, params.minWordLen, params.maxWordLen);
    if (formable >= minFormable) {
      const hintBonus = bonusRoll
        ? seedWords.find((w) => bonusWordsInRange(3, 12).includes(w))
        : undefined;
      return { letters, targetWords: seedWords, hintBonus };
    }
  }

  // Guaranteed fallback — letters drawn only from one rich word
  const fallback = pick(rng, dict.filter((w) => w.length >= 4 && w.length <= params.maxWordLen));
  const letters = shuffle(rng, padFromSeedWords(rng, fallback.split(''), [fallback], params.poolSize));
  return { letters, targetWords: [fallback] };
}

export function generateLevel(
  params: LevelParams,
  userId: string,
  attemptId: string,
): LevelGeneration {
  const seed = hashSeed(userId, params.level, attemptId);
  const rng = mulberry32(seed);
  const theme = themeForLevel(params.level);
  const grid = gridLayoutForCount(params.poolSize);
  const bonusRoll = rng() < params.bonusWordDensity;

  const { letters, targetWords, hintBonus } = buildSolvablePool(rng, params, bonusRoll);

  const tiles: LetterTile[] = letters.map((letter, i) => ({
    id: `${seed}-${i}`,
    letter,
    gridIndex: i,
    textureId: theme.textureId,
    shapeId: shapeForIndex(i, params.poolSize),
  }));

  return {
    params,
    seed,
    grid,
    theme,
    tiles,
    targetWords,
    poolLetters: letters,
    hintBonus,
  };
}

export function poolCountMap(letters: string[]): Map<string, number> {
  return letterCounts(letters);
}
