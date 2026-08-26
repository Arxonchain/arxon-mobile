import { RefreshCw, type LucideIcon } from 'lucide-react';
import {
  errorUi,
  glassBadgeStyle,
  glassPanelStyle,
  glassSecondaryButtonStyle,
} from './errorUiTokens';
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

/** Inline page-level glass error card with retry — for route/query failures inside the app shell. */
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

  const badgeSize = compact ? 44 : 52;
  const iconSize = compact ? 20 : 24;

  return (
    <div
      role="alert"
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: compact ? '24px 16px' : '32px 20px',
        minHeight: compact ? undefined : 'min(420px, 50vh)',
        fontFamily: errorUi.font,
      }}
    >
      <div
        style={{
          ...glassPanelStyle({ compact, inline: true }),
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
          padding: compact ? '28px 24px' : '36px 28px',
          maxWidth: 360,
          width: '100%',
        }}
      >
        <div
          style={{
            ...glassBadgeStyle(errorUi.danger, errorUi.dangerGlow),
            width: badgeSize,
            height: badgeSize,
            borderRadius: '50%',
            marginBottom: 16,
          }}
        >
          <Icon size={iconSize} color={errorUi.danger} />
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
              ...glassSecondaryButtonStyle(),
              width: 'auto',
              display: 'inline-flex',
              padding: '12px 20px',
              color: errorUi.cyan,
              border: `1px solid ${errorUi.glass.panelBorderBright}`,
              boxShadow: `${errorUi.glass.innerHighlight}, 0 4px 20px ${errorUi.cyan}22`,
            }}
          >
            <RefreshCw size={14} />
            {label}
          </button>
        ) : null}
      </div>
    </div>
  );
}
