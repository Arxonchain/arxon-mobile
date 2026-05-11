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
  const previousRankRef = useRef<number | null>(null);
  const miningSessionCheckRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const notifiedSessionsRef = useRef<Set<string>>(new Set());
  const serviceWorkerRef = useRef<ServiceWorkerRegistration | null>(null);
  const isNative = Capacitor.isNativePlatform();

  // Load preferences
  useEffect(() => {
    const stored = localStorage.getItem(NOTIFICATION_PREFS_KEY);
    if (stored) {
      try { setPreferences(JSON.parse(stored)); } catch {}
    }
  }, []);

  // ── NATIVE (Android/iOS via Capacitor + Firebase) ──────────────────────────
  const userRef = useRef(user);
  useEffect(() => { userRef.current = user; }, [user]);

  useEffect(() => {
    if (!isNative) return;

    const setupNative = async () => {
      PushNotifications.addListener('registration', async (token) => {
        console.log('[Push] FCM Token received:', token.value.substring(0, 20) + '...');
        setFcmToken(token.value);
        setPermission('granted');

        const currentUser = userRef.current;
        if (!currentUser) {
          console.warn('[Push] No user when token received — will retry on next login');
          return;
        }

        const { error } = await supabase.from('push_subscriptions').upsert({
          user_id:   currentUser.id,
          endpoint:  `fcm:${token.value}`,
          p256dh:    token.value,
          auth:      Capacitor.getPlatform(),
          fcm_token: token.value,
          platform:  Capacitor.getPlatform(),
        }, { onConflict: 'endpoint' });

        if (error) {
          console.error('[Push] Failed to save token:', error.message, error.details);
        } else {
          console.log('[Push] Token saved OK for user', currentUser.id);
        }
      });

      PushNotifications.addListener('registrationError', (err) => {
        console.error('[Push] FCM registration error:', JSON.stringify(err));
        setPermission('denied');
      });

      PushNotifications.addListener('pushNotificationReceived', (notification) => {
        console.log('[Push] Notification received in foreground:', notification.title);
      });

      PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
        const url = action.notification.data?.url;
        if (url) window.location.hash = url;
      });
    };

    setupNative();

    return () => {
      PushNotifications.removeAllListeners();
    };
  }, [isNative]);

  // ── WEB (Service Worker + VAPID) ───────────────────────────────────────────
  useEffect(() => {
    if (isNative) return;
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;

    const registerSW = async () => {
      try {
        const registration = await navigator.serviceWorker.register('/sw.js');
        serviceWorkerRef.current = registration;
        const existingSub = await (registration as any).pushManager?.getSubscription();
        if (existingSub && Notification.permission === 'granted') {
          setPermission('granted');
        }
      } catch (error) {
        console.error('Service Worker registration failed:', error);
      }
    };
    registerSW();
  }, [isNative]);

  // ── AUTO-REQUEST permission when user logs in (web only) ──────────────────
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
          try {
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
            }, { onConflict: 'user_id,endpoint' });
          } catch (e) {
            console.error('[Push] Failed to subscribe after permission granted:', e);
          }
        }
      } catch (e) {
        console.error('[Push] Permission request error:', e);
      }
    }, 3000);
    return () => clearTimeout(timer);
  }, [user, isNative]);

  // ── AUTO-REQUEST permission for native on login ────────────────────────────
  useEffect(() => {
    if (!isNative || !user) return;

    const autoRegister = async () => {
      try {
        const { receive } = await PushNotifications.checkPermissions();
        console.log('[Push] Native permission status:', receive);

        if (receive === 'granted') {
          console.log('[Push] Permission already granted — registering');
          await PushNotifications.register();
          setPermission('granted');
        } else if (receive === 'prompt' || receive === 'prompt-with-rationale') {
          console.log('[Push] Prompting for permission');
          const { receive: result } = await PushNotifications.requestPermissions();
          if (result === 'granted') {
            await PushNotifications.register();
            setPermission('granted');
          } else {
            console.warn('[Push] User denied notification permission');
            setPermission('denied');
          }
        } else {
          // 'denied' — Android won't show the dialog again
          // User must enable manually in Settings → Apps → Arxon → Notifications
          console.warn('[Push] Notification permission denied by OS. User must enable in Settings.');
          setPermission('denied');
        }
      } catch (e) {
        console.error('[Push] Native auto-register error:', e);
      }
    };

    const t = setTimeout(autoRegister, 1500);
    return () => clearTimeout(t);
  }, [user?.id, isNative]);

  // ── Open OS notification settings (for denied state) ──────────────────────
  const openNotificationSettings = useCallback(async () => {
    if (!isNative) return;
    try {
      // On Android/iOS this opens the app's notification settings page
      const { NativeSettings } = await import('@capgo/capacitor-native-settings');
      await NativeSettings.openAndroid({ option: 'application' as any });
    } catch {
      // Fallback — try Capacitor App plugin if NativeSettings not available
      try {
        const { App } = await import('@capacitor/app');
        // This won't open settings directly but at least won't crash
        console.log('[Push] NativeSettings not available — user must open Settings manually');
      } catch {}
    }
  }, [isNative]);

  // ── Manual requestPermission ───────────────────────────────────────────────
  const requestPermission = useCallback(async () => {
    try {
      if (isNative) {
        const { receive } = await PushNotifications.checkPermissions();
        if (receive === 'denied') {
          // Can't prompt again — open settings instead
          await openNotificationSettings();
          return false;
        }
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
        setPermission(result);
        if (result === 'granted' && serviceWorkerRef.current) {
          await (serviceWorkerRef.current as any).pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
          });
        }
        return result === 'granted';
      }
    } catch (error) {
      console.error('Error requesting permission:', error);
      return false;
    }
  }, [isNative, openNotificationSettings]);

  // ── Re-register token (call this after returning from Settings) ────────────
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

  // ── Send server push via Supabase Edge Function ───────────────────────────
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
          title,
          body,
          url: options?.url || '/',
          tag: options?.tag || 'arxon-notification',
        },
      });
    } catch (error) {
      console.error('Error sending server push:', error);
    }
  }, [user]);

  // ── ARENA NOTIFICATIONS ────────────────────────────────────────────────────
  useEffect(() => {
    if (!user || !preferences.arenaLive) return;
    const channel = supabase
      .channel('arena-live-notifications')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'arena_battles' }, async (payload) => {
        const battle = payload.new as any;
        if (battle?.is_active) {
          const startsNow = !battle.starts_at || new Date(battle.starts_at) <= new Date();
          await sendServerPush(
            startsNow ? '⚔️ New Arena Battle is LIVE!' : '🗓️ New Arena Battle Scheduled!',
            startsNow ? `${battle.title} just started — stake your ARX-P now!` : `${battle.title} is coming. Get ready!`,
            { url: '/arena', tag: 'arena-live' }
          );
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, preferences.arenaLive, sendServerPush]);

  useEffect(() => {
    if (!user || !preferences.arenaResults) return;
    const channel = supabase
      .channel('arena-result-notifications')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'arena_battles' }, async (payload) => {
        const market = payload.new as any;
        if (market?.resolved_at) {
          await sendServerPush(
            '🏆 Arena Battle Result',
            `Arena battle "${market.question || 'Battle'}" has ended. Check your results!`,
            { url: '/arena', tag: 'arena-result' }
          );
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, preferences.arenaResults, sendServerPush]);

  // ── REWARD DISTRIBUTION ───────────────────────────────────────────────────
  useEffect(() => {
    if (!user || !preferences.rewardDistributed) return;
    const channel = supabase
      .channel('reward-distribution-notifications')
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'user_notifications',
        filter: `user_id=eq.${user.id}`,
      }, async (payload) => {
        const notif = payload.new as any;
        if (notif?.notification_type === 'reward' && notif?.amount > 0) {
          await sendServerPush(
            '💰 Reward Distributed!',
            `You received +${notif.amount.toLocaleString()} ARX-P! ${notif.message || ''}`,
            { url: '/dashboard', tag: 'reward-distributed' }
          );
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, preferences.rewardDistributed, sendServerPush]);

  // ── ADMIN ANNOUNCEMENTS ───────────────────────────────────────────────────
  useEffect(() => {
    if (!user || !preferences.adminAnnouncements) return;
    const channel = supabase
      .channel('announcements-notifications')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'announcements' }, async (payload) => {
        if ((payload.new as any)?.is_active) {
          await sendServerPush(
            '📢 Arxon Announcement',
            (payload.new as any).title || 'New announcement from the team',
            { url: '/dashboard', tag: 'announcement' }
          );
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, preferences.adminAnnouncements, sendServerPush]);

  // ── MINING ALERTS ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!user || (!preferences.miningAlerts && !preferences.claimNotifications)) {
      if (miningSessionCheckRef.current) clearInterval(miningSessionCheckRef.current);
      return;
    }

    const checkMiningSession = async () => {
      try {
        const { data: session } = await supabase
          .from('mining_sessions')
          .select('id, started_at, is_active')
          .eq('user_id', user.id)
          .eq('is_active', true)
          .maybeSingle();

        if (!session) return;
        const elapsed = (Date.now() - new Date(session.started_at).getTime()) / 1000;
        const maxTime = 8 * 60 * 60;
        const tenMinsBefore = maxTime - 10 * 60;

        if (preferences.miningAlerts && elapsed >= tenMinsBefore && elapsed < maxTime) {
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
      } catch (error) {
        console.error('Error checking mining session:', error);
      }
    };

    checkMiningSession();
    miningSessionCheckRef.current = setInterval(checkMiningSession, 120_000);
    return () => { if (miningSessionCheckRef.current) clearInterval(miningSessionCheckRef.current); };
  }, [user, preferences.miningAlerts, preferences.claimNotifications, sendServerPush]);

  // ── CHAT NOTIFICATIONS ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel('chat-message-notifications')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_messages' }, async (payload) => {
        const msg = payload.new as any;
        if (msg?.user_id === user.id) return;
        const chanLabels: Record<string, string> = { general: 'General', alpha: 'Alpha Team', omega: 'Omega Team', nexus_exchange: 'Nexus Exchange' };
        await sendServerPush(
          `💬 ${msg.username || 'Someone'} in ${chanLabels[msg.channel] || 'Chat'}`,
          msg.message?.slice(0, 80) || 'New message',
          { url: '/chat', tag: `chat-${msg.channel}` }
        );
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, sendServerPush]);

  // ── ARENA WIN/LOSS PERSONAL NOTIFICATIONS ─────────────────────────────────
  useEffect(() => {
    if (!user || !preferences.arenaResults) return;
    const channel = supabase
      .channel('arena-personal-result-notifications')
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'user_notifications',
        filter: `user_id=eq.${user.id}`,
      }, async (payload) => {
        const notif = payload.new as any;
        if (notif?.notification_type === 'arena_win') {
          await sendServerPush('🏆 You Won the Arena Battle!', `You won ${notif.amount?.toLocaleString() || ''} ARX-P!`, { url: '/arena', tag: 'arena-win' });
        } else if (notif?.notification_type === 'arena_loss') {
          await sendServerPush('💧 Arena Battle Result', `Your team lost. ${Math.abs(notif.amount || 0).toLocaleString()} ARX-P deducted.`, { url: '/arena', tag: 'arena-loss' });
        } else if (notif?.notification_type === 'arena_new_battle') {
          await sendServerPush('⚔️ New Arena Battle Added!', notif.message || 'A new battle has been added. Stake your ARX-P!', { url: '/arena', tag: 'arena-new-battle' });
        } else if (notif?.notification_type === 'announcement') {
          await sendServerPush('📢 ' + (notif.title || 'Arxon Announcement'), notif.message || 'New announcement from the Arxon team.', { url: '/notifications', tag: 'announcement' });
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
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
    reRegisterToken,        // call this after returning from OS Settings
    openNotificationSettings, // opens Android Settings for this app
    sendServerPush,
    updatePreferences,
    isSupported: isNative || ('serviceWorker' in navigator && 'PushManager' in window),
    isNative,
  };
};
