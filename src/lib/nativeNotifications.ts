import { Capacitor } from '@capacitor/core';

/** Must match AndroidManifest FCM default_notification_channel_id */
export const ARXON_NOTIF_CHANNEL = 'arxon_default';

/** res/drawable/ic_stat_arxon.xml — white silhouette for status bar */
export const ARXON_NOTIF_SMALL_ICON = 'ic_stat_arxon';

/** res/drawable/ic_notif_arxon.xml — colored logo for expanded notification */
export const ARXON_NOTIF_LARGE_ICON = 'ic_notif_arxon';

export function isLocalNotificationsAvailable(): boolean {
  return Capacitor.isNativePlatform() && Capacitor.isPluginAvailable('LocalNotifications');
}

export async function ensureArxonNotificationChannel(): Promise<void> {
  if (!isLocalNotificationsAvailable()) return;
  try {
    const { LocalNotifications } = await import('@capacitor/local-notifications');
    await LocalNotifications.createChannel({
      id: ARXON_NOTIF_CHANNEL,
      name: 'Arxon Notifications',
      description: 'Mining, arena, and reward alerts',
      importance: 4,
      visibility: 1,
      vibration: true,
    });
  } catch (e) {
    console.warn('[notifications] channel setup failed:', e);
  }
}
