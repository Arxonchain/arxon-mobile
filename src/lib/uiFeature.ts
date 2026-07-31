/**
 * Arxon UI V2 — native store builds (APK / AAB / iOS) only.
 * - Public OTA (`npm run build`): unset → classic UI
 * - Internal APK/AAB/iOS (`npm run build:internal` + CAPACITOR_BUNDLE_LOCAL): neon V2 UI bundled in the shell
 */
export const ARXON_UI_V2_ENABLED = import.meta.env.VITE_ARXON_UI_V2 === 'true';
