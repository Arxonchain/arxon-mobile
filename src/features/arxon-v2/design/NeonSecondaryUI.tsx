/**
 * Compact neon UI for Profile, Settings, Leaderboard, and sub-pages — matches home dashboard.
 */
import { type ReactNode, type CSSProperties } from 'react';
import { motion } from 'framer-motion';
import { ChevronRight, type LucideIcon } from 'lucide-react';
import { neon } from './neonTokens';
import { NeonEyebrow } from './NeonKit';
import { mobileTopPadding } from '@/lib/mobileLayout';

export const neonFadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] } },
};
export const neonStagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06, delayChildren: 0.05 } },
};

const GLASS = {
  bg: 'linear-gradient(155deg, rgba(12,28,48,0.88) 0%, rgba(6,12,24,0.92) 100%)',
  border: 'rgba(79,216,235,0.18)',
};

const ACTIVITY_TEXT = '#b8eff8';

export function NeonScreenHeader({
  eyebrow,
  title,
  subtitle,
  onBack,
  right,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  onBack?: () => void;
  right?: ReactNode;
}) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      padding: `${mobileTopPadding()} 16px 12px`,
      gap: 10,
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, flex: 1, minWidth: 0 }}>
        {onBack && (
          <motion.button
            type="button"
            whileTap={{ scale: 0.9 }}
            onClick={onBack}
            style={{
              width: 36, height: 36, borderRadius: 12, flexShrink: 0, marginTop: 2,
              background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={ACTIVITY_TEXT} strokeWidth="2.2" strokeLinecap="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </motion.button>
        )}
        <div style={{ minWidth: 0 }}>
          {eyebrow && <NeonEyebrow color={neon.cyan}>{eyebrow}</NeonEyebrow>}
          <h1 style={{
            margin: eyebrow ? '6px 0 0' : 0,
            fontSize: 22, fontWeight: 900, color: neon.text, letterSpacing: '-0.4px', lineHeight: 1.1,
            textShadow: '0 0 24px rgba(79,216,235,0.2)',
          }}>
            {title}
          </h1>
          {subtitle && (
            <p style={{ margin: '5px 0 0', fontSize: 11, fontWeight: 400, color: ACTIVITY_TEXT, opacity: 0.75, lineHeight: 1.4 }}>
              {subtitle}
            </p>
          )}
        </div>
      </div>
      {right && <div style={{ flexShrink: 0, marginTop: 4 }}>{right}</div>}
    </div>
  );
}

export function NeonGlassCard({
  children,
  accent = neon.cyan,
  onClick,
  padding = '14px 14px',
  style,
}: {
  children: ReactNode;
  accent?: string;
  onClick?: () => void;
  padding?: string;
  style?: CSSProperties;
}) {
  return (
    <motion.div
      whileTap={onClick ? { scale: 0.985 } : undefined}
      onClick={onClick}
      style={{
        borderRadius: 18,
        padding,
        position: 'relative',
        overflow: 'hidden',
        cursor: onClick ? 'pointer' : 'default',
        touchAction: 'manipulation',
        background: GLASS.bg,
        border: `1px solid ${accent}28`,
        boxShadow: `0 10px 28px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.06), 0 0 24px ${accent}08`,
        ...style,
      }}
    >
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        background: `radial-gradient(ellipse 80% 60% at 100% 0%, ${accent}12 0%, transparent 55%)`,
      }} />
      <div style={{ position: 'relative', zIndex: 1 }}>{children}</div>
    </motion.div>
  );
}

export function NeonCompactBalance({
  balance,
  label = 'Available Balance',
  rank,
  stats,
}: {
  balance: number;
  label?: string;
  rank?: number | null;
  stats: { label: string; value: string; accent?: string }[];
}) {
  return (
    <NeonGlassCard accent={neon.cyan} padding="14px 14px 12px">
      <p style={{ margin: 0, fontSize: 9, fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'rgba(184,239,248,0.55)' }}>
        {label}
      </p>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginTop: 6 }}>
        <span style={{ fontSize: 28, fontWeight: 900, color: neon.text, letterSpacing: '-1px', lineHeight: 1 }}>
          {balance.toLocaleString()}
        </span>
        <span style={{ fontSize: 11, fontWeight: 800, color: neon.cyan }}>ARX-P</span>
      </div>
      {rank && (
        <p style={{ margin: '4px 0 0', fontSize: 10, fontWeight: 700, color: neon.gold }}>Rank #{rank}</p>
      )}
      <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
        {stats.map((s) => (
          <div key={s.label} style={{
            flex: 1, padding: '5px 4px', borderRadius: 10, textAlign: 'center',
            background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)',
          }}>
            <p style={{ margin: 0, fontSize: 7, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(184,239,248,0.45)' }}>{s.label}</p>
            <p style={{ margin: '2px 0 0', fontSize: 11, fontWeight: 800, color: s.accent ?? neon.cyan }}>{s.value}</p>
          </div>
        ))}
      </div>
    </NeonGlassCard>
  );
}

export function NeonMenuRow({
  icon: Icon,
  label,
  sub,
  accent = neon.cyan,
  onClick,
  badge,
}: {
  icon: LucideIcon;
  label: string;
  sub?: string;
  accent?: string;
  onClick: () => void;
  badge?: string;
}) {
  return (
    <motion.button
      type="button"
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      style={{
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        gap: 11,
        padding: '10px 12px',
        marginBottom: 6,
        borderRadius: 14,
        border: `1px solid ${accent}20`,
        background: `linear-gradient(135deg, ${accent}0a 0%, transparent 100%)`,
        cursor: 'pointer',
        textAlign: 'left',
        fontFamily: neon.font,
        touchAction: 'manipulation',
      }}
    >
      <div style={{
        width: 34, height: 34, borderRadius: 11, flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: `${accent}14`, border: `1px solid ${accent}30`, color: accent,
      }}>
        <Icon size={16} strokeWidth={2.2} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ margin: 0, fontSize: 12, fontWeight: 600, color: ACTIVITY_TEXT }}>{label}</p>
        {sub && <p style={{ margin: '2px 0 0', fontSize: 9, fontWeight: 400, color: 'rgba(184,239,248,0.5)' }}>{sub}</p>}
      </div>
      {badge && (
        <span style={{ fontSize: 7, fontWeight: 800, padding: '2px 6px', borderRadius: 6, background: `${accent}18`, color: accent, letterSpacing: '0.06em' }}>
          {badge}
        </span>
      )}
      <ChevronRight size={14} color="rgba(184,239,248,0.35)" strokeWidth={2.5} />
    </motion.button>
  );
}

export function NeonMenuGroup({ children, title }: { children: ReactNode; title?: string }) {
  return (
    <div style={{ marginBottom: 14 }}>
      {title && (
        <p style={{ margin: '0 0 8px 2px', fontSize: 8, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(184,239,248,0.45)' }}>
          {title}
        </p>
      )}
      <NeonGlassCard accent={neon.cyan} padding="8px 8px 6px">
        {children}
      </NeonGlassCard>
    </div>
  );
}

export function NeonCompactTabs<T extends string>({
  tabs,
  active,
  onChange,
}: {
  tabs: { id: T; label: string }[];
  active: T;
  onChange: (id: T) => void;
}) {
  return (
    <div style={{
      display: 'flex', gap: 4, padding: 3, borderRadius: 14,
      background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(79,216,235,0.14)',
    }}>
      {tabs.map((t) => {
        const on = t.id === active;
        return (
          <button
            key={t.id}
            type="button"
            onClick={() => onChange(t.id)}
            style={{
              flex: 1, padding: '8px 6px', borderRadius: 11, border: 'none', cursor: 'pointer',
              fontFamily: neon.font, fontSize: 10, fontWeight: on ? 800 : 600,
              background: on ? `${neon.cyan}18` : 'transparent',
              color: on ? neon.cyan : 'rgba(184,239,248,0.45)',
              boxShadow: on ? `inset 0 0 0 1px ${neon.cyan}35` : 'none',
            }}
          >
            {t.label}
          </button>
        );
      })}
    </div>
  );
}

export function NeonRankBanner({
  rank,
  label,
  username,
  points,
  accent,
  icon: Icon,
  onClick,
}: {
  rank: number;
  label: string;
  username: string;
  points: number;
  accent: string;
  icon: LucideIcon;
  onClick?: () => void;
}) {
  return (
    <motion.button
      type="button"
      whileTap={onClick ? { scale: 0.97 } : undefined}
      onClick={onClick}
      disabled={!onClick}
      style={{
        minWidth: 148,
        flexShrink: 0,
        borderRadius: 16,
        overflow: 'hidden',
        padding: 0,
        border: `1px solid ${accent}35`,
        background: GLASS.bg,
        cursor: onClick ? 'pointer' : 'default',
        textAlign: 'left',
        fontFamily: neon.font,
        touchAction: 'manipulation',
        boxShadow: `0 8px 24px rgba(0,0,0,0.4), 0 0 20px ${accent}12, inset 0 1px 0 rgba(255,255,255,0.06)`,
      }}
    >
      <div style={{
        padding: '10px 12px',
        background: `linear-gradient(135deg, ${accent}18 0%, transparent 70%)`,
        position: 'relative',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <div style={{
            width: 28, height: 28, borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: `${accent}20`, border: `1px solid ${accent}40`, color: accent,
          }}>
            <Icon size={14} strokeWidth={2.2} />
          </div>
          <span style={{ fontSize: 8, fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: accent }}>
            #{rank} · {label}
          </span>
        </div>
        <p style={{ margin: 0, fontSize: 13, fontWeight: 800, color: neon.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {username}
        </p>
        <p style={{ margin: '4px 0 0', fontSize: 12, fontWeight: 800, color: accent, fontVariantNumeric: 'tabular-nums' }}>
          {points.toLocaleString()}
          <span style={{ fontSize: 9, fontWeight: 500, color: 'rgba(184,239,248,0.5)', marginLeft: 4 }}>ARX-P</span>
        </p>
      </div>
    </motion.button>
  );
}

export function NeonListRow({
  rank,
  icon,
  accent = neon.cyan,
  title,
  subtitle,
  value,
  valueLabel,
  onClick,
  highlight,
}: {
  rank?: number | string;
  icon: ReactNode;
  accent?: string;
  title: string;
  subtitle?: string;
  value: string;
  valueLabel?: string;
  onClick?: () => void;
  highlight?: boolean;
}) {
  return (
    <motion.div
      whileTap={onClick ? { scale: 0.99 } : undefined}
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '9px 10px',
        marginBottom: 6,
        borderRadius: 14,
        cursor: onClick ? 'pointer' : 'default',
        touchAction: 'manipulation',
        background: highlight ? `${accent}10` : 'rgba(255,255,255,0.02)',
        border: `1px solid ${highlight ? `${accent}28` : 'rgba(255,255,255,0.05)'}`,
      }}
    >
      {rank !== undefined && (
        <span style={{ width: 22, fontSize: 10, fontWeight: 800, color: accent, textAlign: 'center', flexShrink: 0 }}>
          {rank}
        </span>
      )}
      <div style={{
        width: 30, height: 30, borderRadius: 10, flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: `${accent}12`, border: `1px solid ${accent}25`, color: accent, overflow: 'hidden',
      }}>
        {icon}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ margin: 0, fontSize: 12, fontWeight: 600, color: ACTIVITY_TEXT, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {title}
        </p>
        {subtitle && <p style={{ margin: '1px 0 0', fontSize: 9, color: 'rgba(184,239,248,0.45)' }}>{subtitle}</p>}
      </div>
      <div style={{ textAlign: 'right', flexShrink: 0 }}>
        <span style={{ fontSize: 12, fontWeight: 800, color: accent, fontVariantNumeric: 'tabular-nums' }}>
          {value}
        </span>
        {valueLabel && (
          <p style={{ margin: '1px 0 0', fontSize: 8, fontWeight: 600, color: 'rgba(184,239,248,0.4)' }}>{valueLabel}</p>
        )}
      </div>
    </motion.div>
  );
}

export function NeonSectionLabel({ children, action, onAction }: { children: ReactNode; action?: string; onAction?: () => void }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
      <p style={{ margin: 0, fontSize: 11, fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', color: ACTIVITY_TEXT, opacity: 0.85 }}>
        {children}
      </p>
      {action && onAction && (
        <button type="button" onClick={onAction} style={{ background: 'none', border: 'none', color: neon.cyan, fontSize: 10, fontWeight: 700, cursor: 'pointer', fontFamily: neon.font }}>
          {action} →
        </button>
      )}
    </div>
  );
}

const headerGlass = (accent: string) => ({
  border: `1px solid ${accent}32`,
  background: GLASS.bg,
  boxShadow: `0 4px 16px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.06), 0 0 18px ${accent}10`,
});

export function NeonHeaderIconButton({
  label,
  onClick,
  accent = neon.cyan,
  badge,
  size = 38,
  children,
}: {
  label: string;
  onClick?: () => void;
  accent?: string;
  badge?: number | string | null;
  size?: number;
  children: ReactNode;
}) {
  const showBadge = badge != null && badge !== 0 && badge !== '';
  const badgeNum = typeof badge === 'number' ? badge : null;

  return (
    <motion.button
      type="button"
      aria-label={label}
      whileTap={{ scale: 0.9 }}
      onClick={onClick}
      style={{
        position: 'relative',
        width: size,
        height: size,
        borderRadius: 12,
        flexShrink: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        color: accent,
        fontFamily: neon.font,
        WebkitTapHighlightColor: 'transparent',
        touchAction: 'manipulation',
        overflow: 'hidden',
        ...headerGlass(accent),
      }}
    >
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        background: `radial-gradient(ellipse 90% 70% at 30% 0%, ${accent}14 0%, transparent 60%)`,
      }} />
      <span style={{ position: 'relative', zIndex: 1, display: 'flex', filter: `drop-shadow(0 0 6px ${accent}44)` }}>
        {children}
      </span>
      {showBadge && (
        <span style={{
          position: 'absolute',
          top: 4,
          right: 4,
          zIndex: 2,
          minWidth: badgeNum != null && badgeNum > 9 ? 15 : 8,
          height: badgeNum != null && badgeNum > 9 ? 15 : 8,
          borderRadius: badgeNum != null && badgeNum > 9 ? 8 : '50%',
          padding: badgeNum != null && badgeNum > 9 ? '0 3px' : 0,
          background: '#f87171',
          border: `1.5px solid ${neon.deep}`,
          boxShadow: '0 0 10px rgba(248,113,113,0.55)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          {badgeNum != null && badgeNum > 9 && (
            <span style={{ fontSize: 7, fontWeight: 800, color: '#fff', lineHeight: 1 }}>
              {badgeNum > 99 ? '99+' : badgeNum}
            </span>
          )}
        </span>
      )}
    </motion.button>
  );
}

export function NeonHeaderAvatar({
  label,
  onClick,
  avatarUrl,
  username,
  accent = neon.cyan,
  size = 38,
}: {
  label: string;
  onClick?: () => void;
  avatarUrl?: string | null;
  username?: string;
  accent?: string;
  size?: number;
}) {
  const initial = (username || '?')[0]?.toUpperCase();

  return (
    <motion.button
      type="button"
      aria-label={label}
      whileTap={{ scale: 0.9 }}
      onClick={onClick}
      style={{
        position: 'relative',
        width: size,
        height: size,
        borderRadius: 12,
        flexShrink: 0,
        padding: 0,
        cursor: 'pointer',
        overflow: 'hidden',
        fontFamily: neon.font,
        WebkitTapHighlightColor: 'transparent',
        touchAction: 'manipulation',
        ...headerGlass(accent),
      }}
    >
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 1,
        background: `radial-gradient(ellipse 90% 70% at 70% 0%, ${accent}18 0%, transparent 60%)`,
      }} />
      {avatarUrl ? (
        <img
          src={avatarUrl}
          alt=""
          style={{ width: '100%', height: '100%', objectFit: 'cover', position: 'relative', zIndex: 0 }}
        />
      ) : (
        <div style={{
          width: '100%', height: '100%',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: `linear-gradient(135deg, ${accent}22 0%, rgba(6,12,24,0.95) 100%)`,
          fontSize: size * 0.38,
          fontWeight: 900,
          color: accent,
          textShadow: `0 0 12px ${accent}66`,
          position: 'relative',
          zIndex: 0,
        }}>
          {initial}
        </div>
      )}
    </motion.button>
  );
}

export function NeonHeaderActions({ children }: { children: ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
      {children}
    </div>
  );
}
