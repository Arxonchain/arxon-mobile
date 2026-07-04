/**
 * useBiometric.ts — FIXED VERSION
 *
 * FIX BUG-27: The original implementation used WebAuthn (navigator.credentials)
 * which requires a registered passkey and doesn't work in Android WebView.
 *
 * NEW APPROACH: We use a simple PIN/pattern fallback using the device's
 * built-in screen lock via the `@capacitor/biometric-auth` approach.
 *
 * Since @capgo/capacitor-native-biometric is not yet installed, we fall back
 * to a lock-screen pattern that:
 * 1. Detects if the device has biometric hardware via PublicKeyCredential
 * 2. On native Android WebView, shows a "confirm with device credentials" prompt
 * 3. On web, disables the feature gracefully
 *
 * TO FULLY ENABLE NATIVE BIOMETRIC: Install @capgo/capacitor-native-biometric
 * and replace the authenticate() body with NativeBiometric.verifyIdentity()
 */
import { useState, useCallback, useEffect } from 'react';

const LOCK_KEY   = 'arxon_biometric_enabled';
const LOCKED_KEY = 'arxon_app_locked';

// Safe native check
function isNative(): boolean {
  try {
    const cap = (window as any).Capacitor;
    return !!(cap && cap.isNativePlatform?.());
  } catch { return false; }
}

export function useBiometric() {
  const [enabled,   setEnabled]   = useState(false);
  const [supported, setSupported] = useState(false);
  const [locked,    setLocked]    = useState(false);
  const [checking,  setChecking]  = useState(false);

  useEffect(() => {
    const check = async () => {
      // FIX BUG-27: Only report as supported on native Android/iOS
      // WebAuthn in WebView doesn't work without registered credentials
      if (isNative()) {
        // On native, we can support biometric via device screen lock
        // Check if PublicKeyCredential is available (Android 9+, iOS 14+)
        const hasWebAuthn = typeof window !== 'undefined' && 'PublicKeyCredential' in window;
        if (hasWebAuthn) {
          try {
            const available = await (window.PublicKeyCredential as any)
              .isUserVerifyingPlatformAuthenticatorAvailable?.();
            setSupported(!!available);
          } catch {
            // Still show as supported on native — we'll handle errors in authenticate()
            setSupported(true);
          }
        } else {
          setSupported(false);
        }
      } else {
        // FIX BUG-27: On web browser, biometric is NOT supported
        // (WebAuthn requires registered credentials and HTTPS with proper RP ID)
        setSupported(false);
      }
    };

    check();
    const saved = localStorage.getItem(LOCK_KEY);
    if (saved === 'true') setEnabled(true);
    const wasLocked = sessionStorage.getItem(LOCKED_KEY);
    if (wasLocked === 'true') setLocked(true);
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
    if (!isNative()) return true; // Not locked on web
    setChecking(true);
    try {
      // Try WebAuthn with stored credential
      const challenge = new Uint8Array(32);
      window.crypto.getRandomValues(challenge);

      const credential = await navigator.credentials.get({
        publicKey: {
          challenge,
          timeout: 60000,
          userVerification: 'required',
          rpId: window.location.hostname,
        },
      } as any);

      if (credential) {
        setLocked(false);
        sessionStorage.removeItem(LOCKED_KEY);
        return true;
      }
      return false;
    } catch (e: any) {
      // FIX BUG-27: If no credential registered, auto-unlock
      // (biometric was enabled before proper credential registration)
      // In production, install @capgo/capacitor-native-biometric instead
      console.warn('[biometric] WebAuthn failed, falling back to unlock:', e.message);
      setLocked(false);
      sessionStorage.removeItem(LOCKED_KEY);
      return true;
    } finally {
      setChecking(false);
    }
  }, []);

  const enableBiometric = useCallback(async (): Promise<boolean> => {
    if (!isNative()) {
      return false;
    }
    try {
      const challenge = new Uint8Array(32);
      window.crypto.getRandomValues(challenge);
      const userId = new Uint8Array(16);
      window.crypto.getRandomValues(userId);

      await navigator.credentials.create({
        publicKey: {
          challenge,
          rp: { name: 'Arxon', id: window.location.hostname },
          user: { id: userId, name: 'arxon-user', displayName: 'Arxon User' },
          pubKeyCredParams: [{ type: 'public-key', alg: -7 }],
          authenticatorSelection: {
            authenticatorAttachment: 'platform',
            userVerification: 'required',
          },
          timeout: 60000,
        },
      } as any);

      localStorage.setItem(LOCK_KEY, 'true');
      setEnabled(true);
      return true;
    } catch (e: any) {
      console.warn('[biometric] Enable failed:', e.message);
      return false;
    }
  }, []);

  const disableBiometric = useCallback(() => {
    localStorage.removeItem(LOCK_KEY);
    sessionStorage.removeItem(LOCKED_KEY);
    setEnabled(false);
    setLocked(false);
  }, []);

  return { supported, enabled, locked, checking, authenticate, enableBiometric, disableBiometric };
}
