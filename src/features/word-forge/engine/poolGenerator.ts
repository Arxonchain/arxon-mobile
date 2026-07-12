import { bonusWordsInRange } from '../data/bonusWords';
import { arenaForLevel, type ArenaFrame } from '../data/boardFrames';
import { shapeForIndex, type TileShapeId } from '../data/tileTextures';
import { wordsInRange } from '../data/dictionary';
import type { ShapeTemplate } from '../data/shapes';
import { shapesForTier } from '../data/shapes';
import { themeForLevel } from '../data/themes';
import type { LevelParams } from './difficultyCurve';
import { hashSeed, mulberry32, pick, shuffle } from './seedHash';

export interface LetterTile {
  id: string;
  letter: string;
  x: number;
  y: number;
  textureId: TileTextureId;
  shapeId: TileShapeId;
}

export interface LevelGeneration {
  params: LevelParams;
  seed: number;
  shape: ShapeTemplate;
  theme: ThemeSkin;
  arena: ArenaFrame;
  tiles: LetterTile[];
  targetWords: string[];
  poolLetters: string[];
  hintBonus?: string;
}

const FREQ = 'EEEEEEEEAAAATTTTTTTIIIIINNNNNNSSSSSHHHHHHRRRRDDDLLLUUCCMMPPYYWWFFGGVVBBKKJJXXQQZZ';

function letterCounts(letters: string[]): Map<string, number> {
  const m = new Map<string, number>();
  for (const ch of letters) {
    const u = ch.toUpperCase();
    m.set(u, (m.get(u) ?? 0) + 1);
  }
  return m;
}

function canForm(word: string, pool: Map<string, number>): boolean {
  const need = letterCounts(word.split(''));
  for (const [ch, n] of need) {
    if ((pool.get(ch) ?? 0) < n) return false;
  }
  return true;
}

function unionLetters(words: string[]): string[] {
  const out: string[] = [];
  for (const w of words) out.push(...w.split(''));
  return out;
}

function padPool(rng: () => number, letters: string[], targetSize: number): string[] {
  const out = [...letters];
  while (out.length < targetSize) {
    out.push(FREQ[Math.floor(rng() * FREQ.length)]);
  }
  return out.slice(0, targetSize);
}

function pickTargetWords(
  rng: () => number,
  count: number,
  minLen: number,
  maxLen: number,
  bonusRoll: boolean,
): string[] {
  const pool = wordsInRange(minLen, maxLen);
  const picked: string[] = [];
  const used = new Set<string>();

  if (bonusRoll) {
    const bonus = bonusWordsInRange(minLen, maxLen);
    if (bonus.length) {
      const bw = pick(rng, bonus);
      picked.push(bw);
      used.add(bw);
    }
  }

  let guard = 0;
  while (picked.length < count && guard < 500) {
    guard++;
    const w = pick(rng, pool);
    if (used.has(w)) continue;
    picked.push(w);
    used.add(w);
  }
  return picked;
}

export function generateLevel(
  params: LevelParams,
  userId: string,
  attemptId: string,
): LevelGeneration {
  const seed = hashSeed(userId, params.level, attemptId);
  const rng = mulberry32(seed);

  const tierShapes = shapesForTier(params.shapeTier);
  const shape = pick(rng, tierShapes);
  const theme = themeForLevel(params.level);
  const arena = arenaForLevel(rng, theme);

  const bonusRoll = rng() < params.bonusWordDensity;
  const targetWords = pickTargetWords(
    rng,
    params.minWordsRequired,
    params.minWordLen,
    params.maxWordLen,
    bonusRoll,
  );

  let letters = unionLetters(targetWords);
  letters = padPool(rng, letters, params.poolSize);
  letters = shuffle(rng, letters);

  const positions = shape.positions.slice(0, params.poolSize);
  const tiles: LetterTile[] = letters.map((letter, i) => ({
    id: `${seed}-${i}`,
    letter,
    x: positions[i]?.x ?? 0,
    y: positions[i]?.y ?? 0,
    textureId: theme.textureId,
    shapeId: shapeForIndex(i, params.poolSize),
  }));

  const hintBonus = bonusRoll
    ? targetWords.find((w) => bonusWordsInRange(3, 12).includes(w))
    : undefined;

  return {
    params,
    seed,
    shape,
    theme,
    arena,
    tiles,
    targetWords,
    poolLetters: letters,
    hintBonus,
  };
}

export function poolCountMap(letters: string[]): Map<string, number> {
  return letterCounts(letters);
}

export { canForm };
