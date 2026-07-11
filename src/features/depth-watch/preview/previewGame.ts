import { generatePreviewSlice, PREVIEW_SECTOR_SECONDS } from './previewSliceLayout';
import type { GameState3D, Input3D } from '../three/gameState';
import { pickupRadius } from '../three/controller/playerController';
import { applyExposure, isFullyExposed, stepStealth } from '../three/controller/stealthSystem';
import { stepPreviewPlayer } from './previewPlayerController';
import { PREVIEW_FLOOR_Y } from './previewCollision';

export function createPreviewGameState(): GameState3D {
  const layout = generatePreviewSlice();
  return {
    level: 1,
    layout,
    player: {
      px: layout.spawn.x,
      py: PREVIEW_FLOOR_Y,
      pz: layout.spawn.z,
      vy: 0,
      facing: 0,
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
    characterId: 'preview',
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
  return Math.hypot(state.player.px - v.x, state.player.pz - v.z) < 2.5;
}

export function stepPreviewGame(
  state: GameState3D,
  input: Input3D,
  dt: number,
): 'caught' | 'won' | null {
  if (state.phase !== 'playing') return null;
  state.elapsed += dt;
  state.prevJump = input.jump;

  state.player = stepPreviewPlayer(
    state.player,
    input,
    state.layout.solids,
    dt,
  );
  tryCollect(state);

  const stealth = stepStealth(
    state.layout,
    state.player.px,
    state.player.py,
    state.player.pz,
    state.player.hiding,
    false,
    state.player.running,
    dt,
  );

  state.exposure = applyExposure(state.exposure, stealth.exposure);

  if (isFullyExposed(state.exposure)) {
    state.phase = 'caught';
    return 'caught';
  }

  if (state.coins >= state.layout.coinsRequired && atVault(state)) {
    state.phase = 'won';
    return 'won';
  }

  if (state.elapsed >= PREVIEW_SECTOR_SECONDS) {
    state.phase = 'caught';
    return 'caught';
  }

  return null;
}

export { PREVIEW_SECTOR_SECONDS };
