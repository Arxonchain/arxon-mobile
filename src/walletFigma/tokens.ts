import type { CSSProperties } from 'react';

/** Colour variables from the Arxon wallet style guide. */
export const ink = {
  page: '#050505',
  card: '#1c2025',
  raised: '#2a3447',
  text: '#ffffff',
  secondary: '#8c8f99',
  muted: '#5c5f64',
  accent: '#accafe',
  accentText: '#0c1018',
  success: '#3ddb85',
  danger: '#f25252',
  border: '#2a3447',
  bar: '#212121',
  eth: '#627eeb',
  arx: '#90b9ff',
};

export const font = {
  sans: "'Plus Jakarta Sans', -apple-system, system-ui, sans-serif",
  tab: "'Readex Pro', 'Plus Jakarta Sans', sans-serif",
};

export const page: CSSProperties = {
  minHeight: '100vh',
  background: ink.page,
  color: ink.text,
  fontFamily: font.sans,
  boxSizing: 'border-box',
  padding: '12px 18px 120px',
  paddingTop: 'max(12px, env(safe-area-inset-top))',
};
