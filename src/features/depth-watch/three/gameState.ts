import { generateArena, type ArenaLayout, type Pickup } from './arena/arenaLayout';
import { pickupRadius, stepPlayer, type InputFrame, type PlayerSnapshot } from './controller/playerController';
import { applyExposure, isFullyExposed, stepStealth } from './controller/stealthSystem';
import { SHIELD_DURATION } from './constants';

export interface Input3D extends InputFrame {
  jumpPressed: boolean;
}

export interface GameState3D {
  level: number;
  layout: ArenaLayout;
  player: PlayerSnapshot;
  exposure: number;
  elapsed: number;
  shieldActive: boolean;
  shieldTimer: number;
  shieldCharges: number;
  coins: number;
  prevJump: boolean;
  phase: 'playing' | 'caught' | 'won';
  characterId: string;
}

export function createGameState(level: number, characterId: string): GameState3D {
  const layout = generateArena(level);
  return {
    level,
    layout,
    player: {
      px: layout.spawn.x,
      py: layout.spawn.y,
      pz: layout.spawn.z,
      vy: 0,
      facing: Math.PI,
      mode: 'ground',
      crouching: false,
      running: false,
      moving: false,
      hiding: false,
      climbing: false,
      height: 1.75,
    },
    exposure: 0,
    elapsed: 0,
    shieldActive: false,
    shieldTimer: 0,
    shieldCharges: 0,
    coins: 0,
    prevJump: false,
    phase: 'playing',
    characterId,
  };
}

function tryCollect(state: GameState3D): void {
  const r = pickupRadius();
  for (const p of state.layout.pickups) {
    if (p.collected) continue;
    const dist = Math.hypot(p.x - state.player.px, p.z - state.player.pz);
    if (dist > r) continue;
    p.collected = true;
    if (p.kind === 'coin') state.coins += p.value;
    if (p.kind === 'shield') state.shieldCharges += 1;
  }
}

function atVault(state: GameState3D): boolean {
  const v = state.layout.vault;
  return Math.hypot(state.player.px - v.x, state.player.pz - v.z) < 2.2;
}

export function stepGame(state: GameState3D, input: Input3D, dt: number): 'caught' | 'won' | null {
  if (state.phase !== 'playing') return null;
  state.elapsed += dt;

  if (state.shieldActive) {
    state.shieldTimer -= dt;
    if (state.shieldTimer <= 0) state.shieldActive = false;
  }

  const jumpEdge = input.jump && !state.prevJump;
  state.prevJump = input.jump;

  state.player = stepPlayer(state.player, input, state.layout.solids, dt, jumpEdge);
  tryCollect(state);

  const stealth = stepStealth(
    state.layout,
    state.player.px,
    state.player.py,
    state.player.pz,
    state.player.hiding,
    state.shieldActive,
    state.player.running,
    dt,
  );

  if (!state.shieldActive && !state.player.hiding) {
    state.exposure = applyExposure(state.exposure, stealth.exposure);
  } else {
    state.exposure = applyExposure(state.exposure, -26 * dt);
  }

  if (isFullyExposed(state.exposure)) {
    state.phase = 'caught';
    return 'caught';
  }

  if (state.coins >= state.layout.coinsRequired && atVault(state)) {
    state.phase = 'won';
    return 'won';
  }

  return null;
}

export function activateShield(state: GameState3D): void {
  if (state.shieldActive || state.shieldCharges <= 0 || state.phase !== 'playing') return;
  state.shieldCharges -= 1;
  state.shieldActive = true;
  state.shieldTimer = SHIELD_DURATION;
}

/** @deprecated use activateShield */
export function activateCloak3D(state: GameState3D): void {
  activateShield(state);
}

export type { ArenaLayout, Pickup };
