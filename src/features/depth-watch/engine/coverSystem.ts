import type { CoverObstacle, InputState, PlayerEntity } from './types';
import { circleRectCollide } from './collision';

export type CoverSide = 'north' | 'south' | 'east' | 'west';

function distToRectEdge(px: number, py: number, o: CoverObstacle): { side: CoverSide; dist: number } {
  const dNorth = Math.abs(py - o.y);
  const dSouth = Math.abs(py - (o.y + o.h));
  const dWest = Math.abs(px - o.x);
  const dEast = Math.abs(px - (o.x + o.w));
  const min = Math.min(dNorth, dSouth, dWest, dEast);
  if (min === dNorth) return { side: 'north', dist: dNorth };
  if (min === dSouth) return { side: 'south', dist: dSouth };
  if (min === dWest) return { side: 'west', dist: dWest };
  return { side: 'east', dist: dEast };
}

function pressingIntoCover(input: InputState, side: CoverSide): boolean {
  const th = 0.22;
  if (side === 'north') return input.moveY < -th;
  if (side === 'south') return input.moveY > th;
  if (side === 'west') return input.moveX < -th;
  return input.moveX > th;
}

export function movingAwayFromCover(input: InputState, side: CoverSide | null): boolean {
  if (!side) return false;
  const th = 0.22;
  if (side === 'north') return input.moveY > th;
  if (side === 'south') return input.moveY < -th;
  if (side === 'west') return input.moveX > th;
  return input.moveX < -th;
}

export function updateCoverState(
  player: PlayerEntity,
  obstacles: CoverObstacle[],
  input: InputState,
): void {
  if (player.hiding && player.hideSide) {
    if (movingAwayFromCover(input, player.hideSide)) {
      player.hiding = false;
      player.hideSide = null;
      player.coverRef = null;
    }
    return;
  }

  if (player.moveMag < 0.08) return;

  for (const o of obstacles) {
    if (!o.isCover) continue;
    if (!circleRectCollide(player.x, player.y, player.r + 4, o)) continue;

    const { side, dist } = distToRectEdge(player.x, player.y, o);
    if (dist > 14) continue;
    if (!pressingIntoCover(input, side)) continue;

    player.hiding = true;
    player.hideSide = side;
    player.coverRef = o;
    return;
  }
}

export function coverBlocksSight(
  player: PlayerEntity,
  ax: number,
  ay: number,
): boolean {
  if (!player.hiding || !player.coverRef || !player.hideSide) return false;
  const px = player.x;
  const py = player.y;
  const agentLeft = ax < px;
  const agentAbove = ay < py;

  switch (player.hideSide) {
    case 'north': return agentAbove;
    case 'south': return !agentAbove;
    case 'west': return agentLeft;
    case 'east': return !agentLeft;
    default: return false;
  }
}
