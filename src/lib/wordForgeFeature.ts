/**
 * Word Forge opt-in via build flag.
 * Enabled for store AAB/APK/iOS and mobile OTA (deploy-web → pages.dev) when
 * VITE_WORD_FORGE_ENABLED=true (same as `vite build --mode word-forge` / .env.word-forge).
 * `npm run build` is locked to that mode — OTA always includes games unless classic is requested.
 */
export const WORD_FORGE_ENABLED = import.meta.env.VITE_WORD_FORGE_ENABLED === 'true';
