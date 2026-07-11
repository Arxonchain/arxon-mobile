import type { Solid } from '../three/arena/arenaLayout';
import { WALK_SPEED, RUN_SPEED, RUN_THRESHOLD, CROUCH_SPEED_MULT } from '../three/constants';
import { isUnderCover, resolveHorizontal } from '../three/controller/collision';
import type { PlayerSnapshot, InputFrame } from '../three/controller/playerController';
import { PREVIEW_BOUNDS, PREVIEW_FLOOR_Y } from './previewCollision';

const COLLISION = {
  floorY: PREVIEW_FLOOR_Y,
  half: PREVIEW_BOUNDS,
  passes: 8,
};

/** Free roam — screen x = strafe, screen y = forward (fixed south camera). */
export function stepPreviewPlayer(
  snap: PlayerSnapshot,
  input: InputFrame,
  solids: Solid[],
  dt: number,
): PlayerSnapshot {
  const crouching = input.crouch;
  const height = crouching ? 1.05 : 1.75;
  const mag = Math.min(1, Math.hypot(input.x, input.y));
  const running = !crouching && mag >= RUN_THRESHOLD;
  const speed = (running ? RUN_SPEED : WALK_SPEED) * (crouching ? CROUCH_SPEED_MULT : 1);

  const mx = input.x;
  const mz = -input.y;

  let { px, pz, facing } = snap;

  if (mag > 0.1) {
    facing = Math.atan2(mx, mz);
  }

  px += mx * speed * dt;
  pz += mz * speed * dt;

  const resolved = resolveHorizontal(px, PREVIEW_FLOOR_Y, pz, height, solids, COLLISION);
  px = resolved.px;
  pz = resolved.pz;

  const hiding = crouching && isUnderCover(px, PREVIEW_FLOOR_Y, pz, height, solids);

  return {
    px,
    py: PREVIEW_FLOOR_Y,
    pz,
    vy: 0,
    facing,
    mode: 'ground',
    crouching,
    running,
    moving: mag > 0.1,
    hiding,
    climbing: false,
    height,
  };
}
