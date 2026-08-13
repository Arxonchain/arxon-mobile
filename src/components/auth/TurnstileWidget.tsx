/**
 * Cloudflare Turnstile widget — lightweight script-loader wrapper (no extra dependency).
 *
 * Uses explicit rendering + visible managed widget so Capacitor WebViews and locked-down
 * networks get a clear checkbox/challenge instead of a silent interaction-only failure.
 *
 * Script load follows Cloudflare's explicit-render guidance:
 *   api.js?render=explicit  — no async/defer; wait for script.onload, then call render().
 * Do not call turnstile.ready() with an async/defer script tag (Cloudflare warns and can fail).
 *
 * Tokens are single-use. Parents should bump `resetKey` only after a failed auth response
 * (or on mode change / Retry) — never before the request finishes.
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
  retry?: 'auto' | 'never';
  callback?: (token: string) => void;
  'expired-callback'?: () => void;
  'error-callback'?: (errorCode?: string) => void;
  'timeout-callback'?: () => void;
}

const SCRIPT_SRC = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
let scriptLoadPromise: Promise<void> | null = null;

/** Poll briefly until window.turnstile.render is available after script load. */
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

/**
 * Load Turnstile api.js without async/defer, then wait until turnstile.render is available.
 * We gate on script.onload + API presence — never turnstile.ready() with async scripts.
 */
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
      // Already finished loading in a prior attempt.
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
    // Intentionally NO async/defer — coordinate via onload before render().
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
  /** Bump after every auth attempt so Success UI cannot outlive a consumed token. */
  resetKey = 0,
}: {
  /** Optional Turnstile "action" label, e.g. "signup" / "signin". */
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

    loadTurnstileScript()
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
            setFailReason(turnstileErrorMessage('timeout'));
            onErrorRef.current?.('timeout');
          },
          'error-callback': (errorCode) => {
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
        // Script/iframe fetch failures are almost always carrier/DNS blocks of challenges.cloudflare.com
        const networkMsg = turnstileErrorMessage('script_load_failed');
        setFailReason(
          err instanceof Error ? `${err.message}. ${networkMsg}` : networkMsg,
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
  }, [action, retryNonce, resetKey]);

  if (!TURNSTILE_SITE_KEY) return null;

  return (
    <div className={className}>
      <div ref={containerRef} className="flex min-h-[65px] justify-center" />
      {failed && (
        <div className="mt-2 space-y-2 text-center">
          <p className="text-xs text-destructive whitespace-pre-wrap">
            {failReason || turnstileErrorMessage()}
          </p>
          <p className="text-[11px] text-muted-foreground leading-snug">
            Login requires Cloudflare Turnstile. If your carrier blocks challenges.cloudflare.com,
            switch to Wi‑Fi — captcha cannot be skipped while Supabase Attack Protection is on.
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
