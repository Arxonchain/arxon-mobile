/**
 * Cloudflare Turnstile widget — explicit render, visible checkbox.
 *
 * Do not remount on error/expire. Remounting is what made "Verifying…" blink and
 * fail in a loop on the mining login WebView. Parents should bump `resetKey` only
 * after a failed sign-in, or when the user taps Retry.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { TURNSTILE_SITE_KEY, isTurnstileConfigured } from '@/lib/turnstile';
import { turnstileErrorMessage } from '@/lib/turnstileErrors';

declare global {
  interface Window {
    turnstile?: {
      render: (container: HTMLElement | string, options: TurnstileRenderOptions) => string;
      remove: (widgetId: string) => void;
      reset: (widgetId?: string) => void;
    };
  }
}

interface TurnstileRenderOptions {
  sitekey: string;
  action?: string;
  theme?: 'auto' | 'light' | 'dark';
  size?: 'normal' | 'flexible' | 'compact';
  appearance?: 'always' | 'execute' | 'interaction-only';
  execution?: 'render' | 'execute';
  retry?: 'auto' | 'never';
  'refresh-expired'?: 'auto' | 'manual' | 'never';
  callback?: (token: string) => void;
  'expired-callback'?: () => void;
  'error-callback'?: (errorCode?: string) => void;
  'timeout-callback'?: () => void;
}

const SCRIPT_SRC = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
let scriptLoadPromise: Promise<void> | null = null;

/** Transient codes: widget is still challenging — do not tear it down. */
function isTransientTurnstileError(errorCode?: string) {
  const code = String(errorCode ?? '').trim();
  return !code || code === '300010';
}

function waitForTurnstileApi(): Promise<void> {
  if (window.turnstile?.render) return Promise.resolve();

  return new Promise<void>((resolve, reject) => {
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
  });
}

function loadTurnstileScript(): Promise<void> {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('Turnstile requires a browser environment'));
  }
  if (window.turnstile?.render) return Promise.resolve();
  if (scriptLoadPromise) return scriptLoadPromise;

  scriptLoadPromise = new Promise((resolve, reject) => {
    const onReady = () => {
      waitForTurnstileApi().then(resolve).catch((err) => {
        scriptLoadPromise = null;
        reject(err);
      });
    };
    const onFail = () => {
      scriptLoadPromise = null;
      reject(new Error('Failed to load Turnstile script'));
    };

    const existing = document.querySelector<HTMLScriptElement>(
      'script[src^="https://challenges.cloudflare.com/turnstile/v0/api.js"]',
    );
    if (existing) {
      if (window.turnstile?.render) {
        resolve();
        return;
      }
      if (existing.dataset.turnstileLoaded === '1') {
        onReady();
        return;
      }
      existing.addEventListener('load', onReady, { once: true });
      existing.addEventListener('error', onFail, { once: true });
      return;
    }

    const script = document.createElement('script');
    script.src = SCRIPT_SRC;
    script.onload = () => {
      script.dataset.turnstileLoaded = '1';
      onReady();
    };
    script.onerror = onFail;
    document.head.appendChild(script);
  });

  return scriptLoadPromise;
}

export { isTurnstileConfigured, TURNSTILE_SITE_KEY };

export function TurnstileWidget({
  action,
  onVerify,
  onExpire,
  onError,
  className,
  resetKey = 0,
}: {
  action?: string;
  onVerify: (token: string) => void;
  onExpire?: () => void;
  onError?: (message?: string) => void;
  className?: string;
  resetKey?: number;
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
    setFailed(false);
    setFailReason(null);

    const start = window.setTimeout(() => {
      loadTurnstileScript()
        .then(() => {
          if (cancelled || !window.turnstile || !containerRef.current) return;

          if (widgetIdRef.current) {
            try {
              window.turnstile.remove(widgetIdRef.current);
            } catch {
              /* already gone */
            }
            widgetIdRef.current = null;
          }
          containerRef.current.innerHTML = '';

          widgetIdRef.current = window.turnstile.render(containerRef.current, {
            sitekey: TURNSTILE_SITE_KEY,
            action,
            theme: 'dark',
            size: 'normal',
            appearance: 'always',
            execution: 'render',
            retry: 'never',
            'refresh-expired': 'auto',
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
              setFailReason(turnstileErrorMessage('timeout'));
              onErrorRef.current?.('timeout');
            },
            'error-callback': (errorCode) => {
              onExpireRef.current?.();
              if (isTransientTurnstileError(errorCode)) return;
              setFailed(true);
              setFailReason(turnstileErrorMessage(errorCode));
              onErrorRef.current?.(errorCode);
            },
          });
        })
        .catch((err: unknown) => {
          if (cancelled) return;
          scriptLoadPromise = null;
          setFailed(true);
          const networkMsg = turnstileErrorMessage('script_load_failed');
          setFailReason(
            err instanceof Error ? `${err.message}. ${networkMsg}` : networkMsg,
          );
          onErrorRef.current?.('script_load_failed');
        });
    }, 50);

    return () => {
      cancelled = true;
      window.clearTimeout(start);
      if (widgetIdRef.current && window.turnstile) {
        try {
          window.turnstile.remove(widgetIdRef.current);
        } catch {
          /* widget already gone */
        }
      }
      widgetIdRef.current = null;
    };
  }, [action, retryNonce, resetKey]);

  if (!isTurnstileConfigured()) return null;

  return (
    <div className={className} data-turnstile-host={typeof window !== 'undefined' ? window.location.hostname : ''}>
      <div
        ref={containerRef}
        className="mx-auto overflow-visible"
        style={{ width: 300, minHeight: 65 }}
      />
      {failed && (
        <div className="mt-2 space-y-2 text-center">
          <p className="text-xs text-destructive whitespace-pre-wrap">
            {failReason || turnstileErrorMessage()}
          </p>
          <p className="text-[11px] text-muted-foreground leading-snug">
            Tap Retry, complete the check, then sign in. If this keeps failing, switch to Wi‑Fi.
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
