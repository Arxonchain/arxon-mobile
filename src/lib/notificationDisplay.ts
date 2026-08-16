const UUID_RE =
  /\[?[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\]?/gi;

/** Strip raw battle/user UUIDs from text shown in notification UI. */
export function sanitizeNotificationText(text: string): string {
  return text
    .replace(UUID_RE, '')
    .replace(/\s{2,}/g, ' ')
    .replace(/\s+([,.!?])/g, '$1')
    .trim();
}

export function displayNotificationTitle(title: string): string {
  return sanitizeNotificationText(title);
}

export function displayNotificationMessage(message: string): string {
  return sanitizeNotificationText(message);
}
