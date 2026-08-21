#!/usr/bin/env node
/** Smoke test: unauthenticated calls must 401; service role must pass auth gate. */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function readEnvText() {
  let text = '';
  for (const file of ['.env', '.env.local']) {
    const p = path.join(__dirname, '..', file);
    if (!fs.existsSync(p)) continue;
    text += fs.readFileSync(p, 'utf8') + '\n';
  }
  return text.replace(/^\uFEFF/, '');
}

function getEnv(text, key) {
  const m = text.match(new RegExp(`^${key}=(.+)$`, 'm'));
  return m ? m[1].trim().replace(/^["']|["']$/g, '') : '';
}

const envText = readEnvText();
const url =
  getEnv(envText, 'VITE_SUPABASE_URL') ||
  getEnv(envText, 'SUPABASE_URL') ||
  process.env.VITE_SUPABASE_URL ||
  process.env.SUPABASE_URL;
const serviceKey =
  getEnv(envText, 'SUPABASE_SERVICE_ROLE_KEY') || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error('Need VITE_SUPABASE_URL (or SUPABASE_URL) and SUPABASE_SERVICE_ROLE_KEY in .env');
  process.exit(1);
}

const SERVICE_ONLY = [
  'cleanup-stale-sessions',
  'auto-resolve-battles',
  'arena-ai-prediction',
  'apply-points-migration',
  'apply-arena-notifications-migration',
];

const ADMIN_OR_SERVICE = [
  'backfill-uncredited-sessions',
  'resolve-arena-battle',
  'send-push-notification',
  'blast-arena-notifications',
];

async function call(name, headers = {}, body = {}) {
  const r = await fetch(`${url}/functions/v1/${name}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(body),
  });
  const text = await r.text();
  return { status: r.status, text: text.slice(0, 200) };
}

let failed = 0;

async function expect401(name) {
  const r = await call(name, {}, { dryRun: true });
  const ok = r.status === 401;
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name} no-auth → ${r.status} ${r.text}`);
  if (!ok) failed++;
}

async function expectServiceOk(name, body = { dryRun: true, batchSize: 1 }) {
  const r = await call(name, {
    apikey: serviceKey,
    Authorization: `Bearer ${serviceKey}`,
  }, body);
  const ok = r.status >= 200 && r.status < 500 && r.status !== 401;
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name} service-role → ${r.status} ${r.text}`);
  if (!ok) failed++;
}

console.log('=== Unauthenticated must 401 ===');
for (const name of [...SERVICE_ONLY, ...ADMIN_OR_SERVICE]) {
  await expect401(name);
}

console.log('\n=== Service role must pass auth gate ===');
for (const name of SERVICE_ONLY) {
  await expectServiceOk(name);
}

for (const name of ADMIN_OR_SERVICE) {
  const body = name === 'resolve-arena-battle'
    ? { dryRun: true }
    : { dry_run: true, limit: 1 };
  await expectServiceOk(name, body);
}

console.log('\n=== Resolve idempotency dry-run (double call) ===');
for (let i = 0; i < 2; i++) {
  const r = await call('resolve-arena-battle', {
    apikey: serviceKey,
    Authorization: `Bearer ${serviceKey}`,
  }, { dryRun: true, battle_id: '00000000-0000-0000-0000-000000000001' });
  const ok = r.status === 200 && r.text.includes('dryRun');
  console.log(`${ok ? 'PASS' : 'FAIL'} resolve-arena-battle dryRun #${i + 1} → ${r.status} ${r.text}`);
  if (!ok) failed++;
}

if (failed) {
  console.error(`\n${failed} probe(s) failed`);
  process.exit(1);
}
console.log('\nAll edge auth probes passed.');
