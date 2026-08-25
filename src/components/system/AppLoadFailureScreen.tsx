import { Capacitor } from '@capacitor/core';
import AppFailureScreen from './AppFailureScreen';
import {
  loadFailureToType,
  type LoadFailureKind,
} from './failureCatalog';

interface Props {
  kind?: LoadFailureKind;
  title?: string;
  message?: string;
  detail?: string;
  onRetry?: () => void;
  showRestart?: boolean;
}

/** Full-screen branded failure UI — OTA/WebView load errors, critical bootstrap failures. */
export default function AppLoadFailureScreen({
  kind = 'unknown',
  title,
  message,
  detail,
  onRetry,
  showRestart = Capacitor.isNativePlatform(),
}: Props) {
  const failureType = loadFailureToType(kind);

  return (
    <AppFailureScreen
      failureType={failureType}
      title={title}
      message={message}
      detail={detail}
      onPrimary={onRetry}
      showRestart={showRestart}
    />
  );
}
