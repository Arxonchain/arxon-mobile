export type AgentState = 'patrol' | 'alert' | 'chase';
export type EnemyKind = 'agent' | 'tower' | 'drone';
export type GamePhase = 'menu' | 'playing' | 'transition' | 'caught' | 'run-complete';
export type ParticleKind = 'dust' | 'fog' | 'rain';

export interface Vec2 {
  x: number;
  y: number;
}

export interface Obstacle {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface CoverObstacle extends Obstacle {
  isCover?: boolean;
  coverNorth?: boolean;
  coverSouth?: boolean;
  coverEast?: boolean;
  coverWest?: boolean;
}

export interface LevelSegment {
  id: string;
  kind: 'straight' | 'turn_left' | 'turn_right' | 'junction' | 'open' | 'room' | 'alcove';
  worldY: number;
  height: number;
  pathCenterX: number;
  pathWidth: number;
}

export interface Portal {
  x: number;
  y: number;
  r: number;
}

export interface PlayerEntity {
  x: number;
  y: number;
  r: number;
  walkSpeed: number;
  runSpeed: number;
  facingRight: boolean;
  moving: boolean;
  running: boolean;
  hiding: boolean;
  hideSide: 'north' | 'south' | 'east' | 'west' | null;
  coverRef: CoverObstacle | null;
  moveMag: number;
  characterId: string;
}

export interface CloakState {
  active: boolean;
  timer: number;
  duration: number;
  cooldown: number;
  cooldownMax: number;
}

export interface BaseAgent {
  kind: 'agent';
  x: number;
  y: number;
  angle: number;
  baseAngle: number;
  sweepSpeed: number;
  coneAngle: number;
  range: number;
  speed: number;
  state: AgentState;
  alertTimer: number;
  lostTimer: number;
  lastSeenX: number;
  lastSeenY: number;
  partialTimer: number;
  facingRight: boolean;
}

export interface TowerEnemy {
  kind: 'tower';
  x: number;
  y: number;
  angle: number;
  sweepSpeed: number;
  coneAngle: number;
  range: number;
}

export interface DroneEnemy {
  kind: 'drone';
  x: number;
  y: number;
  pathIndex: number;
  pathT: number;
  speed: number;
  lightRadius: number;
  waypoints: Vec2[];
}

export type EnemyEntity = BaseAgent | TowerEnemy | DroneEnemy;

export interface Particle {
  x: number;
  y: number;
  r: number;
  spd: number;
  kind: ParticleKind;
}

export interface LevelLayout {
  obstacles: CoverObstacle[];
  enemies: EnemyEntity[];
  portal: Portal;
  playerStart: Vec2;
  tierId: EnvironmentTierId;
  level: number;
  flavorText: string;
  worldWidth: number;
  worldHeight: number;
  segments: LevelSegment[];
}

export type EnvironmentTierId = 'tier1' | 'tier1b' | 'tier2' | 'tier2b';

export interface EnvironmentTier {
  id: EnvironmentTierId;
  label: string;
  ambientTint: string;
  particleKind: ParticleKind;
  visibilityModifier: number;
  backgroundSrc: string;
  levelRange: [number, number];
}

export type UnlockRule =
  | { type: 'free' }
  | { type: 'level'; level: number }
  | { type: 'achievement'; label: string };

export interface CharacterConfig {
  id: string;
  name: string;
  tagline: string;
  spriteSrc: string;
  unlock: UnlockRule;
  speedMultiplier?: number;
  cloakCooldownMultiplier?: number;
}

export interface RunRecord {
  id: string;
  user_id: string;
  level_reached: number;
  survival_seconds: number;
  character_id: string;
  created_at: string;
  profiles?: { username?: string | null };
}

export interface InputState {
  moveX: number;
  moveY: number;
}
