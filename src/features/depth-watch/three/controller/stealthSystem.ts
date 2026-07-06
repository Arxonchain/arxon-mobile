import type { ArenaAgent, ArenaDrone, ArenaLayout } from '../arena/arenaLayout';
import {
  AGENT_CONE, AGENT_RANGE, DRONE_CONE, DRONE_RANGE,
  EXPOSURE_DECAY, EXPOSURE_MAX, EXPOSURE_RATE,
} from '../constants';

function inHorizontalCone(
  ax: number,
  az: number,
  angle: number,
  range: number,
  cone: number,
  px: number,
  pz: number,
): boolean {
  const dx = px - ax;
  const dz = pz - az;
  const dist = Math.hypot(dx, dz);
  if (dist > range) return false;
  const angTo = Math.atan2(dx, dz);
  let diff = angTo - angle;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  return Math.abs(diff) < cone;
}

function inDroneCone(
  drone: ArenaDrone,
  px: number,
  py: number,
  pz: number,
): boolean {
  const dx = px - drone.x;
  const dy = py + 0.9 - drone.y;
  const dz = pz - drone.z;
  const dist = Math.hypot(dx, dy, dz);
  if (dist > DRONE_RANGE) return false;
  const angTo = Math.atan2(Math.hypot(dx, dz), -dy);
  let diff = angTo - (-Math.PI / 2);
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  const horiz = Math.atan2(dx, dz);
  let ad = horiz - drone.angle;
  while (ad > Math.PI) ad -= Math.PI * 2;
  while (ad < -Math.PI) ad += Math.PI * 2;
  return Math.abs(diff) < DRONE_CONE && Math.abs(ad) < DRONE_CONE * 0.85;
}

function advancePatrol(agent: ArenaAgent, dt: number): void {
  const next = agent.path[(agent.pathIndex + 1) % agent.path.length];
  const dx = next.x - agent.x;
  const dz = next.z - agent.z;
  const dist = Math.hypot(dx, dz);
  if (dist < 0.25) {
    agent.pathIndex = (agent.pathIndex + 1) % agent.path.length;
    return;
  }
  agent.angle = Math.atan2(dx, dz);
  const step = agent.speed * dt;
  agent.x += (dx / dist) * step;
  agent.z += (dz / dist) * step;
  agent.angle += agent.sweep * dt * 0.35;
}

function updateAgent(agent: ArenaAgent, dt: number, px: number, pz: number, seen: boolean): void {
  if (seen) {
    agent.state = 'chase';
    agent.alertTimer = 1.5;
    const dx = px - agent.x;
    const dz = pz - agent.z;
    agent.angle = Math.atan2(dx, dz);
    const step = agent.speed * 1.35 * dt;
    agent.x += Math.sign(dx) * Math.min(Math.abs(dx), step);
    agent.z += Math.sign(dz) * Math.min(Math.abs(dz), step);
  } else {
    if (agent.state === 'chase') {
      agent.alertTimer -= dt;
      if (agent.alertTimer <= 0) agent.state = 'patrol';
    }
    advancePatrol(agent, dt);
  }
}

function updateDrone(drone: ArenaDrone, dt: number): void {
  drone.pathT += drone.speed * dt;
  if (drone.pathT >= 1) drone.pathT -= 1;
  const segs = drone.path.length - 1;
  const f = drone.pathT * segs;
  const i = Math.floor(f);
  const t = f - i;
  const a = drone.path[i];
  const b = drone.path[i + 1];
  drone.x = a.x + (b.x - a.x) * t;
  drone.z = a.z + (b.z - a.z) * t;
  drone.y = 9 + drone.hover + Math.sin(drone.pathT * Math.PI * 2) * 0.4;
  drone.angle = Math.atan2(b.x - a.x, b.z - a.z);
}

export function stepStealth(
  layout: ArenaLayout,
  px: number,
  py: number,
  pz: number,
  hidden: boolean,
  shieldActive: boolean,
  running: boolean,
  dt: number,
): { exposure: number; detected: boolean } {
  if (hidden || shieldActive) {
    for (const agent of layout.agents) {
      if (agent.state === 'chase') {
        agent.alertTimer -= dt;
        if (agent.alertTimer <= 0) agent.state = 'patrol';
      } else {
        advancePatrol(agent, dt);
      }
    }
    for (const drone of layout.drones) updateDrone(drone, dt);
    return { exposure: 0, detected: false };
  }

  let lit = false;
  for (const agent of layout.agents) {
    const seen = inHorizontalCone(agent.x, agent.z, agent.angle, AGENT_RANGE, AGENT_CONE, px, pz);
    updateAgent(agent, dt, px, pz, seen);
    if (seen) lit = true;
  }
  for (const drone of layout.drones) {
    updateDrone(drone, dt);
    if (inDroneCone(drone, px, py, pz)) lit = true;
  }

  return { exposure: lit ? EXPOSURE_RATE * dt * (running ? 1.2 : 1) : -EXPOSURE_DECAY * dt, detected: lit };
}

export function applyExposure(current: number, delta: number): number {
  if (delta < 0) return Math.max(0, current + delta);
  return Math.min(EXPOSURE_MAX, current + delta);
}

export function isFullyExposed(exposure: number): boolean {
  return exposure >= EXPOSURE_MAX;
}
