import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

const NOTIFICATION_PREFS_KEY = 'arxon_notification_preferences';
const VAPID_PUBLIC_KEY = 'BH83wzlnSpDzR3jxVWOmlPVnSWMxzKy6XABCoR5BThesZTX3Lkt_cJZmze_gDsReh5_IeBXIjb-ijbluwf0I2_w';

interface NotificationPreferences {
  miningAlerts: boolean;
  claimNotifications: boolean;
  rewardUpdates: boolean;
  leaderboardChanges: boolean;
  systemAnnouncements: boolean;
}

const defaultPrefs: NotificationPreferences = {
  miningAlerts: true,
  claimNotifications: true,
  rewardUpdates: true,
  leaderboardChanges: false,
  systemAnnouncements: true,
};

// Convert base64 to Uint8Array for VAPID key
function urlBase64ToUint8Array(base64String: string): ArrayBuffer {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray.buffer as ArrayBuffer;
}

export const usePushNotifications = () => {
  const { user } = useAuth();
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [preferences, setPreferences] = useState<NotificationPreferences>(defaultPrefs);
  const [subscription, setSubscription] = useState<PushSubscription | null>(null);
  const previousRankRef = useRef<number | null>(null);
  const miningSessionCheckRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const notifiedSessionsRef = useRef<Set<string>>(new Set());
  const serviceWorkerRef = useRef<ServiceWorkerRegistration | null>(null);

  // Load preferences from localStorage
  useEffect(() => {
    const stored = localStorage.getItem(NOTIFICATION_PREFS_KEY);
    if (stored) {
      try {
        setPreferences(JSON.parse(stored));
      } catch (e) {
        console.error('Failed to parse notification preferences');
      }
    }
  }, []);

  // Register service worker and get existing subscription
  useEffect(() => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      console.log('Push notifications not supported');
      return;
    }

    const registerSW = async () => {
      try {
        const registration = await navigator.serviceWorker.register('/sw.js');
        console.log('Service Worker registered:', registration.scope);
        serviceWorkerRef.current = registration;

        // Check for existing subscription
        const existingSub = await (registration as any).pushManager?.getSubscription();
        if (existingSub) {
          setSubscription(existingSub);
          console.log('Existing push subscription found');
        }

        // Update permission state
        if (Notification.permission === 'granted') {
          setPermission('granted');
        } else if (Notification.permission === 'denied') {
          setPermission('denied');
        }
      } catch (error) {
        console.error('Service Worker registration failed:', error);
      }
    };

    registerSW();
  }, []);

  // Save subscription to database when user is authenticated
  useEffect(() => {
    if (!user || !subscription) return;

    const saveSubscription = async () => {
      try {
        const subscriptionJson = subscription.toJSON();
        const keys = subscriptionJson.keys as { p256dh: string; auth: string } | undefined;
        
        if (!keys?.p256dh || !keys?.auth) {
          console.error('Invalid subscription keys');
          return;
        }

        // Upsert subscription
        const { error } = await supabase
          .from('push_subscriptions')
          .upsert({
            user_id: user.id,
            endpoint: subscription.endpoint,
            p256dh: keys.p256dh,
            auth: keys.auth,
          }, {
            onConflict: 'user_id,endpoint'
          });

        if (error) {
          console.error('Error saving push subscription:', error);
        } else {
          console.log('Push subscription saved to database');
        }
      } catch (error) {
        console.error('Error saving subscription:', error);
      }
    };

    saveSubscription();
  }, [user, subscription]);

  // Request permission and subscribe to push
  const requestPermission = useCallback(async () => {
    if (!('Notification' in window) || !serviceWorkerRef.current) {
      return false;
    }

    try {
      const result = await Notification.requestPermission();
      setPermission(result);

      if (result === 'granted' && serviceWorkerRef.current) {
        // Subscribe to push notifications
        const pushSubscription = await (serviceWorkerRef.current as any).pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
        });
        
        setSubscription(pushSubscription);
        console.log('Push subscription created:', pushSubscription.endpoint);
        return true;
      }
      
      return result === 'granted';
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      return false;
    }
  }, []);

  // Send a local notification (fallback when on page)
  const sendNotification = useCallback((title: string, options?: NotificationOptions) => {
    if (permission !== 'granted') return;
    if (document.visibilityState === 'visible') {
      // Don't send push if user is on the page - they'll see the toast
      return;
    }

    try {
      const notification = new Notification(title, {
        icon: '/favicon.jpg',
        badge: '/favicon.jpg',
        ...options,
      });

      notification.onclick = () => {
        window.focus();
        notification.close();
      };
    } catch (error) {
      console.error('Error sending notification:', error);
    }
  }, [permission]);

  // Trigger server push notification
  const sendServerPush = useCallback(async (
    title: string, 
    body: string, 
    options?: { url?: string; tag?: string }
  ) => {
    if (!user) return;

    try {
      await supabase.functions.invoke('send-push-notification', {
        body: {
          userId: user.id,
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

  // Mining session notifications (10 min before end + session complete)
  useEffect(() => {
    if (!user || (!preferences.miningAlerts && !preferences.claimNotifications)) {
      if (miningSessionCheckRef.current) {
        clearInterval(miningSessionCheckRef.current);
        miningSessionCheckRef.current = null;
      }
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

        const startTime = new Date(session.started_at).getTime();
        const elapsed = (Date.now() - startTime) / 1000;
        const maxTime = 8 * 60 * 60; // 8 hours
        const tenMinsBefore = maxTime - 10 * 60; // 10 mins before end

        const sessionKey = session.id;
        const warningKey = `${sessionKey}-warning`;
        const completeKey = `${sessionKey}-complete`;

        // 10 minutes before notification
        if (preferences.miningAlerts && elapsed >= tenMinsBefore && elapsed < maxTime) {
          if (!notifiedSessionsRef.current.has(warningKey)) {
            notifiedSessionsRef.current.add(warningKey);
            await sendServerPush(
              'Mining Session Ending Soon ⏰',
              'Your mining session will complete in 10 minutes. Get ready to claim your rewards!',
              { url: '/mining', tag: 'mining-warning' }
            );
          }
        }

        // Session complete notification
        if (preferences.claimNotifications && elapsed >= maxTime) {
          if (!notifiedSessionsRef.current.has(completeKey)) {
            notifiedSessionsRef.current.add(completeKey);
            await sendServerPush(
              'Mining Complete! 🎉',
              'Your 8-hour session is complete. Claim your ARX-P and start a new session!',
              { url: '/mining', tag: 'mining-complete' }
            );
          }
        }
      } catch (error) {
        console.error('Error checking mining session:', error);
      }
    };

    // Check every 2 minutes (reduced from 30s to save egress)
    checkMiningSession();
    miningSessionCheckRef.current = setInterval(checkMiningSession, 120_000);

    return () => {
      if (miningSessionCheckRef.current) {
        clearInterval(miningSessionCheckRef.current);
        miningSessionCheckRef.current = null;
      }
    };
  }, [user, preferences.miningAlerts, preferences.claimNotifications, sendServerPush]);

  // Leaderboard change notifications
  useEffect(() => {
    if (!user || !preferences.leaderboardChanges) return;

    const checkRank = async () => {
      try {
        // Use the efficient get_user_rank RPC instead of fetching entire leaderboard
        const { data, error } = await supabase.rpc('get_user_rank' as any, { p_user_id: user.id });
        if (error || !data) return;

        const currentRank = data as number;
        
        if (previousRankRef.current !== null && currentRank !== previousRankRef.current) {
          const change = previousRankRef.current - currentRank;
          if (change > 0) {
            await sendServerPush(
              'Rank Up! 🚀',
              `You moved up ${change} position${change > 1 ? 's' : ''} to #${currentRank} on the leaderboard!`,
              { url: '/leaderboard', tag: 'leaderboard-up' }
            );
          } else if (change < 0) {
            await sendServerPush(
              'Leaderboard Update 📊',
              `You dropped to #${currentRank} on the leaderboard. Keep mining to climb back up!`,
              { url: '/leaderboard', tag: 'leaderboard-down' }
            );
          }
        }
        
        previousRankRef.current = currentRank;
      } catch (error) {
        console.error('Error checking leaderboard rank:', error);
      }
    };

    // Check initially and then every 15 minutes (reduced from 5min to save egress)
    checkRank();
    const interval = setInterval(checkRank, 15 * 60 * 1000);

    return () => clearInterval(interval);
  }, [user, preferences.leaderboardChanges, sendServerPush]);

  // System announcements
  useEffect(() => {
    if (!user || !preferences.systemAnnouncements) return;

    const channel = supabase
      .channel('announcements-notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'announcements',
        },
        async (payload) => {
          if (payload.new && (payload.new as any).is_active) {
            await sendServerPush(
              '📢 New Announcement',
              (payload.new as any).title,
              { url: '/dashboard', tag: 'announcement' }
            );
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, preferences.systemAnnouncements, sendServerPush]);

  // Reward updates (points changes)
  useEffect(() => {
    if (!user || !preferences.rewardUpdates) return;

    const channel = supabase
      .channel('reward-notifications')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'user_points',
          filter: `user_id=eq.${user.id}`,
        },
        async (payload) => {
          const oldPoints = (payload.old as any)?.total_points || 0;
          const newPoints = (payload.new as any)?.total_points || 0;
          const diff = newPoints - oldPoints;

          if (diff > 0 && diff >= 10) { // Only notify for significant gains
            await sendServerPush(
              'Rewards Earned! 💰',
              `You earned +${Math.floor(diff)} ARX-P! Total: ${Math.floor(newPoints).toLocaleString()}`,
              { url: '/dashboard', tag: 'reward-update' }
            );
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, preferences.rewardUpdates, sendServerPush]);

  const updatePreferences = useCallback((newPrefs: NotificationPreferences) => {
    setPreferences(newPrefs);
    localStorage.setItem(NOTIFICATION_PREFS_KEY, JSON.stringify(newPrefs));
  }, []);

  return {
    permission,
    preferences,
    subscription,
    requestPermission,
    sendNotification,
    sendServerPush,
    updatePreferences,
    isSupported: 'serviceWorker' in navigator && 'PushManager' in window,
  };
};
