export interface ForgeProgress {
  version: number;
  bestLevel: number;
  currentLevel: number;
  totalWords: number;
  sessionHigh: number;
  hintsLeft: number;
  shufflesLeft: number;
  bestStreak: number;
  longestWord: string;
  dailyCompletedDate: string | null;
  tutorialCompleted: boolean;
  unlockedSkins: number;
}

const VERSION = 2;
const LIVE_KEY = 'word-forge-progress';
const PREVIEW_KEY = 'word-forge-progress-preview';

const DEFAULT: ForgeProgress = {
  version: VERSION,
  bestLevel: 1,
  currentLevel: 1,
  totalWords: 0,
  sessionHigh: 0,
  hintsLeft: 3,
  shufflesLeft: 2,
  bestStreak: 0,
  longestWord: '',
  dailyCompletedDate: null,
  tutorialCompleted: false,
  unlockedSkins: 1,
};

function keyFor(preview: boolean): string {
  return preview ? PREVIEW_KEY : LIVE_KEY;
}

function sanitize(raw: Partial<ForgeProgress>): ForgeProgress {
  return {
    version: VERSION,
    bestLevel: Math.max(1, Number(raw.bestLevel) || 1),
    currentLevel: Math.max(1, Number(raw.currentLevel) || 1),
    totalWords: Math.max(0, Number(raw.totalWords) || 0),
    sessionHigh: Math.max(0, Number(raw.sessionHigh) || 0),
    hintsLeft: Math.max(0, Math.min(10, Number(raw.hintsLeft) ?? 3)),
    shufflesLeft: Math.max(0, Math.min(10, Number(raw.shufflesLeft) ?? 2)),
    bestStreak: Math.max(0, Number(raw.bestStreak) || 0),
    longestWord: typeof raw.longestWord === 'string' ? raw.longestWord : '',
    dailyCompletedDate: typeof raw.dailyCompletedDate === 'string' ? raw.dailyCompletedDate : null,
    tutorialCompleted: Boolean(raw.tutorialCompleted),
    unlockedSkins: Math.max(1, Math.min(5, Number(raw.unlockedSkins) || 1)),
  };
}

export function loadForgeProgress(preview = false): ForgeProgress {
  try {
    const raw = localStorage.getItem(keyFor(preview));
    if (!raw) return { ...DEFAULT };
    return sanitize({ ...DEFAULT, ...JSON.parse(raw) });
  } catch {
    return { ...DEFAULT };
  }
}

export function saveForgeProgress(patch: Partial<ForgeProgress>, preview = false): ForgeProgress {
  const next = sanitize({ ...loadForgeProgress(preview), ...patch, version: VERSION });
  localStorage.setItem(keyFor(preview), JSON.stringify(next));
  return next;
}

export function progressFromCloud(row: Record<string, unknown>): ForgeProgress {
  return sanitize({
    bestLevel: row.best_level as number,
    currentLevel: row.current_level as number,
    totalWords: row.total_words as number,
    sessionHigh: row.session_high as number,
    hintsLeft: row.hints_left as number,
    shufflesLeft: row.shuffles_left as number,
    bestStreak: row.best_streak as number,
    longestWord: row.longest_word as string,
    dailyCompletedDate: row.daily_completed_date as string | null,
    tutorialCompleted: row.tutorial_completed as boolean,
    unlockedSkins: row.unlocked_skins as number,
  });
}

export function progressToCloud(p: ForgeProgress): Record<string, unknown> {
  return {
    best_level: p.bestLevel,
    current_level: p.currentLevel,
    total_words: p.totalWords,
    session_high: p.sessionHigh,
    hints_left: p.hintsLeft,
    shuffles_left: p.shufflesLeft,
    best_streak: p.bestStreak,
    longest_word: p.longestWord,
    daily_completed_date: p.dailyCompletedDate,
    tutorial_completed: p.tutorialCompleted,
    unlocked_skins: p.unlockedSkins,
  };
}
