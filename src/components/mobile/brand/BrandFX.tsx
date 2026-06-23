import type { CSSProperties } from 'react';

// Shared brand design kit.
// Dominant: deep blue/black #09090B (already the app's --background token).
// Complementary: light blue #AABBD9, used for highlight, glow, and primary accent moments.
// Keep this file as the single source of truth so every redesigned screen pulls from
// the same palette instead of re-deriving hex/hsl values inline.

export const BRAND = {
  bgHex: '#09090B',
  bg: 'hsl(225 30% 3%)',
  bgRaised: 'hsl(225 24% 6%)',
  accentHex: '#AABBD9',
  accent: 'hsl(218 38% 76%)',
  accentSoft: 'hsl(218 38% 76%/0.12)',
  accentBorder: 'hsl(218 38% 76%/0.26)',
  accentGlow: 'hsl(218 38% 76%/0.35)',
  textPrimary: 'hsl(215 20% 93%)',
  textSecondary: 'hsl(215 18% 62%)',
  textMuted: 'hsl(215 14% 38%)',
  textFaint: 'hsl(215 14% 28%)',
  border: 'hsl(215 22% 16%)',
  borderSoft: 'hsl(215 20% 12%)',
};

/**
 * Faint tech-line background — a sparse grid + a couple of diagonal "circuit"
 * traces with small node dots, all at very low opacity. Meant to sit behind
 * content as ambient texture, never compete with foreground elements.
 */
export function TechLines({ opacity = 0.5, style }: { opacity?: number; style?: CSSProperties }) {
  return (
    <svg
      viewBox="0 0 400 400"
      preserveAspectRatio="xMidYMid slice"
      style={{
        position: 'absolute', inset: 0, width: '100%', height: '100%',
        opacity, pointerEvents: 'none', zIndex: -1, ...style,
      }}
    >
      <defs>
        <pattern id="techGrid" width="40" height="40" patternUnits="userSpaceOnUse">
          <path d="M0 0H40M0 0V40" stroke={BRAND.accentHex} strokeWidth="0.4" opacity="0.18" />
        </pattern>
      </defs>
      <rect width="400" height="400" fill="url(#techGrid)" />
      <path d="M0 60 L120 60 L150 90 L400 90" stroke={BRAND.accentHex} strokeWidth="0.6" opacity="0.22" fill="none" />
      <path d="M400 260 L260 260 L230 230 L0 230" stroke={BRAND.accentHex} strokeWidth="0.6" opacity="0.16" fill="none" />
      <path d="M60 400 L60 320 L90 290 L90 0" stroke={BRAND.accentHex} strokeWidth="0.5" opacity="0.14" fill="none" />
      {[[120, 60], [150, 90], [260, 260], [230, 230], [60, 320], [90, 290]].map(([cx, cy], i) => (
        <circle key={i} cx={cx} cy={cy} r="2.2" fill={BRAND.accentHex} opacity="0.3" />
      ))}
    </svg>
  );
}

/**
 * Soft blurred radial glow — the gradient-orb decoration seen in modern fintech
 * UI references. Kept subtle and brand-tinted rather than the purple/orange of
 * generic stock kits.
 */
export function GlowOrb({
  size = 220, top, left, right, bottom, color = BRAND.accentHex, opacity = 0.16,
}: {
  size?: number; top?: number | string; left?: number | string; right?: number | string; bottom?: number | string;
  color?: string; opacity?: number;
}) {
  return (
    <div style={{
      position: 'absolute', width: size, height: size, top, left, right, bottom, zIndex: -1,
      background: `radial-gradient(circle, ${color}${Math.round(opacity * 255).toString(16).padStart(2, '0')} 0%, transparent 72%)`,
      filter: 'blur(2px)', pointerEvents: 'none',
    }} />
  );
}

/** Frosted glass panel style, brand-tinted border/glow — spread onto any container's style prop. */
export function glassPanel(extra?: CSSProperties): CSSProperties {
  return {
    background: 'linear-gradient(180deg,hsl(225 26% 9%/0.85),hsl(225 30% 5%/0.92))',
    backdropFilter: 'blur(28px) saturate(1.3)',
    WebkitBackdropFilter: 'blur(28px) saturate(1.3)',
    border: `1px solid ${BRAND.accentBorder}`,
    boxShadow: `0 8px 32px hsl(225 35% 3%/0.5), inset 0 1px 0 ${BRAND.accentSoft}`,
    borderRadius: 22,
    ...extra,
  };
}
