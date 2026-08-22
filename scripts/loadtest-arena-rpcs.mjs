#!/usr/bin/env node
/**
 * Concurrent arena RPC read smoke (bounded payloads).
 *
 *   node scripts/loadtest-arena-rpcs.mjs
 *   node scripts/loadtest-arena-rpcs.mjs --concurrency 10 --rounds 5
 */
import { authHeaders, requireSupabaseEnv, supabaseUrl } from './loadtest-env.mjs';

const concurrency = Number(
  process.argv.find((a) => a.startsWith('--concurrency='))?.split('=')[1] || 10
);
const rounds = Number(
  process.argv.find((a) => a.startsWith('--rounds='))?.split('=')[1] || 5
);

const RPCS = [
  { name: 'get_arena_analytics', body: {} },
  { name: 'get_arena_staker_leaderboard', body: { p_limit: 50 } },
];

requireSupabaseEnv();

async function fetchSampleBattleId() {
  const res = await fetch(
    `${supabaseUrl}/rest/v1/arena_battles?select=id&order=created_at.desc&limit=1`,
    { headers: authHeaders() }
  );
  if (!res.ok) return null;
  const rows = await res.json();
  return rows?.[0]?.id ?? null;
}

async function callRpc(name, body) {
  const t0 = performance.now();
  const res = await fetch(`${supabaseUrl}/rest/v1/rpc/${name}`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(body),
  });
  const ms = performance.now() - t0;
  let rows = null;
  if (res.ok) {
    try {
      rows = await res.json();
    } catch {
      rows = null;
    }
  }
  return { name, status: res.status, ms, rows };
}

async function oneRound(rpcs) {
  const jobs = [];
  for (let i = 0; i < concurrency; i++) {
    for (const rpc of rpcs) {
      jobs.push(callRpc(rpc.name, rpc.body));
    }
  }
  return Promise.all(jobs);
}

console.log(`arena RPC load → ${supabaseUrl}`);
console.log(`concurrency: ${concurrency}, rounds: ${rounds}\n`);

const battleId = await fetchSampleBattleId();
const rpcs = [...RPCS];
if (battleId) {
  rpcs.push(
    { name: 'get_recent_battle_votes', body: { p_battle_id: battleId, p_limit: 50 } },
    { name: 'get_battle_vote_summary', body: { p_battle_id: battleId } }
  );
  console.log(`using battle ${battleId} for per-battle RPCs\n`);
} else {
  console.log('no arena_battles row — skipping per-battle RPCs\n');
}

const all = [];
for (let r = 1; r <= rounds; r++) {
  const results = await oneRound(rpcs);
  all.push(...results);
  const ok = results.filter((x) => x.status === 200).length;
  const fail = results.length - ok;
  const p95 = results
    .map((x) => x.ms)
    .sort((a, b) => a - b)[Math.floor(results.length * 0.95)] ?? 0;
  console.log(`  round ${r}: ${ok} ok, ${fail} fail, p95 ${Math.round(p95)} ms`);
}

const errors = all.filter((x) => x.status !== 200);
const oversized = all.filter((x) => Array.isArray(x.rows) && x.rows.length > 500);
const p95All = all.map((x) => x.ms).sort((a, b) => a - b)[Math.floor(all.length * 0.95)] ?? 0;

console.log('\n--- summary ---');
console.log(`  total calls: ${all.length}`);
console.log(`  errors: ${errors.length}`);
console.log(`  oversized payloads (>500 rows): ${oversized.length}`);
console.log(`  p95 latency: ${Math.round(p95All)} ms`);

if (errors.length > 0) {
  const sample = errors.slice(0, 3).map((e) => `${e.name}→${e.status}`).join(', ');
  console.error(`FAIL: ${sample}${errors.length > 3 ? '…' : ''}`);
  process.exit(1);
}
if (oversized.length > 0) {
  console.error('FAIL: RPC returned unbounded row set');
  process.exit(1);
}

console.log('PASS');
