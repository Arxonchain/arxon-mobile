import { RefreshCw, type LucideIcon } from 'lucide-react';
import { errorUi } from './errorUiTokens';
import {
  getFailureCopy,
  type FailureType,
} from './failureCatalog';

interface Props {
  failureType?: FailureType;
  icon?: LucideIcon;
  title?: string;
  message?: string;
  onRetry?: () => void;
  retryLabel?: string;
  compact?: boolean;
}

/** Inline page-level error with retry — for route/query failures inside the app shell. */
export default function PageErrorState({
  failureType = 'unknown',
  icon,
  title,
  message,
  onRetry,
  retryLabel,
  compact = false,
}: Props) {
  const preset = getFailureCopy(failureType);
  const Icon = icon ?? preset.icon;
  const heading = title ?? preset.title;
  const body = message ?? preset.message;
  const label = retryLabel ?? preset.primaryLabel;

  return (
    <div
      role="alert"
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        padding: compact ? '32px 20px' : '48px 24px',
        minHeight: compact ? undefined : 'min(420px, 50vh)',
        fontFamily: errorUi.font,
      }}
    >
      <div
        style={{
          width: compact ? 44 : 52,
          height: compact ? 44 : 52,
          borderRadius: 14,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 16,
          background: `${errorUi.danger}14`,
          border: `1px solid ${errorUi.danger}33`,
          boxShadow: `0 0 20px ${errorUi.dangerGlow}`,
        }}
      >
        <Icon size={compact ? 20 : 24} color={errorUi.danger} />
      </div>

      <h2
        style={{
          margin: '0 0 8px',
          fontSize: compact ? 16 : 18,
          fontWeight: 800,
          color: errorUi.text,
          letterSpacing: '0.03em',
        }}
      >
        {heading}
      </h2>
      <p
        style={{
          margin: '0 0 20px',
          maxWidth: 320,
          fontSize: compact ? 13 : 14,
          lineHeight: 1.55,
          color: errorUi.textMuted,
        }}
      >
        {body}
      </p>

      {onRetry ? (
        <button
          type="button"
          onClick={onRetry}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            padding: '12px 20px',
            borderRadius: 14,
            border: `1px solid ${errorUi.panelBorder}`,
            background: `${errorUi.cyan}14`,
            color: errorUi.cyan,
            fontSize: 13,
            fontWeight: 700,
            cursor: 'pointer',
            boxShadow: `0 4px 16px ${errorUi.cyan}22`,
          }}
        >
          <RefreshCw size={14} />
          {label}
        </button>
      ) : null}
    </div>
  );
}
