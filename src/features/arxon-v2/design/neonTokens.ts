/**
 * Mining UI — same dark glass as wallet token-list cards.
 */
export const neon = {
  font: "'Plus Jakarta Sans', -apple-system, system-ui, sans-serif",
  cyan: '#accafe',
  cyanGlow: 'rgba(172,202,254,0.40)',
  teal: '#3ddb85',
  gold: '#accafe',
  goldGlow: 'rgba(172,202,254,0.35)',
  purple: '#accafe',
  purpleGlow: 'rgba(172,202,254,0.28)',
  arena: '#accafe',
  deep: '#0a0c10',
  panel: 'rgba(10,12,16,0.88)',
  panelBorder: 'rgba(255,255,255,0.08)',
  text: '#ffffff',
  textMuted: '#8c8f99',
  radius: { sm: 14, md: 18, lg: 22, xl: 26 },
} as const;

export const sheetCard = {
  border: '1px solid rgba(255,255,255,0.08)',
  background: 'rgba(10,12,16,0.88)',
  backdropFilter: 'blur(22px)',
  WebkitBackdropFilter: 'blur(22px)',
  boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.08)',
} as const;

export function neonShadow(_color: string, _spread = 24) {
  return 'inset 0 1px 0 rgba(255,255,255,0.08)';
}
