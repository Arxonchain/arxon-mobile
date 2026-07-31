/** Arxon V2 design tokens — carousel-inspired, brand steel dominant */
export const v2 = {
  font: "'Creato Display', -apple-system, system-ui, sans-serif",

  brand: {
    deep: 'hsl(225 30% 3%)',
    surface: 'hsl(225 28% 7%)',
    raised: 'hsl(225 24% 11%)',
    steel: 'hsl(215 35% 62%)',
    steelLight: 'hsl(215 32% 72%)',
    steelBright: 'hsl(215 20% 96%)',
    glow: 'hsl(215 55% 62%)',
    muted: 'hsl(215 14% 38%)',
    mutedSoft: 'hsl(215 25% 48%)',
    border: 'hsl(215 22% 14%)',
  },

  accent: {
    arena: 'hsl(255 55% 68%)',
    mining: 'hsl(155 50% 52%)',
    gold: 'hsl(38 90% 55%)',
    success: 'hsl(155 45% 43%)',
    danger: 'hsl(0 60% 56%)',
    purple: 'hsl(255 50% 60%)',
    cyan: 'hsl(190 85% 55%)',
  },

  radius: {
    sm: 14,
    md: 18,
    lg: 22,
    xl: 28,
    pill: 99,
  },

  shadow: (accent: string, intensity = 0.22) =>
    `0 16px 40px -12px ${accent}${Math.round(intensity * 255).toString(16).padStart(2, '0').slice(0, 2) || '33'}, 0 4px 20px rgba(0,0,0,0.35)`,

  gradient: {
    hero: 'linear-gradient(150deg, hsl(225 30% 13%), hsl(215 35% 18%), hsl(225 32% 10%))',
    arena: 'linear-gradient(135deg, hsl(255 45% 22%), hsl(280 50% 18%), hsl(225 35% 10%))',
    mining: 'linear-gradient(135deg, hsl(155 40% 18%), hsl(175 45% 14%), hsl(225 35% 10%))',
    tasks: 'linear-gradient(135deg, hsl(155 40% 18%), hsl(175 45% 14%), hsl(225 35% 10%))',
    steel: 'linear-gradient(135deg, hsl(215 35% 16%), hsl(225 32% 10%), hsl(225 35% 6%))',
    mesh: `
      radial-gradient(ellipse 80% 50% at 20% -10%, hsl(215 55% 62% / 0.08), transparent),
      radial-gradient(ellipse 60% 40% at 90% 10%, hsl(255 50% 60% / 0.06), transparent),
      radial-gradient(ellipse 50% 30% at 50% 100%, hsl(155 45% 43% / 0.04), transparent),
      hsl(225 30% 3%)
    `,
  },
} as const;

export type V2Accent = keyof typeof v2.accent;
