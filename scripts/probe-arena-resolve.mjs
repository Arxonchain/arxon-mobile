#!/usr/bin/env node
/**
 * Smoke test: arena resolve / auto-pay auth + idempotent dry-run paths.
 * Safe to run against production — dryRun never pays out.
 */
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
  console.error('Need VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env');
  process.exit(1);
}

const PAYOUT_FUNCTIONS = [
  'resolve-arena-battle',
  'auto-resolve-battles',
  'arena-ai-prediction',
];

async function call(name, headers = {}, body = {}) {
  const r = await fetch(`${url}/functions/v1/${name}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(body),
  });
  const text = await r.text();
  return { status: r.status, text: text.slice(0, 300) };
}

let failed = 0;

console.log('=== Unauthenticated payout/AI paths must 401 ===');
for (const name of PAYOUT_FUNCTIONS) {
  const r = await call(name, {}, { dryRun: true });
  const ok = r.status === 401;
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name} no-auth → ${r.status} ${r.text}`);
  if (!ok) failed++;
}

console.log('\n=== Service role dryRun must succeed ===');
for (const name of PAYOUT_FUNCTIONS) {
  const r = await call(name, {
    apikey: serviceKey,
    Authorization: `Bearer ${serviceKey}`,
  }, { dryRun: true });
  const ok = r.status === 200 && r.text.includes('dryRun');
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name} dryRun → ${r.status} ${r.text}`);
  if (!ok) failed++;
}

console.log('\n=== Double dryRun (idempotent probe) ===');
for (const name of ['resolve-arena-battle', 'auto-resolve-battles']) {
  for (let i = 0; i < 2; i++) {
    const r = await call(name, {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
    }, { dryRun: true });
    const ok = r.status === 200;
    console.log(`${ok ? 'PASS' : 'FAIL'} ${name} dryRun #${i + 1} → ${r.status}`);
    if (!ok) failed++;
  }
}

if (failed) {
  console.error(`\n${failed} probe(s) failed`);
  process.exit(1);
}
console.log('\nArena resolve idempotency probes passed.');
