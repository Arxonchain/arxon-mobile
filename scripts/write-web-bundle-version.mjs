import { writeFileSync, readFileSync, existsSync } from 'node:fs';
import { execSync } from 'node:child_process';

function loadEnvFile(path) {
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    // Do not override explicit CI/shell env.
    if (process.env[key] === undefined) process.env[key] = val;
  }
}

// Same files Vite uses for OTA / store builds (mode word-forge + production fallback).
loadEnvFile('.env');
loadEnvFile('.env.production');
loadEnvFile('.env.word-forge');

let gitSha = 'local';
try {
  gitSha = execSync('git rev-parse --short HEAD', { encoding: 'utf8' }).trim();
} catch {
  /* not a git repo in CI edge cases */
}

const uiV2 = process.env.VITE_ARXON_UI_V2 === 'true';
const wordForge = process.env.VITE_WORD_FORGE_ENABLED === 'true';

if (!uiV2 || !wordForge) {
  console.error(
    '[build] FATAL: OTA/production requires VITE_ARXON_UI_V2=true and VITE_WORD_FORGE_ENABLED=true.',
  );
  console.error(
    '[build] Got:',
    {
      VITE_ARXON_UI_V2: process.env.VITE_ARXON_UI_V2 ?? '(unset)',
      VITE_WORD_FORGE_ENABLED: process.env.VITE_WORD_FORGE_ENABLED ?? '(unset)',
    },
  );
  console.error(
    '[build] Ensure .env.word-forge / .env.production are present, or export the flags, then: vite build --mode word-forge',
  );
  process.exit(1);
}

const gamesMaintenance = process.env.VITE_GAMES_MAINTENANCE === 'true';
const appMaintenance = process.env.VITE_APP_MAINTENANCE === 'true';

const payload = {
  version: gitSha,
  builtAt: new Date().toISOString(),
  // Stamped for OTA verification (Play WebView + pages.dev).
  uiV2: true,
  wordForge: true,
  mode: 'v2-games',
  gamesMaintenance,
  appMaintenance,
};

writeFileSync('public/web-bundle-version.json', `${JSON.stringify(payload, null, 2)}\n`);
console.log('[build] web-bundle-version.json →', payload);
