import { motion, type HTMLMotionProps } from 'framer-motion';
import { ChevronRight, type LucideIcon } from 'lucide-react';
import { type CSSProperties, type ReactNode } from 'react';
import { v2 } from './tokens';
import { NeonPage } from './NeonKit';
import { neon } from './neonTokens';

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
  padBottom = 100,
  style,
}: {
  children: ReactNode;
  padBottom?: number;
  style?: CSSProperties;
}) {
  return (
    <NeonPage padBottom={padBottom}>
      <div style={{ fontFamily: neon.font, ...style }}>{children}</div>
    </NeonPage>
  );
}

export function V2Header({
  title,
  subtitle,
  onBack,
  right,
  large,
}: {
  title?: string;
  subtitle?: string;
  onBack?: () => void;
  right?: ReactNode;
  large?: boolean;
}) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: large ? '52px 20px 8px' : '52px 20px 0',
      }}
    >
      {onBack ? (
        <motion.button type="button" whileTap={{ scale: 0.9 }} onClick={onBack} style={iconBtnStyle}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={v2.brand.steelLight} strokeWidth="2.2" strokeLinecap="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </motion.button>
      ) : (
        <div style={{ width: 40 }} />
      )}
      {(title || subtitle) && (
        <div style={{ textAlign: 'center', flex: 1, padding: '0 8px' }}>
          {title && <h1 style={{ fontSize: large ? 22 : 16, fontWeight: 800, color: neon.text, letterSpacing: '-0.3px', margin: 0 }}>{title}</h1>}
          {subtitle && <p style={{ fontSize: 10, color: neon.textMuted, marginTop: 4, marginBottom: 0 }}>{subtitle}</p>}
        </div>
      )}
      {right ?? <div style={{ width: 40 }} />}
    </div>
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

export function V2Card({ children, accent, onClick, padding = '16px 18px', style }: { children: ReactNode; accent?: string; onClick?: () => void; padding?: string; style?: CSSProperties }) {
  return (
    <motion.div whileTap={onClick ? { scale: 0.98 } : undefined} onClick={onClick}
      style={{ borderRadius: v2.radius.lg, padding, background: 'rgba(255,255,255,0.04)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', border: `1px solid ${accent ? `${accent}32` : 'rgba(255,255,255,0.08)'}`, boxShadow: accent ? `0 8px 32px -8px ${accent}22, inset 0 1px 0 rgba(255,255,255,0.06)` : 'inset 0 1px 0 rgba(255,255,255,0.06)', cursor: onClick ? 'pointer' : 'default', position: 'relative', overflow: 'hidden', ...style }}>
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1, background: 'linear-gradient(90deg, transparent, hsl(215 40% 82% / 0.12), transparent)', pointerEvents: 'none' }} />
      <div style={{ position: 'relative', zIndex: 1 }}>{children}</div>
    </motion.div>
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
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <p style={{ fontSize: 15, fontWeight: 800, color: neon.text, margin: 0 }}>{title}</p>
        {badge && <span style={{ fontSize: 9, fontWeight: 700, color: v2.accent.mining, background: `${v2.accent.mining}18`, border: `1px solid ${v2.accent.mining}40`, borderRadius: 10, padding: '2px 8px' }}>{badge}</span>}
      </div>
      {action && onAction && (
        <button type="button" onClick={onAction} style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 11, color: neon.cyan, fontWeight: 700, background: 'none', border: 'none', cursor: 'pointer', fontFamily: neon.font }}>
          {action} <ChevronRight size={13} />
        </button>
      )}
    </div>
  );
}

export function V2Tabs<T extends string>({ tabs, active, onChange }: { tabs: { id: T; label: string; count?: number }[]; active: T; onChange: (id: T) => void }) {
  return (
    <div style={{ display: 'flex', gap: 6, padding: '4px', borderRadius: v2.radius.md, background: `${v2.brand.raised}88`, border: `1px solid ${v2.brand.border}` }}>
      {tabs.map((t) => {
        const isOn = t.id === active;
        return (
          <button key={t.id} type="button" onClick={() => onChange(t.id)}
            style={{ flex: 1, padding: '10px 8px', borderRadius: v2.radius.sm, border: 'none', cursor: 'pointer', fontFamily: v2.font, fontSize: 11, fontWeight: 700, background: isOn ? `${v2.brand.steel}22` : 'transparent', color: isOn ? v2.brand.steelLight : v2.brand.muted, boxShadow: isOn ? `0 0 0 1px ${v2.brand.steel}44` : 'none' }}>
            {t.label}{t.count !== undefined && <span style={{ marginLeft: 4, opacity: 0.7, fontSize: 9 }}>({t.count})</span>}
          </button>
        );
      })}
    </div>
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

export function V2ListRow({ icon, iconAccent = v2.brand.steel, title, subtitle, value, valueLabel, onClick }: { icon: ReactNode; iconAccent?: string; title: string; subtitle?: string; value?: string; valueLabel?: string; onClick?: () => void }) {
  return (
    <V2Card onClick={onClick} padding="14px 16px" accent={iconAccent} style={{ marginBottom: 10 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 13 }}>
        <div style={{ width: 42, height: 42, borderRadius: v2.radius.sm, background: `${iconAccent}14`, border: `1px solid ${iconAccent}33`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: iconAccent }}>{icon}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: neon.text, margin: 0 }}>{title}</p>
          {subtitle && <p style={{ fontSize: 10, color: neon.textMuted, margin: '3px 0 0' }}>{subtitle}</p>}
        </div>
        {value && <div style={{ textAlign: 'right' }}><p style={{ fontSize: 14, fontWeight: 800, color: iconAccent, margin: 0 }}>{value}</p>{valueLabel && <p style={{ fontSize: 9, color: v2.brand.muted, margin: '2px 0 0' }}>{valueLabel}</p>}</div>}
      </div>
    </V2Card>
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

export function V2BalanceHero({ balance, rank, stats, children }: { balance: number; rank?: number | null; stats: { label: string; value: string; accent?: string }[]; children?: ReactNode }) {
  return (
    <V2Card padding="22px 20px" accent={v2.brand.glow} style={{ background: v2.gradient.hero, border: `1px solid ${v2.brand.steel}33` }}>
      <div style={{ display: 'flex', alignItems: 'stretch', gap: 12 }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <V2Eyebrow accent={v2.brand.steelLight}>ARX-P Balance</V2Eyebrow>
            {rank && <div style={{ display: 'flex', alignItems: 'center', gap: 4, background: `${v2.brand.steel}18`, border: `1px solid ${v2.brand.steel}33`, borderRadius: 20, padding: '3px 10px' }}><div style={{ width: 5, height: 5, borderRadius: '50%', background: v2.brand.steel }} /><span style={{ color: v2.brand.steelLight, fontSize: 10, fontWeight: 800 }}>#{rank}</span></div>}
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 7, marginBottom: 4 }}>
            <span style={{ fontSize: 40, fontWeight: 800, letterSpacing: '-2px', color: v2.brand.steelBright, lineHeight: 1, opacity: balance === 0 ? 0.4 : 1 }}>{balance === 0 ? '···' : balance.toLocaleString()}</span>
            <span style={{ fontSize: 14, fontWeight: 700, color: v2.brand.steel }}>ARX-P</span>
          </div>
          <p style={{ fontSize: 9, color: v2.brand.muted, marginBottom: 16 }}>Your total mining rewards</p>
          <V2StatGrid stats={stats} />
        </div>
        {children}
      </div>
    </V2Card>
  );
}

export function V2MenuRow({ icon: Icon, label, sub, accent, onClick, badge }: { icon: LucideIcon; label: string; sub?: string; accent: string; onClick: () => void; badge?: string }) {
  return (
    <motion.button type="button" whileTap={{ scale: 0.98 }} onClick={onClick}
      style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px', marginBottom: 8, borderRadius: v2.radius.lg, border: `1px solid ${accent}22`, background: `linear-gradient(135deg, ${accent}08, transparent)`, cursor: 'pointer', textAlign: 'left', fontFamily: v2.font }}>
      <div style={{ width: 42, height: 42, borderRadius: v2.radius.sm, background: `${accent}18`, border: `1px solid ${accent}33`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><Icon size={18} color={accent} /></div>
      <div style={{ flex: 1, minWidth: 0 }}><p style={{ fontSize: 14, fontWeight: 700, color: neon.text, margin: 0 }}>{label}</p>{sub && <p style={{ fontSize: 10, color: neon.textMuted, margin: '2px 0 0' }}>{sub}</p>}</div>
      {badge && <span style={{ fontSize: 8, fontWeight: 800, padding: '3px 8px', borderRadius: 8, background: `${accent}22`, color: accent }}>{badge}</span>}
      <ChevronRight size={16} color={v2.brand.muted} />
    </motion.button>
  );
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
