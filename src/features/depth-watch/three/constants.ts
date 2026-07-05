export const LANE_X = [-2.4, 0, 2.4] as const;
export const ROAD_WIDTH = 7;
export const SEGMENT_LEN = 22;
export const PLAYER_RADIUS = 0.45;
export const FORWARD_SPEED = 5.5;
export const SPRINT_MULT = 1.45;
export const LANE_LERP = 12;
export const WALK_SPEED = 4.2;
export const RUN_SPEED = 7.5;
export const RUN_THRESHOLD = 0.72;
export const EXPOSURE_MAX = 100;
export const EXPOSURE_RATE = 38;
export const EXPOSURE_DECAY = 24;
export const CLOAK_DURATION = 2.6;
export const CLOAK_COOLDOWN = 8;
export const AGENT_RANGE = 11;
export const AGENT_CONE = 0.55;

export function segmentCount(level: number): number {
  return 5 + Math.min(level + 2, 8);
}

export function agentCount(level: number): number {
  return 2 + Math.floor(level * 1.2);
}
