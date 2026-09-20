import * as Sentry from '@sentry/react';
import { Capacitor } from '@capacitor/core';

function readRelease(): string {
  const fromEnv = import.meta.env.VITE_SENTRY_RELEASE as string | undefined;
  if (fromEnv?.trim()) return fromEnv.trim();
  return 'dev';
}

/** Call once at startup (before React render). No-op when DSN is unset. */
export function initSentry(): boolean {
  const dsn = (import.meta.env.VITE_SENTRY_DSN as string | undefined)?.trim();
  if (!dsn) {
    if (import.meta.env.DEV) {
      console.info('[sentry] disabled (set VITE_SENTRY_DSN to enable)');
    }
    return false;
  }

  const replayRateRaw = import.meta.env.VITE_SENTRY_REPLAY_SAMPLE_RATE as string | undefined;
  const replaySampleRate = replayRateRaw != null && replayRateRaw !== ''
    ? Math.min(1, Math.max(0, Number(replayRateRaw)))
    : import.meta.env.PROD
      ? 0.1
      : 0;

  Sentry.init({
    dsn,
    environment: import.meta.env.PROD ? 'production' : 'development',
    release: `arxon-mobile@${readRelease()}`,
    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration({
        maskAllText: true,
        blockAllMedia: true,
      }),
    ],
    tracesSampleRate: import.meta.env.PROD ? 0.05 : 0,
    replaysSessionSampleRate: replaySampleRate,
    replaysOnErrorSampleRate: 1,
    sendDefaultPii: false,
    beforeSend(event) {
      const msg = event.exception?.values?.[0]?.value ?? event.message ?? '';
      if (/not implemented|nativebiometric|localnotifications|haptics/i.test(String(msg))) {
        return null;
      }
      return event;
    },
  });

  Sentry.setTag('platform', Capacitor.getPlatform());
  Sentry.setTag('native_app', Capacitor.isNativePlatform() ? 'yes' : 'no');
  Sentry.setTag('ota_mode', import.meta.env.VITE_ARXON_UI_V2 === 'true' ? 'v2-games' : 'classic');

  if (import.meta.env.DEV) {
    console.info('[sentry] enabled (development). Test: __sentryTestError()');
    globalThis.__sentryTestError = async () => {
      const eventId = Sentry.captureException(new Error('sentry local test'));
      await Sentry.flush(5000);
      return eventId;
    };
  }

  return true;
}

declare global {
  interface Window {
    /** Dev only — sends a test error through the SDK (not DevTools throw). */
    __sentryTestError?: () => Promise<string>;
  }
}

export function captureBootFailure(message: string, detail?: unknown): void {
  Sentry.withScope((scope) => {
    scope.setLevel('fatal');
    scope.setTag('boot_failure', 'true');
    if (detail instanceof Error) {
      Sentry.captureException(detail);
    } else {
      Sentry.captureMessage(`${message}${detail ? `: ${String(detail).slice(0, 500)}` : ''}`);
    }
  });
}

export function setSentryUser(userId: string | null): void {
  if (!userId) {
    Sentry.setUser(null);
    return;
  }
  Sentry.setUser({ id: userId });
}

export { Sentry };
