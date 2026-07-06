/** Target humanoid height in world units (metres). */
export const CHARACTER_HEIGHT = 1.75;
export const PLAYER_RADIUS = 0.38;
export const PLAYER_CROUCH_HEIGHT = 1.05;

export const WALK_SPEED = 4.8;
export const RUN_SPEED = 8.2;
export const RUN_THRESHOLD = 0.72;
export const CROUCH_SPEED_MULT = 0.55;

export const GRAVITY = 22;
export const JUMP_VELOCITY = 7.2;
export const CLIMB_SPEED = 3.2;
export const CLIMB_MAX_HEIGHT = 2.8;

export const EXPOSURE_MAX = 100;
export const EXPOSURE_RATE = 34;
export const EXPOSURE_DECAY = 26;

export const SHIELD_DURATION = 3.2;
export const SHIELD_PICKUP_CHARGES = 1;

export const AGENT_RANGE = 13;
export const AGENT_CONE = 0.52;
export const DRONE_RANGE = 16;
export const DRONE_CONE = 0.42;

export const ARENA_HALF = 34;

export function agentCount(level: number): number {
  return 2 + Math.floor(level * 0.8);
}

export function droneCount(level: number): number {
  return 1 + Math.floor(level / 2);
}

export function coinTarget(level: number): number {
  return 8 + level * 3;
}
