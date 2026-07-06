import { ARENA_HALF, agentCount, coinTarget, droneCount } from '../constants';

export type SolidKind = 'building' | 'wall' | 'rock' | 'crate' | 'container' | 'roof';

export interface Solid {
  id: string;
  kind: SolidKind;
  x: number;
  y: number;
  z: number;
  w: number;
  h: number;
  d: number;
  climbable: boolean;
  hideUnder: boolean;
  color: string;
}

export interface Pickup {
  id: string;
  kind: 'coin' | 'shield';
  x: number;
  y: number;
  z: number;
  value: number;
  collected: boolean;
}

export interface PatrolPoint {
  x: number;
  z: number;
}

export interface ArenaAgent {
  id: string;
  modelIndex: number;
  x: number;
  z: number;
  angle: number;
  speed: number;
  sweep: number;
  state: 'patrol' | 'chase';
  alertTimer: number;
  path: PatrolPoint[];
  pathIndex: number;
}

export interface ArenaDrone {
  id: string;
  x: number;
  y: number;
  z: number;
  path: PatrolPoint[];
  pathT: number;
  speed: number;
  angle: number;
  hover: number;
}

export interface ArenaLayout {
  level: number;
  tier: 'day' | 'dusk' | 'night';
  half: number;
  spawn: { x: number; y: number; z: number };
  vault: { x: number; y: number; z: number };
  solids: Solid[];
  pickups: Pickup[];
  agents: ArenaAgent[];
  drones: ArenaDrone[];
  coinsRequired: number;
  flavor: string;
}

function tierForLevel(level: number): ArenaLayout['tier'] {
  if (level <= 2) return 'day';
  if (level <= 4) return 'dusk';
  return 'night';
}

function box(
  id: string,
  kind: SolidKind,
  x: number,
  y: number,
  z: number,
  w: number,
  h: number,
  d: number,
  color: string,
  opts?: { climbable?: boolean; hideUnder?: boolean },
): Solid {
  return {
    id,
    kind,
    x,
    y: y + h / 2,
    z,
    w,
    h,
    d,
    color,
    climbable: opts?.climbable ?? (h <= CLIMB_CUTOFF && kind !== 'building'),
    hideUnder: opts?.hideUnder ?? false,
  };
}

const CLIMB_CUTOFF = 2.6;

/** Hand-authored CODM-style compound — alleys, courtyards, verticality. */
function buildSolids(level: number, tier: ArenaLayout['tier']): Solid[] {
  const wall = tier === 'night' ? '#2d3748' : '#6b7280';
  const brick = tier === 'night' ? '#3d3028' : '#8b6914';
  const concrete = tier === 'night' ? '#1e293b' : '#9ca3af';
  const stone = '#64748b';

  const s: Solid[] = [
    // Perimeter walls
    box('w-n', 'wall', 0, 0, -ARENA_HALF, ARENA_HALF * 2, 4, 1.2, wall),
    box('w-s', 'wall', 0, 0, ARENA_HALF, ARENA_HALF * 2, 4, 1.2, wall),
    box('w-w', 'wall', -ARENA_HALF, 0, 0, 1.2, 4, ARENA_HALF * 2, wall),
    box('w-e', 'wall', ARENA_HALF, 0, 0, 1.2, 4, ARENA_HALF * 2, wall),

    // NW warehouse block
    box('wh-main', 'building', -18, 0, -16, 14, 7, 12, brick),
    box('wh-annex', 'building', -24, 0, -6, 8, 5, 8, brick),
    box('wh-crates', 'crate', -12, 0, -8, 2.2, 1.8, 2.2, '#92400e', { climbable: true }),
    box('wh-crates2', 'crate', -10, 1.8, -8, 2, 1.6, 2, '#78350f', { climbable: true }),

    // NE apartment tower
    box('apt-a', 'building', 16, 0, -18, 10, 12 + level, 10, concrete),
    box('apt-b', 'building', 24, 0, -8, 8, 8, 8, concrete),
    box('apt-stairs', 'wall', 12, 0, -12, 3, 2.2, 6, stone, { climbable: true }),

    // Central courtyard cover
    box('c-r1', 'rock', -4, 0, 2, 3.5, 2.2, 3, stone, { climbable: true, hideUnder: true }),
    box('c-r2', 'rock', 5, 0, -2, 2.8, 1.8, 2.5, stone, { climbable: true }),
    box('c-dump', 'container', 0, 0, 8, 3.5, 2.4, 2, '#1f2937', { hideUnder: true }),
    box('c-bench', 'wall', -8, 0, 6, 2.5, 1.1, 0.8, '#57534e', { hideUnder: true }),

    // SW alley cluster
    box('al-a', 'building', -16, 0, 14, 9, 6, 8, brick),
    box('al-b', 'building', -6, 0, 18, 7, 5, 7, brick),
    box('al-wall', 'wall', -10, 0, 10, 5, 2.4, 0.6, stone, { climbable: true, hideUnder: true }),
    box('al-car', 'container', -2, 0, 14, 4, 1.6, 2.2, '#1e3a5f', { hideUnder: true }),

    // SE market strip
    box('mk-1', 'building', 14, 0, 12, 8, 5, 6, '#6b5344'),
    box('mk-2', 'building', 22, 0, 18, 6, 4.5, 7, '#6b5344'),
    box('mk-stall', 'wall', 10, 0, 16, 4, 2.8, 2, '#78716c', { climbable: true, hideUnder: true }),
    box('mk-cr', 'crate', 18, 0, 10, 1.8, 1.5, 1.8, '#92400e', { climbable: true }),

    // Vault structure (goal)
    box('vault', 'building', -22, 0, -22, 6, 4, 6, '#334155'),
    box('vault-door', 'wall', -22, 0, -18.5, 3, 3, 0.5, '#7FE7C4'),
  ];

  if (level >= 2) {
    s.push(
      box('x-platform', 'crate', 0, 0, -10, 4, 2, 4, stone, { climbable: true }),
      box('x-plat2', 'crate', 0, 2, -10, 3, 1.8, 3, stone, { climbable: true }),
    );
  }
  if (level >= 3) {
    s.push(box('x-tower', 'building', 0, 0, -20, 5, 9, 5, concrete));
  }

  return s;
}

function patrolLoop(points: PatrolPoint[]): PatrolPoint[] {
  return [...points, points[0]];
}

export function generateArena(level: number): ArenaLayout {
  const tier = tierForLevel(level);
  const solids = buildSolids(level, tier);
  const pickups: Pickup[] = [];
  const half = ARENA_HALF;

  const coinSpots: [number, number][] = [
    [-8, -4], [6, -6], [12, 0], [-2, 10], [16, 14], [-14, 8],
    [8, -14], [-20, 0], [0, 0], [20, -12], [-6, -18], [14, 6],
    [-18, -10], [4, 16], [-10, -14], [22, 4], [-4, -8], [10, 10],
  ];

  const totalCoins = coinTarget(level);
  for (let i = 0; i < totalCoins; i++) {
    const [x, z] = coinSpots[i % coinSpots.length];
    pickups.push({
      id: `coin-${i}`,
      kind: 'coin',
      x: x + (i % 3) * 0.6,
      y: 0.5,
      z: z + (i % 2) * 0.5,
      value: 1,
      collected: false,
    });
  }

  pickups.push(
    { id: 'shield-1', kind: 'shield', x: -14, y: 0.8, z: -4, value: 1, collected: false },
    { id: 'shield-2', kind: 'shield', x: 8, y: 0.8, z: 12, value: 1, collected: false },
  );

  const agents: ArenaAgent[] = [];
  const paths: PatrolPoint[][] = [
    [{ x: -6, z: -6 }, { x: 8, z: -8 }, { x: 6, z: 4 }, { x: -8, z: 2 }],
    [{ x: 14, z: 8 }, { x: 14, z: -6 }, { x: 4, z: -4 }],
    [{ x: -12, z: 12 }, { x: 2, z: 14 }, { x: -4, z: 6 }],
  ];

  for (let a = 0; a < agentCount(level); a++) {
    const path = patrolLoop(paths[a % paths.length]);
    agents.push({
      id: `agent-${a}`,
      modelIndex: a,
      x: path[0].x,
      z: path[0].z,
      angle: 0,
      speed: 2.2 + level * 0.25,
      sweep: 0.55,
      state: 'patrol',
      alertTimer: 0,
      path,
      pathIndex: 0,
    });
  }

  const drones: ArenaDrone[] = [];
  const dronePaths: PatrolPoint[][] = [
    [{ x: -10, z: 0 }, { x: 10, z: -10 }, { x: 10, z: 10 }, { x: -10, z: 8 }],
    [{ x: 0, z: -14 }, { x: 16, z: 0 }, { x: 0, z: 14 }, { x: -16, z: 0 }],
  ];

  for (let d = 0; d < droneCount(level); d++) {
    const path = patrolLoop(dronePaths[d % dronePaths.length]);
    drones.push({
      id: `drone-${d}`,
      x: path[0].x,
      y: 9 + d * 1.5,
      z: path[0].z,
      path,
      pathT: 0,
      speed: 0.08 + level * 0.01,
      angle: 0,
      hover: d * 1.3,
    });
  }

  return {
    level,
    tier,
    half,
    spawn: { x: 0, y: 0, z: 24 },
    vault: { x: -22, y: 0, z: -22 },
    solids,
    pickups,
    agents,
    drones,
    coinsRequired: Math.max(5, Math.floor(totalCoins * 0.55)),
    flavor: 'Infiltrate the compound — collect gold, avoid drones, reach the vault.',
  };
}
