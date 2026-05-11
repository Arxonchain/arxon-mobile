import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Capacitor } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';

const NOTIFICATION_PREFS_KEY = 'arxon_notification_preferences';
const VAPID_PUBLIC_KEY = 'BH83wzlnSpDzR3jxVWOmlPVnSWMxzKy6XABCoR5BThesZTX3Lkt_cJZmze_gDsReh5_IeBXIjb-ijbluwf0I2_w';

interface NotificationPreferences {
  arenaResults: boolean;
  arenaLive: boolean;
  rewardDistributed: boolean;
  adminAnnouncements: boolean;
  miningAlerts: boolean;
  claimNotifications: boolean;
}

const defaultPrefs: NotificationPreferences = {
  arenaResults: true,
  arenaLive: true,
  rewardDistributed: true,
  adminAnnouncements: true,
  miningAlerts: true,
  claimNotifications: true,
};

function urlBase64ToUint8Array(base64String: string): ArrayBuffer {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) outputArray[i] = rawData.charCodeAt(i);
  return outputArray.buffer as ArrayBuffer;
}

export const usePushNotifications = () => {
  const { user } = useAuth();
  const [permission, setPermission] = useState<'default' | 'granted' | 'denied'>('default');
  const [preferences, setPreferences] = useState<NotificationPreferences>(defaultPrefs);
  const [fcmToken, setFcmToken] = useState<string | null>(null);
  const miningSessionCheckRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const notifiedSessionsRef = useRef<Set<string>>(new Set());
  const serviceWorkerRef = useRef<ServiceWorkerRegistration | null>(null);
  const isNative = Capacitor.isNativePlatform();
  const userRef = useRef(user);
  useEffect(() => { userRef.current = user; }, [user]);

  // Load preferences
  useEffect(() => {
    const stored = localStorage.getItem(NOTIFICATION_PREFS_KEY);
    if (stored) {
      try { setPreferences(JSON.parse(stored)); } catch {}
    }
  }, []);

  // ── NATIVE setup (Android/iOS) ─────────────────────────────────────────────
  useEffect(() => {
    if (!isNative) return;

    PushNotifications.addListener('registration', async (token) => {
      console.log('[Push] FCM Token received');
      setFcmToken(token.value);
      setPermission('granted');

      const currentUser = userRef.current;
      if (!currentUser) return;

      const { error } = await supabase.from('push_subscriptions').upsert({
        user_id:   currentUser.id,
        endpoint:  `fcm:${token.value}`,
        p256dh:    token.value,
        auth:      Capacitor.getPlatform(),
        fcm_token: token.value,
        platform:  Capacitor.getPlatform(),
      }, { onConflict: 'endpoint' });

      if (error) console.error('[Push] Save token error:', error.message);
      else console.log('[Push] Token saved for user', currentUser.id);
    });

    PushNotifications.addListener('registrationError', (err) => {
      console.error('[Push] Registration error:', JSON.stringify(err));
      setPermission('denied');
    });

    PushNotifications.addListener('pushNotificationReceived', (notification) => {
      console.log('[Push] Foreground notification:', notification.title);
    });

    PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
      const url = action.notification.data?.url;
      if (url) window.location.hash = url;
    });

    return () => { PushNotifications.removeAllListeners(); };
  }, [isNative]);

  // ── WEB service worker setup ───────────────────────────────────────────────
  useEffect(() => {
    if (isNative) return;
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;

    navigator.serviceWorker.register('/sw.js')
      .then(reg => {
        serviceWorkerRef.current = reg;
        if (Notification.permission === 'granted') setPermission('granted');
      })
      .catch(err => console.error('[Push] SW registration failed:', err));
  }, [isNative]);

  // ── AUTO-REQUEST on login (native) ─────────────────────────────────────────
  useEffect(() => {
    if (!isNative || !user) return;

    const autoRegister = async () => {
      try {
        const { receive } = await PushNotifications.checkPermissions();
        console.log('[Push] Permission status:', receive);

        if (receive === 'granted') {
          await PushNotifications.register();
          setPermission('granted');
        } else if (receive === 'prompt' || receive === 'prompt-with-rationale') {
          const { receive: result } = await PushNotifications.requestPermissions();
          if (result === 'granted') {
            await PushNotifications.register();
            setPermission('granted');
          } else {
            setPermission('denied');
          }
        } else {
          setPermission('denied');
        }
      } catch (e) {
        console.error('[Push] Auto-register error:', e);
      }
    };

    const t = setTimeout(autoRegister, 1500);
    return () => clearTimeout(t);
  }, [user?.id, isNative]);

  // ── AUTO-REQUEST on login (web) ────────────────────────────────────────────
  useEffect(() => {
    if (isNative || !user) return;
    if (!('Notification' in window)) return;

    if (Notification.permission !== 'default') {
      setPermission(Notification.permission as any);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const result = await Notification.requestPermission();
        setPermission(result as any);
        if (result === 'granted' && serviceWorkerRef.current) {
          const sub = await (serviceWorkerRef.current as any).pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
          });
          const subJson = sub.toJSON();
          await supabase.from('push_subscriptions').upsert({
            user_id: user.id,
            endpoint: subJson.endpoint,
            p256dh: subJson.keys?.p256dh || '',
            auth: subJson.keys?.auth || '',
          }, { onConflict: 'endpoint' });
        }
      } catch (e) {
        console.error('[Push] Web permission error:', e);
      }
    }, 3000);

    return () => clearTimeout(timer);
  }, [user, isNative]);

  // ── Manual requestPermission ───────────────────────────────────────────────
  const requestPermission = useCallback(async () => {
    try {
      if (isNative) {
        const { receive } = await PushNotifications.checkPermissions();
        if (receive === 'denied') return false;
        const { receive: result } = await PushNotifications.requestPermissions();
        if (result === 'granted') {
          await PushNotifications.register();
          setPermission('granted');
          return true;
        }
        setPermission('denied');
        return false;
      } else {
        const result = await Notification.requestPermission();
        setPermission(result as any);
        return result === 'granted';
      }
    } catch (e) {
      console.error('[Push] requestPermission error:', e);
      return false;
    }
  }, [isNative]);

  // ── Re-register after returning from OS Settings ───────────────────────────
  const reRegisterToken = useCallback(async () => {
    if (!isNative) return;
    try {
      const { receive } = await PushNotifications.checkPermissions();
      if (receive === 'granted') {
        await PushNotifications.register();
        setPermission('granted');
      }
    } catch (e) {
      console.error('[Push] Re-register error:', e);
    }
  }, [isNative]);

  // ── Send via Edge Function ─────────────────────────────────────────────────
  const sendServerPush = useCallback(async (
    title: string,
    body: string,
    options?: { url?: string; tag?: string; userId?: string }
  ) => {
    if (!user) return;
    try {
      await supabase.functions.invoke('send-push-notification', {
        body: {
          userId: options?.userId || user.id,
          title, body,
          url: options?.url || '/',
          tag: options?.tag || 'arxon',
        },
      });
    } catch (e) {
      console.error('[Push] sendServerPush error:', e);
    }
  }, [user]);

  // ── Arena live battle notifications ───────────────────────────────────────
  useEffect(() => {
    if (!user || !preferences.arenaLive) return;
    const ch = supabase.channel('arena-live-notifs')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'arena_battles' }, async (payload) => {
        const b = payload.new as any;
        if (b?.is_active) {
          await sendServerPush('⚔️ New Arena Battle is LIVE!', `${b.title} just started — stake your ARX-P now!`, { url: '/arena', tag: 'arena-live' });
        }
      }).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user, preferences.arenaLive, sendServerPush]);

  // ── Arena results ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!user || !preferences.arenaResults) return;
    const ch = supabase.channel('arena-result-notifs')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'arena_battles' }, async (payload) => {
        const b = payload.new as any;
        if (b?.resolved_at) {
          await sendServerPush('🏆 Arena Battle Result', `"${b.title || 'Battle'}" has ended. Check your results!`, { url: '/arena', tag: 'arena-result' });
        }
      }).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user, preferences.arenaResults, sendServerPush]);

  // ── Admin announcements ────────────────────────────────────────────────────
  useEffect(() => {
    if (!user || !preferences.adminAnnouncements) return;
    const ch = supabase.channel('announcements-notifs')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'announcements' }, async (payload) => {
        const a = payload.new as any;
        if (a?.is_active) {
          await sendServerPush('📢 Arxon Announcement', a.title || 'New announcement from the team', { url: '/dashboard', tag: 'announcement' });
        }
      }).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user, preferences.adminAnnouncements, sendServerPush]);

  // ── Mining alerts ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!user || (!preferences.miningAlerts && !preferences.claimNotifications)) {
      if (miningSessionCheckRef.current) clearInterval(miningSessionCheckRef.current);
      return;
    }

    const check = async () => {
      try {
        const { data: session } = await supabase
          .from('mining_sessions').select('id, started_at, is_active')
          .eq('user_id', user.id).eq('is_active', true).maybeSingle();

        if (!session) return;
        const elapsed = (Date.now() - new Date(session.started_at).getTime()) / 1000;
        const maxTime = 8 * 60 * 60;

        if (preferences.miningAlerts && elapsed >= maxTime - 600 && elapsed < maxTime) {
          if (!notifiedSessionsRef.current.has(`${session.id}-warning`)) {
            notifiedSessionsRef.current.add(`${session.id}-warning`);
            await sendServerPush('⏰ Mining Session Ending Soon', 'Your mining session ends in 10 minutes. Get ready to claim!', { url: '/mining', tag: 'mining-warning' });
          }
        }

        if (preferences.claimNotifications && elapsed >= maxTime) {
          if (!notifiedSessionsRef.current.has(`${session.id}-complete`)) {
            notifiedSessionsRef.current.add(`${session.id}-complete`);
            await sendServerPush('🎉 Mining Complete!', 'Your 8-hour session is done. Claim your ARX-P now!', { url: '/mining', tag: 'mining-complete' });
          }
        }
      } catch (e) {
        console.error('[Push] Mining check error:', e);
      }
    };

    check();
    miningSessionCheckRef.current = setInterval(check, 120_000);
    return () => { if (miningSessionCheckRef.current) clearInterval(miningSessionCheckRef.current); };
  }, [user, preferences.miningAlerts, preferences.claimNotifications, sendServerPush]);



  // ── Personal arena win/loss ────────────────────────────────────────────────
  useEffect(() => {
    if (!user || !preferences.arenaResults) return;
    const ch = supabase.channel('arena-personal-notifs')
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'user_notifications',
        filter: `user_id=eq.${user.id}`,
      }, async (payload) => {
        const n = payload.new as any;
        if (n?.notification_type === 'arena_win') {
          await sendServerPush('🏆 You Won!', `You won ${n.amount?.toLocaleString() || ''} ARX-P!`, { url: '/arena', tag: 'arena-win' });
        } else if (n?.notification_type === 'arena_loss') {
          await sendServerPush('💧 Battle Result', `Your team lost. ${Math.abs(n.amount || 0).toLocaleString()} ARX-P deducted.`, { url: '/arena', tag: 'arena-loss' });
        } else if (n?.notification_type === 'announcement') {
          await sendServerPush('📢 ' + (n.title || 'Arxon Announcement'), n.message || 'New announcement.', { url: '/notifications', tag: 'announcement' });
        }
      }).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user, preferences.arenaResults, sendServerPush]);

  const updatePreferences = useCallback((newPrefs: NotificationPreferences) => {
    setPreferences(newPrefs);
    localStorage.setItem(NOTIFICATION_PREFS_KEY, JSON.stringify(newPrefs));
  }, []);

  return {
    permission,
    preferences,
    fcmToken,
    requestPermission,
    reRegisterToken,
    sendServerPush,
    updatePreferences,
    isSupported: isNative || ('serviceWorker' in navigator && 'PushManager' in window),
    isNative,
  };
};
