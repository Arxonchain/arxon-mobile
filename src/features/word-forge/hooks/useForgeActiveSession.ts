import type { LetterTile } from '../engine/poolGenerator';

export type ForgeGameMode = 'campaign' | 'daily';
export type RoundPhase = 'playing' | 'paused' | 'ended';

export interface SavedFoundWord {
  word: string;
  payout: number;
  isBonus: boolean;
  pending?: boolean;
  rejected?: boolean;
}

export interface ForgeActiveSessionSnapshot {
  version: 1;
  savedAt: number;
  mode: ForgeGameMode;
  level: number;
  attemptId: string;
  phase: RoundPhase;
  balance: number;
  sessionTotal: number;
  foundWords: SavedFoundWord[];
  claimedWords: string[];
  streak: number;
  hintsLeft: number;
  shufflesLeft: number;
  timeLeft: number;
  timerTotal: number;
  liveTiles: LetterTile[] | null;
  roundEnded: boolean;
  maxStreak: number;
  longestWordLen: number;
  hintsAtStart: number;
}

const KEY = 'word-forge-active-session';
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

export function saveForgeActiveSession(snapshot: Omit<ForgeActiveSessionSnapshot, 'version' | 'savedAt'>): void {
  try {
    const payload: ForgeActiveSessionSnapshot = {
      version: 1,
      savedAt: Date.now(),
      ...snapshot,
    };
    localStorage.setItem(KEY, JSON.stringify(payload));
  } catch { /* ignore */ }
}

export function loadForgeActiveSession(): ForgeActiveSessionSnapshot | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ForgeActiveSessionSnapshot;
    if (parsed.version !== 1) return null;
    if (Date.now() - parsed.savedAt > MAX_AGE_MS) {
      clearForgeActiveSession();
      return null;
    }
    if (parsed.phase === 'ended' && parsed.roundEnded) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function hasActiveForgeSession(): boolean {
  return loadForgeActiveSession() != null;
}

export function clearForgeActiveSession(): void {
  try {
    localStorage.removeItem(KEY);
  } catch { /* ignore */ }
}
