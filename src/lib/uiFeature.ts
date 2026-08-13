/**
 * Arxon UI V2 — neon shell + games (Dice, Arena V2, etc.).
 *
 * Enabled when VITE_ARXON_UI_V2=true (store AAB/APK/iOS and Cloudflare OTA deploy-web).
 * Capacitor loads https://arxon-mobile.pages.dev; Play v14+ picks up this flag via OTA.
 * Default `npm run build` is locked to word-forge mode so OTA cannot ship classic by accident.
 */
export const ARXON_UI_V2_ENABLED = import.meta.env.VITE_ARXON_UI_V2 === 'true';
