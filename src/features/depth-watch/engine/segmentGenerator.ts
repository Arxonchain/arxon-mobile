import type {
  BaseAgent, CoverObstacle, DroneEnemy, EnemyEntity, LevelLayout, LevelSegment,
  Portal, TowerEnemy, Vec2,
} from './types';
import {
  agentCountForLevel, agentRangeForLevel, agentSpeedForLevel, coneAngleForLevel,
  droneCountForLevel, sweepSpeedForLevel, towerCountForLevel,
} from './constants';
import { getEnvironmentForLevel, getLevelFlavor } from './environments';

const SEGMENT_KINDS = ['straight', 'straight', 'turn_left', 'turn_right', 'open', 'room', 'alcove'] as const;

function rand(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

function makeCoverObstacle(x: number, y: number, w: number, h: number): CoverObstacle {
  return {
    x, y, w, h,
    isCover: true,
    coverNorth: true,
    coverSouth: true,
    coverEast: true,
    coverWest: true,
  };
}

function corridorObstacles(
  w: number, segY: number, segH: number, pathX: number, pathW: number,
  kind: LevelSegment['kind'], level: number,
): CoverObstacle[] {
  const obs: CoverObstacle[] = [];
  const margin = 18;
  const count = kind === 'open' ? 4 + level : kind === 'room' || kind === 'alcove' ? 2 : 3;

  for (let i = 0; i < count; i++) {
    const side = Math.random() < 0.5 ? -1 : 1;
    const ow = rand(36, 64);
    const oh = rand(28, 48);
    const laneOffset = side * rand(pathW * 0.22, pathW * 0.38);
    const x = clamp(pathX + laneOffset - ow / 2, margin, w - ow - margin);
    const y = segY + rand(segH * 0.15, segH * 0.78);
    obs.push(makeCoverObstacle(x, y, ow, oh));
  }

  if (kind === 'room' || kind === 'alcove') {
    const roomW = pathW * 0.55;
    const roomH = segH * 0.35;
    const rx = pathX - roomW / 2;
    const ry = segY + segH * 0.55;
    obs.push(makeCoverObstacle(rx, ry, roomW, roomH));
  }

  return obs;
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

function makeAgent(x: number, y: number, level: number): BaseAgent {
  return {
    kind: 'agent',
    x, y,
    angle: -Math.PI / 2,
    baseAngle: -Math.PI / 2,
    facingRight: Math.random() < 0.5,
    sweepSpeed: sweepSpeedForLevel(level) * (Math.random() < 0.5 ? 1 : -1),
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

export function generateLevel(w: number, h: number, level: number): LevelLayout {
  const env = getEnvironmentForLevel(level);
  const segmentCount = 4 + Math.min(level + 1, 6);
  const segments: LevelSegment[] = [];
  const obstacles: CoverObstacle[] = [];
  const enemies: EnemyEntity[] = [];

  let pathX = w * 0.5;
  const pathW = w * 0.58;
  let worldY = 0;

  for (let i = 0; i < segmentCount; i++) {
    let kind: LevelSegment['kind'] = 'straight';
    if (i === 0) kind = 'straight';
    else if (i === segmentCount - 1) kind = 'straight';
    else if (level >= 3 && i % 3 === 0) kind = 'junction';
    else kind = SEGMENT_KINDS[Math.floor(Math.random() * SEGMENT_KINDS.length)];

    if (kind === 'turn_left') pathX -= w * 0.12;
    if (kind === 'turn_right') pathX += w * 0.12;
    pathX = clamp(pathX, w * 0.28, w * 0.72);

    const seg: LevelSegment = {
      id: `seg-${i}`,
      kind,
      worldY,
      height: h,
      pathCenterX: pathX,
      pathWidth: pathW,
    };
    segments.push(seg);

    obstacles.push(...corridorObstacles(w, worldY, h, pathX, pathW, kind, level));

    const agentN = Math.max(1, Math.floor(agentCountForLevel(level) / segmentCount));
    for (let a = 0; a < agentN; a++) {
      enemies.push(makeAgent(
        pathX + rand(-pathW * 0.3, pathW * 0.3),
        worldY + rand(h * 0.2, h * 0.75),
        level,
      ));
    }

    worldY += h;
  }

  const worldHeight = worldY;
  const lastSeg = segments[segments.length - 1];

  for (let i = 0; i < towerCountForLevel(level); i++) {
    const t: TowerEnemy = {
      kind: 'tower',
      x: lastSeg.pathCenterX + (i === 0 ? 0 : rand(-80, 80)),
      y: lastSeg.worldY + h * 0.35,
      angle: -Math.PI / 2,
      sweepSpeed: 0.35 + level * 0.02,
      coneAngle: 0.55 + level * 0.015,
      range: agentRangeForLevel(level) * 1.35,
    };
    enemies.push(t);
  }

  if (level >= 6) {
    for (let d = 0; d < droneCountForLevel(level); d++) {
      const seg = segments[Math.floor(segments.length / 2)];
      const drone: DroneEnemy = {
        kind: 'drone',
        x: seg.pathCenterX,
        y: seg.worldY + h * 0.4,
        pathIndex: 0,
        pathT: 0,
        speed: 45 + d * 10,
        lightRadius: 48,
        waypoints: [
          { x: seg.pathCenterX - seg.pathWidth * 0.25, y: seg.worldY + h * 0.35 },
          { x: seg.pathCenterX + seg.pathWidth * 0.25, y: seg.worldY + h * 0.35 },
        ],
      };
      enemies.push(drone);
    }
  }

  const playerStart: Vec2 = { x: w * 0.5, y: worldHeight - h * 0.12 };
  const portal: Portal = {
    x: lastSeg.pathCenterX,
    y: lastSeg.worldY + h * 0.08,
    r: 24,
  };

  return {
    obstacles,
    enemies,
    portal,
    playerStart,
    tierId: env.id,
    level,
    flavorText: getLevelFlavor(level),
    worldWidth: w,
    worldHeight,
    segments,
  };
}
