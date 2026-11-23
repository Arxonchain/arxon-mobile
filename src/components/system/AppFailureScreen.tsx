import { useState, type ReactNode } from 'react';
import { Capacitor } from '@capacitor/core';
import type { LucideIcon } from 'lucide-react';
import { FailSheet } from '@/walletFigma/flow/FailSheet';
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

/** Full-screen wallet-style fail card — dark page, centered frost sheet. */
export default function AppFailureScreen({
  failureType = 'unknown',
  title,
  message,
  detail,
  primaryLabel,
  onPrimary,
  secondaryLabel,
  onSecondary,
  showRestart = false,
  children,
  devError,
}: AppFailureScreenProps) {
  const preset = getFailureCopy(failureType);
  const heading = title ?? preset.title;
  const body = message ?? preset.message;
  const primary = primaryLabel ?? preset.primaryLabel;
  const secondary = secondaryLabel ?? preset.secondaryLabel;
  const [busy, setBusy] = useState(false);

  if (detail) console.error('[Arxon]', detail);
  if (devError) console.error(devError);

  const handlePrimary = async () => {
    setBusy(true);
    try {
      if (onPrimary) await onPrimary();
      else window.location.reload();
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
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: '#050505' }}>
      <FailSheet
        title={heading}
        why={body}
        primary={busy ? 'Retrying…' : primary}
        secondary={showSecondary ? secondary : undefined}
        onPrimary={() => void handlePrimary()}
        onSecondary={showSecondary ? handleSecondary : undefined}
        extra={children}
      />
    </div>
  );
}
