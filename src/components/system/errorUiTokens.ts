import { neon } from '@/features/arxon-v2/design/neonTokens';

/** Shared V2 dark-neon styling for error / loading overlays. */
export const errorUi = {
  ...neon,
  bg: neon.deep,
  danger: '#f87171',
  dangerGlow: 'rgba(248,113,113,0.35)',
  warn: '#fbbf24',
  warnGlow: 'rgba(251,191,36,0.35)',
  overlayZ: 99990,
  criticalZ: 100000,
} as const;

export const errorUiFont = errorUi.font;
