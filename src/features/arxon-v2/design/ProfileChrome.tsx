import { type CSSProperties, type ReactNode } from 'react';
import { motion } from 'framer-motion';
import { frostWash, sheetGlass } from '@/walletFigma/flow/LiveScroll';
import { mobileTopPaddingPage } from '@/lib/mobileLayout';
import { useGoBack } from '@/lib/navBack';
import { neon } from './neonTokens';

export const pc = {
  ink: '#0c1018',
  muted: '#5c6370',
  soft: '#8c8f99',
  cream: '#accafe',
  danger: '#f25252',
  good: '#3ddc84',
  glyph: '#1c2025',
  page: '#0a0c10',
} as const;

export const glassSheet: CSSProperties = {
  borderRadius: 22,
  padding: '4px 12px 6px',
  boxSizing: 'border-box',
  overflow: 'hidden',
  ...sheetGlass,
};

export const frostCard: CSSProperties = {
  ...frostWash,
  borderRadius: 22,
  border: '1px solid rgba(61,109,255,0.32)',
  boxShadow: '0 10px 28px rgba(0,0,0,0.18)',
  boxSizing: 'border-box',
};

export function ProfileHead({
  title,
  subtitle,
  onBack,
  right,
}: {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  right?: ReactNode;
}) {
  const historyBack = useGoBack();
  const handleBack = onBack ?? historyBack;
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        gap: 10,
        padding: `${mobileTopPaddingPage()} 16px 14px`,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, minWidth: 0, flex: 1 }}>
        {handleBack ? (
          <motion.button
            type="button"
            aria-label="Back"
            whileTap={{ scale: 0.92 }}
            onClick={handleBack}
            style={{
              width: 38, height: 38, borderRadius: 19, flexShrink: 0,
              border: '1px solid rgba(255,255,255,0.14)',
              background: 'rgba(255,255,255,0.06)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer',
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </motion.button>
        ) : null}
        <div style={{ minWidth: 0, paddingTop: 2 }}>
          <h1
            style={{
              margin: 0,
              fontSize: 22,
              fontWeight: 750,
              letterSpacing: '-0.5px',
              lineHeight: 1.15,
              color: '#fff',
              fontFamily: neon.font,
            }}
          >
            {title}
          </h1>
          {subtitle ? (
            <p style={{ margin: '4px 0 0', fontSize: 13, fontWeight: 500, color: pc.soft, lineHeight: 1.35, fontFamily: neon.font }}>
              {subtitle}
            </p>
          ) : null}
        </div>
      </div>
      {right}
    </div>
  );
}

export function SectionLabel({ children, color = pc.soft }: { children: ReactNode; color?: string }) {
  return (
    <p style={{ margin: '0 2px 8px', fontSize: 11, fontWeight: 650, color, fontFamily: neon.font }}>
      {children}
    </p>
  );
}

export function GlassSheet({ children, title, danger, style }: { children: ReactNode; title?: string; danger?: boolean; style?: CSSProperties }) {
  return (
    <div style={{ marginBottom: 12 }}>
      {title ? <SectionLabel color={danger ? '#ff8a8a' : pc.soft}>{title}</SectionLabel> : null}
      <div
        style={{
          ...glassSheet,
          ...(danger
            ? { border: '1px solid rgba(242,82,82,0.5)', background: 'rgba(242,82,82,0.10)' }
            : null),
          ...style,
        }}
      >
        {children}
      </div>
    </div>
  );
}

export function FrostPanel({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  return (
    <div style={{ ...frostCard, padding: '16px 16px 14px', marginBottom: 12, ...style }}>
      {children}
    </div>
  );
}

export function TokenRow({
  icon,
  title,
  sub,
  trailing,
  onClick,
  danger,
  wrap,
  glyphBg,
}: {
  icon?: ReactNode;
  title: string;
  sub?: ReactNode;
  trailing?: ReactNode;
  onClick?: () => void;
  danger?: boolean;
  wrap?: boolean;
  glyphBg?: string;
}) {
  const inner = (
    <>
      {icon ? (
        <span
          style={{
            width: 32, height: 32, borderRadius: 16, flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: glyphBg || (danger ? pc.danger : pc.glyph),
            color: '#fff',
          }}
        >
          {icon}
        </span>
      ) : null}
      <span style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 3, textAlign: 'left' }}>
        <span
          style={{
            fontSize: 13,
            fontWeight: 600,
            color: danger ? '#ff8a8a' : '#fff',
            overflow: wrap ? 'visible' : 'hidden',
            textOverflow: wrap ? undefined : 'ellipsis',
            whiteSpace: wrap ? 'normal' : 'nowrap',
            lineHeight: 1.3,
            fontFamily: neon.font,
          }}
        >
          {title}
        </span>
        {sub ? (
          <span
            style={{
              fontSize: 12,
              fontWeight: 500,
              color: danger ? 'rgba(255,138,138,0.8)' : pc.soft,
              lineHeight: 1.45,
              overflow: wrap ? 'visible' : 'hidden',
              textOverflow: wrap ? undefined : 'ellipsis',
              whiteSpace: wrap ? 'normal' : 'nowrap',
              fontFamily: neon.font,
            }}
          >
            {sub}
          </span>
        ) : null}
      </span>
      {trailing}
    </>
  );

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        style={{
          width: '100%',
          minHeight: 52,
          display: 'flex',
          alignItems: wrap ? 'flex-start' : 'center',
          gap: 10,
          border: 'none',
          background: 'none',
          color: '#fff',
          padding: wrap ? '10px 0' : '8px 0',
          cursor: 'pointer',
          fontFamily: neon.font,
          textAlign: 'left',
        }}
      >
        {inner}
      </button>
    );
  }

  return (
    <div
      style={{
        width: '100%',
        minHeight: 52,
        display: 'flex',
        alignItems: wrap ? 'flex-start' : 'center',
        gap: 10,
        padding: wrap ? '10px 0' : '8px 0',
        boxSizing: 'border-box',
      }}
    >
      {inner}
    </div>
  );
}

export function PrimaryBtn({
  label,
  onClick,
  disabled,
  danger,
}: {
  label: string;
  onClick?: () => void;
  disabled?: boolean;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      style={{
        width: '100%',
        height: 48,
        borderRadius: 14,
        border: 'none',
        background: danger ? pc.danger : pc.cream,
        color: danger ? '#fff' : pc.ink,
        fontFamily: neon.font,
        fontSize: 15,
        fontWeight: 700,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.55 : 1,
      }}
    >
      {label}
    </button>
  );
}

export function GhostBtn({ label, onClick }: { label: string; onClick?: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        width: '100%',
        height: 44,
        marginTop: 8,
        borderRadius: 14,
        border: '1px solid rgba(255,255,255,0.14)',
        background: 'transparent',
        color: '#fff',
        fontFamily: neon.font,
        fontSize: 14,
        fontWeight: 650,
        cursor: 'pointer',
      }}
    >
      {label}
    </button>
  );
}

export function SegmentTabs<T extends string>({
  tabs,
  active,
  onChange,
}: {
  tabs: { id: T; label: string }[];
  active: T;
  onChange: (id: T) => void;
}) {
  return (
    <div
      style={{
        display: 'flex',
        gap: 4,
        padding: 4,
        borderRadius: 18,
        background: '#1c2025',
        marginBottom: 14,
      }}
    >
      {tabs.map((tab) => {
        const on = tab.id === active;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onChange(tab.id)}
            style={{
              flex: 1,
              height: 32,
              border: 'none',
              borderRadius: 14,
              background: on ? '#fff' : 'transparent',
              color: on ? pc.ink : pc.soft,
              fontSize: 12,
              fontWeight: 650,
              fontFamily: neon.font,
              cursor: 'pointer',
              boxShadow: on ? '0 2px 8px rgba(12,16,24,0.18)' : 'none',
            }}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}

export function NeonToggle({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return (
    <div
      onClick={(e) => { e.stopPropagation(); onToggle(); }}
      role="switch"
      aria-checked={on}
      style={{
        width: 44, height: 24, borderRadius: 12, cursor: 'pointer', position: 'relative', flexShrink: 0,
        background: on ? 'rgba(172,202,254,0.35)' : 'rgba(255,255,255,0.06)',
        border: `1px solid ${on ? 'rgba(172,202,254,0.55)' : 'rgba(255,255,255,0.08)'}`,
      }}
    >
      <div
        style={{
          position: 'absolute', top: 3, left: on ? 23 : 3, width: 16, height: 16, borderRadius: '50%',
          background: on ? pc.cream : 'rgba(184,239,248,0.35)',
          transition: 'left 0.22s',
        }}
      />
    </div>
  );
}

export function Field({
  value,
  onChange,
  placeholder,
  type = 'text',
  trailing,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  trailing?: ReactNode;
}) {
  return (
    <div
      style={{
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        height: 48,
        borderRadius: 14,
        background: pc.glyph,
        border: '1px solid rgba(255,255,255,0.08)',
        padding: '0 12px',
        marginBottom: 10,
      }}
    >
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        style={{
          flex: 1,
          minWidth: 0,
          height: '100%',
          background: 'none',
          border: 'none',
          outline: 'none',
          color: '#fff',
          fontSize: 14,
          fontWeight: 550,
          fontFamily: neon.font,
        }}
      />
      {trailing}
    </div>
  );
}

export function EmptyCopy({ title, body }: { title: string; body: string }) {
  return (
    <div style={{ padding: '28px 8px', textAlign: 'center' }}>
      <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#fff', fontFamily: neon.font }}>{title}</p>
      <p style={{ margin: '6px 0 0', fontSize: 13, lineHeight: 1.45, color: pc.soft, fontFamily: neon.font }}>{body}</p>
    </div>
  );
}

export function Body({ children, ink }: { children: ReactNode; ink?: boolean }) {
  return (
    <p
      style={{
        margin: 0,
        fontSize: 13,
        fontWeight: 500,
        lineHeight: 1.5,
        color: ink ? pc.muted : pc.soft,
        fontFamily: neon.font,
      }}
    >
      {children}
    </p>
  );
}
