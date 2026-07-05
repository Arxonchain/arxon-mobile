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

export interface Portal {
  x: number;
  y: number;
  r: number;
}

export interface PlayerEntity {
  x: number;
  y: number;
  r: number;
  speed: number;
  angle: number;
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
  obstacles: Obstacle[];
  enemies: EnemyEntity[];
  portal: Portal;
  playerStart: Vec2;
  tierId: EnvironmentTierId;
  level: number;
  flavorText: string;
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
