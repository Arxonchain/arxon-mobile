import type {
  BaseAgent, DroneEnemy, EnemyEntity, LevelLayout, Obstacle, Portal, TowerEnemy, Vec2,
} from './types';
import {
  agentCountForLevel, agentRangeForLevel, agentSpeedForLevel, coneAngleForLevel,
  droneCountForLevel, obstacleCountForLevel, sweepSpeedForLevel, towerCountForLevel,
} from './constants';
import { getEnvironmentForLevel, getLevelFlavor } from './environments';

function rand(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

function placeObstacle(w: number, h: number, existing: Obstacle[], margin = 50): Obstacle | null {
  for (let attempt = 0; attempt < 24; attempt++) {
    const ow = rand(40, 90);
    const oh = rand(28, 55);
    const x = rand(16, w - ow - 16);
    const y = rand(h * 0.18, h * 0.78 - oh);
    const candidate = { x, y, w: ow, h: oh };
    const overlaps = existing.some((o) =>
      x < o.x + o.w + 12 && x + ow + 12 > o.x &&
      y < o.y + o.h + 12 && y + oh + 12 > o.y,
    );
    if (!overlaps && y > margin && y < h - margin) return candidate;
  }
  return null;
}

function makeAgent(x: number, y: number, level: number): BaseAgent {
  const sweep = sweepSpeedForLevel(level) * (Math.random() < 0.5 ? 1 : -1);
  return {
    kind: 'agent',
    x, y,
    angle: Math.random() * Math.PI * 2,
    baseAngle: Math.random() * Math.PI * 2,
    sweepSpeed: sweep,
    coneAngle: coneAngleForLevel(level),
    range: agentRangeForLevel(level),
    speed: agentSpeedForLevel(level),
    state: 'patrol',
    alertTimer: 0,
    lostTimer: 0,
    lastSeenX: x,
    lastSeenY: y,
    partialTimer: 0,
  };
}

function makeTower(x: number, y: number, level: number): TowerEnemy {
  return {
    kind: 'tower',
    x, y,
    angle: Math.random() * Math.PI * 2,
    sweepSpeed: 0.35 + level * 0.02,
    coneAngle: 0.55 + level * 0.015,
    range: agentRangeForLevel(level) * 1.35,
  };
}

function makeDrone(w: number, h: number, index: number): DroneEnemy {
  const patterns: Vec2[][] = [
    [{ x: w * 0.25, y: h * 0.35 }, { x: w * 0.75, y: h * 0.35 }, { x: w * 0.75, y: h * 0.55 }, { x: w * 0.25, y: h * 0.55 }],
    [{ x: w * 0.5, y: h * 0.25 }, { x: w * 0.5, y: h * 0.65 }],
  ];
  const waypoints = patterns[index % patterns.length];
  return {
    kind: 'drone',
    x: waypoints[0].x,
    y: waypoints[0].y,
    pathIndex: 0,
    pathT: 0,
    speed: 55 + index * 8,
    lightRadius: 52,
    waypoints,
  };
}

export function generateLevel(w: number, h: number, level: number): LevelLayout {
  const env = getEnvironmentForLevel(level);
  const obstacles: Obstacle[] = [];
  const count = obstacleCountForLevel(level);

  for (let i = 0; i < count; i++) {
    const o = placeObstacle(w, h, obstacles);
    if (o) obstacles.push(o);
  }

  const playerStart: Vec2 = { x: w * 0.5, y: h * 0.88 };
  const portal: Portal = {
    x: clampPortal(w * 0.5 + (Math.random() - 0.5) * w * 0.28, 40, w - 40),
    y: h * 0.1,
    r: 22,
  };

  const enemies: EnemyEntity[] = [];
  const spawnMargin = 44;

  for (let i = 0; i < agentCountForLevel(level); i++) {
    enemies.push(makeAgent(
      rand(spawnMargin, w - spawnMargin),
      rand(h * 0.16, h * 0.68),
      level,
    ));
  }

  for (let i = 0; i < towerCountForLevel(level); i++) {
    enemies.push(makeTower(
      i === 0 ? w * 0.5 : rand(spawnMargin, w - spawnMargin),
      rand(h * 0.22, h * 0.5),
      level,
    ));
  }

  for (let i = 0; i < droneCountForLevel(level); i++) {
    enemies.push(makeDrone(w, h, i));
  }

  return {
    obstacles,
    enemies,
    portal,
    playerStart,
    tierId: env.id,
    level,
    flavorText: getLevelFlavor(level),
  };
}

function clampPortal(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}
