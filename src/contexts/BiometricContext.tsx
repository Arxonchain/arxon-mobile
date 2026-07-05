/**
 * Biometric app lock — temporarily disabled (native AuthActivity crashes on some Android devices).
 * Re-enable by setting BIOMETRIC_FEATURE_ENABLED = true and restoring native verifyIdentity calls.
 */
import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';

/** Set to true when native biometric is stable on target devices. */
export const BIOMETRIC_FEATURE_ENABLED = false;

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

const DISABLED_VALUE: BiometricContextValue = {
  supported: false,
  enabled: false,
  locked: false,
  checking: false,
  authenticate: async () => true,
  enableBiometric: async () => false,
  disableBiometric: () => clearLockState(),
  probeSupport: async () => false,
};

function BiometricProviderInner({ children }: { children: ReactNode }) {
  const [enabled, setEnabled] = useState(false);
  const [locked, setLocked] = useState(false);

  useEffect(() => {
    clearLockState();
    setEnabled(false);
    setLocked(false);
  }, []);

  const disableBiometric = useCallback(() => {
    clearLockState();
    setEnabled(false);
    setLocked(false);
  }, []);

  if (!BIOMETRIC_FEATURE_ENABLED) {
    return (
      <BiometricContext.Provider value={DISABLED_VALUE}>
        {children}
      </BiometricContext.Provider>
    );
  }

  return (
    <BiometricContext.Provider value={{
      supported: false,
      enabled,
      locked,
      checking: false,
      authenticate: async () => true,
      enableBiometric: async () => false,
      disableBiometric,
      probeSupport: async () => false,
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
