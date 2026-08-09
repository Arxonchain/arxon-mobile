/**
 * Cloudflare Turnstile widget — lightweight script-loader wrapper (no extra dependency).
 *
 * Uses explicit rendering + visible managed widget so Capacitor WebViews and locked-down
 * networks get a clear checkbox/challenge instead of a silent interaction-only failure.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { TURNSTILE_SITE_KEY, isTurnstileConfigured } from '@/lib/turnstile';

declare global {
  interface Window {
    turnstile?: {
      render: (container: HTMLElement | string, options: TurnstileRenderOptions) => string;
      remove: (widgetId: string) => void;
      reset: (widgetId?: string) => void;
      ready?: (cb: () => void) => void;
    };
  }
}

interface TurnstileRenderOptions {
  sitekey: string;
  action?: string;
  theme?: 'auto' | 'light' | 'dark';
  size?: 'normal' | 'flexible' | 'compact';
  appearance?: 'always' | 'execute' | 'interaction-only';
  retry?: 'auto' | 'never';
  callback?: (token: string) => void;
  'expired-callback'?: () => void;
  'error-callback'?: (errorCode?: string) => void;
  'timeout-callback'?: () => void;
}

const SCRIPT_SRC = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
let scriptLoadPromise: Promise<void> | null = null;

function loadTurnstileScript(): Promise<void> {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('Turnstile requires a browser environment'));
  }
  if (window.turnstile?.render) return Promise.resolve();
  if (scriptLoadPromise) return scriptLoadPromise;

  scriptLoadPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${SCRIPT_SRC}"]`);
    if (existing) {
      if (window.turnstile?.render) {
        resolve();
        return;
      }
      existing.addEventListener('load', () => resolve(), { once: true });
      existing.addEventListener(
        'error',
        () => {
          scriptLoadPromise = null;
          reject(new Error('Failed to load Turnstile script'));
        },
        { once: true },
      );
      return;
    }

    const script = document.createElement('script');
    script.src = SCRIPT_SRC;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => {
      scriptLoadPromise = null;
      reject(new Error('Failed to load Turnstile script'));
    };
    document.head.appendChild(script);
  });

  return scriptLoadPromise;
}

function whenTurnstileReady(): Promise<void> {
  return loadTurnstileScript().then(
    () =>
      new Promise<void>((resolve, reject) => {
        if (window.turnstile?.render) {
          if (typeof window.turnstile.ready === 'function') {
            window.turnstile.ready(() => resolve());
          } else {
            resolve();
          }
          return;
        }
        // Script tagged loaded but API not ready yet — brief poll.
        let tries = 0;
        const id = window.setInterval(() => {
          tries += 1;
          if (window.turnstile?.render) {
            window.clearInterval(id);
            resolve();
          } else if (tries > 40) {
            window.clearInterval(id);
            reject(new Error('Turnstile API failed to initialize'));
          }
        }, 50);
      }),
  );
}

export { isTurnstileConfigured, TURNSTILE_SITE_KEY };

export function TurnstileWidget({
  action,
  onVerify,
  onExpire,
  onError,
  className,
}: {
  /** Optional Turnstile "action" label, e.g. "signup" / "signin". */
  action?: string;
  onVerify: (token: string) => void;
  onExpire?: () => void;
  onError?: (message?: string) => void;
  className?: string;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const widgetIdRef = useRef<string | null>(null);
  const onVerifyRef = useRef(onVerify);
  const onExpireRef = useRef(onExpire);
  const onErrorRef = useRef(onError);
  const [failed, setFailed] = useState(false);
  const [failReason, setFailReason] = useState<string | null>(null);
  const [retryNonce, setRetryNonce] = useState(0);

  useEffect(() => {
    onVerifyRef.current = onVerify;
    onExpireRef.current = onExpire;
    onErrorRef.current = onError;
  }, [onVerify, onExpire, onError]);

  const remount = useCallback(() => {
    setFailed(false);
    setFailReason(null);
    onExpireRef.current?.();
    setRetryNonce((n) => n + 1);
  }, []);

  useEffect(() => {
    if (!TURNSTILE_SITE_KEY) return;
    let cancelled = false;

    whenTurnstileReady()
      .then(() => {
        if (cancelled || !window.turnstile || !containerRef.current) return;

        // Clear previous mount artifacts before re-render.
        containerRef.current.innerHTML = '';

        widgetIdRef.current = window.turnstile.render(containerRef.current, {
          sitekey: TURNSTILE_SITE_KEY,
          action,
          theme: 'auto',
          size: 'flexible',
          // Visible widget is far more reliable in Capacitor WebViews than interaction-only.
          appearance: 'always',
          retry: 'auto',
          callback: (token) => {
            setFailed(false);
            setFailReason(null);
            onVerifyRef.current(token);
          },
          'expired-callback': () => {
            onExpireRef.current?.();
          },
          'timeout-callback': () => {
            onExpireRef.current?.();
            setFailed(true);
            setFailReason('Verification timed out. Tap Retry, then complete the check again.');
            onErrorRef.current?.('timeout');
          },
          'error-callback': (errorCode) => {
            setFailed(true);
            setFailReason(
              errorCode
                ? `Verification failed (${errorCode}). Check your connection, disable VPN if needed, then Retry.`
                : 'Verification failed. Check your connection, then Retry.',
            );
            onErrorRef.current?.(errorCode);
          },
        });
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        scriptLoadPromise = null;
        setFailed(true);
        setFailReason(
          err instanceof Error
            ? `${err.message}. challenges.cloudflare.com may be blocked on this network.`
            : 'Verification widget failed to load. challenges.cloudflare.com may be blocked on this network.',
        );
        onErrorRef.current?.('script_load_failed');
      });

    return () => {
      cancelled = true;
      if (widgetIdRef.current && window.turnstile) {
        try {
          window.turnstile.remove(widgetIdRef.current);
        } catch {
          // widget already gone
        }
      }
      widgetIdRef.current = null;
    };
  }, [action, retryNonce]);

  if (!TURNSTILE_SITE_KEY) return null;

  return (
    <div className={className}>
      <div ref={containerRef} className="flex min-h-[65px] justify-center" />
      {failed && (
        <div className="mt-2 space-y-2 text-center">
          <p className="text-xs text-destructive">
            {failReason ||
              'Verification widget failed to load — please check your connection and try again.'}
          </p>
          <button
            type="button"
            onClick={remount}
            className="text-xs font-medium text-accent underline underline-offset-2"
          >
            Retry verification
          </button>
        </div>
      )}
    </div>
  );
}
