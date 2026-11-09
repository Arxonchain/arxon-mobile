import type { CSSProperties, ReactNode } from 'react';
import { font } from '@/walletFigma/tokens';

const frostPanel: CSSProperties = {
  background: 'radial-gradient(120% 90% at 88% 0%, rgba(172,202,254,0.95) 0%, rgba(232,240,255,0.7) 38%, #ffffff 72%), linear-gradient(180deg, #ffffff 0%, #eef3ff 100%)',
  border: '1px solid rgba(61,109,255,0.32)',
  borderRadius: 16,
  boxShadow: '0 8px 18px rgba(0,0,0,0.12)',
  boxSizing: 'border-box',
};

function FrostLine({ label, value, tone }: { label: string; value: string; tone?: 'bad' }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, minHeight: 32, padding: '3px 0' }}>
      <span style={{ fontSize: 12, fontWeight: 600, color: '#5c6578', flexShrink: 0 }}>{label}</span>
      <span style={{ fontSize: 13, fontWeight: 700, color: tone === 'bad' ? '#f25252' : '#0c1018', textAlign: 'right', minWidth: 0, wordBreak: 'break-all', lineHeight: 1.25 }}>{value}</span>
    </div>
  );
}

export function FailSheet({
  kicker,
  title,
  why,
  rows,
  primary,
  secondary,
  onPrimary,
  onSecondary,
  danger = true,
  onBack,
  extra,
}: {
  kicker: string;
  title: string;
  why: string;
  rows?: { label: string; value: string; tone?: 'bad' }[];
  primary: string;
  secondary?: string;
  onPrimary: () => void;
  onSecondary?: () => void;
  danger?: boolean;
  onBack?: () => void;
  extra?: ReactNode;
}) {
  return (
    <div style={{ position: 'absolute', inset: 0, background: '#050505' }}>
      {onBack ? (
        <button type="button" aria-label="Back" onClick={onBack} style={back}>
          <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true">
            <path d="M12.5 4.5L7 10l5.5 5.5" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      ) : null}
      <div style={{ position: 'absolute', left: 24, right: 24, top: '50%', transform: 'translateY(-50%)', ...frostPanel, padding: '18px 16px 16px' }}>
        <div style={{ ...mark, background: danger ? 'rgba(242,82,82,0.14)' : 'rgba(61,109,255,0.16)' }}>
          {danger ? <FailMark /> : <InfoMark />}
        </div>
        <p style={kickerStyle}>{kicker}</p>
        <p style={titleStyle}>{title}</p>
        <p style={whyStyle}>{why}</p>
        {rows && rows.length > 0 ? (
          <div style={rowBox}>
            {rows.map((row) => (
              <FrostLine key={row.label} label={row.label} value={row.value} tone={row.tone} />
            ))}
          </div>
        ) : null}
        {extra}
        <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <button type="button" onClick={onPrimary} style={primaryBtn}>{primary}</button>
          {secondary && onSecondary ? (
            <button type="button" onClick={onSecondary} style={ghostBtn}>{secondary}</button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function FailMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M7 7l10 10M17 7 7 17" stroke="#f25252" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  );
}

function InfoMark() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M12 8v5M12 16.5h.01M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" stroke="#3d6dff" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

const back: CSSProperties = {
  position: 'absolute',
  left: 16,
  top: 'max(48px, calc(env(safe-area-inset-top, 0px) + 12px))',
  width: 44,
  height: 44,
  borderRadius: 22,
  border: 'none',
  background: '#1c2025',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  cursor: 'pointer',
  padding: 0,
  zIndex: 12,
};

const mark: CSSProperties = {
  width: 40,
  height: 40,
  borderRadius: 20,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  margin: '0 auto 10px',
};

const kickerStyle: CSSProperties = {
  margin: 0,
  textAlign: 'center',
  fontFamily: font.sans,
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: 0.4,
  color: '#5c6578',
  textTransform: 'uppercase',
};

const titleStyle: CSSProperties = {
  margin: '6px 0 0',
  textAlign: 'center',
  fontFamily: font.sans,
  fontSize: 20,
  fontWeight: 800,
  color: '#0c1018',
  lineHeight: 1.2,
};

const whyStyle: CSSProperties = {
  margin: '8px 0 0',
  textAlign: 'center',
  fontFamily: font.sans,
  fontSize: 13,
  fontWeight: 500,
  color: '#3a4254',
  lineHeight: 1.35,
};

const rowBox: CSSProperties = {
  marginTop: 12,
  background: 'rgba(255,255,255,0.55)',
  border: '1px solid rgba(61,109,255,0.18)',
  borderRadius: 12,
  padding: '4px 12px',
};

const primaryBtn: CSSProperties = {
  height: 44,
  border: 'none',
  borderRadius: 12,
  background: '#accafe',
  color: '#0c1018',
  fontFamily: font.sans,
  fontSize: 14,
  fontWeight: 700,
  cursor: 'pointer',
};

export function Unavailable({ title, body, onBack }: { title: string; body: string; onBack: () => void }) {
  return (
    <FailSheet
      kicker={title}
      title="Not available yet"
      why={body}
      danger={false}
      primary="Back"
      onPrimary={onBack}
      onBack={onBack}
    />
  );
}

const ghostBtn: CSSProperties = {
  height: 40,
  border: '1px solid rgba(12,16,24,0.16)',
  borderRadius: 12,
  background: 'transparent',
  color: '#0c1018',
  fontFamily: font.sans,
  fontSize: 13,
  fontWeight: 600,
  cursor: 'pointer',
};
