export type TileTextureId =
  | 'wood'
  | 'ice'
  | 'water'
  | 'stone'
  | 'metal'
  | 'lava'
  | 'crystal'
  | 'moss'
  | 'sand';

export type TileShapeId = 'rounded' | 'hex' | 'shield' | 'diamond' | 'octagon';

export interface TileTexture {
  id: TileTextureId;
  label: string;
  background: string;
  border: string;
  innerGlow: string;
  letterShadow: string;
  animated?: boolean;
}

export const TILE_TEXTURES: TileTexture[] = [
  {
    id: 'wood',
    label: 'Oak',
    background: `linear-gradient(145deg, #6b4423 0%, #8b5a2b 35%, #5c3d1e 70%, #3e2812 100%),
      repeating-linear-gradient(90deg, transparent, transparent 6px, rgba(0,0,0,0.08) 6px, rgba(0,0,0,0.08) 8px)`,
    border: 'rgba(210, 160, 90, 0.65)',
    innerGlow: 'inset 0 2px 8px rgba(255,220,160,0.25), inset 0 -4px 10px rgba(0,0,0,0.35)',
    letterShadow: '0 1px 2px rgba(0,0,0,0.8)',
  },
  {
    id: 'ice',
    label: 'Ice',
    background: `linear-gradient(160deg, #e8f8ff 0%, #9dd4f0 40%, #5eb8e8 75%, #2a7aaa 100%)`,
    border: 'rgba(220, 245, 255, 0.75)',
    innerGlow: 'inset 0 0 14px rgba(255,255,255,0.55), inset 0 -3px 8px rgba(30,100,160,0.3)',
    letterShadow: '0 1px 3px rgba(20,60,100,0.6)',
  },
  {
    id: 'water',
    label: 'Water',
    background: `linear-gradient(180deg, #1e6fa8 0%, #2d8fc4 45%, #0e4d7a 100%)`,
    border: 'rgba(120, 210, 255, 0.6)',
    innerGlow: 'inset 0 4px 12px rgba(180,240,255,0.35)',
    letterShadow: '0 1px 2px rgba(0,40,80,0.8)',
    animated: true,
  },
  {
    id: 'stone',
    label: 'Stone Wall',
    background: `linear-gradient(145deg, #5a5a5a, #3d3d3d),
      repeating-linear-gradient(0deg, transparent, transparent 10px, rgba(0,0,0,0.15) 10px, rgba(0,0,0,0.15) 12px),
      repeating-linear-gradient(90deg, transparent, transparent 18px, rgba(0,0,0,0.12) 18px, rgba(0,0,0,0.12) 20px)`,
    border: 'rgba(180, 180, 180, 0.45)',
    innerGlow: 'inset 0 2px 6px rgba(255,255,255,0.12), inset 0 -4px 8px rgba(0,0,0,0.4)',
    letterShadow: '0 1px 2px rgba(0,0,0,0.9)',
  },
  {
    id: 'metal',
    label: 'Steel',
    background: `linear-gradient(145deg, #e8ecef 0%, #9aa5b1 40%, #5c6670 80%, #3a4249 100%)`,
    border: 'rgba(200, 220, 235, 0.55)',
    innerGlow: 'inset 0 2px 10px rgba(255,255,255,0.4), inset 0 -3px 8px rgba(0,0,0,0.35)',
    letterShadow: '0 1px 2px rgba(0,0,0,0.7)',
  },
  {
    id: 'lava',
    label: 'Lava',
    background: `linear-gradient(160deg, #ff6b20 0%, #e83a10 50%, #8a1a00 100%)`,
    border: 'rgba(255, 180, 80, 0.7)',
    innerGlow: 'inset 0 0 16px rgba(255,200,80,0.45)',
    letterShadow: '0 1px 3px rgba(60,0,0,0.8)',
    animated: true,
  },
  {
    id: 'crystal',
    label: 'Crystal',
    background: `linear-gradient(135deg, #f0e6ff 0%, #c084fc 35%, #7c3aed 70%, #4c1d95 100%)`,
    border: 'rgba(220, 180, 255, 0.65)',
    innerGlow: 'inset 0 0 18px rgba(255,220,255,0.4)',
    letterShadow: '0 1px 3px rgba(40,0,80,0.7)',
  },
  {
    id: 'moss',
    label: 'Moss',
    background: `linear-gradient(145deg, #4a7c3f 0%, #2d5a28 50%, #1a3a18 100%),
      radial-gradient(circle at 30% 30%, rgba(120,200,90,0.3) 0%, transparent 50%)`,
    border: 'rgba(140, 200, 110, 0.5)',
    innerGlow: 'inset 0 2px 8px rgba(180,255,140,0.2)',
    letterShadow: '0 1px 2px rgba(0,30,0,0.8)',
  },
  {
    id: 'sand',
    label: 'Sand',
    background: `linear-gradient(160deg, #f5deb3 0%, #d4a76a 50%, #a67c3a 100%)`,
    border: 'rgba(240, 210, 150, 0.6)',
    innerGlow: 'inset 0 2px 6px rgba(255,240,200,0.35)',
    letterShadow: '0 1px 2px rgba(80,50,10,0.6)',
  },
];

export const TILE_SHAPES: Record<TileShapeId, string> = {
  rounded: '18%',
  hex: 'polygon(25% 5%, 75% 5%, 95% 50%, 75% 95%, 25% 95%, 5% 50%)',
  shield: 'polygon(50% 0%, 95% 15%, 95% 60%, 50% 100%, 5% 60%, 5% 15%)',
  diamond: 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)',
  octagon: 'polygon(30% 0%, 70% 0%, 100% 30%, 100% 70%, 70% 100%, 30% 100%, 0% 70%, 0% 30%)',
};

const TEXTURE_MAP = new Map(TILE_TEXTURES.map((t) => [t.id, t]));

export function getTileTexture(id: TileTextureId): TileTexture {
  return TEXTURE_MAP.get(id) ?? TILE_TEXTURES[0];
}

export function textureForSeed(rng: () => number): TileTextureId {
  const ids = TILE_TEXTURES.map((t) => t.id);
  return ids[Math.floor(rng() * ids.length)];
}

export function shapeForIndex(index: number, poolSize: number): TileShapeId {
  const shapes: TileShapeId[] = ['rounded', 'hex', 'shield', 'diamond', 'octagon'];
  if (poolSize <= 7) return shapes[index % 3];
  return shapes[index % shapes.length];
}
