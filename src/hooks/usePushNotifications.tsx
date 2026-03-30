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
  useEffect(() => {
    if (!isNative) return;

    const setupNative = async () => {
      // Check current permission
      const { receive } = await PushNotifications.checkPermissions();
      if (receive === 'granted') setPermission('granted');

      // Listen for FCM token
      PushNotifications.addListener('registration', async (token) => {
        console.log('FCM Token:', token.value);
        setFcmToken(token.value);
        setPermission('granted');

        // Save token to Supabase
        if (user) {
          await supabase.from('push_subscriptions').upsert({
            user_id: user.id,
            fcm_token: token.value,
            platform: Capacitor.getPlatform(),
          }, { onConflict: 'user_id,fcm_token' });
        }
      });

      PushNotifications.addListener('registrationError', (err) => {
        console.error('FCM registration error:', err);
        setPermission('denied');
      });

      // Handle notification received while app is open
      PushNotifications.addListener('pushNotificationReceived', (notification) => {
        console.log('Notification received:', notification);
      });

      // Handle notification tap (app was in background)
      PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
        const url = action.notification.data?.url;
        if (url) window.location.hash = url;
      });
    };

    setupNative();

    return () => {
      PushNotifications.removeAllListeners();
    };
  }, [isNative, user]);

  // ── AUTO-REQUEST permission on first load (native) ──────────────────────
  useEffect(() => {
    if (!isNative) return;
    PushNotifications.checkPermissions().then(({ receive }) => {
      if (receive === 'prompt' || receive === 'prompt-with-rationale') {
        PushNotifications.requestPermissions().then(({ receive: r }) => {
          if (r === 'granted') {
            PushNotifications.register();
            setPermission('granted');
          }
        });
      } else if (receive === 'granted') {
        PushNotifications.register();
      }
    });
  }, [isNative]);

  // ── AUTO-REQUEST permission on first load (web) ─────────────────────────
  useEffect(() => {
    if (isNative) return;
    if (!('Notification' in window)) return;
    if (Notification.permission === 'default') {
      // Slight delay so user has interacted with page
      const t = setTimeout(async () => {
        const result = await Notification.requestPermission();
        setPermission(result as 'default' | 'granted' | 'denied');
        if (result === 'granted' && serviceWorkerRef.current) {
          try {
            await (serviceWorkerRef.current as any).pushManager.subscribe({
              userVisibleOnly: true,
              applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
            });
          } catch (e) { console.error('Web push subscribe error:', e); }
        }
      }, 2000);
      return () => clearTimeout(t);
    } else if (Notification.permission === 'granted') {
      setPermission('granted');
    }
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

  // Save FCM token when user logs in after token is received
  useEffect(() => {
    if (!user || !fcmToken || !isNative) return;
    supabase.from('push_subscriptions').upsert({
      user_id: user.id,
      fcm_token: fcmToken,
      platform: Capacitor.getPlatform(),
    }, { onConflict: 'user_id,fcm_token' });
  }, [user, fcmToken, isNative]);

  // Request permission
  const requestPermission = useCallback(async () => {
    try {
      if (isNative) {
        const { receive } = await PushNotifications.requestPermissions();
        if (receive === 'granted') {
          await PushNotifications.register();
          setPermission('granted');
          return true;
        }
        setPermission('denied');
        return false;
      } else {
        // Web fallback
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
  }, [isNative]);

  // Send server push via Supabase Edge Function
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
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'arena_markets',
      }, async (payload) => {
        if ((payload.new as any)?.is_active) {
          await sendServerPush(
            '⚔️ New Arena Battle is LIVE!',
            'A new arena battle has started. Join now and stake your ARX-P!',
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
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'arena_markets',
        filter: `is_active=eq.false`,
      }, async (payload) => {
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
        event: 'INSERT',
        schema: 'public',
        table: 'user_notifications',
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
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'announcements',
      }, async (payload) => {
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
            await sendServerPush(
              '⏰ Mining Session Ending Soon',
              'Your mining session ends in 10 minutes. Get ready to claim!',
              { url: '/mining', tag: 'mining-warning' }
            );
          }
        }

        if (preferences.claimNotifications && elapsed >= maxTime) {
          if (!notifiedSessionsRef.current.has(`${session.id}-complete`)) {
            notifiedSessionsRef.current.add(`${session.id}-complete`);
            await sendServerPush(
              '🎉 Mining Complete!',
              'Your 8-hour session is done. Claim your ARX-P now!',
              { url: '/mining', tag: 'mining-complete' }
            );
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
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'chat_messages',
      }, async (payload) => {
        const msg = payload.new as any;
        // Don't notify of own messages
        if (msg?.user_id === user.id) return;
        const chanLabels: Record<string, string> = {
          general: 'General',
          alpha: 'Alpha Team',
          omega: 'Omega Team',
          nexus_exchange: 'Nexus Exchange',
        };
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
        event: 'INSERT',
        schema: 'public',
        table: 'user_notifications',
        filter: `user_id=eq.${user.id}`,
      }, async (payload) => {
        const notif = payload.new as any;
        if (notif?.notification_type === 'arena_win') {
          await sendServerPush(
            '🏆 You Won the Arena Battle!',
            `You won ${notif.amount?.toLocaleString() || ''} ARX-P has been credited to your balance!`,
            { url: '/arena', tag: 'arena-win' }
          );
        } else if (notif?.notification_type === 'arena_loss') {
          await sendServerPush(
            '💧 Arena Battle Result',
            `Your team lost. ${Math.abs(notif.amount || 0).toLocaleString()} ARX-P has been removed from your balance.`,
            { url: '/arena', tag: 'arena-loss' }
          );
        } else if (notif?.notification_type === 'arena_new_battle') {
          await sendServerPush(
            '⚔️ New Arena Battle Added!',
            notif.message || 'A new battle has been added to the Arena. Stake your ARX-P!',
            { url: '/arena', tag: 'arena-new-battle' }
          );
        } else if (notif?.notification_type === 'announcement') {
          await sendServerPush(
            '📢 ' + (notif.title || 'Arxon Announcement'),
            notif.message || 'New announcement from the Arxon team.',
            { url: '/notifications', tag: 'announcement' }
          );
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
    sendServerPush,
    updatePreferences,
    isSupported: isNative || ('serviceWorker' in navigator && 'PushManager' in window),
    isNative,
  };
};
