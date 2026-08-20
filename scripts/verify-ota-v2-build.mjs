/**
 * Fail the OTA/CI build if dist is missing V2 + games markers.
 * Guards against accidental classic (mining-only) deploys to pages.dev.
 */
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const dist = 'dist';
const assetsDir = join(dist, 'assets');

if (!existsSync(assetsDir)) {
  console.error('[verify-ota-v2] missing dist/assets — run the V2 build first');
  process.exit(1);
}

const versionPath = join(dist, 'web-bundle-version.json');
if (!existsSync(versionPath)) {
  console.error('[verify-ota-v2] missing dist/web-bundle-version.json');
  process.exit(1);
}

const version = JSON.parse(readFileSync(versionPath, 'utf8'));
const files = readdirSync(assetsDir).filter((f) => f.endsWith('.js'));
const blob = files.map((f) => readFileSync(join(assetsDir, f), 'utf8')).join('\n');

const checks = [
  { name: '/games route', ok: blob.includes('/games') || blob.includes('"games"') || /path:"games"/.test(blob) },
  { name: 'Word Forge route', ok: blob.includes('/word-forge') },
  { name: 'Dice hub', ok: blob.includes('DiceHub') || blob.includes('/arena/dice') },
  { name: 'Arena V2', ok: blob.includes('ArenaV2') },
  { name: 'Gaming hub or WordForge page chunk', ok: /GamingHub|WordForgePage/.test(blob) },
];

const MINING_PROJECT_REF = 'oztccmrhiawleucdluwb';
const FORBIDDEN_PROJECT_REF = 'knfpmzjghbjnlnarsivs';

const dbChecks = [
  {
    name: 'Mining App Supabase project',
    ok: blob.includes(MINING_PROJECT_REF) || blob.includes(`${MINING_PROJECT_REF}.supabase.co`),
  },
  {
    name: 'No website Supabase project',
    ok: !blob.includes(FORBIDDEN_PROJECT_REF),
  },
];

const failed = checks.filter((c) => !c.ok);
const dbFailed = dbChecks.filter((c) => !c.ok);
if (failed.length || dbFailed.length) {
  console.error('[verify-ota-v2] FAIL — dist does not look like full V2+games OTA:');
  for (const f of failed) console.error(`  - missing: ${f.name}`);
  for (const f of dbFailed) console.error(`  - DB isolation: ${f.name}`);
  console.error('Build with: VITE_ARXON_UI_V2=true VITE_WORD_FORGE_ENABLED=true && vite build --mode word-forge');
  process.exit(1);
}

if (version.uiV2 !== true || version.wordForge !== true || version.mode !== 'v2-games') {
  console.error('[verify-ota-v2] FAIL — web-bundle-version.json flags not V2+games:', version);
  process.exit(1);
}

console.log('[verify-ota-v2] OK — full V2+games markers present', {
  version: version.version,
  builtAt: version.builtAt,
  uiV2: version.uiV2,
  wordForge: version.wordForge,
  mode: version.mode,
  jsFiles: files.length,
});
