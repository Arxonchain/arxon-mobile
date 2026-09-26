/**
 * Full-app maintenance gate (login, mining, everything).
 * OTA / web build: VITE_APP_MAINTENANCE=true to block the whole app.
 */
export const APP_MAINTENANCE_MODE = import.meta.env.VITE_APP_MAINTENANCE === 'true';

export const APP_MAINTENANCE_TITLE = 'Arxon is temporarily unavailable';

export const APP_MAINTENANCE_MESSAGE =
  'Our team is resolving a platform issue affecting sign-in and mining. Access is paused briefly so we can restore a stable experience for everyone.';

export const APP_MAINTENANCE_FOLLOWUP =
  'When service is fully restored, we will publish an in-app announcement and notify you through the app (and Discord) — no need to reinstall or create a new account.';
