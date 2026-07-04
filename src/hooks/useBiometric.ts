/**
 * Native biometric app lock via @capgo/capacitor-native-biometric.
 * Gracefully disabled when the store APK has not been rebuilt with the plugin yet.
 */
import { useState, useCallback, useEffect } from 'react';
import { Capacitor } from '@capacitor/core';

const LOCK_KEY   = 'arxon_biometric_enabled';
const LOCKED_KEY = 'arxon_app_locked';
const PLUGIN_ID  = 'NativeBiometric';

function pluginMissing(): boolean {
  return Capacitor.isNativePlatform() && !Capacitor.isPluginAvailable(PLUGIN_ID);
}

function clearLockState() {
  try {
    localStorage.removeItem(LOCK_KEY);
    sessionStorage.removeItem(LOCKED_KEY);
  } catch { /* ignore */ }
}

async function getNativeBiometric() {
  if (!Capacitor.isNativePlatform()) return null;
  if (!Capacitor.isPluginAvailable(PLUGIN_ID)) return null;
  try {
    const { NativeBiometric } = await import('@capgo/capacitor-native-biometric');
    return NativeBiometric;
  } catch {
    return null;
  }
}

export function useBiometric() {
  const [enabled,   setEnabled]   = useState(false);
  const [supported, setSupported] = useState(false);
  const [locked,    setLocked]    = useState(false);
  const [checking,  setChecking]  = useState(false);

  useEffect(() => {
    const check = async () => {
      if (!Capacitor.isNativePlatform()) {
        setSupported(false);
        return;
      }

      // OTA JS may load before a Play Store rebuild ships the native plugin.
      if (pluginMissing()) {
        setSupported(false);
        setEnabled(false);
        setLocked(false);
        clearLockState();
        return;
      }

      const NB = await getNativeBiometric();
      if (!NB) {
        setSupported(false);
        setEnabled(false);
        setLocked(false);
        clearLockState();
        return;
      }

      try {
        const result = await NB.isAvailable({ useFallback: true });
        const available = !!result.isAvailable;
        setSupported(available);
        if (!available) {
          setEnabled(false);
          setLocked(false);
          clearLockState();
          return;
        }
        if (localStorage.getItem(LOCK_KEY) === 'true') setEnabled(true);
        if (sessionStorage.getItem(LOCKED_KEY) === 'true') setLocked(true);
      } catch (e) {
        console.warn('[biometric] isAvailable failed:', e);
        setSupported(false);
        setEnabled(false);
        setLocked(false);
        clearLockState();
      }
    };

    void check().catch((e) => {
      console.warn('[biometric] init failed:', e);
      setSupported(false);
      setEnabled(false);
      setLocked(false);
      clearLockState();
    });
  }, []);

  useEffect(() => {
    if (!enabled || !supported) return;
    const onVisible = () => {
      if (document.visibilityState === 'hidden') {
        sessionStorage.setItem(LOCKED_KEY, 'true');
      } else if (sessionStorage.getItem(LOCKED_KEY) === 'true') {
        setLocked(true);
      }
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [enabled, supported]);

  const authenticate = useCallback(async (): Promise<boolean> => {
    if (!Capacitor.isNativePlatform() || pluginMissing()) return true;
    setChecking(true);
    try {
      const NB = await getNativeBiometric();
      if (!NB) return false;
      await NB.verifyIdentity({
        reason: 'Unlock the Arxon app',
        title: 'App Locked',
        subtitle: 'Use fingerprint or face ID',
      });
      setLocked(false);
      sessionStorage.removeItem(LOCKED_KEY);
      return true;
    } catch (e) {
      console.warn('[biometric] verify failed:', e);
      return false;
    } finally {
      setChecking(false);
    }
  }, []);

  const enableBiometric = useCallback(async (): Promise<boolean> => {
    if (!Capacitor.isNativePlatform() || pluginMissing()) return false;
    try {
      const NB = await getNativeBiometric();
      if (!NB) return false;
      await NB.verifyIdentity({
        reason: 'Enable biometric lock for Arxon',
        title: 'Enable Biometric Lock',
        subtitle: 'Confirm your identity',
      });
      localStorage.setItem(LOCK_KEY, 'true');
      setEnabled(true);
      return true;
    } catch (e) {
      console.warn('[biometric] enable failed:', e);
      return false;
    }
  }, []);

  const disableBiometric = useCallback(() => {
    clearLockState();
    setEnabled(false);
    setLocked(false);
  }, []);

  return { supported, enabled, locked, checking, authenticate, enableBiometric, disableBiometric };
}
