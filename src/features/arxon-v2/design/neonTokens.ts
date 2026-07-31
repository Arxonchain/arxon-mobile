/**
 * Neon / Forge design language — matches Word Forge banner & carousel.
 * Teal glow, space backdrop, glossy 3D buttons.
 */
export const neon = {
  font: "'Creato Display', -apple-system, system-ui, sans-serif",
  cyan: '#4FD8EB',
  cyanGlow: 'rgba(79,216,235,0.55)',
  teal: '#7FE7C4',
  gold: '#ffc93c',
  goldGlow: 'rgba(255,201,60,0.45)',
  purple: '#a855f7',
  purpleGlow: 'rgba(168,85,247,0.45)',
  arena: '#c084fc',
  deep: '#02060e',
  panel: 'linear-gradient(180deg, rgba(21,54,86,0.92) 0%, rgba(9,26,48,0.96) 100%)',
  panelBorder: 'rgba(79,216,235,0.35)',
  text: '#e8fcff',
  textMuted: 'rgba(232,252,255,0.55)',
  radius: { sm: 14, md: 20, lg: 26, xl: 32 },
} as const;

export function neonShadow(color: string, spread = 24) {
  return `0 0 ${spread}px ${color}, 0 8px 32px rgba(0,0,0,0.5)`;
}
