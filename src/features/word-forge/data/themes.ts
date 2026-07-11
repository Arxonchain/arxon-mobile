export interface ThemeSkin {
  id: string;
  label: string;
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
}

export const THEMES: ThemeSkin[] = [
  {
    id: 'neon-cipher',
    label: 'Neon Cipher',
    bg: '#0a0f18',
    bgGradient: 'radial-gradient(ellipse at 50% 0%, #1a1040 0%, #0a0f18 55%)',
    tileBg: 'rgba(20, 30, 55, 0.85)',
    tileBorder: 'rgba(127, 231, 196, 0.45)',
    tileText: '#e8fff8',
    tileGlow: '0 0 18px rgba(79, 216, 235, 0.35)',
    accent: '#7FE7C4',
    accentMuted: '#4FD8EB',
    particle: 'rgba(127, 231, 196, 0.6)',
    fontFamily: "'Creato Display', system-ui, sans-serif",
  },
  {
    id: 'parchment',
    label: 'Vintage Parchment',
    bg: '#2a2218',
    bgGradient: 'radial-gradient(ellipse at 40% 20%, #4a3d2a 0%, #2a2218 60%)',
    tileBg: 'rgba(58, 48, 36, 0.9)',
    tileBorder: 'rgba(210, 180, 140, 0.5)',
    tileText: '#f5e6d0',
    tileGlow: '0 0 12px rgba(180, 140, 90, 0.25)',
    accent: '#d4a574',
    accentMuted: '#c9956a',
    particle: 'rgba(210, 180, 140, 0.35)',
    fontFamily: 'Georgia, serif',
  },
  {
    id: 'cosmic-void',
    label: 'Cosmic Void',
    bg: '#0d0820',
    bgGradient: 'radial-gradient(ellipse at 60% 30%, #2d1560 0%, #0d0820 55%)',
    tileBg: 'rgba(35, 20, 65, 0.88)',
    tileBorder: 'rgba(180, 140, 255, 0.4)',
    tileText: '#f0e8ff',
    tileGlow: '0 0 20px rgba(140, 100, 255, 0.4)',
    accent: '#b794f6',
    accentMuted: '#9f7aea',
    particle: 'rgba(180, 140, 255, 0.5)',
    fontFamily: "'Creato Display', system-ui, sans-serif",
  },
  {
    id: 'molten-forge',
    label: 'Molten Forge',
    bg: '#140a08',
    bgGradient: 'radial-gradient(ellipse at 50% 80%, #4a1808 0%, #140a08 55%)',
    tileBg: 'rgba(45, 22, 12, 0.9)',
    tileBorder: 'rgba(255, 140, 60, 0.45)',
    tileText: '#fff0e0',
    tileGlow: '0 0 16px rgba(255, 100, 40, 0.35)',
    accent: '#ff8c3a',
    accentMuted: '#ff6b4a',
    particle: 'rgba(255, 120, 50, 0.45)',
    fontFamily: "'Creato Display', system-ui, sans-serif",
  },
  {
    id: 'arctic-frost',
    label: 'Arctic Frost',
    bg: '#0c1420',
    bgGradient: 'radial-gradient(ellipse at 30% 10%, #1e3a5f 0%, #0c1420 55%)',
    tileBg: 'rgba(22, 40, 58, 0.9)',
    tileBorder: 'rgba(200, 230, 255, 0.45)',
    tileText: '#f0f8ff',
    tileGlow: '0 0 14px rgba(180, 220, 255, 0.35)',
    accent: '#a8d8ff',
    accentMuted: '#7ec8e8',
    particle: 'rgba(200, 230, 255, 0.4)',
    fontFamily: "'Creato Display', system-ui, sans-serif",
  },
];

export function themeForLevel(level: number, rng: () => number): ThemeSkin {
  const unlocked = Math.min(THEMES.length, 1 + Math.floor(level / 8));
  const pool = THEMES.slice(0, unlocked);
  return pool[Math.floor(rng() * pool.length)];
}
