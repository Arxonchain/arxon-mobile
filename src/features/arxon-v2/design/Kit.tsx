import { motion, type HTMLMotionProps } from 'framer-motion';
import { ChevronRight, type LucideIcon } from 'lucide-react';
import { type CSSProperties, type ReactNode } from 'react';
import { v2 } from './tokens';
import { NeonPage } from './NeonKit';
import { neon } from './neonTokens';
import { useMobileNav } from '@/contexts/MobileNavContext';
import { mobileScrollPadding, mobileScrollPaddingNavHidden } from '@/lib/mobileLayout';
import {
  NeonScreenHeader,
  NeonCompactBalance,
  NeonMenuRow,
  NeonCompactTabs,
  NeonListRow,
  NeonSectionLabel,
  NeonGlassCard,
} from './NeonSecondaryUI';

export {
  NeonScreenHeader,
  NeonGlassCard,
  NeonCompactBalance,
  NeonMenuRow,
  NeonMenuGroup,
  NeonCompactTabs,
  NeonRankBanner,
  NeonListRow,
  NeonSectionLabel,
  NeonHeaderIconButton,
  NeonHeaderAvatar,
  NeonHeaderActions,
  neonFadeUp,
  neonStagger,
} from './NeonSecondaryUI';

const fadeUp = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0, transition: { duration: 0.42, ease: [0.25, 0.46, 0.45, 0.94] } },
};

const stagger = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06, delayChildren: 0.08 } },
};

export { fadeUp, stagger };

export function V2Page({
  children,
  padBottom,
  style,
}: {
  children: ReactNode;
  /** Omit for auto bottom nav clearance; pass 0 to disable. */
  padBottom?: number | string;
  style?: CSSProperties;
}) {
  const { hideNav } = useMobileNav();
  const bottomInset = (() => {
    if (padBottom !== undefined) return padBottom;
    return hideNav ? mobileScrollPaddingNavHidden() : mobileScrollPadding();
  })();

  return (
    <NeonPage padBottom={0}>
      <div
        style={{
          fontFamily: neon.font,
          paddingBottom: bottomInset,
          boxSizing: 'border-box',
          // NeonPage owns the scrollport; keep pan-y so nested tappables don't steal swipes.
          touchAction: 'pan-y',
          ...style,
        }}
      >
        {children}
      </div>
    </NeonPage>
  );
}

export function V2Header({
  title,
  subtitle,
  onBack,
  right,
  large: _large,
  eyebrow,
}: {
  title?: string;
  subtitle?: string;
  onBack?: () => void;
  right?: ReactNode;
  large?: boolean;
  eyebrow?: string;
}) {
  if (!title) return null;
  return (
    <NeonScreenHeader
      eyebrow={eyebrow}
      title={title}
      subtitle={subtitle}
      onBack={onBack}
      right={right}
    />
  );
}

export function V2WelcomeHeader({
  username,
  avatarUrl,
  onNotif,
  onProfile,
  onShare,
  notifCount = 0,
}: {
  username: string;
  avatarUrl?: string | null;
  onNotif?: () => void;
  onProfile?: () => void;
  onShare?: () => void;
  notifCount?: number;
}) {
  return (
    <motion.div variants={fadeUp} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '52px 20px 0' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <V2LogoMark size={44} />
        <div>
          <V2Eyebrow>Welcome back</V2Eyebrow>
          <p style={{ margin: '4px 0 0', fontSize: 20, fontWeight: 800, color: neon.text, letterSpacing: '-0.3px' }}>{username}</p>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        {onShare && (
          <motion.button type="button" whileTap={{ scale: 0.88 }} onClick={onShare} style={iconBtnStyle}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={v2.brand.steel} strokeWidth="2" strokeLinecap="round">
              <circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" />
              <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" /><line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
            </svg>
          </motion.button>
        )}
        {onNotif && (
          <motion.button type="button" whileTap={{ scale: 0.88 }} onClick={onNotif} style={{ ...iconBtnStyle, position: 'relative' }}>
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke={v2.brand.steel} strokeWidth="2" strokeLinecap="round">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" />
            </svg>
            {notifCount > 0 && (
              <span style={{ position: 'absolute', top: 8, right: 9, width: 7, height: 7, borderRadius: '50%', background: v2.accent.danger, border: `2px solid ${v2.brand.deep}` }} />
            )}
          </motion.button>
        )}
        {onProfile && (
          <motion.button type="button" whileTap={{ scale: 0.88 }} onClick={onProfile} style={{ width: 40, height: 40, borderRadius: 14, overflow: 'hidden', cursor: 'pointer', border: `1.5px solid ${v2.brand.steel}40` }}>
            {avatarUrl ? (
              <img src={avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <div style={{ width: '100%', height: '100%', background: v2.gradient.steel, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 15, color: v2.brand.steelBright }}>
                {username[0]?.toUpperCase()}
              </div>
            )}
          </motion.button>
        )}
      </div>
    </motion.div>
  );
}

export function V2LogoMark({ size = 44 }: { size?: number }) {
  return (
    <div style={{ width: size, height: size, borderRadius: 14, overflow: 'hidden', border: `1px solid ${v2.brand.steel}33`, boxShadow: `0 0 16px ${v2.brand.glow}22`, display: 'flex', alignItems: 'center', justifyContent: 'center', background: v2.brand.surface }}>
      <img src="/arxon-icon.svg" alt="Arxon" style={{ width: '70%', height: '70%', objectFit: 'contain' }} />
    </div>
  );
}

export function V2Eyebrow({ children, accent = neon.cyan, icon }: { children: ReactNode; accent?: string; icon?: ReactNode }) {
  return (
    <p style={{ margin: 0, fontSize: 9, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', color: accent, display: 'flex', alignItems: 'center', gap: 6 }}>
      {icon}{children}
    </p>
  );
}

export function V2Title({ children, size = 22 }: { children: ReactNode; size?: number }) {
  return <h2 style={{ margin: '6px 0 0', fontSize: size, fontWeight: 800, letterSpacing: '-0.3px', color: neon.text, lineHeight: 1.1 }}>{children}</h2>;
}

export function V2Subtitle({ children, maxWidth = '85%' }: { children: ReactNode; maxWidth?: string }) {
  return <p style={{ margin: '8px 0 0', fontSize: 12, lineHeight: 1.45, maxWidth, color: neon.textMuted, fontWeight: 500 }}>{children}</p>;
}

export function V2HeroCard({
  eyebrow, title, subtitle, cta, onCta, accent = v2.brand.steel, gradient = v2.gradient.steel, image, icon, compact,
}: {
  eyebrow: string; title: string; subtitle?: string; cta?: string; onCta?: () => void;
  accent?: string; gradient?: string; image?: string; icon?: ReactNode; compact?: boolean;
}) {
  return (
    <motion.div whileTap={onCta ? { scale: 0.985 } : undefined} onClick={onCta}
      style={{ borderRadius: v2.radius.lg, overflow: 'hidden', border: `1px solid ${accent}33`, boxShadow: v2.shadow(accent), background: gradient, position: 'relative', minHeight: compact ? 120 : 168, cursor: onCta ? 'pointer' : 'default' }}>
      {image && <img src={image} alt="" aria-hidden style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: 0.92 }} />}
      <div style={{ position: 'absolute', inset: 0, background: image ? 'linear-gradient(90deg, rgba(4,8,18,0.92) 0%, rgba(4,8,18,0.55) 55%, rgba(4,8,18,0.25) 100%)' : 'linear-gradient(180deg, transparent, rgba(0,0,0,0.35))' }} />
      <div style={{ position: 'relative', zIndex: 1, padding: compact ? '14px 16px' : '18px 18px 16px', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', minHeight: compact ? 120 : 168 }}>
        <V2Eyebrow accent={accent} icon={icon}>{eyebrow}</V2Eyebrow>
        <V2Title size={compact ? 18 : 22}>{title}</V2Title>
        {subtitle && <V2Subtitle maxWidth={compact ? '95%' : '72%'}>{subtitle}</V2Subtitle>}
        {cta && onCta && <V2Button accent={accent} size="sm" style={{ marginTop: 14, alignSelf: 'flex-start' }} onClick={(e) => { e.stopPropagation(); onCta(); }}>{cta}</V2Button>}
      </div>
    </motion.div>
  );
}

export function V2Button({
  children, onClick, accent = v2.accent.gold, size = 'md', fullWidth, disabled, style, ...rest
}: { children: ReactNode; onClick?: (e: React.MouseEvent) => void; accent?: string; size?: 'sm' | 'md' | 'lg'; fullWidth?: boolean; disabled?: boolean; style?: CSSProperties } & Omit<HTMLMotionProps<'button'>, 'style'>) {
  const pad = size === 'sm' ? '10px 18px' : size === 'lg' ? '16px 28px' : '14px 22px';
  const fs = size === 'sm' ? 13 : size === 'lg' ? 15 : 14;
  return (
    <motion.button type="button" whileTap={disabled ? undefined : { scale: 0.97 }} onClick={disabled ? undefined : onClick} disabled={disabled}
      style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: pad, borderRadius: v2.radius.sm, border: 'none', cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.45 : 1, background: `linear-gradient(135deg, ${accent}, hsl(38 80% 45%))`, color: v2.brand.deep, fontSize: fs, fontWeight: 800, fontFamily: v2.font, boxShadow: `0 6px 20px ${accent}44`, width: fullWidth ? '100%' : undefined, ...style }} {...rest}>
      {children}
      {!disabled && <ChevronRight size={size === 'sm' ? 16 : 18} strokeWidth={3} />}
    </motion.button>
  );
}

export function V2ButtonGhost({ children, onClick, accent = v2.brand.steel, fullWidth }: { children: ReactNode; onClick?: () => void; accent?: string; fullWidth?: boolean }) {
  return (
    <motion.button type="button" whileTap={{ scale: 0.97 }} onClick={onClick}
      style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '12px 20px', borderRadius: v2.radius.sm, border: `1px solid ${accent}44`, background: `${accent}12`, color: accent, fontSize: 13, fontWeight: 700, fontFamily: v2.font, cursor: 'pointer', width: fullWidth ? '100%' : undefined }}>
      {children}
    </motion.button>
  );
}

export function V2Card({ children, accent = neon.cyan, onClick, padding = '14px 14px', style }: { children: ReactNode; accent?: string; onClick?: () => void; padding?: string; style?: CSSProperties }) {
  return (
    <NeonGlassCard accent={accent} onClick={onClick} padding={padding} style={style}>
      {children}
    </NeonGlassCard>
  );
}

export function V2DiscoverCard({ eyebrow, title, subtitle, accent, gradient, onClick, badge }: { eyebrow: string; title: string; subtitle: string; accent: string; gradient: string; onClick: () => void; badge?: string }) {
  return (
    <motion.button type="button" whileTap={{ scale: 0.97 }} onClick={onClick}
      style={{ minWidth: 260, flexShrink: 0, borderRadius: v2.radius.lg, overflow: 'hidden', border: `1px solid ${accent}33`, boxShadow: v2.shadow(accent, 0.15), background: gradient, padding: 0, cursor: 'pointer', textAlign: 'left', position: 'relative' }}>
      <div style={{ padding: '16px 18px' }}>
        {badge && <span style={{ position: 'absolute', top: 12, right: 12, fontSize: 8, fontWeight: 800, padding: '3px 8px', borderRadius: 8, background: `${accent}22`, border: `1px solid ${accent}44`, color: accent }}>{badge}</span>}
        <V2Eyebrow accent={accent}>{eyebrow}</V2Eyebrow>
        <V2Title size={18}>{title}</V2Title>
        <V2Subtitle maxWidth="100%">{subtitle}</V2Subtitle>
        <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 700, color: accent }}>Open <ChevronRight size={14} strokeWidth={3} /></div>
      </div>
    </motion.button>
  );
}

export function V2SectionHeader({ title, action, onAction, badge }: { title: string; action?: string; onAction?: () => void; badge?: string }) {
  return (
    <div style={{ marginBottom: badge ? 10 : 0 }}>
      <NeonSectionLabel action={action} onAction={onAction}>
        {title}{badge ? ` · ${badge}` : ''}
      </NeonSectionLabel>
    </div>
  );
}

export function V2Tabs<T extends string>({ tabs, active, onChange }: { tabs: { id: T; label: string; count?: number }[]; active: T; onChange: (id: T) => void }) {
  return (
    <NeonCompactTabs
      tabs={tabs.map((t) => ({ id: t.id, label: t.count !== undefined ? `${t.label} (${t.count})` : t.label }))}
      active={active}
      onChange={onChange}
    />
  );
}

export function V2Pills<T extends string>({ items, active, onChange }: { items: { id: T; label: string; count?: number; dot?: boolean; accent?: string }[]; active: T; onChange: (id: T) => void }) {
  return (
    <div style={{ display: 'flex', gap: 8, marginBottom: 16, overflowX: 'auto' }} className="scrollbar-none">
      {items.map((p) => {
        const isOn = p.id === active;
        const col = p.accent ?? v2.brand.steel;
        return (
          <button key={p.id} type="button" onClick={() => onChange(p.id)}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: v2.radius.pill, border: 'none', cursor: 'pointer', fontFamily: v2.font, fontSize: 11, fontWeight: 700, flexShrink: 0, background: isOn ? `${col}18` : `${v2.brand.raised}88`, boxShadow: isOn ? `0 0 0 1.5px ${col}55` : `0 0 0 1px ${v2.brand.border}`, color: isOn ? col : v2.brand.muted }}>
            {p.dot && <div style={{ width: 6, height: 6, borderRadius: '50%', background: isOn ? col : v2.brand.muted, boxShadow: isOn ? `0 0 8px ${col}` : 'none' }} />}
            {p.label}
            {p.count !== undefined && <span style={{ fontSize: 9, fontWeight: 800, padding: '2px 6px', borderRadius: 12, background: isOn ? `${col}25` : v2.brand.surface, color: isOn ? col : v2.brand.muted }}>{p.count}</span>}
          </button>
        );
      })}
    </div>
  );
}

export function V2ListRow({ icon, iconAccent = neon.cyan, title, subtitle, value, valueLabel, onClick }: { icon: ReactNode; iconAccent?: string; title: string; subtitle?: string; value?: string; valueLabel?: string; onClick?: () => void }) {
  if (!value) {
    return (
      <NeonListRow icon={icon} accent={iconAccent} title={title} subtitle={subtitle} value="—" onClick={onClick} />
    );
  }
  return (
    <NeonListRow
      icon={icon}
      accent={iconAccent}
      title={title}
      subtitle={subtitle}
      value={value}
      valueLabel={valueLabel}
      onClick={onClick}
    />
  );
}

export function V2StatGrid({ stats }: { stats: { label: string; value: string; accent?: string }[] }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(stats.length, 4)}, 1fr)` }}>
      {stats.map((s, i) => (
        <div key={s.label} style={{ paddingLeft: i > 0 ? 12 : 0, borderLeft: i > 0 ? `1px solid ${v2.brand.border}` : 'none' }}>
          <p style={{ fontSize: 7, textTransform: 'uppercase', letterSpacing: '0.1em', color: v2.brand.muted, fontWeight: 700, marginBottom: 4 }}>{s.label}</p>
          <p style={{ fontSize: 13, fontWeight: 800, color: s.accent ?? v2.brand.steelLight, margin: 0 }}>{s.value}</p>
        </div>
      ))}
    </div>
  );
}

export function V2BalanceHero({ balance, rank, stats, children, label }: { balance: number; rank?: number | null; stats: { label: string; value: string; accent?: string }[]; children?: ReactNode; label?: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'stretch', gap: 10 }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <NeonCompactBalance balance={balance} rank={rank} stats={stats} label={label} />
      </div>
      {children}
    </div>
  );
}

export function V2MenuRow({ icon: Icon, label, sub, accent, onClick, badge }: { icon: LucideIcon; label: string; sub?: string; accent: string; onClick: () => void; badge?: string }) {
  return <NeonMenuRow icon={Icon} label={label} sub={sub} accent={accent} onClick={onClick} badge={badge} />;
}

export function V2LiveBanner({ title, subtitle, accent = v2.accent.mining, onClick }: { title: string; subtitle: string; accent?: string; onClick: () => void }) {
  return (
    <V2Card onClick={onClick} accent={accent} padding="13px 18px">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 9, height: 9, borderRadius: '50%', background: accent, boxShadow: `0 0 10px ${accent}` }} />
          <div><p style={{ fontSize: 13, fontWeight: 800, color: accent, margin: 0 }}>{title}</p><p style={{ fontSize: 10, color: `${accent}99`, margin: '2px 0 0' }}>{subtitle}</p></div>
        </div>
        <ChevronRight size={14} color={`${accent}88`} />
      </div>
    </V2Card>
  );
}

const iconBtnStyle: CSSProperties = {
  width: 40, height: 40, borderRadius: 14,
  background: 'rgba(255,255,255,0.04)',
  border: '1px solid rgba(255,255,255,0.08)',
  display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
};
