import { useState, type ReactNode } from 'react';
import { Capacitor } from '@capacitor/core';
import { motion } from 'framer-motion';
import { RefreshCw, RotateCcw, type LucideIcon } from 'lucide-react';
import arxonLogo from '@/assets/arxon-icon.svg';
import { errorUi } from './errorUiTokens';
import {
  getFailureCopy,
  type FailureType,
} from './failureCatalog';

export interface AppFailureScreenProps {
  failureType?: FailureType;
  icon?: LucideIcon;
  title?: string;
  message?: string;
  detail?: string;
  primaryLabel?: string;
  onPrimary?: () => void | Promise<void>;
  secondaryLabel?: string;
  onSecondary?: () => void;
  showLogo?: boolean;
  showRestart?: boolean;
  children?: ReactNode;
  devError?: Error | null;
}

/** Reusable full-screen branded failure card — dark neon Arxon V2 aesthetic. */
export default function AppFailureScreen({
  failureType = 'unknown',
  icon,
  title,
  message,
  detail,
  primaryLabel,
  onPrimary,
  secondaryLabel,
  onSecondary,
  showLogo = true,
  showRestart = false,
  children,
  devError,
}: AppFailureScreenProps) {
  const preset = getFailureCopy(failureType);
  const Icon = icon ?? preset.icon;
  const heading = title ?? preset.title;
  const body = message ?? preset.message;
  const primary = primaryLabel ?? preset.primaryLabel;
  const secondary = secondaryLabel ?? preset.secondaryLabel;

  const [busy, setBusy] = useState(false);

  const handlePrimary = async () => {
    setBusy(true);
    try {
      if (onPrimary) {
        await onPrimary();
      } else {
        window.location.reload();
      }
    } finally {
      setBusy(false);
    }
  };

  const handleSecondary = () => {
    if (onSecondary) {
      onSecondary();
      return;
    }
    window.location.href = Capacitor.isNativePlatform() ? '/' : window.location.origin;
    window.location.reload();
  };

  const showSecondary = Boolean(secondary && (onSecondary || showRestart || preset.secondaryLabel));

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: errorUi.criticalZ,
        background: errorUi.bg,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '32px 24px',
        fontFamily: errorUi.font,
        overflow: 'auto',
      }}
    >
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: `
            radial-gradient(ellipse 80% 60% at 50% 20%, ${errorUi.cyan}18, transparent 55%),
            radial-gradient(ellipse 60% 40% at 50% 100%, ${errorUi.purple}12, transparent 50%)
          `,
          pointerEvents: 'none',
        }}
      />

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        style={{ position: 'relative', textAlign: 'center', maxWidth: 340, width: '100%' }}
      >
        {showLogo ? (
          <div
            style={{
              width: 88,
              height: 88,
              borderRadius: 22,
              overflow: 'hidden',
              margin: '0 auto 24px',
              border: `2px solid ${errorUi.panelBorder}`,
              boxShadow: `0 0 40px ${errorUi.cyanGlow}`,
            }}
          >
            <img src={arxonLogo} alt="Arxon" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </div>
        ) : null}

        <div
          style={{
            width: 52,
            height: 52,
            borderRadius: 16,
            margin: '0 auto 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: `${errorUi.danger}18`,
            border: `1px solid ${errorUi.danger}44`,
            boxShadow: `0 0 24px ${errorUi.dangerGlow}`,
          }}
        >
          <Icon size={24} color={errorUi.danger} />
        </div>

        <h1
          style={{
            margin: '0 0 10px',
            fontSize: 22,
            fontWeight: 800,
            color: errorUi.text,
            letterSpacing: '0.04em',
          }}
        >
          {heading}
        </h1>
        <p
          style={{
            margin: '0 0 8px',
            fontSize: 14,
            lineHeight: 1.55,
            color: errorUi.textMuted,
          }}
        >
          {body}
        </p>
        {detail ? (
          <p
            style={{
              margin: '0 0 24px',
              fontSize: 11,
              color: 'rgba(232,252,255,0.35)',
              fontFamily: 'ui-monospace, monospace',
              wordBreak: 'break-word',
            }}
          >
            {detail}
          </p>
        ) : (
          <div style={{ height: 24 }} />
        )}

        {children}

        <motion.button
          type="button"
          whileTap={{ scale: 0.97 }}
          onClick={() => void handlePrimary()}
          disabled={busy}
          style={{
            width: '100%',
            padding: '16px 20px',
            borderRadius: 16,
            border: 'none',
            background: `linear-gradient(135deg, ${errorUi.cyan}, ${errorUi.teal})`,
            color: errorUi.deep,
            fontSize: 15,
            fontWeight: 800,
            cursor: busy ? 'wait' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 10,
            boxShadow: `0 8px 28px ${errorUi.cyanGlow}`,
            marginBottom: showSecondary ? 12 : 0,
            opacity: busy ? 0.75 : 1,
          }}
        >
          <RefreshCw size={18} style={busy ? { animation: 'arxonSpin 0.9s linear infinite' } : undefined} />
          {busy ? 'Retrying…' : primary}
        </motion.button>

        {showSecondary ? (
          <button
            type="button"
            onClick={handleSecondary}
            style={{
              width: '100%',
              padding: '14px',
              borderRadius: 14,
              border: `1px solid ${errorUi.panelBorder}`,
              background: 'transparent',
              color: errorUi.textMuted,
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              marginTop: 12,
            }}
          >
            <RotateCcw size={14} />
            {secondary}
          </button>
        ) : null}

        {import.meta.env.DEV && devError ? (
          <details
            style={{
              marginTop: 20,
              textAlign: 'left',
              fontSize: 11,
              color: errorUi.textMuted,
              padding: 12,
              borderRadius: 12,
              border: `1px solid ${errorUi.panelBorder}`,
              background: 'rgba(0,0,0,0.25)',
            }}
          >
            <summary style={{ cursor: 'pointer', fontWeight: 600 }}>Error details</summary>
            <pre style={{ margin: '8px 0 0', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
              {devError.message}
            </pre>
          </details>
        ) : null}
      </motion.div>

      <style>{'@keyframes arxonSpin{to{transform:rotate(360deg)}}'}</style>
    </div>
  );
}
