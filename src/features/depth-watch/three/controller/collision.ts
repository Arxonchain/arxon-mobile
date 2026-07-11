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

export interface ResolveOptions {
  floorY?: number;
  half?: number;
  passes?: number;
}

/** Circle-vs-AABB separation — stable, no snap-back oscillation. */
export function resolveHorizontal(
  px: number,
  py: number,
  pz: number,
  height: number,
  solids: Solid[],
  opts?: ResolveOptions,
): { px: number; pz: number; grounded: boolean; groundY: number } {
  const floorY = opts?.floorY ?? 0;
  const half = opts?.half ?? ARENA_HALF;
  const passes = opts?.passes ?? 6;
  const r = PLAYER_RADIUS;

  let nx = px;
  let nz = pz;
  let groundY = py;

  for (let pass = 0; pass < passes; pass++) {
    for (const s of solids) {
      const box = solidAabb(s);
      if (py + height < box.minY + 0.05 || py > box.maxY + 0.15) continue;

      const cx = Math.max(box.minX, Math.min(nx, box.maxX));
      const cz = Math.max(box.minZ, Math.min(nz, box.maxZ));
      const dx = nx - cx;
      const dz = nz - cz;
      const distSq = dx * dx + dz * dz;
      if (distSq >= r * r) continue;

      const dist = Math.sqrt(distSq) || 0.0001;
      const pen = r - dist + 0.004;
      nx += (dx / dist) * pen;
      nz += (dz / dist) * pen;
    }
  }

  let grounded = py <= floorY + 0.1;
  if (grounded) groundY = floorY;

  const inset = 1.2;
  nx = Math.max(-half + inset, Math.min(half - inset, nx));
  nz = Math.max(-half + inset, Math.min(half - inset, nz));

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
