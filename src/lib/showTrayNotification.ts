import {
  ARXON_NOTIF_CHANNEL,
  ARXON_NOTIF_LARGE_ICON,
  ARXON_NOTIF_SMALL_ICON,
  ensureArxonNotificationChannel,
  isLocalNotificationsAvailable,
} from '@/lib/nativeNotifications';

const recentKeys = new Map<string, number>();
const DEDUPE_MS = 8_000;

/**
 * Show a system-tray alert the same way mining reminders do (LocalNotifications).
 * Safe to call from multiple paths — short dedupe prevents double banners.
 */
export async function showTrayNotification(
  title: string,
  body: string,
  options?: { url?: string; tag?: string },
) {
  if (!isLocalNotificationsAvailable()) return;

  const key = `${options?.tag || 'arxon'}|${title}|${body}`;
  const now = Date.now();
  const prev = recentKeys.get(key);
  if (prev && now - prev < DEDUPE_MS) return;
  recentKeys.set(key, now);
  for (const [k, t] of recentKeys) {
    if (now - t > DEDUPE_MS) recentKeys.delete(k);
  }

  try {
    const { LocalNotifications } = await import('@capacitor/local-notifications');
    const perm = await LocalNotifications.requestPermissions();
    if (perm.display !== 'granted') return;

    await ensureArxonNotificationChannel();

    const id = (now % 2147483647) || 1;
    await LocalNotifications.schedule({
      notifications: [{
        id,
        title,
        body,
        schedule: { at: new Date(now + 1500), allowWhileIdle: true },
        sound: 'default',
        smallIcon: ARXON_NOTIF_SMALL_ICON,
        largeIcon: ARXON_NOTIF_LARGE_ICON,
        channelId: ARXON_NOTIF_CHANNEL,
        extra: {
          url: options?.url || '/arena/prediction-market',
          tag: options?.tag || 'arxon',
        },
      }],
    });
  } catch (e) {
    console.warn('[tray] Local notification failed:', e);
  }
}
