import type { ReactNode } from 'react';
import { neon } from '@/features/arxon-v2/design/neonTokens';

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

export function buildV2NavTabs(basePath = ''): NavTab[] {
  const p = (path: string) => (basePath ? `${basePath}${path === '/' ? '' : path}` : path || '/');

  return [
    {
      to: p('/'),
      id: 'home',
      label: 'Home',
      accent: neon.teal,
      end: true,
      icon: (a) => (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <path
            d="M4 10.5L12 4l8 6.5V20a1 1 0 01-1 1h-5v-6H10v6H5a1 1 0 01-1-1v-9.5z"
            fill={fill(a, neon.teal)}
            stroke={stroke(a, neon.teal)}
            strokeWidth="1.8"
            strokeLinejoin="round"
          />
        </svg>
      ),
    },
    {
      to: p('/explore'),
      id: 'explore',
      label: 'Explore',
      accent: neon.purple,
      icon: (a) => (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="8" fill={fill(a, neon.purple)} stroke={stroke(a, neon.purple)} strokeWidth="1.8" />
          <path
            d="M10.2 10.2l6-1.8-1.8 6-4.2-4.2z"
            fill={a ? `${neon.purple}55` : 'none'}
            stroke={stroke(a, neon.purple)}
            strokeWidth="1.6"
            strokeLinejoin="round"
          />
        </svg>
      ),
    },
    {
      to: p('/market'),
      id: 'market',
      label: 'Market',
      accent: neon.gold,
      icon: (a) => (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <path d="M5 17l4-5 3 2.5L19 7" stroke={stroke(a, neon.gold)} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M14 7h5v5" stroke={stroke(a, neon.gold)} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ),
    },
    {
      to: p('/portfolio'),
      id: 'portfolio',
      label: 'Portfolio',
      accent: neon.cyan,
      icon: (a) => (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <path
            d="M4 7a2 2 0 012-2h12a2 2 0 012 2v10a2 2 0 01-2 2H6a2 2 0 01-2-2V7z"
            fill={fill(a, neon.cyan)}
            stroke={stroke(a, neon.cyan)}
            strokeWidth="1.8"
            strokeLinejoin="round"
          />
          <path d="M16 12h4M18 10.5v3" stroke={stroke(a, neon.cyan)} strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      ),
    },
  ];
}
