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
      to: p('/balances'),
      id: 'balances',
      label: 'Balances',
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
    {
      to: p('/testnet'),
      id: 'testnet',
      label: 'Testnet',
      accent: neon.purple,
      icon: (a) => (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <path
            d="M9 3h6l1 6H8L9 3z"
            fill={fill(a, neon.purple)}
            stroke={stroke(a, neon.purple)}
            strokeWidth="1.8"
            strokeLinejoin="round"
          />
          <path
            d="M8 9h8l2 11H6L8 9z"
            fill={fill(a, neon.purple)}
            stroke={stroke(a, neon.purple)}
            strokeWidth="1.8"
            strokeLinejoin="round"
          />
        </svg>
      ),
    },
    {
      to: p('/mine'),
      id: 'mine',
      label: 'Mine',
      accent: neon.teal,
      icon: (a) => (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="4" fill={fill(a, neon.teal)} stroke={stroke(a, neon.teal)} strokeWidth="1.8" />
          <circle cx="12" cy="12" r="8.5" stroke={stroke(a, neon.teal)} strokeWidth="1.4" strokeDasharray="3 3" />
        </svg>
      ),
    },
  ];
}
