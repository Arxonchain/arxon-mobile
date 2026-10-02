import type { CSSProperties } from 'react';

export function shortAddr(addr: string) {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

export function shortHash(hash: string) {
  return `${hash.slice(0, 10)}…${hash.slice(-6)}`;
}

export const walletFont = "'Creato Display',-apple-system,system-ui,sans-serif";

export const walletPage: CSSProperties = {
  minHeight: '100vh',
  background: 'hsl(225 30% 3%)',
  paddingBottom: 110,
  fontFamily: walletFont,
  color: 'hsl(215 20% 93%)',
};

export const walletBtn: CSSProperties = {
  flex: 1,
  padding: '14px 16px',
  borderRadius: 16,
  border: '1px solid hsl(215 35% 62%/0.35)',
  background: 'hsl(215 35% 62%/0.15)',
  color: 'hsl(215 35% 82%)',
  fontSize: 14,
  fontWeight: 700,
  cursor: 'pointer',
  fontFamily: walletFont,
};

export const walletGhost: CSSProperties = {
  ...walletBtn,
  background: 'transparent',
  border: '1px solid hsl(215 22% 18%)',
  color: 'hsl(215 18% 78%)',
};

export const walletField: CSSProperties = {
  width: '100%',
  boxSizing: 'border-box',
  padding: '14px 16px',
  borderRadius: 16,
  border: '1px solid hsl(215 22% 18%)',
  background: 'hsl(225 26% 8%)',
  color: 'hsl(215 20% 93%)',
  fontSize: 15,
  fontFamily: walletFont,
  outline: 'none',
};
