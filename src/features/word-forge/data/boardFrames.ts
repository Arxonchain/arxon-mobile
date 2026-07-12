import type { ThemeSkin } from './themes';
import type { TileTextureId } from './tileTextures';

export interface ArenaFrame {
  id: string;
  label: string;
  textureId: TileTextureId;
  /** SVG path in 0–100 viewBox coords */
  path: string;
  fillOpacity: number;
}

const BIOME_ARENAS: Record<ThemeSkin['biome'], ArenaFrame[]> = {
  rock: [
    { id: 'star-stone', label: 'Stone Bastion', textureId: 'stone', path: 'M50,2 L61,38 L98,38 L68,60 L79,96 L50,74 L21,96 L32,60 L2,38 L39,38 Z', fillOpacity: 0.38 },
    { id: 'moss-grove', label: 'Moss Grove', textureId: 'moss', path: 'M8,60 Q25,15 50,35 Q75,15 92,60 Q75,88 50,92 Q25,88 8,60 Z', fillOpacity: 0.4 },
  ],
  wood: [
    { id: 'hex-wood', label: 'Timber Hex', textureId: 'wood', path: 'M50,5 L88,27.5 L88,72.5 L50,95 L12,72.5 L12,27.5 Z', fillOpacity: 0.4 },
    { id: 'moss-grove', label: 'Forest Ring', textureId: 'moss', path: 'M8,60 Q25,15 50,35 Q75,15 92,60 Q75,88 50,92 Q25,88 8,60 Z', fillOpacity: 0.4 },
  ],
  ancient: [
    { id: 'crystal-cave', label: 'Ancient Seal', textureId: 'sand', path: 'M50,5 L75,40 L95,55 L65,95 L35,95 L5,55 L25,40 Z', fillOpacity: 0.32 },
    { id: 'star-stone', label: 'Ruined Bastion', textureId: 'stone', path: 'M50,2 L61,38 L98,38 L68,60 L79,96 L50,74 L21,96 L32,60 L2,38 L39,38 Z', fillOpacity: 0.35 },
  ],
  city: [
    { id: 'metal-grid', label: 'Steel Grid', textureId: 'metal', path: 'M12,12 H88 V88 H12 Z M12,50 H88 M50,12 V88', fillOpacity: 0.28 },
    { id: 'ring-ice', label: 'Neon Ring', textureId: 'crystal', path: 'M50,8 A42,42 0 1,1 49.9,8 Z M50,22 A28,28 0 1,0 50.1,22 Z', fillOpacity: 0.35 },
  ],
};

export const ARENA_FRAMES: ArenaFrame[] = Object.values(BIOME_ARENAS).flat();

export function arenaForLevel(rng: () => number, theme: ThemeSkin): ArenaFrame {
  const pool = BIOME_ARENAS[theme.biome];
  return pool[Math.floor(rng() * pool.length)];
}
