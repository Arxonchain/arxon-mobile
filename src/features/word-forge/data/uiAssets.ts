import discoveryBg from '@/assets/word-forge/ui/discovery-bg.png';
import arxCoin from '@/assets/word-forge/ui/arx-coin-3d.png';
import arxCoinStack from '@/assets/word-forge/ui/arx-coin-stack-clean.png';
import forgeLogo from '@/assets/word-forge/ui/forge-logo.png';
import treasureBg from '@/assets/word-forge/ui/treasure-bg.png';
import dashboardBanner from '@/assets/word-forge/ui/dashboard-banner.png';
import leaderboardKing from '@/assets/word-forge/ui/leaderboard-king.png';
import bannerWordForge from '@/assets/word-forge/ui/banner-word-forge-clean.png';
import bannerTasks from '@/assets/word-forge/ui/banner-tasks-clean.png';
import bannerArena from '@/assets/word-forge/ui/banner-arena-clean.png';

export const FORGE_UI = {
  discoveryBg,
  arxCoin,
  arxCoinStack,
  forgeLogo,
  treasureBg,
  dashboardBanner,
  leaderboardKing,
  bannerWordForge,
  bannerTasks,
  bannerArena,
} as const;

export interface LevelTileSkin {
  id: string;
  letterColor: string;
  glow: string;
  accent: string;
  label: string;
  unlockLevel: number;
}

export const LEVEL_TILE_SKINS: LevelTileSkin[] = [
  { id: 'hex', letterColor: '#e8fcff', glow: 'rgba(127,231,196,0.65)', accent: '#7FE7C4', label: 'Hex Forge', unlockLevel: 1 },
  { id: 'diamond', letterColor: '#f0fcff', glow: 'rgba(79,216,235,0.7)', accent: '#4FD8EB', label: 'Crystal Cut', unlockLevel: 1 },
  { id: 'banner', letterColor: '#fff8e8', glow: 'rgba(255,217,61,0.55)', accent: '#ffd93d', label: 'Vault Seal', unlockLevel: 5 },
  { id: 'scallop', letterColor: '#e8fff8', glow: 'rgba(127,231,196,0.5)', accent: '#5eead4', label: 'Node Badge', unlockLevel: 10 },
  { id: 'splash', letterColor: '#f0ffe8', glow: 'rgba(160,255,140,0.45)', accent: '#86efac', label: 'Flux Mark', unlockLevel: 15 },
];

export function tileSkinForLevel(level: number, unlockedSkins = 5): LevelTileSkin {
  const available = LEVEL_TILE_SKINS.filter((_, i) => i < unlockedSkins);
  return available[(Math.max(1, level) - 1) % available.length] ?? LEVEL_TILE_SKINS[0];
}

