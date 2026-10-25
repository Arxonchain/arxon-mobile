import type { CSSProperties, ReactNode } from 'react';
import { font } from '@/walletFigma/tokens';

/** Live screens scroll inside the phone frame. Flow Studio demos keep absolute positions. */
export function LiveScroll({ children }: { children: ReactNode }) {
  return (
    <div
      className="arxon-token-scroll"
      style={{
        position: 'absolute',
        left: 0,
        top: 0,
        bottom: 0,
        width: 390,
        overflowY: 'auto',
        WebkitOverflowScrolling: 'touch',
        touchAction: 'pan-y',
        boxSizing: 'border-box',
        padding: '8px 18px calc(28px + env(safe-area-inset-bottom, 0px))',
      }}
    >
      {children}
    </div>
  );
}

export function LiveHead({ title, onBack }: { title: string; onBack: () => void }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', minHeight: 44, marginBottom: 12 }}>
      <button type="button" aria-label="Back" onClick={onBack} style={backBtn}>
        <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true">
          <path d="M12.5 4.5L7 10l5.5 5.5" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      <p style={{ flex: 1, margin: 0, textAlign: 'center', fontFamily: font.sans, fontSize: 17, fontWeight: 700 }}>{title}</p>
      <span style={{ width: 44 }} />
    </div>
  );
}

export const livePrimary: CSSProperties = {
  width: '100%',
  height: 52,
  borderRadius: 12,
  border: 'none',
  background: '#accafe',
  color: '#0c1018',
  fontFamily: font.sans,
  fontSize: 16,
  fontWeight: 600,
  cursor: 'pointer',
};

export const liveGhost: CSSProperties = {
  ...livePrimary,
  background: 'transparent',
  color: '#accafe',
  border: '1px solid #2a3447',
};

/** Square balance chip. The label sits in the middle of the box. */
export const availableBox: CSSProperties = {
  minWidth: 148,
  height: 44,
  padding: '0 12px',
  borderRadius: 0,
  background: '#1c2025',
  color: '#c9cdd4',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  textAlign: 'center',
  fontFamily: font.sans,
  fontSize: 13,
  fontWeight: 500,
  lineHeight: 1.2,
  boxSizing: 'border-box',
};

export function Unavailable({ title, body, onBack }: { title: string; body: string; onBack: () => void }) {
  return (
    <div style={{ position: 'absolute', inset: 0, background: '#050505' }}>
      <button type="button" aria-label="Back" onClick={onBack} style={{ ...backBtn, position: 'absolute', left: 16, top: 'max(48px, calc(env(safe-area-inset-top, 0px) + 12px))' }}>
        <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true">
          <path d="M12.5 4.5L7 10l5.5 5.5" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      <div style={{ position: 'absolute', left: 24, right: 24, top: '46%', transform: 'translateY(-50%)', background: '#1c2126', border: '1px solid #29333d', borderRadius: 16, padding: '22px 18px' }}>
        <p style={{ margin: 0, fontFamily: font.sans, fontSize: 13, fontWeight: 600, letterSpacing: 0.4, color: '#8c8f99' }}>{title}</p>
        <p style={{ margin: '8px 0 0', fontFamily: font.sans, fontSize: 20, fontWeight: 700, lineHeight: 1.25 }}>Not available yet</p>
        <p style={{ margin: '8px 0 0', fontFamily: font.sans, color: '#c9cdd4', fontSize: 14, lineHeight: 1.4 }}>{body}</p>
      </div>
    </div>
  );
}

const backBtn: CSSProperties = {
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
  flexShrink: 0,
};
