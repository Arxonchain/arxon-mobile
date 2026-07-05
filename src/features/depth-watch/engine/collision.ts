import type { Obstacle } from './types';

export function circleRectCollide(
  cx: number,
  cy: number,
  cr: number,
  rect: Obstacle,
): boolean {
  const nx = Math.max(rect.x, Math.min(cx, rect.x + rect.w));
  const ny = Math.max(rect.y, Math.min(cy, rect.y + rect.h));
  const dx = cx - nx;
  const dy = cy - ny;
  return dx * dx + dy * dy < cr * cr;
}

function segIntersect(
  x1: number, y1: number, x2: number, y2: number,
  x3: number, y3: number, x4: number, y4: number,
): boolean {
  const d = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);
  if (Math.abs(d) < 1e-9) return false;
  const t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / d;
  const u = ((x1 - x3) * (y1 - y2) - (y1 - y3) * (x1 - x2)) / d;
  return t >= 0 && t <= 1 && u >= 0 && u <= 1;
}

export function segmentIntersectsRect(
  x1: number, y1: number, x2: number, y2: number,
  rect: Obstacle,
): boolean {
  const lines: [number, number, number, number][] = [
    [rect.x, rect.y, rect.x + rect.w, rect.y],
    [rect.x + rect.w, rect.y, rect.x + rect.w, rect.y + rect.h],
    [rect.x + rect.w, rect.y + rect.h, rect.x, rect.y + rect.h],
    [rect.x, rect.y + rect.h, rect.x, rect.y],
  ];
  for (const [x3, y3, x4, y4] of lines) {
    if (segIntersect(x1, y1, x2, y2, x3, y3, x4, y4)) return true;
  }
  if (x1 > rect.x && x1 < rect.x + rect.w && y1 > rect.y && y1 < rect.y + rect.h) return true;
  return false;
}

export function hasLineOfSight(
  ex: number, ey: number, px: number, py: number,
  obstacles: Obstacle[],
): boolean {
  for (const o of obstacles) {
    if (segmentIntersectsRect(ex, ey, px, py, o)) return false;
  }
  return true;
}

export function angleDiff(a: number, b: number): number {
  let d = a - b;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return Math.abs(d);
}

export function normalizeAngle(a: number): number {
  while (a > Math.PI) a -= Math.PI * 2;
  while (a < -Math.PI) a += Math.PI * 2;
  return a;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function moveWithObstacles(
  x: number, y: number, nx: number, ny: number, r: number,
  w: number, h: number, obstacles: Obstacle[],
): { x: number; y: number } {
  let blockedX = false;
  let blockedY = false;
  for (const o of obstacles) {
    if (circleRectCollide(nx, y, r, o)) blockedX = true;
    if (circleRectCollide(x, ny, r, o)) blockedY = true;
  }
  return {
    x: blockedX ? x : clamp(nx, r, w - r),
    y: blockedY ? y : clamp(ny, r, h - r),
  };
}

export function pointInCone(
  ex: number, ey: number, angle: number, coneHalf: number, range: number,
  px: number, py: number,
): { inside: boolean; partial: boolean; dist: number; angDiff: number } {
  const dx = px - ex;
  const dy = py - ey;
  const dist = Math.hypot(dx, dy);
  if (dist > range) return { inside: false, partial: false, dist, angDiff: Math.PI };
  const angTo = Math.atan2(dy, dx);
  const diff = angleDiff(angTo, angle);
  const inside = diff < coneHalf;
  const partial = inside && diff > coneHalf * 0.72;
  return { inside, partial, dist, angDiff: diff };
}

export function pointInCircleLight(
  lx: number, ly: number, radius: number,
  px: number, py: number,
): boolean {
  return Math.hypot(px - lx, py - ly) < radius;
}
