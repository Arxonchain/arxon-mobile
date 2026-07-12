export interface ForgeProgress {
  bestLevel: number;
  currentLevel: number;
  totalWords: number;
  sessionHigh: number;
  hintsLeft: number;
  shufflesLeft: number;
}

const KEY = 'word-forge-progress';

const DEFAULT: ForgeProgress = {
  bestLevel: 1,
  currentLevel: 1,
  totalWords: 0,
  sessionHigh: 0,
  hintsLeft: 3,
  shufflesLeft: 2,
};

export function loadForgeProgress(): ForgeProgress {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { ...DEFAULT };
    return { ...DEFAULT, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT };
  }
}

export function saveForgeProgress(patch: Partial<ForgeProgress>): ForgeProgress {
  const next = { ...loadForgeProgress(), ...patch };
  localStorage.setItem(KEY, JSON.stringify(next));
  return next;
}
