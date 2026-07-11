import type { Solid } from '../arena/arenaLayout';
import {
  CLIMB_SPEED, CROUCH_SPEED_MULT, GRAVITY, JUMP_VELOCITY,
  PLAYER_CROUCH_HEIGHT, PLAYER_RADIUS, RUN_SPEED, RUN_THRESHOLD, WALK_SPEED,
} from '../constants';
import { findClimbTarget, isUnderCover, resolveHorizontal, solidAabb, type ResolveOptions } from './collision';

export type MoveMode = 'ground' | 'air' | 'climb';

export interface PlayerSnapshot {
  px: number;
  py: number;
  pz: number;
  vy: number;
  facing: number;
  mode: MoveMode;
  crouching: boolean;
  running: boolean;
  moving: boolean;
  hiding: boolean;
  climbing: boolean;
  height: number;
}

export interface InputFrame {
  x: number;
  y: number;
  jump: boolean;
  crouch: boolean;
  cameraYaw: number;
}

export interface StepPlayerOptions {
  collision?: ResolveOptions;
}

export function stepPlayer(
  snap: PlayerSnapshot,
  input: InputFrame,
  solids: Solid[],
  dt: number,
  jumpPressed: boolean,
  options?: StepPlayerOptions,
): PlayerSnapshot {
  const crouching = input.crouch;
  const height = crouching ? PLAYER_CROUCH_HEIGHT : 1.75;
  const mag = Math.min(1, Math.hypot(input.x, input.y));
  const running = !crouching && mag >= RUN_THRESHOLD;
  const speed = (running ? RUN_SPEED : WALK_SPEED) * (crouching ? CROUCH_SPEED_MULT : 1);

  const sin = Math.sin(input.cameraYaw);
  const cos = Math.cos(input.cameraYaw);
  const mx = input.x * cos - input.y * sin;
  const mz = input.x * sin + input.y * cos;

  let { px, py, pz, vy, facing, mode } = snap;
  let climbing = false;

  if (Math.abs(mx) > 0.18 || Math.abs(mz) > 0.18) {
    facing = Math.atan2(mx, mz);
  }

  if (mode === 'climb') {
    climbing = true;
    py += CLIMB_SPEED * dt;
    const target = findClimbTarget(px, py, pz, facing, solids);
    const topY = target ? solidAabb(target).maxY : py;
    if (py >= topY - 0.05) {
      py = topY;
      mode = 'ground';
      vy = 0;
    }
  } else {
    if (jumpPressed && mode === 'ground') {
      const climb = findClimbTarget(px, py, pz, facing, solids);
      if (climb && !crouching) {
        mode = 'climb';
        climbing = true;
      } else {
        vy = JUMP_VELOCITY;
        mode = 'air';
      }
    }

    if (mode === 'air') {
      vy -= GRAVITY * dt;
      py += vy * dt;
    }

    px += mx * speed * dt;
    pz += mz * speed * dt;

    const resolved = resolveHorizontal(px, py, pz, height, solids, options?.collision);
    px = resolved.px;
    pz = resolved.pz;

    if (mode === 'air' && resolved.groundY >= py - 0.05) {
      py = resolved.groundY;
      vy = 0;
      mode = 'ground';
    } else if (mode === 'ground') {
      py = resolved.groundY;
    }
  }

  const hiding = isUnderCover(px, py, pz, height, solids) || (crouching && mag < 0.15);
  const moving = mag > 0.12 || mode === 'climb';

  return {
    px,
    py,
    pz,
    vy,
    facing,
    mode,
    crouching,
    running,
    moving,
    hiding,
    climbing,
    height,
  };
}

export function pickupRadius(): number {
  return PLAYER_RADIUS + 0.55;
}
