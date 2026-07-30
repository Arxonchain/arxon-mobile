/** Shared Word Forge design tokens */
export const FORGE_COLORS = {
  accent: '#4FD8EB',
  gold: '#ffd93d',
  danger: '#ff6b4a',
  bg: '#020508',
  surface: 'rgba(4,18,32,0.94)',
  muted: 'rgba(255,255,255,0.45)',
} as const;

export const FORGE_MOTION = {
  fast: '120ms',
  standard: '240ms',
  ceremony: '400ms',
  spring: { stiffness: 280, damping: 26 },
  stagger: 0.06,
} as const;

export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}
