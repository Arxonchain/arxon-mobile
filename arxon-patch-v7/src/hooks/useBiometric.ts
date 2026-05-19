import { useState, useCallback, useEffect } from 'react';
import { Capacitor } from '@capacitor/core';

const LOCK_KEY   = 'arxon_biometric_enabled';
const LOCKED_KEY = 'arxon_app_locked';

export function useBiometric() {
  const [enabled,   setEnabled]   = useState(false);
  const [supported, setSupported] = useState(false);
  const [locked,    setLocked]    = useState(false);
  const [checking,  setChecking]  = useState(false);

  // Check if biometric/WebAuthn is available
  useEffect(() => {
    const check = async () => {
      // Web: Check PublicKeyCredential (WebAuthn) support
      if (typeof window !== 'undefined' && 'PublicKeyCredential' in window) {
        try {
          const available = await (window.PublicKeyCredential as any)
            .isUserVerifyingPlatformAuthenticatorAvailable?.();
          setSupported(!!available);
        } catch { setSupported(false); }
      } else {
        setSupported(false);
      }
    };
    check();
    // Load saved preference
    const saved = localStorage.getItem(LOCK_KEY);
    if (saved === 'true') setEnabled(true);
    // Check if app should be locked on resume
    const wasLocked = sessionStorage.getItem(LOCKED_KEY);
    if (wasLocked === 'true') setLocked(true);
  }, []);

  // When app comes back to foreground, lock if enabled
  useEffect(() => {
    if (!enabled) return;
    const onVisible = () => {
      if (document.visibilityState === 'hidden') {
        sessionStorage.setItem(LOCKED_KEY, 'true');
      }
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [enabled]);

  const authenticate = useCallback(async (): Promise<boolean> => {
    setChecking(true);
    try {
      // Use WebAuthn platform authenticator (FaceID / Fingerprint)
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
        setChecking(false);
        return true;
      }
      setChecking(false);
      return false;
    } catch (e: any) {
      setChecking(false);
      // User cancelled or not available
      return false;
    }
  }, []);

  const enableBiometric = useCallback(async (): Promise<boolean> => {
    // Register a credential first (needed for WebAuthn)
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
      return false;
    }
  }, []);

  const disableBiometric = useCallback(() => {
    localStorage.removeItem(LOCK_KEY);
    sessionStorage.removeItem(LOCKED_KEY);
    setEnabled(false);
    setLocked(false);
  }, []);

  return {
    supported,
    enabled,
    locked,
    checking,
    authenticate,
    enableBiometric,
    disableBiometric,
  };
}
