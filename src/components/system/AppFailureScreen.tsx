import { useState, type ReactNode } from 'react';
import { Capacitor } from '@capacitor/core';
import { motion } from 'framer-motion';
import { RefreshCw, RotateCcw, type LucideIcon } from 'lucide-react';
import arxonLogo from '@/assets/arxon-icon.svg';
import {
  errorUi,
  glassBadgeStyle,
  glassMeshBackground,
  glassPanelStyle,
  glassPrimaryButtonStyle,
  glassSecondaryButtonStyle,
} from './errorUiTokens';
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

/** Reusable full-screen glass failure overlay — dark neon Arxon V2 aesthetic. */
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
  const g = errorUi.glass;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: errorUi.criticalZ,
        background: g.overlayBgStrong,
        backdropFilter: g.blurStrong,
        WebkitBackdropFilter: g.blurStrong,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '32px 24px',
        fontFamily: errorUi.font,
        overflow: 'auto',
      }}
    >
      <div style={glassMeshBackground()} />

      {/* Subtle noise texture overlay */}
      <div
        aria-hidden
        style={{
          position: 'absolute',
          inset: 0,
          opacity: 0.035,
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
          pointerEvents: 'none',
        }}
      />

      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
        style={{
          ...glassPanelStyle(),
          textAlign: 'center',
          padding: '32px 28px 28px',
        }}
      >
        {showLogo ? (
          <div
            style={{
              width: 80,
              height: 80,
              borderRadius: 20,
              overflow: 'hidden',
              margin: '0 auto 20px',
              border: `1px solid ${g.badgeBorder}`,
              boxShadow: `${g.innerHighlight}, 0 0 36px ${errorUi.cyanGlow}`,
              backdropFilter: g.badgeBlur,
              WebkitBackdropFilter: g.badgeBlur,
            }}
          >
            <img src={arxonLogo} alt="Arxon" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </div>
        ) : null}

        <div
          style={{
            ...glassBadgeStyle(errorUi.danger, errorUi.dangerGlow),
            width: 52,
            height: 52,
            borderRadius: '50%',
            margin: '0 auto 20px',
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
            ...glassPrimaryButtonStyle(busy),
            marginBottom: showSecondary ? 12 : 0,
          }}
        >
          <RefreshCw size={18} style={busy ? { animation: 'arxonSpin 0.9s linear infinite' } : undefined} />
          {busy ? 'Retrying…' : primary}
        </motion.button>

        {showSecondary ? (
          <button
            type="button"
            onClick={handleSecondary}
            style={{ ...glassSecondaryButtonStyle(), marginTop: 12 }}
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
              border: `1px solid ${g.panelBorder}`,
              background: 'rgba(0,0,0,0.2)',
              backdropFilter: g.badgeBlur,
              WebkitBackdropFilter: g.badgeBlur,
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
