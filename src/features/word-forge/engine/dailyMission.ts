import { hashSeed } from './seedHash';
import { dailySeed } from './dailyChallenge';

export type DailyMissionId =
  | 'clear_forge'
  | 'long_word'
  | 'speed_run'
  | 'word_hunter'
  | 'pure_skill'
  | 'hot_streak';

export interface DailyMission {
  id: DailyMissionId;
  title: string;
  shortLabel: string;
  description: string;
  emoji: string;
}

const MISSIONS: DailyMission[] = [
  {
    id: 'clear_forge',
    title: 'Forge Clear',
    shortLabel: 'Clear',
    description: 'Complete today\'s shared puzzle before time runs out.',
    emoji: '⚒',
  },
  {
    id: 'long_word',
    title: 'Long Cast',
    shortLabel: '6+ Letters',
    description: 'Spell at least one word with 6 or more letters.',
    emoji: '📏',
  },
  {
    id: 'speed_run',
    title: 'Speed Forge',
    shortLabel: '30s Left',
    description: 'Clear the puzzle with at least 30 seconds remaining.',
    emoji: '⚡',
  },
  {
    id: 'word_hunter',
    title: 'Word Hunter',
    shortLabel: '6 Words',
    description: 'Find 6 or more valid words during the run.',
    emoji: '🎯',
  },
  {
    id: 'pure_skill',
    title: 'Pure Skill',
    shortLabel: 'No Hints',
    description: 'Clear the puzzle without using any hints.',
    emoji: '🛡',
  },
  {
    id: 'hot_streak',
    title: 'Hot Streak',
    shortLabel: '3× Streak',
    description: 'Build a word streak of 3 or higher.',
    emoji: '🔥',
  },
];

/** Deterministic daily mission — same for all players on a given UTC date. */
export function getDailyMission(date = new Date()): DailyMission {
  const idx = hashSeed(`mission-${dailySeed(date)}`) % MISSIONS.length;
  return MISSIONS[idx];
}

export interface MissionSnapshot {
  puzzleCleared: boolean;
  longestWord: number;
  timeLeft: number;
  wordsFound: number;
  hintsUsed: number;
  bestStreak: number;
  minWords: number;
}

export interface MissionStatus {
  met: boolean;
  /** 0–1 progress toward the milestone */
  progress: number;
  detail: string;
}

export function evaluateDailyMission(mission: DailyMission, snap: MissionSnapshot): MissionStatus {
  switch (mission.id) {
    case 'clear_forge':
      return {
        met: snap.puzzleCleared,
        progress: snap.puzzleCleared ? 1 : Math.min(0.95, snap.wordsFound / Math.max(1, snap.minWords)),
        detail: `${Math.min(snap.wordsFound, snap.minWords)}/${snap.minWords} slots`,
      };
    case 'long_word':
      return {
        met: snap.longestWord >= 6,
        progress: Math.min(1, snap.longestWord / 6),
        detail: `${Math.min(snap.longestWord, 6)}/6 letter word`,
      };
    case 'speed_run':
      return {
        met: snap.puzzleCleared && snap.timeLeft >= 30,
        progress: snap.puzzleCleared ? 1 : Math.min(0.9, snap.timeLeft / 30),
        detail: snap.puzzleCleared ? `${snap.timeLeft}s saved` : `${snap.timeLeft}s on clock`,
      };
    case 'word_hunter':
      return {
        met: snap.wordsFound >= 6,
        progress: Math.min(1, snap.wordsFound / 6),
        detail: `${Math.min(snap.wordsFound, 6)}/6 words`,
      };
    case 'pure_skill':
      return {
        met: snap.puzzleCleared && snap.hintsUsed === 0,
        progress: snap.hintsUsed > 0 ? 0.15 : snap.puzzleCleared ? 1 : 0.35,
        detail: snap.hintsUsed > 0 ? 'Hint used' : 'No hints used',
      };
    case 'hot_streak':
      return {
        met: snap.bestStreak >= 3,
        progress: Math.min(1, snap.bestStreak / 3),
        detail: `${Math.min(snap.bestStreak, 3)}/3 streak`,
      };
    default:
      return { met: snap.puzzleCleared, progress: snap.puzzleCleared ? 1 : 0, detail: '' };
  }
}

/** Daily bonus requires clearing the puzzle; mission met unlocks the full +50 payout. */
export function dailyMissionBonusEligible(mission: DailyMission, snap: MissionSnapshot): boolean {
  if (!snap.puzzleCleared) return false;
  return evaluateDailyMission(mission, snap).met;
}
