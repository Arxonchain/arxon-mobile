#!/usr/bin/env node
/**
 * Deploy P0 edge auth lockdown functions.
 *
 * Usage:
 *   node scripts/deploy-edge-auth-lockdown.mjs
 *
 * Requires SUPABASE_ACCESS_TOKEN in env (or .env).
 */
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const PROJECT_REF = 'oztccmrhiawleucdluwb';

function loadEnv() {
  for (const file of ['.env', '.env.local']) {
    const p = path.join(ROOT, file);
    if (!fs.existsSync(p)) continue;
    for (const line of fs.readFileSync(p, 'utf8').split('\n')) {
      const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
      if (!m || process.env[m[1]]) continue;
      process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '');
    }
  }
}

loadEnv();

const FUNCTIONS = [
  'cleanup-stale-sessions',
  'backfill-uncredited-sessions',
  'auto-resolve-battles',
  'arena-ai-prediction',
  'apply-points-migration',
  'apply-arena-notifications-migration',
  'resolve-arena-battle',
  'send-push-notification',
  'blast-arena-notifications',
  'notify-arena-battle-ends',
  'notify-arena-battle-created',
  'send-magic-link',
  'verify-recaptcha',
];

const token = process.env.SUPABASE_ACCESS_TOKEN?.trim();
if (!token) {
  console.error('Set SUPABASE_ACCESS_TOKEN before deploying.');
  process.exit(1);
}

console.log('Deploying edge auth lockdown functions (verify_jwt=false via config.toml)...\n');

for (const name of FUNCTIONS) {
  console.log(`=== ${name} ===`);
  const args = [
    'supabase',
    'functions',
    'deploy',
    name,
    '--project-ref',
    PROJECT_REF,
    '--no-verify-jwt',
  ];
  const result = spawnSync('npx', args, {
    cwd: ROOT,
    stdio: 'inherit',
    env: { ...process.env, SUPABASE_ACCESS_TOKEN: token },
    shell: process.platform === 'win32',
  });
  if (result.status !== 0) {
    console.error(`Deploy failed for ${name}. On Windows, use scoop install supabase and run:`);
    console.error(`  supabase functions deploy ${name} --project-ref ${PROJECT_REF} --no-verify-jwt`);
    process.exit(result.status ?? 1);
  }
}

console.log('\nDeploy complete. Smoke test: node scripts/probe-edge-auth.mjs');
