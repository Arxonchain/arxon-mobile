/**
 * Schedules a local notification when mining starts (8-hour claim reminder).
 */
import { useCallback } from 'react';
import {
  ARXON_NOTIF_CHANNEL,
  ARXON_NOTIF_SMALL_ICON,
  isLocalNotificationsAvailable,
} from '@/lib/nativeNotifications';

const NOTIFICATION_ID = 1001;

export async function scheduleMiningEndNotification() {
  if (!isLocalNotificationsAvailable()) return;

  try {
    const { LocalNotifications } = await import('@capacitor/local-notifications');
    const perm = await LocalNotifications.requestPermissions();
    if (perm.display !== 'granted') return;

    await LocalNotifications.cancel({ notifications: [{ id: NOTIFICATION_ID }] });

    const fireAt = new Date(Date.now() + 8 * 60 * 60 * 1000);

    await LocalNotifications.schedule({
      notifications: [{
        id:    NOTIFICATION_ID,
        title: '⛏️ Mining Complete!',
        body:  'Your 8-hour mining session is done. Open Arxon to claim your ARX-P!',
        schedule: { at: fireAt },
        sound: 'default',
        smallIcon: ARXON_NOTIF_SMALL_ICON,
        channelId: ARXON_NOTIF_CHANNEL,
      }],
    });
  } catch (e) {
    console.warn('[miningNotif] Failed to schedule:', e);
  }
}

export async function cancelMiningNotification() {
  if (!isLocalNotificationsAvailable()) return;
  try {
    const { LocalNotifications } = await import('@capacitor/local-notifications');
    await LocalNotifications.cancel({ notifications: [{ id: NOTIFICATION_ID }] });
  } catch { /* ignore */ }
}

export function useMiningNotification() {
  const schedule = useCallback(() => scheduleMiningEndNotification(), []);
  const cancel = useCallback(() => cancelMiningNotification(), []);
  return { scheduleMiningEndNotification: schedule, cancelMiningNotification: cancel };
}
