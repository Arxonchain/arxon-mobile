import { useEffect, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { WifiOff } from 'lucide-react';

/** Sticky banner when native app loses network (remote UI requires connectivity). */
export default function NetworkOfflineBanner() {
  const [offline, setOffline] = useState(
    () => typeof navigator !== 'undefined' && !navigator.onLine,
  );

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    const onOnline  = () => setOffline(false);
    const onOffline = () => setOffline(true);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);

  if (!offline || !Capacitor.isNativePlatform()) return null;

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 9998,
      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
      padding: '10px 16px',
      background: 'hsl(38 55% 52%/0.15)',
      borderBottom: '1px solid hsl(38 55% 52%/0.35)',
      color: 'hsl(38 55% 68%)',
      fontSize: 12, fontWeight: 600,
      fontFamily: "'Creato Display',-apple-system,system-ui,sans-serif",
    }}>
      <WifiOff size={14} />
      <span>No connection — check your network and reload</span>
    </div>
  );
}
