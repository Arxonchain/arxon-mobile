import { useState } from 'react';
import { ChevronLeft } from 'lucide-react';
import { FORGE_UI } from '../data/uiAssets';

/**
 * Toy-3D game UI kit — glossy candy buttons with a pressed-ridge treatment,
 * ribbon banners and panels shared across hub, pause and result screens.
 */

type GlossyColor = 'gold' | 'cyan' | 'green' | 'red' | 'slate';

const COLORS: Record<GlossyColor, { grad: string; ridge: string; border: string; text: string; glow: string }> = {
  gold: {
    grad: 'linear-gradient(180deg,#ffe89a 0%,#ffc93c 40%,#ff9d1b 100%)',
    ridge: '#a85a06', border: '#7d4203', text: '#5b2e00',
    glow: 'rgba(255,201,60,0.45)',
  },
  cyan: {
    grad: 'linear-gradient(180deg,#b8f4ff 0%,#4FD8EB 45%,#1592b4 100%)',
    ridge: '#0b5a73', border: '#08455a', text: '#013647',
    glow: 'rgba(79,216,235,0.45)',
  },
  green: {
    grad: 'linear-gradient(180deg,#c9f77e 0%,#84d92f 45%,#4ba412 100%)',
    ridge: '#2e6f0a', border: '#245808', text: '#173f02',
    glow: 'rgba(132,217,47,0.4)',
  },
  red: {
    grad: 'linear-gradient(180deg,#ffb3a0 0%,#ff7757 45%,#e04a26 100%)',
    ridge: '#8f2b0e', border: '#6f2009', text: '#521503',
    glow: 'rgba(255,119,87,0.4)',
  },
  slate: {
    grad: 'linear-gradient(180deg,#3d5a78 0%,#24405c 50%,#152c44 100%)',
    ridge: '#0a1828', border: '#0a1a2e', text: '#cfe8f5',
    glow: 'rgba(79,216,235,0.2)',
  },
};

interface GlossyButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  color?: GlossyColor;
  disabled?: boolean;
  size?: 'md' | 'lg' | 'xl';
  fullWidth?: boolean;
  style?: React.CSSProperties;
}

export function GlossyButton({
  children, onClick, color = 'gold', disabled, size = 'md', fullWidth = true, style,
}: GlossyButtonProps) {
  const [pressed, setPressed] = useState(false);
  const c = COLORS[color];
  const ridge = size === 'xl' ? 6 : size === 'lg' ? 5 : 4;
  const pad = size === 'xl' ? '18px 30px' : size === 'lg' ? '14px 24px' : '11px 18px';
  const fs = size === 'xl' ? 26 : size === 'lg' ? 17 : 13;
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      onPointerDown={() => !disabled && setPressed(true)}
      onPointerUp={() => setPressed(false)}
      onPointerLeave={() => setPressed(false)}
      style={{
        position: 'relative',
        width: fullWidth ? '100%' : undefined,
        padding: pad,
        borderRadius: 16,
        border: `2px solid ${c.border}`,
        background: c.grad,
        color: c.text,
        fontSize: fs,
        fontWeight: 900,
        letterSpacing: '0.08em',
        textTransform: 'uppercase',
        fontFamily: "'Creato Display', system-ui, sans-serif",
        cursor: disabled ? 'default' : 'pointer',
        opacity: disabled ? 0.45 : 1,
        transform: pressed ? `translateY(${ridge - 1}px)` : 'translateY(0)',
        boxShadow: pressed
          ? `0 1px 0 ${c.ridge}, inset 0 2px 0 rgba(255,255,255,0.5), 0 2px 10px rgba(0,0,0,0.4)`
          : `0 ${ridge}px 0 ${c.ridge}, inset 0 2px 0 rgba(255,255,255,0.55), inset 0 -3px 6px rgba(0,0,0,0.12), 0 ${ridge + 6}px 18px rgba(0,0,0,0.45), 0 0 24px ${c.glow}`,
        transition: 'transform 0.07s ease, box-shadow 0.07s ease',
        textShadow: '0 1px 0 rgba(255,255,255,0.45)',
        WebkitTapHighlightColor: 'transparent',
        ...style,
      }}
    >
      {/* top gloss sweep */}
      <span style={{
        position: 'absolute', top: 2, left: '6%', right: '6%', height: '42%',
        borderRadius: 12, pointerEvents: 'none',
        background: 'linear-gradient(180deg, rgba(255,255,255,0.5), rgba(255,255,255,0.02))',
      }} />
      <span style={{ position: 'relative' }}>{children}</span>
    </button>
  );
}

interface GlossyIconButtonProps {
  children: React.ReactNode;
  label: string;
  onClick?: () => void;
  color?: GlossyColor;
  size?: number;
  badge?: string | number | null;
  disabled?: boolean;
  caption?: string;
}

export function GlossyIconButton({
  children, label, onClick, color = 'green', size = 62, badge, disabled, caption,
}: GlossyIconButtonProps) {
  const [pressed, setPressed] = useState(false);
  const c = COLORS[color];
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5 }}>
      <button
        type="button"
        aria-label={label}
        disabled={disabled}
        onClick={onClick}
        onPointerDown={() => !disabled && setPressed(true)}
        onPointerUp={() => setPressed(false)}
        onPointerLeave={() => setPressed(false)}
        style={{
          position: 'relative',
          width: size, height: size,
          borderRadius: size * 0.3,
          border: `2px solid ${c.border}`,
          background: c.grad,
          color: '#fff',
          cursor: disabled ? 'default' : 'pointer',
          opacity: disabled ? 0.45 : 1,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transform: pressed ? 'translateY(3px)' : 'translateY(0)',
          boxShadow: pressed
            ? `0 1px 0 ${c.ridge}, inset 0 2px 0 rgba(255,255,255,0.5)`
            : `0 4px 0 ${c.ridge}, inset 0 2px 0 rgba(255,255,255,0.55), inset 0 -3px 6px rgba(0,0,0,0.15), 0 8px 16px rgba(0,0,0,0.45)`,
          transition: 'transform 0.07s ease, box-shadow 0.07s ease',
          WebkitTapHighlightColor: 'transparent',
          flexShrink: 0,
        }}
      >
        <span style={{
          position: 'absolute', top: 2, left: '10%', right: '10%', height: '40%',
          borderRadius: size * 0.22, pointerEvents: 'none',
          background: 'linear-gradient(180deg, rgba(255,255,255,0.48), rgba(255,255,255,0.02))',
        }} />
        <span style={{ position: 'relative', filter: 'drop-shadow(0 2px 2px rgba(0,0,0,0.35))', display: 'flex' }}>
          {children}
        </span>
        {badge != null && (
          <span style={{
            position: 'absolute', top: -6, right: -6,
            minWidth: 20, height: 20, padding: '0 5px', borderRadius: 10,
            background: 'linear-gradient(180deg,#ffe89a,#ff9d1b)',
            border: '1.5px solid #7d4203',
            color: '#5b2e00', fontSize: 10, fontWeight: 900,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 2px 4px rgba(0,0,0,0.4)',
          }}>
            {badge}
          </span>
        )}
      </button>
      {caption && (
        <span style={{
          fontSize: 9, fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase',
          color: 'rgba(255,255,255,0.75)', textShadow: '0 1px 3px rgba(0,0,0,0.8)',
        }}>
          {caption}
        </span>
      )}
    </div>
  );
}

/** Ribbon banner that sits half-overlapping the top edge of a panel */
export function RibbonBanner({ children, color = 'gold' }: { children: React.ReactNode; color?: GlossyColor }) {
  const c = COLORS[color];
  return (
    <div style={{
      position: 'absolute', top: 0, left: '50%', transform: 'translate(-50%, -55%)',
      padding: '10px 34px', borderRadius: 14,
      background: c.grad,
      border: `2px solid ${c.border}`,
      boxShadow: `0 5px 0 ${c.ridge}, inset 0 2px 0 rgba(255,255,255,0.55), 0 10px 24px rgba(0,0,0,0.5)`,
      fontSize: 17, fontWeight: 900, letterSpacing: '0.16em', textTransform: 'uppercase',
      color: c.text, textShadow: '0 1px 0 rgba(255,255,255,0.4)',
      fontFamily: "'Creato Display', system-ui, sans-serif",
      whiteSpace: 'nowrap', zIndex: 3,
    }}>
      {children}
    </div>
  );
}

/** Rounded navy game panel (image-1 style menu card) */
export function GamePanel({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{
      position: 'relative',
      borderRadius: 26,
      padding: '26px 20px 22px',
      background: 'linear-gradient(180deg, rgba(21,54,86,0.92) 0%, rgba(9,26,48,0.96) 100%)',
      border: '2px solid rgba(79,216,235,0.3)',
      boxShadow: '0 6px 0 rgba(3,14,28,0.9), inset 0 2px 0 rgba(255,255,255,0.12), inset 0 0 40px rgba(79,216,235,0.05), 0 24px 60px rgba(0,0,0,0.6)',
      ...style,
    }}>
      {children}
    </div>
  );
}

/** Blurred treasure backdrop + vignette shared by every forge screen */
export function TreasureBackdrop({ blur = 8, brightness = 0.6 }: { blur?: number; brightness?: number }) {
  return (
    <>
      <div style={{
        position: 'absolute', inset: -20,
        backgroundImage: `url(${FORGE_UI.treasureBg})`,
        backgroundSize: 'cover', backgroundPosition: 'center bottom',
        filter: `blur(${blur}px) brightness(${brightness}) saturate(1.12)`,
        transform: 'scale(1.08)',
      }} />
      <div style={{
        position: 'absolute', inset: 0,
        background: 'radial-gradient(ellipse 92% 70% at 50% 40%, rgba(2,6,14,0.18) 0%, rgba(2,6,14,0.75) 100%), linear-gradient(180deg, rgba(2,6,14,0.5) 0%, transparent 28%)',
      }} />
    </>
  );
}

/** Glossy circular back button used on sub-pages */
export function GlossyBackButton({ onClick }: { onClick: () => void }) {
  return (
    <GlossyIconButton label="Back" color="slate" size={44} onClick={onClick}>
      <ChevronLeft size={22} strokeWidth={3.2} />
    </GlossyIconButton>
  );
}

export function TimerRing({ timeLeft, total, urgent, size = 46 }: {
  timeLeft: number; total: number; urgent: boolean; size?: number;
}) {
  const pct = total > 0 ? timeLeft / total : 0;
  const r = size * 0.42;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - pct);
  const stroke = urgent ? '#ff6b4a' : '#4FD8EB';
  const half = size / 2;
  return (
    <svg width={size} height={size} style={{ display: 'block' }}>
      <circle cx={half} cy={half} r={r} fill="rgba(2,10,20,0.85)" stroke="rgba(79,216,235,0.15)" strokeWidth={3.5} />
      <circle cx={half} cy={half} r={r} fill="none" stroke={stroke} strokeWidth={3.5}
        strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
        transform={`rotate(-90 ${half} ${half})`}
        style={{ transition: 'stroke-dashoffset 0.9s linear', filter: `drop-shadow(0 0 5px ${stroke})` }}
      />
      <text x={half} y={half + 4.5} textAnchor="middle" fontSize={size * 0.3} fontWeight={900} fill={stroke}
        fontFamily="'Creato Display', system-ui, sans-serif">
        {timeLeft}
      </text>
    </svg>
  );
}
