#!/usr/bin/env node
/**
 * Smoke load test: auth-signup durable rate limit should 429 after ~30 requests/min per IP.
 * No k6 required — uses Node fetch (same pattern as scripts/probe-*.mjs).
 *
 *   node scripts/loadtest-auth-rate-limit.mjs
 *   node scripts/loadtest-auth-rate-limit.mjs --iterations 35
 */
import { anonKey, authHeaders, requireSupabaseEnv, supabaseUrl } from './loadtest-env.mjs';

const iterations = Number(process.argv.find((a) => a.startsWith('--iterations='))?.split('=')[1] || 35);

requireSupabaseEnv();

const body = JSON.stringify({
  email: 'loadtest-invalid@example.com',
  password: 'short',
});

let count429 = 0;
let countOther = 0;
let count5xx = 0;
const latencies = [];

console.log(`auth-signup rate limit smoke → ${supabaseUrl}`);
console.log(`iterations: ${iterations} (expect 429 after ~30)\n`);

for (let i = 1; i <= iterations; i++) {
  const t0 = performance.now();
  const res = await fetch(`${supabaseUrl}/functions/v1/auth-signup`, {
    method: 'POST',
    headers: authHeaders(),
    body,
  });
  latencies.push(performance.now() - t0);

  if (res.status === 429) count429++;
  else if (res.status >= 500) count5xx++;
  else countOther++;

  const tag = res.status === 429 ? 'RATE LIMITED' : `HTTP ${res.status}`;
  console.log(`  ${String(i).padStart(2)}  ${tag}`);
}

const p95 = latencies.sort((a, b) => a - b)[Math.floor(latencies.length * 0.95)] ?? 0;

console.log('\n--- summary ---');
console.log(`  429: ${count429}`);
console.log(`  other 4xx: ${countOther}`);
console.log(`  5xx: ${count5xx}`);
console.log(`  p95 latency: ${Math.round(p95)} ms`);

let failed = 0;
if (count5xx > 0) {
  console.error('FAIL: server errors');
  failed++;
}
if (iterations > 30 && count429 === 0) {
  console.error('FAIL: expected 429 after 30 requests (durable rate limit may be off)');
  failed++;
}
if (iterations <= 30 && count429 > 0) {
  console.warn('WARN: got 429 before 30 — bucket may already be hot from prior runs');
}

if (!failed) {
  console.log('PASS');
} else {
  process.exit(1);
}
