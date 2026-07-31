/**
 * Word Forge is opt-in via build flag only.
 * - Public OTA / Play Store (until launch): VITE_WORD_FORGE_ENABLED unset → hidden
 * - Internal team APK: `npm run build:internal` (loads .env.word-forge)
 *
 * Arxon UI V2 uses the same internal build flag file.
 * - Public OTA: classic UI
 * - Internal APK/AAB: VITE_ARXON_UI_V2=true → carousel-inspired redesign
 */
export const WORD_FORGE_ENABLED = import.meta.env.VITE_WORD_FORGE_ENABLED === 'true';
