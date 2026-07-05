import patrolSprite from '@/assets/depth-watch/agents/agent_patrol_flashlight_RAW.png';
import alertSprite from '@/assets/depth-watch/agents/agent_alert_cutlass_RAW.png';
import chaseSprite from '@/assets/depth-watch/agents/agent_chase_headlamp_RAW.png';
import towerSprite from '@/assets/depth-watch/agents/agent_tower_security_RAW.png';
import droneSprite from '@/assets/depth-watch/agents/agent_drone_RAW.png';

import { DEPTH_WATCH_CHARACTERS } from '../data/characters';

const warned = new Set<string>();

function loadImage(src: string, key: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => {
      if (!warned.has(key)) {
        console.warn(`[DepthWatch] Missing or failed asset: ${key} (${src})`);
        warned.add(key);
      }
      resolve(null);
    };
    img.src = src;
  });
}

export interface DepthWatchAssets {
  agents: {
    patrol: HTMLImageElement | null;
    alert: HTMLImageElement | null;
    chase: HTMLImageElement | null;
    tower: HTMLImageElement | null;
    drone: HTMLImageElement | null;
  };
  characters: Record<string, HTMLImageElement | null>;
  backgrounds: Record<string, HTMLImageElement | null>;
}

let cache: DepthWatchAssets | null = null;

export async function loadDepthWatchAssets(
  backgroundSrcs: Record<string, string>,
): Promise<DepthWatchAssets> {
  if (cache) return cache;

  const [patrol, alert, chase, tower, drone] = await Promise.all([
    loadImage(patrolSprite, 'agent_patrol'),
    loadImage(alertSprite, 'agent_alert'),
    loadImage(chaseSprite, 'agent_chase'),
    loadImage(towerSprite, 'agent_tower'),
    loadImage(droneSprite, 'agent_drone'),
  ]);

  const characters: Record<string, HTMLImageElement | null> = {};
  await Promise.all(
    DEPTH_WATCH_CHARACTERS.map(async (c) => {
      characters[c.id] = await loadImage(c.spriteSrc, `player_${c.id}`);
    }),
  );

  const backgrounds: Record<string, HTMLImageElement | null> = {};
  await Promise.all(
    Object.entries(backgroundSrcs).map(async ([id, src]) => {
      backgrounds[id] = await loadImage(src, `bg_${id}`);
    }),
  );

  cache = { agents: { patrol, alert, chase, tower, drone }, characters, backgrounds };
  return cache;
}

export function drawSpriteOrFallback(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement | null,
  x: number,
  y: number,
  size: number,
  angle: number,
  fallbackColor: string,
  label?: string,
): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle + Math.PI / 2);
  if (img) {
    ctx.drawImage(img, -size / 2, -size / 2, size, size);
  } else {
    ctx.beginPath();
    ctx.arc(0, 0, size * 0.35, 0, Math.PI * 2);
    ctx.fillStyle = fallbackColor;
    ctx.fill();
    ctx.strokeStyle = 'rgba(244,228,193,0.5)';
    ctx.lineWidth = 2;
    ctx.stroke();
    if (label) {
      ctx.fillStyle = '#F4E4C1';
      ctx.font = 'bold 8px system-ui,sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(label, 0, 3);
    }
  }
  ctx.restore();
}
