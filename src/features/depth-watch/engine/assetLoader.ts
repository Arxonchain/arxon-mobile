import patrolSprite from '@/assets/depth-watch/agents/agent_patrol_flashlight_RAW.png';
import alertSprite from '@/assets/depth-watch/agents/agent_alert_cutlass_RAW.png';
import chaseSprite from '@/assets/depth-watch/agents/agent_chase_headlamp_RAW.png';
import towerSprite from '@/assets/depth-watch/agents/agent_tower_security_RAW.png';
import droneSprite from '@/assets/depth-watch/agents/agent_drone_RAW.png';

import { DEPTH_WATCH_CHARACTERS } from '../data/characters';
import { loadProcessedSprite } from './spriteProcessing';

const warned = new Set<string>();

export interface DepthWatchAssets {
  agents: {
    patrol: HTMLCanvasElement | null;
    alert: HTMLCanvasElement | null;
    chase: HTMLCanvasElement | null;
    tower: HTMLCanvasElement | null;
    drone: HTMLCanvasElement | null;
  };
  characters: Record<string, HTMLCanvasElement | null>;
  backgrounds: Record<string, HTMLImageElement | null>;
}

let cache: DepthWatchAssets | null = null;

async function loadBg(src: string, key: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => {
      if (!warned.has(key)) {
        console.warn(`[DepthWatch] Missing background: ${key}`);
        warned.add(key);
      }
      resolve(null);
    };
    img.src = src;
  });
}

export async function loadDepthWatchAssets(
  backgroundSrcs: Record<string, string>,
): Promise<DepthWatchAssets> {
  if (cache) return cache;

  const [patrol, alert, chase, tower, drone] = await Promise.all([
    loadProcessedSprite(patrolSprite),
    loadProcessedSprite(alertSprite),
    loadProcessedSprite(chaseSprite),
    loadProcessedSprite(towerSprite),
    loadProcessedSprite(droneSprite),
  ]);

  const characters: Record<string, HTMLCanvasElement | null> = {};
  await Promise.all(
    DEPTH_WATCH_CHARACTERS.map(async (c) => {
      characters[c.id] = await loadProcessedSprite(c.spriteSrc);
    }),
  );

  const backgrounds: Record<string, HTMLImageElement | null> = {};
  await Promise.all(
    Object.entries(backgroundSrcs).map(async ([id, src]) => {
      backgrounds[id] = await loadBg(src, `bg_${id}`);
    }),
  );

  cache = { agents: { patrol, alert, chase, tower, drone }, characters, backgrounds };
  return cache;
}

export function clearAssetCache(): void {
  cache = null;
}
