import type { Solid } from '../arena/arenaLayout';
import { ARENA_HALF, PLAYER_RADIUS } from '../constants';

export interface Aabb {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  minZ: number;
  maxZ: number;
}

export function solidAabb(s: Solid): Aabb {
  return {
    minX: s.x - s.w / 2,
    maxX: s.x + s.w / 2,
    minY: s.y - s.h / 2,
    maxY: s.y + s.h / 2,
    minZ: s.z - s.d / 2,
    maxZ: s.z + s.d / 2,
  };
}

export function playerAabb(px: number, py: number, pz: number, height: number): Aabb {
  const r = PLAYER_RADIUS;
  return {
    minX: px - r,
    maxX: px + r,
    minY: py,
    maxY: py + height,
    minZ: pz - r,
    maxZ: pz + r,
  };
}

function overlap(a: Aabb, b: Aabb): boolean {
  return a.minX < b.maxX && a.maxX > b.minX
    && a.minY < b.maxY && a.maxY > b.minY
    && a.minZ < b.maxZ && a.maxZ > b.minZ;
}

export function resolveHorizontal(
  px: number,
  py: number,
  pz: number,
  height: number,
  solids: Solid[],
): { px: number; pz: number; grounded: boolean; groundY: number } {
  let nx = px;
  let nz = pz;
  let grounded = false;
  let groundY = py;

  for (const s of solids) {
    const box = solidAabb(s);
    const p = playerAabb(nx, py, nz, height);
    if (!overlap(p, box)) continue;

    const overlapX = Math.min(p.maxX, box.maxX) - Math.max(p.minX, box.minX);
    const overlapZ = Math.min(p.maxZ, box.maxZ) - Math.max(p.minZ, box.minZ);

    if (overlapX < overlapZ) {
      nx += p.minX + p.maxX < box.minX + box.maxX
        ? box.minX - p.maxX - 0.001
        : box.maxX - p.minX + 0.001;
    } else {
      nz += p.minZ + p.maxZ < box.minZ + box.maxZ
        ? box.minZ - p.maxZ - 0.001
        : box.maxZ - p.minZ + 0.001;
    }
  }

  // Ground / standing on top
  for (const s of solids) {
    const box = solidAabb(s);
    const foot = py;
    const onTop =
      nx + PLAYER_RADIUS > box.minX && nx - PLAYER_RADIUS < box.maxX &&
      nz + PLAYER_RADIUS > box.minZ && nz - PLAYER_RADIUS < box.maxZ &&
      foot >= box.maxY - 0.15 && foot <= box.maxY + 0.35;
    if (onTop && box.maxY > groundY) {
      grounded = true;
      groundY = box.maxY;
    }
  }

  const floor = 0;
  if (py <= floor + 0.05) {
    grounded = true;
    groundY = Math.max(groundY, floor);
  }

  nx = Math.max(-ARENA_HALF + 1.5, Math.min(ARENA_HALF - 1.5, nx));
  nz = Math.max(-ARENA_HALF + 1.5, Math.min(ARENA_HALF - 1.5, nz));

  return { px: nx, pz: nz, grounded, groundY };
}

export function findClimbTarget(
  px: number,
  py: number,
  pz: number,
  facing: number,
  solids: Solid[],
): Solid | null {
  const reach = 0.9;
  const fx = Math.sin(facing);
  const fz = Math.cos(facing);
  let best: Solid | null = null;
  let bestDist = Infinity;

  for (const s of solids) {
    if (!s.climbable) continue;
    const box = solidAabb(s);
    if (s.h > 2.8) continue;
    const cx = (box.minX + box.maxX) / 2;
    const cz = (box.minZ + box.maxZ) / 2;
    const dx = cx - px;
    const dz = cz - pz;
    const dist = Math.hypot(dx, dz);
    if (dist > reach + s.w / 2) continue;
    const dot = dx * fx + dz * fz;
    if (dot < 0.2) continue;
    if (box.maxY <= py + 0.5) continue;
    if (dist < bestDist) {
      bestDist = dist;
      best = s;
    }
  }
  return best;
}

export function isUnderCover(
  px: number,
  py: number,
  pz: number,
  height: number,
  solids: Solid[],
): boolean {
  if (height > 1.2) return false;
  for (const s of solids) {
    if (!s.hideUnder) continue;
    const box = solidAabb(s);
    const inside =
      px > box.minX - 0.3 && px < box.maxX + 0.3 &&
      pz > box.minZ - 0.3 && pz < box.maxZ + 0.3;
    if (inside && box.minY > py + height - 0.2) return true;
  }
  return false;
}
