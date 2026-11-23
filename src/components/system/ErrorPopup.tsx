import type { CSSProperties, ReactNode } from 'react';
import {
  AlertCircle,
  Camera,
  Clock,
  Dices,
  Gift,
  KeyRound,
  Lock,
  Send,
  ShieldAlert,
  UserX,
  Wallet,
  WifiOff,
  X,
  Zap,
  type LucideIcon,
} from 'lucide-react';
import { frostWash } from '@/walletFigma/flow/LiveScroll';
import { neon } from '@/features/arxon-v2/design/neonTokens';
import {
  PUBLIC_ERROR_COPY,
  type PublicErrorKind,
} from '@/lib/publicError';

const ICONS: Record<PublicErrorKind, LucideIcon> = {
  network: WifiOff,
  timeout: Clock,
  session: Lock,
  claim: Gift,
  mining: Zap,
  wallet: Wallet,
  transfer: Send,
  upload: Camera,
  play: Dices,
  account: UserX,
  verify: ShieldAlert,
  auth: KeyRound,
  notice: AlertCircle,
  unknown: AlertCircle,
};

const card: CSSProperties = {
  backgroundColor: '#ffffff',
  ...frostWash,
  width: '100%',
  minWidth: 0,
  maxWidth: 320,
  borderRadius: 20,
  border: '1px solid rgba(61,109,255,0.32)',
  boxShadow: '0 12px 28px rgba(0,0,0,0.32)',
  padding: '18px 16px 16px',
  boxSizing: 'border-box',
  fontFamily: neon.font,
  position: 'relative',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  textAlign: 'center',
};

const mark: CSSProperties = {
  width: 36,
  height: 36,
  borderRadius: 18,
  margin: 0,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: 'rgba(242,82,82,0.14)',
  flexShrink: 0,
};

export function ErrorCard({
  kind = 'unknown',
  title,
  hint,
  actionLabel,
  onAction,
  onClose,
  extra,
}: {
  kind?: PublicErrorKind;
  title?: ReactNode;
  hint?: ReactNode;
  actionLabel?: string;
  onAction?: () => void;
  onClose?: () => void;
  extra?: ReactNode;
}) {
  const Icon = ICONS[kind] ?? AlertCircle;
  const copy = PUBLIC_ERROR_COPY[kind] ?? PUBLIC_ERROR_COPY.unknown;
  return (
    <div style={card}>
      {onClose ? (
        <button type="button" onClick={onClose} aria-label="Close" style={closeBtn}>
          <X size={14} strokeWidth={2.4} color="#0c1018" />
        </button>
      ) : null}
      <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <div style={mark}>
        <Icon size={18} color="#f25252" strokeWidth={2.2} />
      </div>
      <p
        style={{
          margin: '10px 0 0',
          textAlign: 'center',
          fontSize: 16,
          fontWeight: 800,
          color: '#0c1018',
          letterSpacing: '-0.3px',
          lineHeight: 1.25,
          width: '100%',
        }}
      >
        {title ?? copy.title}
      </p>
      <p
        style={{
          margin: '6px 0 0',
          textAlign: 'center',
          fontSize: 12,
          fontWeight: 500,
          color: '#3a4254',
          lineHeight: 1.45,
          width: '100%',
        }}
      >
        {hint ?? copy.hint}
      </p>
      {extra}
      </div>
      {onAction ? (
        <button type="button" onClick={onAction} style={primaryBtn}>
          {actionLabel ?? 'Got it'}
        </button>
      ) : null}
    </div>
  );
}

export default function ErrorPopup({
  kind = 'unknown',
  title,
  hint,
  onClose,
}: {
  kind?: PublicErrorKind;
  title?: ReactNode;
  hint?: ReactNode;
  onClose: () => void;
}) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={typeof title === 'string' ? title : 'Error'}
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 10080,
        background: 'rgba(0,0,0,0.55)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px 20px',
        paddingTop: 'max(24px, env(safe-area-inset-top, 0px))',
        paddingBottom: 'max(24px, env(safe-area-inset-bottom, 0px))',
        boxSizing: 'border-box',
      }}
    >
      <div onClick={(e) => e.stopPropagation()} style={{ width: 'min(320px, 100%)' }}>
        <ErrorCard kind={kind} title={title} hint={hint} onClose={onClose} />
      </div>
    </div>
  );
}

const primaryBtn: CSSProperties = {
  width: '100%',
  height: 40,
  marginTop: 14,
  border: 'none',
  borderRadius: 12,
  background: '#accafe',
  color: '#0c1018',
  fontFamily: neon.font,
  fontSize: 15,
  fontWeight: 700,
  cursor: 'pointer',
};

const closeBtn: CSSProperties = {
  position: 'absolute',
  top: 12,
  right: 12,
  width: 28,
  height: 28,
  border: 'none',
  borderRadius: 14,
  background: 'rgba(12,16,24,0.08)',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: 0,
};
