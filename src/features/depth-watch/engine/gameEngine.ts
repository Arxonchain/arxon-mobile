import type {
  BaseAgent, CloakState, DroneEnemy, EnemyEntity, InputState, LevelLayout,
  Particle, PlayerEntity, TowerEnemy,
} from './types';
import type { DepthWatchAssets } from './assetLoader';
import { drawGroundedAgent, drawGroundedCharacter } from './characterRender';
import { coverBlocksSight, updateCoverState } from './coverSystem';
import {
  ALERT_DURATION, EXPOSURE_DECAY, EXPOSURE_MAX, EXPOSURE_PARTIAL_RATE, EXPOSURE_RATE,
  LOST_SIGHT_DURATION, PARTIAL_EDGE_RATIO, RUN_EXPOSURE_MUL, cloakCooldownForLevel,
} from './constants';
import {
  angleDiff, hasLineOfSight, moveWithObstacles, normalizeAngle,
  pointInCircleLight, pointInCone,
} from './collision';
import { getCharacterById } from '../data/characters';
import { getEnvironmentForLevel } from './environments';
import {
  constrainToCorridor, resolveMovementSpeed, updateCamera, worldToScreen,
} from './worldCamera';

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
  cameraY: number;
}

function updateAgent(
  en: BaseAgent, dt: number,
  player: PlayerEntity, obstacles: LevelLayout['obstacles'],
  cloakActive: boolean, worldW: number, worldH: number,
): { lit: boolean; partial: boolean } {
  let lit = false;
  let partial = false;

  if (player.hiding && coverBlocksSight(player, en.x, en.y)) {
    return { lit: false, partial: false };
  }

  const dx = player.x - en.x;
  const dy = player.y - en.y;
  const angTo = Math.atan2(dy, dx);
  const los = hasLineOfSight(en.x, en.y, player.x, player.y, obstacles);
  const cone = pointInCone(en.x, en.y, en.angle, en.coneAngle, en.range, player.x, player.y);
  const canDetect = !cloakActive && !player.hiding && los && cone.inside;

  if (canDetect) {
    if (cone.partial || cone.angDiff > en.coneAngle * PARTIAL_EDGE_RATIO) {
      en.state = 'alert';
      en.alertTimer = ALERT_DURATION;
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
      en.angle += en.sweepSpeed * dt * 0.45;
      en.facingRight = Math.cos(en.angle) >= 0;
      break;
    case 'alert':
      en.alertTimer -= dt;
      en.angle = normalizeAngle(angTo);
      en.facingRight = dx >= 0;
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
      en.facingRight = tx >= en.x;
      en.x += Math.cos(chaseAng) * en.speed * dt;
      en.y += Math.sin(chaseAng) * en.speed * dt;
      en.x = Math.max(24, Math.min(worldW - 24, en.x));
      en.y = Math.max(24, Math.min(worldH - 24, en.y));
      if (!canDetect && en.lostTimer <= 0) en.state = 'patrol';
      break;
    }
  }

  return { lit, partial };
}

function updateTower(t: TowerEnemy, dt: number): void {
  t.angle += t.sweepSpeed * dt * 0.4;
}

function updateDrone(d: DroneEnemy, dt: number): void {
  const nextIdx = (d.pathIndex + 1) % d.waypoints.length;
  const from = d.waypoints[d.pathIndex];
  const to = d.waypoints[nextIdx];
  const dist = Math.max(1, Math.hypot(to.x - from.x, to.y - from.y));
  d.pathT += (d.speed * dt) / dist;
  if (d.pathT >= 1) {
    d.pathT = 0;
    d.pathIndex = nextIdx;
  }
  d.x = from.x + (to.x - from.x) * d.pathT;
  d.y = from.y + (to.y - from.y) * d.pathT;
}

export function updateGame(
  snap: GameSnapshot,
  input: InputState,
  dt: number,
  viewW: number,
  viewH: number,
): { caught: boolean; levelComplete: boolean } {
  if (snap.phase !== 'playing') return { caught: false, levelComplete: false };

  snap.elapsed += dt;
  const { layout } = snap;
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

  const moveMag = Math.min(1, Math.hypot(input.moveX, input.moveY));
  snap.player.moveMag = moveMag;
  snap.player.moving = moveMag > 0.08;

  if (snap.player.moving) {
    const { speed, running } = resolveMovementSpeed(
      moveMag,
      snap.player.walkSpeed * speedMul,
      snap.player.runSpeed * speedMul,
    );
    snap.player.running = running;
    if (input.moveX !== 0) snap.player.facingRight = input.moveX >= 0;

    if (!snap.player.hiding) {
      let mx = input.moveX / (moveMag || 1);
      let my = input.moveY / (moveMag || 1);
      const nx = snap.player.x + mx * speed * dt;
      const ny = snap.player.y + my * speed * dt;
      const moved = moveWithObstacles(
        snap.player.x, snap.player.y, nx, ny, snap.player.r,
        layout.worldWidth, layout.worldHeight, layout.obstacles,
      );
      const corridor = constrainToCorridor(moved.x, moved.y, layout.segments);
      snap.player.x = corridor.x;
      snap.player.y = corridor.y;
    }
    updateCoverState(snap.player, layout.obstacles, input);
  } else {
    snap.player.running = false;
    snap.player.hiding = false;
    snap.player.coverRef = null;
    snap.player.hideSide = null;
  }

  snap.cameraY = updateCamera(snap.player.y, viewH, layout.worldHeight);

  let lit = false;
  let partialOnly = false;
  const exposureMul = snap.player.running ? RUN_EXPOSURE_MUL : 1;

  for (const en of layout.enemies) {
    if (en.kind === 'agent') {
      const r = updateAgent(
        en, dt, snap.player, layout.obstacles, snap.cloak.active,
        layout.worldWidth, layout.worldHeight,
      );
      if (r.lit && !r.partial) lit = true;
      if (r.partial) partialOnly = true;
    } else if (en.kind === 'tower') {
      updateTower(en, dt);
      if (!snap.cloak.active && !snap.player.hiding &&
        hasLineOfSight(en.x, en.y, snap.player.x, snap.player.y, layout.obstacles) &&
        pointInCone(en.x, en.y, en.angle, en.coneAngle, en.range, snap.player.x, snap.player.y).inside) {
        lit = true;
      }
    } else if (en.kind === 'drone') {
      updateDrone(en, dt);
      if (!snap.cloak.active && !snap.player.hiding &&
        pointInCircleLight(en.x, en.y, en.lightRadius, snap.player.x, snap.player.y)) {
        lit = true;
      }
    }
  }

  if (snap.player.hiding) {
    snap.exposure = Math.max(0, snap.exposure - EXPOSURE_DECAY * 2 * dt);
  } else if (lit) {
    snap.exposure = Math.min(EXPOSURE_MAX, snap.exposure + EXPOSURE_RATE * exposureMul * dt);
  } else if (partialOnly) {
    snap.exposure = Math.min(EXPOSURE_MAX, snap.exposure + EXPOSURE_PARTIAL_RATE * dt);
  } else {
    snap.exposure = Math.max(0, snap.exposure - EXPOSURE_DECAY * dt);
  }

  if (snap.exposure >= EXPOSURE_MAX) {
    snap.phase = 'caught';
    return { caught: true, levelComplete: false };
  }

  const dP = Math.hypot(snap.player.x - layout.portal.x, snap.player.y - layout.portal.y);
  if (dP < layout.portal.r + snap.player.r - 4) {
    return { caught: false, levelComplete: true };
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

const TIER_PALETTE: Record<string, { road: string; wall: string; curb: string }> = {
  tier1: { road: '#4a5568', wall: '#2d3748', curb: '#718096' },
  tier1b: { road: '#5c4a3a', wall: '#3d2e24', curb: '#8b6914' },
  tier2: { road: '#1a2332', wall: '#0f1419', curb: '#4a5568' },
  tier2b: { road: '#152028', wall: '#0a1018', curb: '#2c5282' },
};

function drawPerspectiveSegment(
  ctx: CanvasRenderingContext2D,
  seg: LevelLayout['segments'][0],
  screenY: number,
  viewW: number,
  segH: number,
  tierId: string,
  bg: HTMLImageElement | null,
): void {
  const pal = TIER_PALETTE[tierId] ?? TIER_PALETTE.tier1;
  const topInset = seg.pathWidth * 0.1;
  const pathL = seg.pathCenterX - seg.pathWidth / 2;
  const pathR = seg.pathCenterX + seg.pathWidth / 2;

  if (bg) {
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, screenY, viewW, segH);
    ctx.clip();
    ctx.globalAlpha = 0.35;
    ctx.drawImage(bg, 0, screenY, viewW, segH);
    ctx.restore();
  }

  ctx.fillStyle = pal.wall;
  ctx.fillRect(0, screenY, pathL + topInset, segH);
  ctx.fillRect(pathR - topInset, screenY, viewW - pathR + topInset, segH);

  const roadGrad = ctx.createLinearGradient(0, screenY, 0, screenY + segH);
  roadGrad.addColorStop(0, pal.road);
  roadGrad.addColorStop(1, '#2d3748');
  ctx.fillStyle = roadGrad;
  ctx.beginPath();
  ctx.moveTo(pathL, screenY + segH);
  ctx.lineTo(pathR, screenY + segH);
  ctx.lineTo(pathR - topInset, screenY);
  ctx.lineTo(pathL + topInset, screenY);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = pal.curb;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(pathL, screenY + segH);
  ctx.lineTo(pathL + topInset, screenY);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(pathR, screenY + segH);
  ctx.lineTo(pathR - topInset, screenY);
  ctx.stroke();
}

function drawCone(
  ctx: CanvasRenderingContext2D,
  ex: number, ey: number, angle: number, half: number, range: number,
  danger: boolean, narrow = false,
): void {
  const effectiveHalf = narrow ? half * 0.72 : half;
  const grad = ctx.createRadialGradient(ex, ey, 4, ex, ey, range);
  grad.addColorStop(0, danger ? 'rgba(255,90,60,0.5)' : 'rgba(255,209,102,0.32)');
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
  viewW: number,
  viewH: number,
): void {
  const env = getEnvironmentForLevel(snap.level);
  const bg = assets.backgrounds[env.id];
  const cam = snap.cameraY;

  ctx.clearRect(0, 0, viewW, viewH);

  const skyGrad = ctx.createLinearGradient(0, 0, 0, viewH);
  skyGrad.addColorStop(0, '#1a2838');
  skyGrad.addColorStop(1, '#0a1018');
  ctx.fillStyle = skyGrad;
  ctx.fillRect(0, 0, viewW, viewH);

  for (const seg of snap.layout.segments) {
    const screenY = seg.worldY - cam;
    if (screenY > viewH + 80 || screenY + seg.height < -80) continue;
    drawPerspectiveSegment(ctx, seg, screenY, viewW, seg.height, snap.layout.tierId, bg);
  }

  if (env.visibilityModifier < 1) {
    ctx.fillStyle = `rgba(0,0,0,${(1 - env.visibilityModifier) * 0.55})`;
    ctx.fillRect(0, 0, viewW, viewH);
  }

  const portal = worldToScreen(snap.layout.portal.x, snap.layout.portal.y, cam);
  const pulse = 4 * Math.sin(snap.elapsed * 3);
  ctx.beginPath();
  ctx.arc(portal.x, portal.y, snap.layout.portal.r + pulse, 0, Math.PI * 2);
  const pg = ctx.createRadialGradient(portal.x, portal.y, 4, portal.x, portal.y, snap.layout.portal.r + pulse + 12);
  pg.addColorStop(0, 'rgba(127,231,196,0.95)');
  pg.addColorStop(1, 'rgba(127,231,196,0)');
  ctx.fillStyle = pg;
  ctx.fill();

  for (const o of snap.layout.obstacles) {
    const s = worldToScreen(o.x, o.y, cam);
    if (s.y > viewH + 60 || s.y + o.h < -60) continue;
    ctx.fillStyle = snap.layout.tierId.startsWith('tier2') ? '#243044' : '#3d4f5c';
    roundRect(ctx, s.x, s.y, o.w, o.h, 8);
    ctx.fill();
    ctx.strokeStyle = o.isCover ? 'rgba(127,231,196,0.35)' : 'rgba(255,123,84,0.3)';
    ctx.lineWidth = 2;
    roundRect(ctx, s.x, s.y, o.w, o.h, 8);
    ctx.stroke();
  }

  for (const en of snap.layout.enemies) {
    const p = worldToScreen(en.x, en.y, cam);
    if (p.y < -120 || p.y > viewH + 120) continue;
    if (en.kind === 'drone') {
      ctx.beginPath();
      ctx.arc(p.x, p.y, en.lightRadius, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255,200,80,0.2)';
      ctx.fill();
    } else if (en.kind !== 'drone') {
      drawCone(ctx, p.x, p.y, en.angle, en.coneAngle, en.range, en.kind === 'agent' && en.state === 'chase');
    }
  }

  for (const en of snap.layout.enemies) {
    const p = worldToScreen(en.x, en.y, cam);
    if (p.y < -120 || p.y > viewH + 120) continue;
    if (en.kind === 'agent') {
      const sprite = en.state === 'chase' ? assets.agents.chase
        : en.state === 'alert' ? assets.agents.alert
        : assets.agents.patrol;
      drawGroundedAgent(ctx, sprite, p.x, p.y, en.facingRight, snap.elapsed, '#1b6e85', 'W');
    } else if (en.kind === 'tower') {
      drawGroundedAgent(ctx, assets.agents.tower, p.x, p.y, true, snap.elapsed, '#2a5570', 'T');
    } else {
      drawGroundedAgent(ctx, assets.agents.drone, p.x, p.y - 16, true, snap.elapsed, '#4a90b8', 'D');
    }
  }

  const pp = worldToScreen(snap.player.x, snap.player.y, cam);
  const playerImg = assets.characters[snap.player.characterId] ?? null;
  drawGroundedCharacter(ctx, playerImg, pp.x, pp.y, {
    facingRight: snap.player.facingRight,
    moving: snap.player.moving,
    running: snap.player.running,
    hiding: snap.player.hiding,
    elapsed: snap.elapsed,
    alpha: snap.cloak.active ? 0.45 : 1,
    inShadow: snap.player.hiding,
  });

  if (snap.cloak.active) {
    ctx.beginPath();
    ctx.arc(pp.x, pp.y - 20, 28, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(79,216,235,0.55)';
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  if (snap.player.hiding) {
    ctx.fillStyle = 'rgba(127,231,196,0.85)';
    ctx.font = 'bold 10px system-ui,sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('IN COVER', pp.x, pp.y - 52);
  }
}

export function createPlayer(characterId: string, start: { x: number; y: number }): PlayerEntity {
  return {
    x: start.x,
    y: start.y,
    r: 12,
    walkSpeed: 130,
    runSpeed: 225,
    facingRight: true,
    moving: false,
    running: false,
    hiding: false,
    hideSide: null,
    coverRef: null,
    moveMag: 0,
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

export function initSnapshot(
  level: number,
  layout: LevelLayout,
  characterId: string,
  viewH: number,
): GameSnapshot {
  const env = getEnvironmentForLevel(level);
  return {
    level,
    elapsed: 0,
    exposure: 0,
    cloak: createCloak(level),
    player: createPlayer(characterId, layout.playerStart),
    layout,
    particles: createParticles(env.particleKind),
    phase: 'playing',
    transitionTimer: 0,
    cameraY: updateCamera(layout.playerStart.y, viewH, layout.worldHeight),
  };
}
