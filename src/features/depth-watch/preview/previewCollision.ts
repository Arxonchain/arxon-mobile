import type { Solid } from '../three/arena/arenaLayout';
import { FLOOR_Y } from './cityLayout';

const WALL_T = 0.55;
export const PREVIEW_HALF = 28;
const ROAD_GAP = 4.5;

export const PREVIEW_BOUNDS = PREVIEW_HALF;
export const PREVIEW_FLOOR_Y = FLOOR_Y;

interface BuildingLot {
  key: string;
  cx: number;
  cz: number;
  w: number;
  d: number;
  h: number;
  door?: 'north' | 'south';
}

export const BUILDING_LOTS: BuildingLot[] = [
  { key: 'market', cx: -18, cz: -14, w: 10, d: 9, h: 3.8, door: 'south' },
  { key: 'command', cx: 18, cz: -14, w: 9, d: 9, h: 4.2, door: 'south' },
  { key: 'shop', cx: -18, cz: 0, w: 8, d: 7, h: 3.2, door: 'south' },
  { key: 'hab', cx: -18, cz: 14, w: 9, d: 9, h: 3.5 },
  { key: 'clinic', cx: 18, cz: 0, w: 8, d: 7, h: 3.4, door: 'south' },
  { key: 'social', cx: 18, cz: 16, w: 10, d: 9, h: 3.8 },
];

function box(
  id: string,
  x: number,
  z: number,
  w: number,
  h: number,
  d: number,
  color: string,
  opts?: { climbable?: boolean; hideUnder?: boolean },
): Solid {
  return {
    id,
    kind: 'wall',
    x,
    y: h / 2 + PREVIEW_FLOOR_Y,
    z,
    w,
    h,
    d,
    color,
    climbable: opts?.climbable ?? false,
    hideUnder: opts?.hideUnder ?? false,
  };
}

function buildingShells(): Solid[] {
  const solids: Solid[] = [];
  const doorW = 2.6;

  for (const lot of BUILDING_LOTS) {
    const { key, cx, cz, w, d, h, door } = lot;
    const hw = w / 2;
    const hd = d / 2;

    const addWall = (id: string, x: number, z: number, ww: number, dd: number) => {
      solids.push(box(id, x, z, ww, h, dd, '#3d4a56'));
    };

    const northZ = cz + hd;
    const southZ = cz - hd;

    if (door === 'north') {
      const seg = (w - doorW) / 2;
      addWall(`${key}-n-w`, cx - doorW / 2 - seg / 2, northZ, seg, WALL_T);
      addWall(`${key}-n-e`, cx + doorW / 2 + seg / 2, northZ, seg, WALL_T);
    } else {
      addWall(`${key}-n`, cx, northZ, w, WALL_T);
    }

    if (door === 'south') {
      const seg = (w - doorW) / 2;
      addWall(`${key}-s-w`, cx - doorW / 2 - seg / 2, southZ, seg, WALL_T);
      addWall(`${key}-s-e`, cx + doorW / 2 + seg / 2, southZ, seg, WALL_T);
    } else {
      addWall(`${key}-s`, cx, southZ, w, WALL_T);
    }

    addWall(`${key}-w`, cx - hw, cz, WALL_T, d);
    addWall(`${key}-e`, cx + hw, cz, WALL_T, d);
  }

  return solids;
}

/** Doorway recesses + alcoves — crouch here to hide under building lip. */
function hideAlcoves(): Solid[] {
  return [
    box('alcove-market', -18, -17.2, 3.5, 2.4, 2.2, '#2d3748', { hideUnder: true }),
    box('alcove-command', 18, -17.5, 3.2, 2.6, 2.2, '#2d3748', { hideUnder: true }),
    box('alcove-shop', -18, -2.8, 3, 2.2, 2, '#2d3748', { hideUnder: true }),
    box('alcove-clinic', 18, -2.8, 3, 2.2, 2, '#2d3748', { hideUnder: true }),
    box('corner-sw', -6, -6, 3.5, 2.8, 3.5, '#374151', { hideUnder: true }),
    box('corner-se', 6, -6, 3.5, 2.8, 3.5, '#374151', { hideUnder: true }),
  ];
}

function perimeter(): Solid[] {
  const h = 2.6;
  const half = PREVIEW_HALF;
  const gap = ROAD_GAP;
  const segW = half - gap;

  return [
    box('perim-n-l', -(gap + segW / 2), -half, segW, h, WALL_T, '#1e293b'),
    box('perim-n-r', gap + segW / 2, -half, segW, h, WALL_T, '#1e293b'),
    box('perim-s-l', -(gap + segW / 2), half, segW, h, WALL_T, '#1e293b'),
    box('perim-s-r', gap + segW / 2, half, segW, h, WALL_T, '#1e293b'),
    box('perim-w-l', -half, -(gap + segW / 2), WALL_T, h, segW, '#1e293b'),
    box('perim-w-r', -half, gap + segW / 2, WALL_T, h, segW, '#1e293b'),
    box('perim-e-l', half, -(gap + segW / 2), WALL_T, h, segW, '#1e293b'),
    box('perim-e-r', half, gap + segW / 2, WALL_T, h, segW, '#1e293b'),
  ];
}

function streetProps(): Solid[] {
  return [
    box('mk-crate-a', -12, -8, 1.8, 1.5, 1.8, '#92400e', { climbable: true, hideUnder: true }),
    box('mk-crate-b', -10, -11, 2, 1.6, 2, '#78350f', { climbable: true, hideUnder: true }),
    box('mk-barrel', -14, -6, 0.55, 1.1, 0.55, '#64748b', { hideUnder: true }),
    box('mk-wall', -8, -12, 4, 2.2, 0.6, '#57534e', { climbable: true, hideUnder: true }),
    box('cmd-crate', 14, -10, 1.8, 1.5, 1.8, '#92400e', { climbable: true, hideUnder: true }),
    box('cmd-barrel-a', 12, -16, 0.55, 1.1, 0.55, '#64748b', { hideUnder: true }),
    box('cmd-barrel-b', 20, -12, 0.55, 1.1, 0.55, '#64748b', { hideUnder: true }),
    box('plaza-crate', -4, 4, 1.8, 1.5, 1.8, '#92400e', { climbable: true, hideUnder: true }),
    box('plaza-barrel', 5, 2, 0.55, 1.1, 0.55, '#64748b', { hideUnder: true }),
    box('nw-crate', -14, 6, 1.6, 1.4, 1.6, '#92400e', { hideUnder: true }),
    box('vault-crate', 16, -20, 1.8, 1.5, 1.8, '#92400e', { hideUnder: true }),
  ];
}

export function buildPreviewSolids(): Solid[] {
  return [...buildingShells(), ...perimeter(), ...hideAlcoves(), ...streetProps()];
}
