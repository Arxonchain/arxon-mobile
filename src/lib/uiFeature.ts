/**
 * Arxon UI V2 — new-main / internal store shell only (NOT public OTA).
 *
 * Controls public OTA vs new-main:
 * - Public OTA Play Store channel: Capacitor loads https://arxon-mobile.pages.dev
 *   (`npm run build` in .github/workflows/deploy-web.yml). VITE_ARXON_UI_V2 unset →
 *   classic UI, mining page + nav kept, Word Forge hidden.
 * - New-main redesign / upcoming Play upload: `npm run build:internal` loads
 *   `.env.word-forge` (VITE_ARXON_UI_V2=true). Neon V2 UI; mining page intentionally hidden
 *   until that store build ships. Do not enable this flag on the OTA Cloudflare deploy.
 */
export const ARXON_UI_V2_ENABLED = import.meta.env.VITE_ARXON_UI_V2 === 'true';
