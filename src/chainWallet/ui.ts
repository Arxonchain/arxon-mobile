import type { CSSProperties } from 'react';

export function shortAddr(addr: string) {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

export function shortHash(hash: string) {
  return `${hash.slice(0, 10)}…${hash.slice(-6)}`;
}

export const walletFont = "'Plus Jakarta Sans', -apple-system, system-ui, sans-serif";

export const walletPage: CSSProperties = {
  minHeight: '100%',
  background: '#050505',
  color: '#ffffff',
  fontFamily: walletFont,
  boxSizing: 'border-box',
  padding: '8px 18px 128px',
};

export const walletBtn: CSSProperties = {
  flex: 1,
  height: 52,
  padding: '0 16px',
  borderRadius: 8,
  border: 'none',
  background: '#accafe',
  color: '#0c1018',
  fontSize: 15,
  fontWeight: 600,
  cursor: 'pointer',
  fontFamily: walletFont,
};

export const walletGhost: CSSProperties = {
  ...walletBtn,
  background: '#1c2025',
  color: '#ffffff',
  border: '1px solid #2a3447',
};

export const walletField: CSSProperties = {
  width: '100%',
  boxSizing: 'border-box',
  height: 56,
  padding: '0 16px',
  borderRadius: 14,
  border: '1px solid #2a3447',
  background: '#1c2025',
  color: '#ffffff',
  fontSize: 15,
  fontFamily: walletFont,
  outline: 'none',
};
