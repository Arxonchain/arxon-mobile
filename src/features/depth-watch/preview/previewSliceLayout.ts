import type { ArenaLayout, PatrolPoint } from '../three/arena/arenaLayout';
import {
  PREVIEW_BOUNDS,
  PREVIEW_FLOOR_Y,
  buildPreviewSolids,
} from './previewCollision';

export const PREVIEW_SECTOR_SECONDS = 120;
export const PREVIEW_COINS_REQUIRED = 4;

function patrolLoop(points: PatrolPoint[]): PatrolPoint[] {
  return [...points, points[0]];
}

/** Coins and patrols aligned to compound street routes. */
export function generatePreviewSlice(): ArenaLayout {
  const solids = buildPreviewSolids();

  const pickups = [
    { id: 'coin-0', kind: 'coin' as const, x: 0, y: PREVIEW_FLOOR_Y, z: 4, value: 1, collected: false },
    { id: 'coin-1', kind: 'coin' as const, x: -6, y: PREVIEW_FLOOR_Y, z: -6, value: 1, collected: false },
    { id: 'coin-2', kind: 'coin' as const, x: -14, y: PREVIEW_FLOOR_Y, z: -10, value: 1, collected: false },
    { id: 'coin-3', kind: 'coin' as const, x: 6, y: PREVIEW_FLOOR_Y, z: -6, value: 1, collected: false },
    { id: 'coin-4', kind: 'coin' as const, x: 14, y: PREVIEW_FLOOR_Y, z: -10, value: 1, collected: false },
  ];

  const agents = [
    {
      id: 'agent-market',
      modelIndex: 0,
      x: -10,
      z: -8,
      angle: Math.PI / 2,
      speed: 1.85,
      sweep: 0.35,
      state: 'patrol' as const,
      alertTimer: 0,
      path: patrolLoop([
        { x: -10, z: -8 },
        { x: -6, z: -6 },
        { x: -14, z: -10 },
        { x: -18, z: -10 },
        { x: -14, z: -6 },
      ]),
      pathIndex: 0,
    },
    {
      id: 'agent-command',
      modelIndex: 1,
      x: 10,
      z: -8,
      angle: -Math.PI / 2,
      speed: 1.95,
      sweep: 0.35,
      state: 'patrol' as const,
      alertTimer: 0,
      path: patrolLoop([
        { x: 10, z: -8 },
        { x: 6, z: -6 },
        { x: 14, z: -10 },
        { x: 18, z: -10 },
        { x: 14, z: -16 },
        { x: 16, z: -18 },
      ]),
      pathIndex: 0,
    },
  ];

  const drones = [
    {
      id: 'drone-roof',
      x: 0,
      y: 9,
      z: -4,
      path: patrolLoop([
        { x: -6, z: -8 },
        { x: 6, z: -8 },
        { x: 6, z: 4 },
        { x: -6, z: 4 },
        { x: -14, z: 6 },
        { x: 14, z: 6 },
      ]),
      pathT: 0,
      speed: 0.06,
      angle: 0,
      hover: 0,
    },
  ];

  return {
    level: 1,
    tier: 'night',
    half: PREVIEW_BOUNDS,
    spawn: { x: 0, y: PREVIEW_FLOOR_Y, z: 8 },
    vault: { x: 16, y: PREVIEW_FLOOR_Y, z: -18 },
    solids,
    pickups,
    agents,
    drones,
    coinsRequired: PREVIEW_COINS_REQUIRED,
    flavor: 'Explore the compound — hide in doorways, collect ARX gold, reach the vault.',
  };
}
