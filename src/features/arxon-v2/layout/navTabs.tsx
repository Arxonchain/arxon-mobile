import type { ReactNode } from 'react';
import { neon } from '@/features/arxon-v2/design/neonTokens';
import { ArenaNavIcon } from './ArenaNavIcon';

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

/** V2 / new-main nav only (VITE_ARXON_UI_V2). No mining tab — mining stays on classic OTA nav. */
export function buildV2NavTabs(basePath = ''): NavTab[] {
  const p = (path: string) => (basePath ? `${basePath}${path === '/' ? '' : path}` : path || '/');

  return [
    {
      to: p('/'),
      id: 'home',
      label: 'Home',
      accent: neon.cyan,
      end: basePath ? true : undefined,
      icon: (a) => (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <path d="M4 10.5L12 4l8 6.5V20a1 1 0 01-1 1h-5v-6H10v6H5a1 1 0 01-1-1v-9.5z" fill={fill(a, neon.cyan)} stroke={stroke(a, neon.cyan)} strokeWidth="1.8" strokeLinejoin="round" />
        </svg>
      ),
    },
    {
      to: p('/arena'),
      id: 'arena',
      label: 'Arena',
      accent: neon.purple,
      icon: (a) => <ArenaNavIcon active={a} accent={neon.purple} />,
    },
    {
      to: p('/wallet'),
      id: 'wallet',
      label: 'Wallet',
      accent: neon.teal,
      icon: (a) => (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <path d="M4 7a2 2 0 012-2h12a2 2 0 012 2v10a2 2 0 01-2 2H6a2 2 0 01-2-2V7z" fill={fill(a, neon.teal)} stroke={stroke(a, neon.teal)} strokeWidth="1.8" strokeLinejoin="round" />
          <path d="M16 12h4M18 10.5v3" stroke={stroke(a, neon.teal)} strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      ),
    },
    {
      to: p('/profile'),
      id: 'profile',
      label: 'You',
      accent: neon.cyan,
      icon: (a) => (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="8" r="4" fill={fill(a, neon.cyan)} stroke={stroke(a, neon.cyan)} strokeWidth="1.8" />
          <path d="M4 21c0-3.3 3.6-6 8-6s8 2.7 8 6" stroke={stroke(a, neon.cyan)} strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      ),
    },
  ];
}
