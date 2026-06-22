/**
 * useMiningNotification.ts — ENH-08
 *
 * Schedules a local push notification when a mining session starts,
 * to fire 8 hours later reminding the user to claim their ARX-P.
 *
 * Usage: Call scheduleMiningEndNotification() when mining starts.
 *        Call cancelMiningNotification() when mining stops/claims.
 *
 * Requires @capacitor/local-notifications (already likely installed via push-notifications)
 */
import { useCallback } from 'react';

const NOTIFICATION_ID = 1001; // Fixed ID so we can cancel it

function isNative(): boolean {
  try {
    return !!(window as any).Capacitor?.isNativePlatform?.();
  } catch { return false; }
}

async function getLocalNotifications() {
  try {
    const { LocalNotifications } = await import('@capacitor/local-notifications');
    return LocalNotifications;
  } catch {
    return null;
  }
}

export function useMiningNotification() {
  const scheduleMiningEndNotification = useCallback(async () => {
    if (!isNative()) return;
    const LN = await getLocalNotifications();
    if (!LN) return;

    try {
      // Request permission first
      const perm = await LN.requestPermissions();
      if (perm.display !== 'granted') return;

      // Cancel any existing mining notification
      await LN.cancel({ notifications: [{ id: NOTIFICATION_ID }] });

      // Schedule for 8 hours from now
      const fireAt = new Date(Date.now() + 8 * 60 * 60 * 1000);

      await LN.schedule({
        notifications: [{
          id:    NOTIFICATION_ID,
          title: '⛏️ Mining Complete!',
          body:  'Your 8-hour mining session is done. Open Arxon to claim your ARX-P!',
          schedule: { at: fireAt },
          sound: 'default',
          smallIcon: 'ic_stat_icon_config_sample',
        }],
      });
    } catch (e) {
      console.warn('[miningNotif] Failed to schedule:', e);
    }
  }, []);

  const cancelMiningNotification = useCallback(async () => {
    if (!isNative()) return;
    const LN = await getLocalNotifications();
    if (!LN) return;
    try {
      await LN.cancel({ notifications: [{ id: NOTIFICATION_ID }] });
    } catch {}
  }, []);

  return { scheduleMiningEndNotification, cancelMiningNotification };
}
