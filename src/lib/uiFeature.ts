/**
 * Arxon UI V2 — neon shell + games (Dice, Arena V2, etc.).
 *
 * Enabled when VITE_ARXON_UI_V2=true (store AAB/APK/iOS and Cloudflare OTA deploy-web).
 * Capacitor loads https://arxon-mobile.pages.dev; Play v14+ picks up this flag via OTA.
 * Classic UI only when the flag is unset (local `npm run build` without env).
 */
export const ARXON_UI_V2_ENABLED = import.meta.env.VITE_ARXON_UI_V2 === 'true';
