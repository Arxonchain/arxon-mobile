import type { ReactNode } from 'react';
import { House, Swords, Trophy, User } from 'lucide-react';
import { neon } from '@/features/arxon-v2/design/neonTokens';

export type NavTab = {
  to: string;
  id: string;
  label: string;
  accent: string;
  end?: boolean;
  icon: (active: boolean) => ReactNode;
};

const INACTIVE = 'rgba(140,143,153,0.7)';
const ACTIVE_INK = '#0c1018';

function navIcon(active: boolean, Icon: typeof House) {
  return <Icon size={18} strokeWidth={2.2} color={active ? ACTIVE_INK : INACTIVE} />;
}

/** Mining-only bottom nav. Wallet and Testnet live in the wallet app, not here. */
export function buildV2NavTabs(basePath = ''): NavTab[] {
  const p = (path: string) => (basePath ? `${basePath}${path === '/' ? '' : path}` : path || '/');

  return [
    {
      to: p('/mine'),
      id: 'home',
      label: 'Home',
      accent: neon.cyan,
      end: true,
      icon: (a) => navIcon(a, House),
    },
    {
      to: p('/arena'),
      id: 'arena',
      label: 'Arena',
      accent: neon.purple,
      icon: (a) => navIcon(a, Swords),
    },
    {
      to: p('/leaderboard'),
      id: 'leaderboard',
      label: 'Ranks',
      accent: neon.gold,
      icon: (a) => navIcon(a, Trophy),
    },
    {
      to: p('/profile'),
      id: 'profile',
      label: 'Profile',
      accent: neon.cyan,
      icon: (a) => navIcon(a, User),
    },
  ];
}
