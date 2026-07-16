import { useCallback, useEffect, useRef } from 'react';
import { Capacitor } from '@capacitor/core';
import { PRODUCTION_APP_ORIGIN } from '@/lib/appOrigins';

const STORAGE_KEY = 'arxon:web-bundle-version';
const CHECK_INTERVAL_MS = 5 * 60_000;

type BundleVersion = { version: string; builtAt: string };

async function fetchRemoteVersion(): Promise<BundleVersion | null> {
  try {
    const origin = Capacitor.isNativePlatform() ? PRODUCTION_APP_ORIGIN : window.location.origin;
    const res = await fetch(`${origin}/web-bundle-version.json?t=${Date.now()}`, {
      cache: 'no-store',
    });
    if (!res.ok) return null;
    return (await res.json()) as BundleVersion;
  } catch {
    return null;
  }
}

function persistVersion(version: string) {
  try {
    localStorage.setItem(STORAGE_KEY, version);
  } catch {
    /* ignore */
  }
}

function readStoredVersion(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

/** Poll remote bundle version and reload when Cloudflare Pages has a newer deploy (no Play Store update). */
export function useWebBundleRefresh() {
  const checkingRef = useRef(false);

  const checkForUpdate = useCallback(async (forceReload = false) => {
    if (checkingRef.current) return;
    checkingRef.current = true;
    try {
      const remote = await fetchRemoteVersion();
      if (!remote?.version) return;

      const stored = readStoredVersion();
      if (!stored) {
        persistVersion(remote.version);
        return;
      }

      if (remote.version !== stored) {
        persistVersion(remote.version);
        if (forceReload || stored !== 'local') {
          window.location.reload();
        }
      }
    } finally {
      checkingRef.current = false;
    }
  }, []);

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    void checkForUpdate(false);

    const onVisible = () => {
      if (document.visibilityState === 'visible') {
        void checkForUpdate(true);
      }
    };
    document.addEventListener('visibilitychange', onVisible);

    const interval = window.setInterval(() => {
      void checkForUpdate(true);
    }, CHECK_INTERVAL_MS);

    let removeAppListener: (() => void) | undefined;
    void (async () => {
      if (!Capacitor.isPluginAvailable('App')) return;
      try {
        const { App } = await import('@capacitor/app');
        const handle = await App.addListener('appStateChange', ({ isActive }) => {
          if (isActive) void checkForUpdate(true);
        });
        removeAppListener = () => handle.remove();
      } catch {
        /* ignore */
      }
    })();

    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      window.clearInterval(interval);
      removeAppListener?.();
    };
  }, [checkForUpdate]);
}
