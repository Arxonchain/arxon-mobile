import type { ForgeProgress } from '../hooks/useForgeProgress';

/** Highest sector the player may enter (frontier). Clears on L unlock L+1. */
export function maxUnlockedLevel(bestLevel: number): number {
  return Math.max(1, bestLevel);
}

export function isSectorUnlocked(sector: number, bestLevel: number): boolean {
  return sector >= 1 && sector <= maxUnlockedLevel(bestLevel);
}

/** Campaign level must stay within unlocked range — blocks localStorage / URL tampering. */
export function clampCampaignLevel(level: number, bestLevel: number): number {
  return Math.max(1, Math.min(Math.floor(level) || 1, maxUnlockedLevel(bestLevel)));
}

/** The next sector to clear in linear order. */
export function frontierLevel(progress: Pick<ForgeProgress, 'bestLevel'>): number {
  return maxUnlockedLevel(progress.bestLevel);
}

export type SectorMapState = 'locked' | 'cleared' | 'frontier';

/**
 * Map node state for linear progression:
 * - locked: beyond earned progress
 * - cleared: beaten sector (replay allowed)
 * - frontier: next sector to clear
 */
export function sectorMapState(sector: number, bestLevel: number): SectorMapState {
  if (!isSectorUnlocked(sector, bestLevel)) return 'locked';
  if (sector < maxUnlockedLevel(bestLevel)) return 'cleared';
  return 'frontier';
}

/** Whether the player may launch this sector from the map. */
export function canSelectSector(sector: number, bestLevel: number): boolean {
  return isSectorUnlocked(sector, bestLevel);
}

/** Normalize progress so currentLevel never exceeds earned unlocks. */
export function normalizeCampaignProgress(progress: ForgeProgress): ForgeProgress {
  const best = maxUnlockedLevel(progress.bestLevel);
  const current = clampCampaignLevel(progress.currentLevel, best);
  if (current === progress.currentLevel && best === progress.bestLevel) return progress;
  return { ...progress, bestLevel: best, currentLevel: current };
}
