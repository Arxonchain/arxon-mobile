import arcadePlay from '@/assets/word-forge/ui/arcade-play.png';
import levelCoin from '@/assets/word-forge/ui/level-coin.png';
import forgeFrameBg from '@/assets/word-forge/ui/forge-frame-bg.png';
import discoveryBg from '@/assets/word-forge/ui/discovery-bg.png';
import arxCoin from '@/assets/word-forge/ui/arx-coin.png';
import tileHex from '@/assets/word-forge/ui/tile-hex.png';
import tileDiamond from '@/assets/word-forge/ui/tile-diamond.png';
import tileBanner from '@/assets/word-forge/ui/tile-banner.png';
import tileScallop from '@/assets/word-forge/ui/tile-scallop.png';
import tileSplash from '@/assets/word-forge/ui/tile-splash.png';

export const FORGE_UI = {
  arcadePlay,
  levelCoin,
  forgeFrameBg,
  discoveryBg,
  arxCoin,
} as const;

export interface LevelTileSkin {
  id: string;
  image: string;
  letterColor: string;
  glow: string;
  label: string;
}

/** Images 4–8 — one skin per level cycle */
export const LEVEL_TILE_SKINS: LevelTileSkin[] = [
  { id: 'hex', image: tileHex, letterColor: '#1e3a22', glow: 'rgba(127,231,196,0.55)', label: 'Hex Forge' },
  { id: 'diamond', image: tileDiamond, letterColor: '#0c1a28', glow: 'rgba(79,216,235,0.6)', label: 'Crystal Cut' },
  { id: 'banner', image: tileBanner, letterColor: '#2a2218', glow: 'rgba(255,217,61,0.5)', label: 'Vault Seal' },
  { id: 'scallop', image: tileScallop, letterColor: '#e8fff8', glow: 'rgba(127,231,196,0.45)', label: 'Node Badge' },
  { id: 'splash', image: tileSplash, letterColor: '#1a3a18', glow: 'rgba(160,255,140,0.4)', label: 'Flux Mark' },
];

export function tileSkinForLevel(level: number): LevelTileSkin {
  return LEVEL_TILE_SKINS[(Math.max(1, level) - 1) % LEVEL_TILE_SKINS.length];
}

/** Alternate play-field backgrounds per biome band */
export function playfieldBgForLevel(level: number): string {
  const band = Math.floor((level - 1) / 5);
  return band % 2 === 0 ? forgeFrameBg : discoveryBg;
}
