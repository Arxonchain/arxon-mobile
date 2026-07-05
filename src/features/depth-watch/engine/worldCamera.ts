import { WALK_SPEED, RUN_SPEED, RUN_THRESHOLD } from './constants';

export function getSegmentAtY(segments: import('./types').LevelSegment[], worldY: number) {
  return segments.find((s) => worldY >= s.worldY && worldY < s.worldY + s.height) ?? segments[0];
}

export function constrainToCorridor(
  x: number,
  y: number,
  segments: import('./types').LevelSegment[],
  margin = 14,
): { x: number; y: number } {
  const seg = getSegmentAtY(segments, y);
  if (!seg) return { x, y };
  const half = seg.pathWidth / 2 - margin;
  return {
    x: Math.max(seg.pathCenterX - half, Math.min(seg.pathCenterX + half, x)),
    y,
  };
}

export function updateCamera(playerY: number, viewH: number, worldH: number): number {
  const target = playerY - viewH * 0.68;
  return Math.max(0, Math.min(worldH - viewH, target));
}

export function worldToScreen(wx: number, wy: number, cameraY: number): { x: number; y: number } {
  return { x: wx, y: wy - cameraY };
}

export function resolveMovementSpeed(moveMag: number, walkSpeed: number, runSpeed: number): {
  speed: number;
  running: boolean;
} {
  const running = moveMag >= RUN_THRESHOLD;
  const speed = running ? runSpeed : walkSpeed;
  return { speed, running };
}

export { WALK_SPEED, RUN_SPEED, RUN_THRESHOLD };
