import type { CSSProperties, ReactNode } from 'react';
import { font } from '@/walletFigma/tokens';

/** Dark page with faint scattered blue — Testnet home, used on every live screen except welcome. */
export function AppGloss() {
  const blob = (extra: CSSProperties): CSSProperties => ({
    position: 'absolute',
    borderRadius: '50%',
    filter: 'blur(78px)',
    pointerEvents: 'none',
    ...extra,
  });
  return (
    <div
      aria-hidden
      style={{
        position: 'absolute',
        inset: 0,
        overflow: 'hidden',
        pointerEvents: 'none',
        zIndex: 0,
        backgroundColor: '#050505',
        backgroundImage: 'radial-gradient(ellipse 120% 70% at 50% -10%, rgba(61,109,255,0.10) 0%, rgba(26,61,158,0.04) 38%, transparent 70%)',
      }}
    >
      <span style={blob({ width: 320, height: 230, left: -110, top: -70, background: 'rgba(61,109,255,0.13)' })} />
      <span style={blob({ width: 250, height: 200, right: -100, top: 150, background: 'rgba(61,109,255,0.09)' })} />
      <span style={blob({ width: 280, height: 220, left: -90, top: 380, background: 'rgba(33,62,115,0.18)' })} />
      <span style={blob({ width: 300, height: 240, right: -80, bottom: 40, background: 'rgba(61,109,255,0.10)' })} />
      <span style={blob({ width: 210, height: 170, left: 90, bottom: -50, background: 'rgba(172,202,254,0.05)' })} />
    </div>
  );
}

export const frostWash: CSSProperties = {
  background: 'radial-gradient(120% 90% at 88% 0%, rgba(172,202,254,0.95) 0%, rgba(232,240,255,0.7) 38%, #ffffff 72%), linear-gradient(180deg, #ffffff 0%, #eef3ff 100%)',
};

export const frostField: CSSProperties = {
  ...frostWash,
  boxSizing: 'border-box',
  border: '1px solid rgba(61,109,255,0.32)',
  borderRadius: 14,
  display: 'flex',
  alignItems: 'center',
  gap: 12,
  boxShadow: '0 8px 20px rgba(0,0,0,0.14)',
};

export const frostInput: CSSProperties = {
  flex: 1,
  minWidth: 0,
  border: 'none',
  outline: 'none',
  background: 'transparent',
  color: '#0c1018',
  caretColor: '#0c1018',
  fontFamily: font.sans,
  fontSize: 15,
};

export const frostIcon: CSSProperties = { filter: 'brightness(0)', opacity: 0.5, flexShrink: 0 };

/** Compact white+blue instruction card — same wash as the Mainnet home hero. */
export const hintCard: CSSProperties = {
  ...frostWash,
  border: '1px solid rgba(61,109,255,0.32)',
  borderRadius: 14,
  padding: '8px 12px',
  boxShadow: '0 6px 14px rgba(0,0,0,0.12)',
  boxSizing: 'border-box',
};

export const frostPanel: CSSProperties = {
  ...frostWash,
  border: '1px solid rgba(61,109,255,0.32)',
  borderRadius: 16,
  boxShadow: '0 8px 18px rgba(0,0,0,0.12)',
  boxSizing: 'border-box',
};

/** Compact token-list row: label left, value right, black type on frost. */
export function FrostLine({ label, value, tone }: { label: string; value: string; tone?: 'bad' }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, minHeight: 32, padding: '3px 0' }}>
      <span style={{ fontSize: 12, fontWeight: 600, color: '#5c6578', flexShrink: 0 }}>{label}</span>
      <span style={{ fontSize: 13, fontWeight: 700, color: tone === 'bad' ? '#f25252' : '#0c1018', textAlign: 'right', minWidth: 0, wordBreak: 'break-all', lineHeight: 1.25 }}>{value}</span>
    </div>
  );
}

export function FrostNote({ title, body, icon }: { title: string; body: string; icon?: ReactNode }) {
  return (
    <div style={{ ...frostPanel, padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 10 }}>
      <span style={{ width: 28, height: 28, borderRadius: 8, background: 'rgba(61,109,255,0.16)', color: '#3d6dff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        {icon ?? <BlueShield />}
      </span>
      <span style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
        <span style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#0c1018', lineHeight: 1.2 }}>{title}</span>
        <span style={{ display: 'block', marginTop: 3, fontSize: 11, fontWeight: 500, color: '#3a4254', lineHeight: 1.35 }}>{body}</span>
      </span>
    </div>
  );
}

function BlueShield() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M12 3.2 5 6.4v5.3c0 4.4 2.9 7.5 7 9.1 4.1-1.6 7-4.7 7-9.1V6.4L12 3.2Z" fill="#3d6dff" />
    </svg>
  );
}

export const frostAvail: CSSProperties = {
  ...frostWash,
  minWidth: 148,
  height: 36,
  padding: '0 12px',
  borderRadius: 12,
  border: '1px solid rgba(61,109,255,0.32)',
  color: '#0c1018',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  textAlign: 'center',
  fontFamily: font.sans,
  fontSize: 12,
  fontWeight: 600,
  lineHeight: 1.2,
  boxSizing: 'border-box',
  boxShadow: '0 6px 14px rgba(0,0,0,0.12)',
};

export function HintCard({ title, body, icon }: { title?: string; body: string; icon?: ReactNode }) {
  const mark = icon ? <span style={{ display: 'flex', flexShrink: 0, filter: 'brightness(0)', opacity: 0.72 }}>{icon}</span> : null;
  return (
    <div style={hintCard}>
      {title ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {mark}
          <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: '#0c1018', lineHeight: 1.2 }}>{title}</p>
        </div>
      ) : null}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6, marginTop: title ? 4 : 0 }}>
        {!title ? mark : null}
        <p style={{ margin: 0, flex: 1, minWidth: 0, fontSize: 11, fontWeight: 500, color: '#3a4254', lineHeight: 1.35 }}>{body}</p>
      </div>
    </div>
  );
}

export const FROST_PLACEHOLDER_CSS = `.frost-input::placeholder{color:#7a8294}`;

/** Sliding pill used by Wallet/Mining and Receive public/shielded. */
export function IceToggle({
  left,
  right,
  onRight,
  onLeft,
  onRightPick,
  label,
  width = 180,
}: {
  left: string;
  right: string;
  onRight: boolean;
  onLeft: () => void;
  onRightPick: () => void;
  label: string;
  width?: number;
}) {
  const pad = 3;
  const pillW = (width - pad * 2) / 2;
  return (
    <div
      role="tablist"
      aria-label={label}
      style={{
        position: 'relative',
        width,
        height: 40,
        boxSizing: 'border-box',
        padding: pad,
        borderRadius: 20,
        background: 'rgba(8,10,16,0.45)',
        backdropFilter: 'blur(18px)',
        WebkitBackdropFilter: 'blur(18px)',
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.14)',
        border: '1px solid rgba(255,255,255,0.12)',
        touchAction: 'manipulation',
      }}
    >
      <div
        aria-hidden
        style={{
          position: 'absolute',
          top: pad,
          left: onRight ? pad + pillW : pad,
          width: pillW,
          height: 34,
          borderRadius: 17,
          ...frostWash,
          boxShadow: '0 4px 12px rgba(0,0,0,0.18)',
          transition: 'left 160ms ease',
        }}
      />
      <div style={{ position: 'relative', zIndex: 1, display: 'flex', height: 34 }}>
        <button
          type="button"
          role="tab"
          aria-selected={!onRight}
          onClick={(event) => {
            event.stopPropagation();
            onLeft();
          }}
          style={iceBtn(!onRight)}
        >
          {left}
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={onRight}
          onClick={(event) => {
            event.stopPropagation();
            onRightPick();
          }}
          style={iceBtn(onRight)}
        >
          {right}
        </button>
      </div>
    </div>
  );
}

function iceBtn(on: boolean): CSSProperties {
  return {
    flex: 1,
    height: 34,
    border: 'none',
    background: 'transparent',
    cursor: 'pointer',
    color: on ? '#0c1018' : '#8c8f99',
    fontFamily: font.sans,
    fontSize: 13,
    fontWeight: 600,
    lineHeight: '34px',
    padding: 0,
    touchAction: 'manipulation',
  };
}

/** Tokens / History sheet on live home. Reuse for list sections across live wallet pages. */
export const sheetGlass: CSSProperties = {
  border: '1px solid rgba(255,255,255,0.08)',
  background: 'rgba(10,12,16,0.88)',
  backdropFilter: 'blur(22px)',
  WebkitBackdropFilter: 'blur(22px)',
  boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.08)',
};

export function SheetCard({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  return (
    <div style={{ borderRadius: 22, padding: '2px 12px 8px', boxSizing: 'border-box', overflow: 'hidden', ...sheetGlass, ...style }}>
      {children}
    </div>
  );
}

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

export function BackChip({ onBack }: { onBack: () => void }) {
  return (
    <button
      type="button"
      aria-label="Back"
      onClick={(event) => {
        event.stopPropagation();
        onBack();
      }}
      style={backBtn}
    >
      <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true">
        <path d="M12.5 4.5L7 10l5.5 5.5" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </button>
  );
}

export function PullHint({ pull, busy }: { pull: number; busy: boolean }) {
  if (pull <= 6 && !busy) return null;
  return (
    <p style={{ margin: 0, padding: '2px 0 4px', minHeight: 16, textAlign: 'center', fontSize: 11, fontWeight: 600, color: '#accafe', letterSpacing: 0.2 }}>
      {busy ? 'Refreshing…' : pull > 28 ? 'Release to refresh' : 'Pull to refresh'}
    </p>
  );
}

export function LiveHead({ title, onBack }: { title: string; onBack: () => void }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', minHeight: 44, marginBottom: 12 }}>
      <BackChip onBack={onBack} />
      <p style={{ flex: 1, margin: 0, textAlign: 'center', fontFamily: font.sans, fontSize: 17, fontWeight: 700 }}>{title}</p>
      <span style={{ width: 44 }} />
    </div>
  );
}

/** Per-row History / token-list card. */
export const itemCard: CSSProperties = {
  width: '100%',
  maxWidth: '100%',
  minWidth: 0,
  border: '1px solid rgba(255,255,255,0.08)',
  background: 'rgba(10,12,16,0.88)',
  color: '#fff',
  borderRadius: 18,
  padding: '12px 14px',
  display: 'flex',
  alignItems: 'center',
  gap: 12,
  textAlign: 'left',
  fontFamily: font.sans,
  cursor: 'pointer',
  boxSizing: 'border-box',
  overflow: 'hidden',
  boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.08)',
};

/** Static navy wash used on Testnet cluster / Shield / Private pay / Unshield / Faucet. No glow animation. */
export const clusterBlue: CSSProperties = {
  border: '1px solid rgba(172,202,254,0.28)',
  background: 'radial-gradient(ellipse 130% 90% at 50% -12%, rgba(90,140,255,0.55) 0%, rgba(33,62,115,0.48) 36%, rgba(16,24,42,0.92) 78%)',
  boxShadow: 'inset 0 1px 0 rgba(172,202,254,0.38), 0 10px 26px rgba(33,62,115,0.28)',
};

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

export { Unavailable } from './FailSheet';

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
  position: 'relative',
  zIndex: 12,
  pointerEvents: 'auto',
};
