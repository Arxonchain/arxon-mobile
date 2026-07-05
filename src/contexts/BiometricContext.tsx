/**
 * Native biometric app lock — lazy-loaded only when user enables/unlocks.
 * Never probes the native plugin on app startup (avoids crash if plugin missing).
 */
import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';
import { Capacitor } from '@capacitor/core';
import {
  BiometryType,
  type AvailableResult,
  type BiometricOptions,
} from '@capgo/capacitor-native-biometric';

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

const VERIFY_OPTIONS: BiometricOptions = {
  title: 'App Locked',
  subtitle: 'Use fingerprint or face ID',
  description: 'Confirm your identity to unlock Arxon',
  negativeButtonText: 'Cancel',
  maxAttempts: 3,
  allowedBiometryTypes: [
    BiometryType.FINGERPRINT,
    BiometryType.FACE_AUTHENTICATION,
    BiometryType.IRIS_AUTHENTICATION,
  ],
};

const ENABLE_OPTIONS: BiometricOptions = {
  title: 'Enable Biometric Lock',
  subtitle: 'Confirm your identity',
  description: 'Use fingerprint or face ID to lock the app when you switch away',
  negativeButtonText: 'Cancel',
  maxAttempts: 3,
  allowedBiometryTypes: [
    BiometryType.FINGERPRINT,
    BiometryType.FACE_AUTHENTICATION,
    BiometryType.IRIS_AUTHENTICATION,
  ],
};

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

/** Android: isAvailable(useFallback:true) can be true for PIN-only — verifyIdentity still needs biometrics. */
function hasEnrolledBiometric(result: AvailableResult): boolean {
  if (!result.isAvailable) return false;
  if (result.strongBiometryIsAvailable) return true;
  const t = result.biometryType;
  return t === BiometryType.FINGERPRINT
    || t === BiometryType.FACE_AUTHENTICATION
    || t === BiometryType.IRIS_AUTHENTICATION
    || t === BiometryType.MULTIPLE;
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
    const result = await callNative(NB => NB.isAvailable({ useFallback: false }));
    if (!result) {
      setSupported(false);
      return false;
    }
    const ok = hasEnrolledBiometric(result);
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
        NB.verifyIdentity(VERIFY_OPTIONS).then(() => true),
      );
      if (ok) {
        setLocked(false);
        sessionStorage.removeItem(LOCKED_KEY);
        return true;
      }
      return false;
    } finally {
      setChecking(false);
    }
  }, [enabled]);

  const enableBiometric = useCallback(async (): Promise<boolean> => {
    if (!Capacitor.isNativePlatform()) return false;
    const available = await probeSupport();
    if (!available) return false;

    const ok = await callNative(NB =>
      NB.verifyIdentity(ENABLE_OPTIONS).then(() => true),
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
