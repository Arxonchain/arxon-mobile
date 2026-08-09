import { type ReactNode } from 'react';
import { motion } from 'framer-motion';
import { FORGE_UI } from '@/features/word-forge/data/uiAssets';
import { neon, neonShadow } from './neonTokens';
import { useIsAppPreview } from '@/features/arxon-v2/preview/AppPreviewContext';
import { useMobileNav } from '@/contexts/MobileNavContext';
import {
  mobilePageScrollRoot,
  mobileScrollPadding,
  mobileScrollPaddingNavHidden,
} from '@/lib/mobileLayout';

/** Space nebula page shell — meshy creamy Word Forge aesthetic */
export function NeonPage({
  children,
  padBottom,
}: {
  children: ReactNode;
  /** Override bottom scroll inset. Omit for auto nav clearance; pass 0 to disable. */
  padBottom?: number | string;
}) {
  const contained = useIsAppPreview();
  const { hideNav } = useMobileNav();

  const resolvedPadBottom = (() => {
    if (padBottom !== undefined) return padBottom;
    return hideNav ? mobileScrollPaddingNavHidden() : mobileScrollPadding();
  })();

  return (
    <div style={{
      ...mobilePageScrollRoot(contained),
      paddingBottom: resolvedPadBottom,
      fontFamily: neon.font,
      background: neon.deep,
      boxSizing: 'border-box',
    }}>
      <div style={{
        position: contained ? 'absolute' : 'fixed',
        inset: 0,
        zIndex: 0,
        pointerEvents: 'none',
      }}>
        <div style={{
          position: 'absolute', inset: -20,
          backgroundImage: `url(${FORGE_UI.discoveryBg})`,
          backgroundSize: 'cover', backgroundPosition: 'center',
          filter: 'brightness(0.42) saturate(1.25) blur(0.5px)',
          transform: 'scale(1.08)',
        }} />
        <div style={{
          position: 'absolute', inset: 0,
          background: `
            radial-gradient(ellipse 100% 70% at 50% -5%, rgba(79,216,235,0.14), transparent 55%),
            radial-gradient(ellipse 60% 50% at 85% 15%, rgba(168,85,247,0.1), transparent 50%),
            radial-gradient(ellipse 40% 35% at 10% 60%, rgba(127,231,196,0.06), transparent 45%),
            linear-gradient(180deg, rgba(2,6,14,0.25) 0%, rgba(2,6,14,0.94) 88%)
          `,
        }} />
        <div style={{
          position: 'absolute', inset: 0, opacity: 0.4,
          backgroundImage: `
            radial-gradient(circle at 25% 25%, rgba(255,255,255,0.03) 1px, transparent 1px),
            radial-gradient(circle at 75% 75%, rgba(79,216,235,0.04) 1px, transparent 1px)
          `,
          backgroundSize: '32px 32px, 48px 48px',
        }} />
      </div>
      <div style={{ position: 'relative', zIndex: 1 }}>{children}</div>
    </div>
  );
}

export function NeonEyebrow({ children, color = neon.cyan }: { children: ReactNode; color?: string }) {
  return (
    <p style={{
      margin: 0, fontSize: 9, fontWeight: 800, letterSpacing: '0.22em', textTransform: 'uppercase',
      color, textShadow: `0 0 12px ${color}88`,
    }}>{children}</p>
  );
}

export function NeonPanel({ children, glow = neon.cyan, onClick, style }: { children: ReactNode; glow?: string; onClick?: () => void; style?: React.CSSProperties }) {
  return (
    <motion.div
      whileTap={onClick ? { scale: 0.98 } : undefined}
      onClick={onClick}
      style={{
        borderRadius: neon.radius.lg,
        padding: '20px 18px',
        background: neon.panel,
        border: `2px solid ${glow}44`,
        boxShadow: `0 6px 0 rgba(3,14,28,0.9), inset 0 1px 0 rgba(255,255,255,0.1), inset 0 0 40px ${glow}08, ${neonShadow(glow, 16)}`,
        cursor: onClick ? 'pointer' : 'default',
        position: 'relative',
        overflow: 'hidden',
        ...style,
      }}
    >
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1, background: `linear-gradient(90deg, transparent, ${glow}55, transparent)` }} />
      {children}
    </motion.div>
  );
}

/** Neon pill stat chip */
export function NeonChip({ label, value, accent = neon.cyan }: { label: string; value: string; accent?: string }) {
  return (
    <div style={{
      flex: 1, padding: '10px 8px', borderRadius: neon.radius.sm, textAlign: 'center',
      background: `${accent}10`, border: `1px solid ${accent}33`,
      boxShadow: `inset 0 0 20px ${accent}08`,
    }}>
      <p style={{ margin: 0, fontSize: 7, fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', color: neon.textMuted }}>{label}</p>
      <p style={{ margin: '4px 0 0', fontSize: 14, fontWeight: 900, color: accent, textShadow: `0 0 10px ${accent}66` }}>{value}</p>
    </div>
  );
}

/** Horizontal neon action tile — carousel-inspired */
export function NeonActionTile({
  title, subtitle, accent, image, badge, onClick,
}: {
  title: string; subtitle: string; accent: string; image?: string; badge?: string; onClick: () => void;
}) {
  return (
    <motion.button
      type="button"
      whileTap={{ scale: 0.96 }}
      onClick={onClick}
      style={{
        minWidth: 200, flexShrink: 0, borderRadius: neon.radius.md, overflow: 'hidden', cursor: 'pointer',
        border: `1px solid ${accent}44`, boxShadow: neonShadow(accent, 14), padding: 0, textAlign: 'left',
        background: neon.deep, position: 'relative',
      }}
    >
      {image && (
        <div style={{ height: 88, position: 'relative' }}>
          <img src={image} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, transparent 20%, rgba(2,6,14,0.95))' }} />
        </div>
      )}
      <div style={{ padding: image ? '12px 14px 14px' : '16px 14px', background: image ? undefined : `linear-gradient(135deg, ${accent}18, rgba(9,26,48,0.95))` }}>
        {badge && (
          <span style={{ position: 'absolute', top: 10, right: 10, fontSize: 8, fontWeight: 900, padding: '3px 8px', borderRadius: 8, background: `${accent}33`, border: `1px solid ${accent}66`, color: accent, letterSpacing: '0.08em' }}>{badge}</span>
        )}
        <NeonEyebrow color={accent}>{title.split(' ')[0]}</NeonEyebrow>
        <p style={{ margin: '6px 0 0', fontSize: 16, fontWeight: 900, color: neon.text, letterSpacing: '-0.2px' }}>{title}</p>
        <p style={{ margin: '4px 0 0', fontSize: 10, color: neon.textMuted, lineHeight: 1.4 }}>{subtitle}</p>
      </div>
    </motion.button>
  );
}

export function NeonSectionTitle({ title, action, onAction, badge }: { title: string; action?: string; onAction?: () => void; badge?: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <p style={{ margin: 0, fontSize: 13, fontWeight: 900, letterSpacing: '0.14em', textTransform: 'uppercase', color: neon.text, textShadow: `0 0 20px ${neon.cyanGlow}` }}>{title}</p>
        {badge && (
          <span style={{
            fontSize: 8, fontWeight: 800, padding: '2px 8px', borderRadius: 8,
            background: 'rgba(255,68,68,0.15)', border: '1px solid rgba(255,100,100,0.35)', color: '#ff8888',
          }}>
            {badge}
          </span>
        )}
      </div>
      {action && onAction && (
        <button type="button" onClick={onAction} style={{ background: 'none', border: 'none', color: neon.cyan, fontSize: 11, fontWeight: 800, cursor: 'pointer', fontFamily: neon.font }}>{action} →</button>
      )}
    </div>
  );
}

export function NeonActivityRow({ title, sub, value, accent = neon.teal }: { title: string; sub: string; value: string; accent?: string }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', marginBottom: 10, borderRadius: neon.radius.md,
      background: 'rgba(9,26,48,0.75)', border: `1px solid ${accent}33`, boxShadow: `inset 0 0 24px ${accent}06`,
    }}>
      <div style={{ width: 40, height: 40, borderRadius: 12, background: `${accent}18`, border: `1px solid ${accent}44`, boxShadow: `0 0 16px ${accent}22` }} />
      <div style={{ flex: 1 }}>
        <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: neon.text }}>{title}</p>
        <p style={{ margin: '2px 0 0', fontSize: 10, color: neon.textMuted }}>{sub}</p>
      </div>
      <p style={{ margin: 0, fontSize: 14, fontWeight: 900, color: accent, textShadow: `0 0 8px ${accent}66` }}>{value}</p>
    </div>
  );
}
