/**
 * Native biometric app lock — lazy-loaded only when user enables/unlocks.
 * Never probes the native plugin on app startup (avoids crash if plugin missing).
 */
import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';
import { Capacitor } from '@capacitor/core';

const LOCK_KEY   = 'arxon_biometric_enabled';
const LOCKED_KEY = 'arxon_app_locked';

type BiometricContextValue = {
  supported: boolean;
  enabled: boolean;
  locked: boolean;
  checking: boolean;
  authenticate: () => Promise<boolean>;
  enableBiometric: () => Promise<boolean>;
  disableBiometric: () => void;
  probeSupport: () => Promise<boolean>;
};

const BiometricContext = createContext<BiometricContextValue | null>(null);

function clearLockState() {
  try {
    localStorage.removeItem(LOCK_KEY);
    sessionStorage.removeItem(LOCKED_KEY);
  } catch { /* ignore */ }
}

function isPluginError(e: unknown): boolean {
  const msg = String((e as Error)?.message || e || '').toLowerCase();
  return msg.includes('not implemented') || msg.includes('nativebiometric');
}

async function callNative<T>(fn: (NB: typeof import('@capgo/capacitor-native-biometric').NativeBiometric) => Promise<T>): Promise<T | null> {
  if (!Capacitor.isNativePlatform()) return null;
  try {
    const { NativeBiometric } = await import('@capgo/capacitor-native-biometric');
    return await fn(NativeBiometric);
  } catch (e) {
    if (isPluginError(e)) console.warn('[biometric] native plugin unavailable:', e);
    else console.warn('[biometric] call failed:', e);
    return null;
  }
}

function BiometricProviderInner({ children }: { children: ReactNode }) {
  const [enabled, setEnabled]   = useState(() => {
    try { return localStorage.getItem(LOCK_KEY) === 'true'; } catch { return false; }
  });
  const [locked, setLocked]     = useState(() => {
    try { return sessionStorage.getItem(LOCKED_KEY) === 'true'; } catch { return false; }
  });
  const [supported, setSupported] = useState(false);
  const [checking, setChecking]   = useState(false);

  const probeSupport = useCallback(async (): Promise<boolean> => {
    if (!Capacitor.isNativePlatform()) {
      setSupported(false);
      return false;
    }
    const result = await callNative(NB => NB.isAvailable({ useFallback: true }));
    if (!result) {
      setSupported(false);
      return false;
    }
    const ok = !!result.isAvailable;
    setSupported(ok);
    if (!ok) {
      clearLockState();
      setEnabled(false);
      setLocked(false);
    }
    return ok;
  }, []);

  useEffect(() => {
    if (!enabled) return;
    const onVisible = () => {
      if (document.visibilityState === 'hidden') {
        sessionStorage.setItem(LOCKED_KEY, 'true');
      } else if (sessionStorage.getItem(LOCKED_KEY) === 'true') {
        setLocked(true);
      }
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [enabled]);

  const authenticate = useCallback(async (): Promise<boolean> => {
    if (!Capacitor.isNativePlatform()) return true;
    if (!enabled) return true;

    setChecking(true);
    try {
      const ok = await callNative(NB =>
        NB.verifyIdentity({
          reason: 'Unlock the Arxon app',
          title: 'App Locked',
          subtitle: 'Use fingerprint or face ID',
        }).then(() => true),
      );
      if (ok) {
        setLocked(false);
        sessionStorage.removeItem(LOCKED_KEY);
        return true;
      }
      // Plugin missing or verify failed — don't brick the app
      clearLockState();
      setEnabled(false);
      setLocked(false);
      return true;
    } finally {
      setChecking(false);
    }
  }, [enabled]);

  const enableBiometric = useCallback(async (): Promise<boolean> => {
    if (!Capacitor.isNativePlatform()) return false;
    const available = await probeSupport();
    if (!available) return false;

    const ok = await callNative(NB =>
      NB.verifyIdentity({
        reason: 'Enable biometric lock for Arxon',
        title: 'Enable Biometric Lock',
        subtitle: 'Confirm your identity',
      }).then(() => true),
    );
    if (!ok) return false;

    localStorage.setItem(LOCK_KEY, 'true');
    setEnabled(true);
    return true;
  }, [probeSupport]);

  const disableBiometric = useCallback(() => {
    clearLockState();
    setEnabled(false);
    setLocked(false);
  }, []);

  return (
    <BiometricContext.Provider value={{
      supported, enabled, locked, checking,
      authenticate, enableBiometric, disableBiometric, probeSupport,
    }}>
      {children}
    </BiometricContext.Provider>
  );
}

export function BiometricProvider({ children }: { children: ReactNode }) {
  return <BiometricProviderInner>{children}</BiometricProviderInner>;
}

export function useBiometric(): BiometricContextValue {
  const ctx = useContext(BiometricContext);
  if (!ctx) throw new Error('useBiometric must be used within BiometricProvider');
  return ctx;
}
