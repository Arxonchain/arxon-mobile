import {
  ARXON_NOTIF_CHANNEL,
  ARXON_NOTIF_LARGE_ICON,
  ARXON_NOTIF_SMALL_ICON,
  ensureArxonNotificationChannel,
  isLocalNotificationsAvailable,
} from '@/lib/nativeNotifications';

const recentKeys = new Map<string, number>();
const DEDUPE_MS = 60_000;

function tagToNotificationId(tag: string): number {
  let h = 0;
  for (let i = 0; i < tag.length; i++) {
    h = ((h << 5) - h + tag.charCodeAt(i)) | 0;
  }
  return (Math.abs(h) % 2147483646) + 1;
}

/**
 * Show a system-tray alert the same way mining reminders do (LocalNotifications).
 * Safe to call from multiple paths — dedupe by tag/battle prevents double banners.
 */
export async function showTrayNotification(
  title: string,
  body: string,
  options?: { url?: string; tag?: string; battleId?: string },
) {
  if (!isLocalNotificationsAvailable()) return;

  const dedupeTag = options?.battleId
    ? `${options.tag || 'arxon'}:${options.battleId}`
    : (options?.tag || 'arxon');
  const key = options?.battleId ? dedupeTag : `${dedupeTag}|${title}|${body}`;
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

    const id = tagToNotificationId(dedupeTag);
    await LocalNotifications.schedule({
      notifications: [{
        id,
        title,
        body,
        schedule: { at: new Date(now + 300), allowWhileIdle: true },
        sound: 'default',
        smallIcon: ARXON_NOTIF_SMALL_ICON,
        largeIcon: ARXON_NOTIF_LARGE_ICON,
        channelId: ARXON_NOTIF_CHANNEL,
        extra: {
          url: options?.url || '/arena/prediction-market',
          tag: options?.tag || 'arxon',
          battle_id: options?.battleId,
        },
      }],
    });
  } catch (e) {
    console.warn('[tray] Local notification failed:', e);
  }
}
