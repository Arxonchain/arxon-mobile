import { useEffect, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import AppFailureScreen from './AppFailureScreen';
import { isBootOk, onBootOk } from '@/lib/bootState';
import { errorUi } from './errorUiTokens';

const ESCALATE_MS = 2500;

/** Sticky banner when native app loses network; full-screen when offline blocks initial load. */
export default function NetworkOfflineBanner() {
  const [offline, setOffline] = useState(
    () => typeof navigator !== 'undefined' && !navigator.onLine,
  );
  const [bootOk, setBootOk] = useState(isBootOk);
  const [escalate, setEscalate] = useState(false);

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    const onOnline = () => setOffline(false);
    const onOffline = () => setOffline(true);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);

  useEffect(() => onBootOk(() => setBootOk(true)), []);

  useEffect(() => {
    if (!offline || bootOk || !Capacitor.isNativePlatform()) {
      setEscalate(false);
      return;
    }
    const t = window.setTimeout(() => setEscalate(true), ESCALATE_MS);
    return () => window.clearTimeout(t);
  }, [offline, bootOk]);

  if (!offline || !Capacitor.isNativePlatform()) return null;

  if (!bootOk && escalate) {
    return (
      <AppFailureScreen
        failureType="offline"
        onPrimary={() => window.location.reload()}
      />
    );
  }

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: errorUi.overlayZ - 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        padding: '10px 16px',
        background: `${errorUi.warn}22`,
        borderBottom: `1px solid ${errorUi.warn}55`,
        color: errorUi.warn,
        fontSize: 12,
        fontWeight: 600,
        fontFamily: errorUi.font,
      }}
    >
      <span aria-hidden>📡</span>
      <span>No connection — check your network and reload</span>
    </div>
  );
}
