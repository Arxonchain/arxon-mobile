import type { TileTextureId } from './tileTextures';

export interface ThemeSkin {
  id: string;
  label: string;
  biome: 'rock' | 'wood' | 'ancient' | 'city';
  bg: string;
  bgGradient: string;
  tileBg: string;
  tileBorder: string;
  tileText: string;
  tileGlow: string;
  accent: string;
  accentMuted: string;
  particle: string;
  fontFamily: string;
  /** Primary tile + arena texture for this biome */
  textureId: TileTextureId;
}

export const BIOME_THEMES: ThemeSkin[] = [
  {
    id: 'rock-canyon',
    label: 'Rock Canyon',
    biome: 'rock',
    bg: '#1a1410',
    bgGradient: 'radial-gradient(ellipse at 50% 20%, #4a3a32 0%, #1a1410 55%)',
    tileBg: 'linear-gradient(145deg, #8a8078 0%, #6a6560 40%, #4a4540 100%)',
    tileBorder: 'rgba(200, 190, 180, 0.55)',
    tileText: '#1a1410',
    tileGlow: '0 0 14px rgba(180, 170, 160, 0.25)',
    accent: '#d4c4b0',
    accentMuted: '#a89888',
    particle: 'rgba(180, 160, 140, 0.35)',
    fontFamily: "'Creato Display', system-ui, sans-serif",
    textureId: 'stone',
  },
  {
    id: 'timber-grove',
    label: 'Timber Grove',
    biome: 'wood',
    bg: '#1a1208',
    bgGradient: 'radial-gradient(ellipse at 40% 15%, #3d2814 0%, #1a1208 58%)',
    tileBg: 'linear-gradient(145deg, #f5e6c8 0%, #d4a574 45%, #8b5a2b 100%)',
    tileBorder: 'rgba(210, 170, 110, 0.65)',
    tileText: '#3e2812',
    tileGlow: '0 0 12px rgba(210, 180, 140, 0.3)',
    accent: '#d4a574',
    accentMuted: '#b8894a',
    particle: 'rgba(210, 180, 140, 0.35)',
    fontFamily: "'Creato Display', system-ui, sans-serif",
    textureId: 'wood',
  },
  {
    id: 'ancient-vault',
    label: 'Ancient Vault',
    biome: 'ancient',
    bg: '#141008',
    bgGradient: 'radial-gradient(ellipse at 50% 10%, #3a3020 0%, #141008 55%)',
    tileBg: 'linear-gradient(145deg, #e8dcc8 0%, #c4a882 50%, #8b7355 100%)',
    tileBorder: 'rgba(210, 180, 140, 0.55)',
    tileText: '#2a2218',
    tileGlow: '0 0 16px rgba(180, 140, 90, 0.28)',
    accent: '#c9956a',
    accentMuted: '#a67c52',
    particle: 'rgba(210, 180, 140, 0.32)',
    fontFamily: 'Georgia, serif',
    textureId: 'sand',
  },
  {
    id: 'neon-sprawl',
    label: 'Neon Sprawl',
    biome: 'city',
    bg: '#0a0f18',
    bgGradient: 'radial-gradient(ellipse at 50% 0%, #1a1040 0%, #0a0f18 55%)',
    tileBg: 'linear-gradient(145deg, #e8ecef 0%, #9aa5b1 45%, #5c6670 100%)',
    tileBorder: 'rgba(127, 231, 196, 0.5)',
    tileText: '#0a1018',
    tileGlow: '0 0 18px rgba(79, 216, 235, 0.35)',
    accent: '#7FE7C4',
    accentMuted: '#4FD8EB',
    particle: 'rgba(127, 231, 196, 0.5)',
    fontFamily: "'Creato Display', system-ui, sans-serif",
    textureId: 'metal',
  },
];

/** Legacy export for any remaining references */
export const THEMES = BIOME_THEMES;

export function themeForLevel(level: number): ThemeSkin {
  const biomeIndex = Math.floor((level - 1) / 5) % BIOME_THEMES.length;
  return BIOME_THEMES[biomeIndex];
}

export function arenaTextureForTheme(theme: ThemeSkin): TileTextureId {
  return theme.textureId;
}
