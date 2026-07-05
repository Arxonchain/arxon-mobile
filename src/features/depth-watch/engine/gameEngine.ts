import type {
  BaseAgent, CloakState, DroneEnemy, EnemyEntity, InputState, LevelLayout,
  Particle, PlayerEntity, TowerEnemy,
} from './types';
import type { DepthWatchAssets } from './assetLoader';
import { drawSpriteOrFallback } from './assetLoader';
import {
  ALERT_DURATION, EXPOSURE_DECAY, EXPOSURE_MAX, EXPOSURE_PARTIAL_RATE, EXPOSURE_RATE,
  LOST_SIGHT_DURATION, PARTIAL_EDGE_RATIO, cloakCooldownForLevel,
} from './constants';
import {
  angleDiff, hasLineOfSight, moveWithObstacles, normalizeAngle,
  pointInCircleLight, pointInCone,
} from './collision';
import { getCharacterById } from '../data/characters';
import { getEnvironmentForLevel } from './environments';

export interface GameSnapshot {
  level: number;
  elapsed: number;
  exposure: number;
  cloak: CloakState;
  player: PlayerEntity;
  layout: LevelLayout;
  particles: Particle[];
  phase: 'playing' | 'transition' | 'caught';
  transitionTimer: number;
}

function updateAgent(
  en: BaseAgent, dt: number,
  player: PlayerEntity, obstacles: LevelLayout['obstacles'],
  cloakActive: boolean, w: number, h: number,
): { lit: boolean; partial: boolean } {
  let lit = false;
  let partial = false;

  const dx = player.x - en.x;
  const dy = player.y - en.y;
  const dist = Math.hypot(dx, dy);
  const angTo = Math.atan2(dy, dx);
  const los = hasLineOfSight(en.x, en.y, player.x, player.y, obstacles);
  const cone = pointInCone(en.x, en.y, en.angle, en.coneAngle, en.range, player.x, player.y);
  const canDetect = !cloakActive && los && cone.inside;

  if (canDetect) {
    if (cone.partial || cone.angDiff > en.coneAngle * PARTIAL_EDGE_RATIO) {
      en.state = 'alert';
      en.alertTimer = ALERT_DURATION;
      en.partialTimer = 0.35;
      partial = true;
      lit = true;
    } else {
      en.state = 'chase';
      en.alertTimer = ALERT_DURATION;
      en.lostTimer = LOST_SIGHT_DURATION;
      en.lastSeenX = player.x;
      en.lastSeenY = player.y;
      lit = true;
    }
  }

  switch (en.state) {
    case 'patrol':
      en.angle += en.sweepSpeed * dt * 0.55;
      break;
    case 'alert':
      en.alertTimer -= dt;
      en.angle = normalizeAngle(angTo);
      if (en.alertTimer <= 0) {
        en.state = canDetect && !partial ? 'chase' : 'patrol';
        if (en.state === 'chase') {
          en.lostTimer = LOST_SIGHT_DURATION;
          en.lastSeenX = player.x;
          en.lastSeenY = player.y;
        }
      }
      break;
    case 'chase': {
      en.lostTimer -= dt;
      const tx = canDetect ? player.x : en.lastSeenX;
      const ty = canDetect ? player.y : en.lastSeenY;
      const chaseAng = Math.atan2(ty - en.y, tx - en.x);
      en.angle = chaseAng;
      en.x += Math.cos(chaseAng) * en.speed * dt;
      en.y += Math.sin(chaseAng) * en.speed * dt;
      en.x = Math.max(24, Math.min(w - 24, en.x));
      en.y = Math.max(24, Math.min(h - 24, en.y));
      if (!canDetect && en.lostTimer <= 0) {
        en.state = 'patrol';
        en.baseAngle = en.angle;
      }
      break;
    }
  }

  return { lit, partial };
}

function updateTower(t: TowerEnemy, dt: number): void {
  t.angle += t.sweepSpeed * dt * 0.45;
}

function updateDrone(d: DroneEnemy, dt: number): void {
  const nextIdx = (d.pathIndex + 1) % d.waypoints.length;
  const from = d.waypoints[d.pathIndex];
  const to = d.waypoints[nextIdx];
  d.pathT += (d.speed * dt) / Math.max(1, Math.hypot(to.x - from.x, to.y - from.y));
  if (d.pathT >= 1) {
    d.pathT = 0;
    d.pathIndex = nextIdx;
  }
  const t = d.pathT;
  d.x = from.x + (to.x - from.x) * t;
  d.y = from.y + (to.y - from.y) * t;
}

export function updateGame(
  snap: GameSnapshot,
  input: InputState,
  dt: number,
  w: number,
  h: number,
): { caught: boolean; levelComplete: boolean } {
  if (snap.phase !== 'playing') return { caught: false, levelComplete: false };

  snap.elapsed += dt;

  const char = getCharacterById(snap.player.characterId);
  const speedMul = char?.speedMultiplier ?? 1;
  const cloakMul = char?.cloakCooldownMultiplier ?? 1;

  if (snap.cloak.active) {
    snap.cloak.timer -= dt;
    if (snap.cloak.timer <= 0) {
      snap.cloak.active = false;
      snap.cloak.cooldown = snap.cloak.cooldownMax * cloakMul;
    }
  } else if (snap.cloak.cooldown > 0) {
    snap.cloak.cooldown -= dt;
  }

  let mx = input.moveX;
  let my = input.moveY;
  const len = Math.hypot(mx, my);
  if (len > 0.05) {
    mx /= len;
    my /= len;
    snap.player.angle = Math.atan2(my, mx);
    const nx = snap.player.x + mx * snap.player.speed * speedMul * dt;
    const ny = snap.player.y + my * snap.player.speed * speedMul * dt;
    const moved = moveWithObstacles(
      snap.player.x, snap.player.y, nx, ny, snap.player.r, w, h, snap.layout.obstacles,
    );
    snap.player.x = moved.x;
    snap.player.y = moved.y;
  }

  let lit = false;
  let partialOnly = false;

  for (const en of snap.layout.enemies) {
    if (en.kind === 'agent') {
      const r = updateAgent(en, dt, snap.player, snap.layout.obstacles, snap.cloak.active, w, h);
      if (r.lit && !r.partial) lit = true;
      if (r.partial) partialOnly = true;
    } else if (en.kind === 'tower') {
      updateTower(en, dt);
      if (!snap.cloak.active &&
        hasLineOfSight(en.x, en.y, snap.player.x, snap.player.y, snap.layout.obstacles) &&
        pointInCone(en.x, en.y, en.angle, en.coneAngle, en.range, snap.player.x, snap.player.y).inside) {
        lit = true;
      }
    } else if (en.kind === 'drone') {
      updateDrone(en, dt);
      if (!snap.cloak.active && pointInCircleLight(en.x, en.y, en.lightRadius, snap.player.x, snap.player.y)) {
        lit = true;
      }
    }
  }

  if (lit) {
    snap.exposure = Math.min(EXPOSURE_MAX, snap.exposure + EXPOSURE_RATE * dt);
  } else if (partialOnly) {
    snap.exposure = Math.min(EXPOSURE_MAX, snap.exposure + EXPOSURE_PARTIAL_RATE * dt);
  } else {
    snap.exposure = Math.max(0, snap.exposure - EXPOSURE_DECAY * dt);
  }

  if (snap.exposure >= EXPOSURE_MAX) {
    snap.phase = 'caught';
    return { caught: true, levelComplete: false };
  }

  const dP = Math.hypot(snap.player.x - snap.layout.portal.x, snap.player.y - snap.layout.portal.y);
  if (dP < snap.layout.portal.r + snap.player.r - 6) {
    return { caught: false, levelComplete: true };
  }

  const env = getEnvironmentForLevel(snap.level);
  for (const p of snap.particles) {
    p.y -= (p.spd * dt) / h;
    if (p.y < -0.02) {
      p.y = 1.02;
      p.x = Math.random();
    }
    if (env.particleKind === 'rain') p.x += Math.sin(snap.elapsed * 2 + p.r) * 0.0008;
  }

  return { caught: false, levelComplete: false };
}

export function activateCloak(snap: GameSnapshot): void {
  if (snap.phase !== 'playing' || snap.cloak.active || snap.cloak.cooldown > 0) return;
  snap.cloak.active = true;
  snap.cloak.timer = snap.cloak.duration;
}

export function createParticles(kind: Particle['kind'], count = 28): Particle[] {
  return Array.from({ length: count }, () => ({
    x: Math.random(),
    y: Math.random(),
    r: 1 + Math.random() * 2.5,
    spd: 6 + Math.random() * 14,
    kind,
  }));
}

function drawCone(
  ctx: CanvasRenderingContext2D,
  ex: number, ey: number, angle: number, half: number, range: number,
  danger: boolean, narrow = false,
): void {
  const effectiveHalf = narrow ? half * 0.72 : half;
  const grad = ctx.createRadialGradient(ex, ey, 4, ex, ey, range);
  grad.addColorStop(0, danger ? 'rgba(255,90,60,0.55)' : 'rgba(255,209,102,0.38)');
  grad.addColorStop(1, 'rgba(255,90,60,0)');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.moveTo(ex, ey);
  ctx.arc(ex, ey, range, angle - effectiveHalf, angle + effectiveHalf);
  ctx.closePath();
  ctx.fill();
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export function renderGame(
  ctx: CanvasRenderingContext2D,
  snap: GameSnapshot,
  assets: DepthWatchAssets,
  w: number,
  h: number,
): void {
  const env = getEnvironmentForLevel(snap.level);
  const bg = assets.backgrounds[env.id];

  ctx.clearRect(0, 0, w, h);

  if (bg) {
    ctx.drawImage(bg, 0, 0, w, h);
    ctx.fillStyle = env.ambientTint;
    ctx.fillRect(0, 0, w, h);
  } else {
    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, '#0d5f7a');
    grad.addColorStop(0.45, '#0B4F6C');
    grad.addColorStop(1, '#052832');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);
  }

  if (env.visibilityModifier < 1) {
    ctx.fillStyle = `rgba(0,0,0,${1 - env.visibilityModifier})`;
    ctx.fillRect(0, 0, w, h);
  }

  ctx.fillStyle = env.particleKind === 'dust' ? 'rgba(244,228,193,0.28)' : 'rgba(180,200,220,0.22)';
  for (const p of snap.particles) {
    ctx.beginPath();
    ctx.arc(p.x * w, p.y * h, p.r, 0, Math.PI * 2);
    ctx.fill();
  }

  const pulse = 4 * Math.sin(snap.elapsed * 3);
  const { portal } = snap.layout;
  ctx.beginPath();
  ctx.arc(portal.x, portal.y, portal.r + pulse, 0, Math.PI * 2);
  const pg = ctx.createRadialGradient(portal.x, portal.y, 4, portal.x, portal.y, portal.r + pulse + 10);
  pg.addColorStop(0, 'rgba(127,231,196,0.95)');
  pg.addColorStop(1, 'rgba(127,231,196,0)');
  ctx.fillStyle = pg;
  ctx.fill();
  ctx.beginPath();
  ctx.arc(portal.x, portal.y, 10, 0, Math.PI * 2);
  ctx.fillStyle = '#7FE7C4';
  ctx.fill();

  for (const o of snap.layout.obstacles) {
    ctx.fillStyle = snap.layout.tierId.startsWith('tier2') ? '#1a2838' : '#0a3f4d';
    roundRect(ctx, o.x, o.y, o.w, o.h, 8);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,123,84,0.35)';
    ctx.lineWidth = 2;
    roundRect(ctx, o.x, o.y, o.w, o.h, 8);
    ctx.stroke();
  }

  for (const en of snap.layout.enemies) {
    if (en.kind === 'drone') {
      ctx.beginPath();
      ctx.arc(en.x, en.y, en.lightRadius, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255,200,80,0.22)';
      ctx.fill();
    } else if (en.kind === 'tower') {
      drawCone(ctx, en.x, en.y, en.angle, en.coneAngle, en.range, false);
    } else {
      const danger = en.state === 'chase';
      const narrow = en.state === 'alert';
      drawCone(ctx, en.x, en.y, en.angle, en.coneAngle, en.range, danger, narrow);
    }
  }

  for (const en of snap.layout.enemies) {
    if (en.kind === 'agent') {
      const sprite = en.state === 'chase' ? assets.agents.chase
        : en.state === 'alert' ? assets.agents.alert
        : assets.agents.patrol;
      drawSpriteOrFallback(ctx, sprite, en.x, en.y, 48, en.angle, en.state === 'chase' ? '#FF7B54' : '#1b6e85', 'W');
    } else if (en.kind === 'tower') {
      drawSpriteOrFallback(ctx, assets.agents.tower, en.x, en.y, 56, en.angle, '#2a5570', 'T');
    } else {
      drawSpriteOrFallback(ctx, assets.agents.drone, en.x, en.y - 20, 44, 0, '#4a90b8', 'D');
    }
  }

  const playerImg = assets.characters[snap.player.characterId] ?? null;
  ctx.save();
  ctx.translate(snap.player.x, snap.player.y);
  ctx.globalAlpha = snap.cloak.active ? 0.45 : 1;
  drawSpriteOrFallback(
    ctx, playerImg, 0, 0, snap.player.r * 3.2, snap.player.angle,
    snap.cloak.active ? 'rgba(79,216,235,0.85)' : '#7FE7C4',
  );
  if (snap.cloak.active) {
    ctx.beginPath();
    ctx.arc(0, 0, snap.player.r + 8, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(79,216,235,0.65)';
    ctx.lineWidth = 2;
    ctx.stroke();
  }
  ctx.restore();
}

export function createPlayer(characterId: string, start: { x: number; y: number }): PlayerEntity {
  return {
    x: start.x,
    y: start.y,
    r: 14,
    speed: 150,
    angle: -Math.PI / 2,
    characterId,
  };
}

export function createCloak(level: number): CloakState {
  return {
    active: false,
    timer: 0,
    duration: 2.6,
    cooldown: 0,
    cooldownMax: cloakCooldownForLevel(level),
  };
}
