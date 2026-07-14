import { useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { useAuth } from '@/contexts/AuthContext';
import { WORD_FORGE_ENABLED } from '@/lib/wordForgeFeature';
import {
  ARXON_NOTIF_CHANNEL,
  ARXON_NOTIF_LARGE_ICON,
  ARXON_NOTIF_SMALL_ICON,
  ensureArxonNotificationChannel,
  isLocalNotificationsAvailable,
} from '@/lib/nativeNotifications';
import { loadForgeProgress } from './useForgeProgress';
import { isDailyCompleted } from '../engine/dailyChallenge';

const DAILY_NOTIF_ID = 9001;
const STREAK_NOTIF_ID = 9002;

function nextReminderAt(hour: number, minute: number): Date {
  const target = new Date();
  target.setHours(hour, minute, 0, 0);
  if (Date.now() >= target.getTime()) target.setDate(target.getDate() + 1);
  return target;
}

/** Schedules local reminders for daily forge and streak maintenance. */
export function useForgeDailyReminder(enabled: boolean) {
  const { user } = useAuth();

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    if (!enabled || !WORD_FORGE_ENABLED || !user) return;
    if (!isLocalNotificationsAvailable()) return;

    let cancelled = false;
    let removeListener: (() => void) | undefined;

    const setup = async () => {
      await ensureArxonNotificationChannel();
      const { LocalNotifications } = await import('@capacitor/local-notifications');

      removeListener = (await LocalNotifications.addListener('localNotificationActionPerformed', (action) => {
        const url = action.notification.extra?.url as string | undefined;
        if (url) {
          window.dispatchEvent(new CustomEvent('arxon:navigate', { detail: { path: url } }));
          window.location.hash = `#${url}`;
        }
      })).remove;

      const progress = loadForgeProgress();
      const dailyDone = isDailyCompleted(progress.dailyCompletedDate);

      await LocalNotifications.cancel({
        notifications: [{ id: DAILY_NOTIF_ID }, { id: STREAK_NOTIF_ID }],
      });

      if (cancelled) return;

      const notifications: Parameters<typeof LocalNotifications.schedule>[0]['notifications'] = [];

      if (!dailyDone) {
        notifications.push({
          id: DAILY_NOTIF_ID,
          title: 'Daily Forge Ready',
          body: 'Complete today\'s Word Forge challenge for +50 ARX-P!',
          schedule: { at: nextReminderAt(18, 0) },
          sound: 'default',
          smallIcon: ARXON_NOTIF_SMALL_ICON,
          largeIcon: ARXON_NOTIF_LARGE_ICON,
          channelId: ARXON_NOTIF_CHANNEL,
          extra: { url: '/word-forge?mode=daily' },
        });
      }

      if (progress.bestStreak >= 3) {
        notifications.push({
          id: STREAK_NOTIF_ID,
          title: 'Keep Your Forge Streak',
          body: `You're on a ${progress.bestStreak}-word streak record. Jump back in!`,
          schedule: { at: nextReminderAt(12, 0) },
          sound: 'default',
          smallIcon: ARXON_NOTIF_SMALL_ICON,
          largeIcon: ARXON_NOTIF_LARGE_ICON,
          channelId: ARXON_NOTIF_CHANNEL,
          extra: { url: '/games' },
        });
      }

      if (notifications.length > 0) {
        await LocalNotifications.schedule({ notifications });
      }
    };

    void setup();

    return () => {
      cancelled = true;
      removeListener?.();
    };
  }, [enabled, user?.id]);
}
