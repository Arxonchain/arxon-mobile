import type { ReactNode } from 'react';
import { neon } from '@/features/arxon-v2/design/neonTokens';
import { WORD_FORGE_ENABLED } from '@/lib/wordForgeFeature';

export type NavTab = {
  to: string;
  id: string;
  label: string;
  accent: string;
  end?: boolean;
  icon: (active: boolean) => ReactNode;
};

const INACTIVE = 'rgba(232,252,255,0.38)';
const stroke = (active: boolean, accent: string) => (active ? accent : INACTIVE);
const fill = (active: boolean, accent: string) => (active ? `${accent}30` : 'none');

/** Mining-only bottom nav. Wallet and Testnet live in the wallet app, not here. */
export function buildV2NavTabs(basePath = ''): NavTab[] {
  const p = (path: string) => (basePath ? `${basePath}${path === '/' ? '' : path}` : path || '/');

  const home: NavTab = {
    to: p('/mine'),
    id: 'home',
    label: 'Home',
    accent: neon.cyan,
    end: true,
    icon: (a) => (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
        <rect x="3" y="3" width="7" height="7" rx="2" fill={fill(a, neon.cyan)} stroke={stroke(a, neon.cyan)} strokeWidth="1.8" />
        <rect x="14" y="3" width="7" height="7" rx="2" fill={fill(a, neon.cyan)} stroke={stroke(a, neon.cyan)} strokeWidth="1.8" />
        <rect x="3" y="14" width="7" height="7" rx="2" fill={fill(a, neon.cyan)} stroke={stroke(a, neon.cyan)} strokeWidth="1.8" />
        <rect x="14" y="14" width="7" height="7" rx="2" fill={fill(a, neon.cyan)} stroke={stroke(a, neon.cyan)} strokeWidth="1.8" />
      </svg>
    ),
  };

  const mining: NavTab = {
    to: p('/mining'),
    id: 'mining',
    label: 'Mining',
    accent: neon.teal,
    icon: (a) => (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="4" fill={fill(a, neon.teal)} stroke={stroke(a, neon.teal)} strokeWidth="1.8" />
        <circle cx="12" cy="12" r="8.5" stroke={stroke(a, neon.teal)} strokeWidth="1.4" strokeDasharray="3 3" />
      </svg>
    ),
  };

  const arena: NavTab = {
    to: p('/arena'),
    id: 'arena',
    label: 'Arena',
    accent: neon.purple,
    icon: (a) => (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
        <path
          d="M14.5 17.5L3 6V3h3l11.5 11.5"
          fill={fill(a, neon.purple)}
          stroke={stroke(a, neon.purple)}
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M9.5 17.5L21 6V3h-3L9.5 14.5"
          fill={fill(a, neon.purple)}
          stroke={stroke(a, neon.purple)}
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
  };

  const play: NavTab = {
    to: p('/games'),
    id: 'games',
    label: 'Play',
    accent: neon.cyan,
    icon: (a) => (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
        <rect x="4" y="5" width="16" height="14" rx="2" fill={fill(a, neon.cyan)} stroke={stroke(a, neon.cyan)} strokeWidth="1.8" />
        <path d="M10 9l5 3-5 3V9z" fill={a ? neon.cyan : INACTIVE} />
      </svg>
    ),
  };

  const ranks: NavTab = {
    to: p('/leaderboard'),
    id: 'leaderboard',
    label: 'Ranks',
    accent: neon.gold,
    icon: (a) => (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
        <path
          d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z"
          fill={fill(a, neon.gold)}
          stroke={stroke(a, neon.gold)}
          strokeWidth="1.8"
          strokeLinejoin="round"
        />
      </svg>
    ),
  };

  const profile: NavTab = {
    to: p('/profile'),
    id: 'profile',
    label: 'Profile',
    accent: neon.cyan,
    icon: (a) => (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="8" r="4" fill={fill(a, neon.cyan)} stroke={stroke(a, neon.cyan)} strokeWidth="1.8" />
        <path d="M4 21c0-3.3 3.6-6 8-6s8 2.7 8 6" stroke={stroke(a, neon.cyan)} strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    ),
  };

  return WORD_FORGE_ENABLED
    ? [home, mining, arena, play, profile]
    : [home, mining, arena, ranks, profile];
}
