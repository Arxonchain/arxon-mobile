import type { CSSProperties } from 'react';
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

  /** Glassmorphism tokens — frosted overlays & panels */
  glass: {
    overlayBg: 'rgba(2, 6, 14, 0.65)',
    overlayBgStrong: 'rgba(2, 6, 14, 0.78)',
    blur: 'blur(16px)',
    blurStrong: 'blur(24px)',
    panelBg: 'rgba(255, 255, 255, 0.06)',
    panelBgHover: 'rgba(255, 255, 255, 0.09)',
    panelBorder: 'rgba(255, 255, 255, 0.12)',
    panelBorderBright: 'rgba(255, 255, 255, 0.18)',
    panelRadius: 22,
    panelRadiusLg: 24,
    innerHighlight: 'inset 0 1px 0 rgba(255, 255, 255, 0.14)',
    badgeBg: 'rgba(255, 255, 255, 0.08)',
    badgeBorder: 'rgba(255, 255, 255, 0.14)',
    badgeBlur: 'blur(12px)',
    glowCyan: '0 0 48px rgba(79, 216, 235, 0.18), 0 0 96px rgba(168, 85, 247, 0.08)',
    glowPanel: '0 24px 64px rgba(0, 0, 0, 0.45), 0 0 0 1px rgba(255, 255, 255, 0.04)',
    meshCyan: 'rgba(79, 216, 235, 0.12)',
    meshPurple: 'rgba(168, 85, 247, 0.09)',
  },
} as const;

export const errorUiFont = errorUi.font;

/** Full-viewport glass overlay backdrop */
export function glassOverlayStyle(strong = false): CSSProperties {
  const g = errorUi.glass;
  return {
    position: 'fixed',
    inset: 0,
    background: strong ? g.overlayBgStrong : g.overlayBg,
    backdropFilter: strong ? g.blurStrong : g.blur,
    WebkitBackdropFilter: strong ? g.blurStrong : g.blur,
  };
}

/** Centered frosted glass card */
export function glassPanelStyle(opts?: { compact?: boolean; inline?: boolean }): CSSProperties {
  const g = errorUi.glass;
  const radius = opts?.compact ? errorUi.radius.md : g.panelRadiusLg;
  return {
    position: 'relative',
    background: g.panelBg,
    borderRadius: radius,
    border: `1px solid ${g.panelBorder}`,
    boxShadow: `${g.innerHighlight}, ${g.glowPanel}, ${g.glowCyan}`,
    backdropFilter: g.badgeBlur,
    WebkitBackdropFilter: g.badgeBlur,
    ...(opts?.inline ? {} : { maxWidth: 340, width: '100%' }),
  };
}

/** Frosted icon badge circle */
export function glassBadgeStyle(color: string, glow: string): CSSProperties {
  const g = errorUi.glass;
  return {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: `${color}14`,
    border: `1px solid ${g.badgeBorder}`,
    boxShadow: `${g.innerHighlight}, 0 0 28px ${glow}`,
    backdropFilter: g.badgeBlur,
    WebkitBackdropFilter: g.badgeBlur,
  };
}

/** Primary CTA — gradient fill with glass edge glow */
export function glassPrimaryButtonStyle(disabled = false): CSSProperties {
  return {
    width: '100%',
    padding: '16px 20px',
    borderRadius: 16,
    border: `1px solid rgba(255, 255, 255, 0.2)`,
    background: `linear-gradient(135deg, ${errorUi.cyan}, ${errorUi.teal})`,
    color: errorUi.deep,
    fontSize: 15,
    fontWeight: 800,
    cursor: disabled ? 'wait' : 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    boxShadow: `${errorUi.glass.innerHighlight}, 0 8px 32px ${errorUi.cyanGlow}`,
    opacity: disabled ? 0.75 : 1,
  };
}

/** Secondary ghost glass button */
export function glassSecondaryButtonStyle(): CSSProperties {
  const g = errorUi.glass;
  return {
    width: '100%',
    padding: '14px',
    borderRadius: 14,
    border: `1px solid ${g.panelBorder}`,
    background: g.panelBg,
    color: errorUi.textMuted,
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    boxShadow: g.innerHighlight,
    backdropFilter: g.badgeBlur,
    WebkitBackdropFilter: g.badgeBlur,
  };
}

/** Animated gradient mesh behind glass panels */
export function glassMeshBackground(): CSSProperties {
  const g = errorUi.glass;
  return {
    position: 'absolute',
    inset: 0,
    background: `
      radial-gradient(ellipse 80% 60% at 50% 20%, ${g.meshCyan}, transparent 55%),
      radial-gradient(ellipse 60% 40% at 80% 80%, ${g.meshPurple}, transparent 50%),
      radial-gradient(ellipse 50% 35% at 20% 70%, ${g.meshCyan}, transparent 45%)
    `,
    pointerEvents: 'none',
  };
}
