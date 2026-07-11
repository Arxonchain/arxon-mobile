import type { TileTextureId } from './tileTextures';

export interface ArenaFrame {
  id: string;
  label: string;
  textureId: TileTextureId;
  /** SVG path in 0–100 viewBox coords */
  path: string;
  fillOpacity: number;
}

export const ARENA_FRAMES: ArenaFrame[] = [
  {
    id: 'ring-ice',
    label: 'Frozen Ring',
    textureId: 'ice',
    path: 'M50,8 A42,42 0 1,1 49.9,8 Z M50,22 A28,28 0 1,0 50.1,22 Z',
    fillOpacity: 0.35,
  },
  {
    id: 'hex-wood',
    label: 'Timber Hex',
    textureId: 'wood',
    path: 'M50,5 L88,27.5 L88,72.5 L50,95 L12,72.5 L12,27.5 Z',
    fillOpacity: 0.4,
  },
  {
    id: 'star-stone',
    label: 'Stone Bastion',
    textureId: 'stone',
    path: 'M50,2 L61,38 L98,38 L68,60 L79,96 L50,74 L21,96 L32,60 L2,38 L39,38 Z',
    fillOpacity: 0.38,
  },
  {
    id: 'pool-water',
    label: 'Tidal Pool',
    textureId: 'water',
    path: 'M10,50 Q30,20 50,50 T90,50 Q70,80 50,50 T10,50 Z',
    fillOpacity: 0.42,
  },
  {
    id: 'forge-lava',
    label: 'Molten Crucible',
    textureId: 'lava',
    path: 'M15,75 Q50,10 85,75 L75,90 Q50,70 25,90 Z',
    fillOpacity: 0.45,
  },
  {
    id: 'crystal-cave',
    label: 'Crystal Cave',
    textureId: 'crystal',
    path: 'M50,5 L75,40 L95,55 L65,95 L35,95 L5,55 L25,40 Z',
    fillOpacity: 0.32,
  },
  {
    id: 'moss-grove',
    label: 'Moss Grove',
    textureId: 'moss',
    path: 'M8,60 Q25,15 50,35 Q75,15 92,60 Q75,88 50,92 Q25,88 8,60 Z',
    fillOpacity: 0.4,
  },
  {
    id: 'metal-grid',
    label: 'Steel Grid',
    textureId: 'metal',
    path: 'M12,12 H88 V88 H12 Z M12,50 H88 M50,12 V88',
    fillOpacity: 0.28,
  },
];

export function arenaForLevel(rng: () => number): ArenaFrame {
  return ARENA_FRAMES[Math.floor(rng() * ARENA_FRAMES.length)];
}
