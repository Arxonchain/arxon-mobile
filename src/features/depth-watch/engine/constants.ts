/** Tunable difficulty — adjust constants here, not in game logic. */
export const EXPOSURE_MAX = 100;
export const EXPOSURE_RATE = 42;
export const EXPOSURE_DECAY = 22;
export const EXPOSURE_PARTIAL_RATE = 18;

export const CLOAK_DURATION = 2.6;
export const CLOAK_COOLDOWN_BASE = 9;
export const CLOAK_COOLDOWN_MIN = 5;

export const ALERT_DURATION = 1.1;
export const LOST_SIGHT_DURATION = 2.4;
export const PARTIAL_EDGE_RATIO = 0.72;

export const LEVEL_TRANSITION_MS = 1200;

export const TIER_THRESHOLDS = {
  tier1: [1, 3],
  tier1b: [4, 6],
  tier2: [7, 9],
  tier2b: [10, 999],
} as const;

export function agentCountForLevel(level: number): number {
  return 2 + Math.floor(level * 1.1);
}

export function towerCountForLevel(level: number): number {
  if (level < 4) return 0;
  return Math.min(2, Math.floor((level - 3) / 3));
}

export function droneCountForLevel(level: number): number {
  if (level < 6) return 0;
  return Math.min(2, Math.floor((level - 5) / 4));
}

export function obstacleCountForLevel(level: number): number {
  return 6 + Math.min(8, level);
}

export function agentRangeForLevel(level: number): number {
  return 120 + level * 6;
}

export function agentSpeedForLevel(level: number): number {
  return 38 + level * 3.5;
}

export function sweepSpeedForLevel(level: number): number {
  return 0.55 + level * 0.07;
}

export function coneAngleForLevel(level: number): number {
  return Math.max(0.32, 0.72 - level * 0.018);
}

export function cloakCooldownForLevel(level: number): number {
  return Math.max(CLOAK_COOLDOWN_MIN, CLOAK_COOLDOWN_BASE - level * 0.25);
}
