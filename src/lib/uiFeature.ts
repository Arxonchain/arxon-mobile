/**
 * Arxon UI V2 — internal / Play Store preview builds only.
 * - Public OTA (`npm run build`): unset → classic UI
 * - Internal APK/AAB (`npm run build:internal`): .env.word-forge sets VITE_ARXON_UI_V2=true
 */
export const ARXON_UI_V2_ENABLED = import.meta.env.VITE_ARXON_UI_V2 === 'true';
