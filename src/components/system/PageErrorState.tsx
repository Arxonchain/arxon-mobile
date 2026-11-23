import { type LucideIcon } from 'lucide-react';
import { ErrorCard } from './ErrorPopup';
import {
  getFailureCopy,
  type FailureType,
} from './failureCatalog';
import type { PublicErrorKind } from '@/lib/publicError';

const KIND_BY_FAILURE: Partial<Record<FailureType, PublicErrorKind>> = {
  ota_load_failed: 'network',
  offline: 'network',
  backend_down: 'unknown',
  session_expired: 'session',
  timeout: 'timeout',
  unknown: 'unknown',
};

interface Props {
  failureType?: FailureType;
  icon?: LucideIcon;
  title?: string;
  message?: string;
  onRetry?: () => void;
  retryLabel?: string;
  compact?: boolean;
  onClose?: () => void;
}

/** Inline white frost error card — same compact sheet as in-app error popups. */
export default function PageErrorState({
  failureType = 'unknown',
  title,
  message,
  onRetry,
  retryLabel,
  onClose,
}: Props) {
  const preset = getFailureCopy(failureType);
  const heading = title ?? preset.title;
  const body = message ?? preset.message;
  const label = retryLabel ?? preset.primaryLabel;
  const kind = KIND_BY_FAILURE[failureType] ?? 'unknown';

  return (
    <div
      role="alert"
      style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        padding: '16px 12px',
      }}
    >
      <ErrorCard
        kind={kind}
        title={heading}
        hint={body}
        actionLabel={onRetry ? label : undefined}
        onAction={onRetry}
        onClose={onClose}
      />
    </div>
  );
}
