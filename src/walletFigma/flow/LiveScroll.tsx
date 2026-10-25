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

export function Unavailable({ title, body, onBack }: { title: string; body: string; onBack: () => void }) {
  return (
    <LiveScroll>
      <LiveHead title={title} onBack={onBack} />
      <p style={{ margin: '28px 0 0', fontFamily: font.sans, fontSize: 22, fontWeight: 700 }}>Not available yet</p>
      <p style={{ margin: '10px 0 0', fontFamily: font.sans, color: '#8b9097', fontSize: 15, lineHeight: 1.45 }}>{body}</p>
    </LiveScroll>
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
