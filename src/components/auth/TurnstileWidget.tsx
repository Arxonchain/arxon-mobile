/**
 * Cloudflare Turnstile widget — lightweight script-loader wrapper (no extra dependency).
 *
 * Renders nothing (and never blocks the form) if VITE_TURNSTILE_SITE_KEY isn't configured,
 * so local dev and any environment without a site key set up keeps working exactly as before.
 *
 * The actual "managed" vs "invisible" behavior is controlled by the Widget Mode chosen when
 * the site key is created in the Cloudflare dashboard — this component just renders the
 * container and lets Turnstile decide whether an interactive challenge is ever shown.
 */
import { useEffect, useRef, useState, useId } from 'react';

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
  appearance?: 'always' | 'execute' | 'interaction-only';
  callback?: (token: string) => void;
  'expired-callback'?: () => void;
  'error-callback'?: () => void;
}

const SCRIPT_SRC = 'https://challenges.cloudflare.com/turnstile/v0/api.js';
let scriptLoadPromise: Promise<void> | null = null;

function loadTurnstileScript(): Promise<void> {
  if (window.turnstile) return Promise.resolve();
  if (scriptLoadPromise) return scriptLoadPromise;

  scriptLoadPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${SCRIPT_SRC}"]`);
    if (existing) {
      existing.addEventListener('load', () => resolve());
      existing.addEventListener('error', () => reject(new Error('Failed to load Turnstile script')));
      return;
    }
    const script = document.createElement('script');
    script.src = SCRIPT_SRC;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load Turnstile script'));
    document.head.appendChild(script);
  });

  return scriptLoadPromise;
}

/** Site key, read once. Returns undefined (not empty string) when unset so callers can `if` on it. */
export const TURNSTILE_SITE_KEY: string | undefined =
  (import.meta.env.VITE_TURNSTILE_SITE_KEY as string | undefined) || undefined;

/** True only when a real site key has been configured — gates the "require token" UX. */
export function isTurnstileConfigured(): boolean {
  return !!TURNSTILE_SITE_KEY;
}

export function TurnstileWidget({
  action,
  onVerify,
  onExpire,
  onError,
  className,
}: {
  /** Optional Turnstile "action" label, e.g. "signup" / "signin", surfaced in the CF dashboard analytics. */
  action?: string;
  onVerify: (token: string) => void;
  onExpire?: () => void;
  onError?: () => void;
  className?: string;
}) {
  const containerId = useId();
  const widgetIdRef = useRef<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!TURNSTILE_SITE_KEY) return;
    let cancelled = false;

    loadTurnstileScript()
      .then(() => {
        if (cancelled || !window.turnstile) return;
        const el = document.getElementById(containerId);
        if (!el) return;
        widgetIdRef.current = window.turnstile.render(el, {
          sitekey: TURNSTILE_SITE_KEY,
          action,
          theme: 'auto',
          appearance: 'interaction-only',
          callback: (token) => onVerify(token),
          'expired-callback': () => onExpire?.(),
          'error-callback': () => {
            setFailed(true);
            onError?.();
          },
        });
      })
      .catch(() => {
        // Never block the auth form just because the CAPTCHA script failed to load
        // (e.g. an ad-blocker or offline dev environment) — surface it, don't hard-fail.
        if (!cancelled) setFailed(true);
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
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [containerId, action]);

  if (!TURNSTILE_SITE_KEY) return null;

  return (
    <div className={className}>
      <div id={containerId} />
      {failed && (
        <p className="text-xs text-muted-foreground mt-1">
          Verification widget failed to load — please check your connection and try again.
        </p>
      )}
    </div>
  );
}
