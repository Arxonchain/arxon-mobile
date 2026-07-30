/**
 * Word Forge is opt-in via build flag only.
 * - Public OTA / Play Store (until launch): VITE_WORD_FORGE_ENABLED unset → hidden
 * - Internal team APK: `npm run build:word-forge` (loads .env.word-forge)
 */
export const WORD_FORGE_ENABLED = import.meta.env.VITE_WORD_FORGE_ENABLED === 'true';
