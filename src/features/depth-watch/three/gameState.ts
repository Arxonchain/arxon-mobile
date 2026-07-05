import { generateWorld, type WorldAgent, type WorldLayout, type WorldProp } from './worldLayout';
import {
  AGENT_CONE, AGENT_RANGE, EXPOSURE_DECAY, EXPOSURE_MAX, EXPOSURE_RATE,
  FORWARD_SPEED, LANE_LERP, LANE_X, PLAYER_RADIUS, RUN_THRESHOLD, SPRINT_MULT,
} from './constants';

export interface Input3D {
  x: number;
  y: number;
}

export interface GameState3D {
  level: number;
  layout: WorldLayout;
  px: number;
  pz: number;
  exposure: number;
  elapsed: number;
  cloakActive: boolean;
  cloakTimer: number;
  cloakCooldown: number;
  hiding: boolean;
  moving: boolean;
  running: boolean;
  facingRight: boolean;
  targetLane: number;
  prevInputX: number;
  phase: 'playing' | 'caught' | 'won';
  characterId: string;
}

export function createGameState(level: number, characterId: string): GameState3D {
  const layout = generateWorld(level);
  return {
    level,
    layout,
    px: 0,
    pz: layout.startZ,
    exposure: 0,
    elapsed: 0,
    cloakActive: false,
    cloakTimer: 0,
    cloakCooldown: 0,
    hiding: false,
    moving: false,
    running: false,
    facingRight: true,
    targetLane: 1,
    prevInputX: 0,
    phase: 'playing',
    characterId,
  };
}

function aabbHit(px: number, pz: number, o: WorldProp): boolean {
  return (
    px + PLAYER_RADIUS > o.x - o.w / 2 &&
    px - PLAYER_RADIUS < o.x + o.w / 2 &&
    pz + PLAYER_RADIUS > o.z - o.d / 2 &&
    pz - PLAYER_RADIUS < o.z + o.d / 2
  );
}

function blocked(px: number, pz: number, props: WorldProp[], buildings: WorldLayout['buildings']): boolean {
  for (const o of props) {
    if (aabbHit(px, pz, o)) return true;
  }
  for (const b of buildings) {
    if (
      px + PLAYER_RADIUS > b.x - b.w / 2 &&
      px - PLAYER_RADIUS < b.x + b.w / 2 &&
      pz + PLAYER_RADIUS > b.z - b.d / 2 &&
      pz - PLAYER_RADIUS < b.z + b.d / 2
    ) return true;
  }
  return false;
}

function inCone(ax: number, az: number, angle: number, px: number, pz: number): boolean {
  const dx = px - ax;
  const dz = pz - az;
  const dist = Math.hypot(dx, dz);
  if (dist > AGENT_RANGE) return false;
  const angTo = Math.atan2(dx, dz);
  let diff = angTo - angle;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  return Math.abs(diff) < AGENT_CONE;
}

function updateAgent(agent: WorldAgent, dt: number, px: number, pz: number, seen: boolean): void {
  if (seen) {
    agent.state = 'chase';
    agent.alertTimer = 1.2;
    const dx = px - agent.x;
    const dz = pz - agent.z;
    agent.angle = Math.atan2(dx, dz);
    agent.x += Math.sign(dx) * Math.min(Math.abs(dx), agent.speed * dt);
    agent.z += Math.sign(dz) * Math.min(Math.abs(dz), agent.speed * dt);
  } else {
    agent.angle += agent.sweep * dt * 0.5;
    if (agent.state === 'chase') {
      agent.alertTimer -= dt;
      if (agent.alertTimer <= 0) agent.state = 'patrol';
    }
  }
}

export function stepGame(state: GameState3D, input: Input3D, dt: number): 'caught' | 'won' | null {
  if (state.phase !== 'playing') return null;
  state.elapsed += dt;

  if (state.cloakActive) {
    state.cloakTimer -= dt;
    if (state.cloakTimer <= 0) {
      state.cloakActive = false;
      state.cloakCooldown = 8;
    }
  } else if (state.cloakCooldown > 0) {
    state.cloakCooldown -= dt;
  }

  const mag = Math.min(1, Math.hypot(input.x, input.y));
  state.moving = true;
  state.running = input.y > RUN_THRESHOLD || mag >= RUN_THRESHOLD;
  const forward = FORWARD_SPEED * (state.running ? SPRINT_MULT : 1) * dt;

  if (input.x > 0.45 && state.prevInputX <= 0.45) {
    state.targetLane = Math.min(LANE_X.length - 1, state.targetLane + 1);
  } else if (input.x < -0.45 && state.prevInputX >= -0.45) {
    state.targetLane = Math.max(0, state.targetLane - 1);
  }
  state.prevInputX = input.x;
  const laneX = LANE_X[state.targetLane];
  const nx = state.px + (laneX - state.px) * Math.min(1, LANE_LERP * dt);
  if (!blocked(nx, state.pz, state.layout.props, state.layout.buildings)) {
    state.px = nx;
    state.facingRight = laneX >= state.px;
  }

  const nz = state.pz - forward;
  if (!blocked(state.px, nz, state.layout.props, state.layout.buildings)) state.pz = nz;

  state.hiding = false;
  if (!state.cloakActive) {
    for (const o of state.layout.props) {
      if (!o.isCover || !aabbHit(state.px, state.pz, o)) continue;
      if (input.y < -0.25) state.hiding = true;
    }
  }

  let lit = false;
  if (!state.cloakActive && !state.hiding) {
    for (const agent of state.layout.agents) {
      const seen = inCone(agent.x, agent.z, agent.angle, state.px, state.pz);
      updateAgent(agent, dt, state.px, state.pz, seen);
      if (seen) lit = true;
    }
  } else {
    for (const agent of state.layout.agents) {
      agent.angle += agent.sweep * dt * 0.4;
    }
  }

  if (lit) {
    state.exposure = Math.min(EXPOSURE_MAX, state.exposure + EXPOSURE_RATE * dt * (state.running ? 1.15 : 1));
  } else {
    state.exposure = Math.max(0, state.exposure - EXPOSURE_DECAY * dt);
  }

  if (state.exposure >= EXPOSURE_MAX) {
    state.phase = 'caught';
    return 'caught';
  }

  if (state.pz <= state.layout.portalZ + 1.5) {
    state.phase = 'won';
    return 'won';
  }

  return null;
}

export function activateCloak3D(state: GameState3D): void {
  if (state.cloakActive || state.cloakCooldown > 0 || state.phase !== 'playing') return;
  state.cloakActive = true;
  state.cloakTimer = 2.6;
}
