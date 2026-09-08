#!/usr/bin/env node
/**
 * Resolve a stuck arena battle by alternating sync resolve + chunked credit
 * until winner_side is set. Works around Postgres statement_timeout in
 * credit_arena_battle_earnings when migration is not yet applied.
 */
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const battleId = process.argv[2];
const winnerSide = process.argv[3] || 'b';
const maxAttempts = Number(process.argv[4] || 12);

if (!battleId) {
  console.error('Usage: node scripts/retry-resolve-arena-battle.mjs <battle_id> [winner_side] [maxAttempts]');
  process.exit(1);
}

function readEnv() {
  let text = '';
  for (const f of ['.env', '.env.local']) {
    const p = path.join(ROOT, f);
    if (fs.existsSync(p)) text += fs.readFileSync(p, 'utf8') + '\n';
  }
  return text;
}

function getEnv(text, key) {
  const m = text.match(new RegExp(`^${key}=(.+)$`, 'm'));
  return m ? m[1].trim().replace(/^["']|["']$/g, '') : '';
}

const envText = readEnv();
const url = (getEnv(envText, 'VITE_SUPABASE_URL') || getEnv(envText, 'SUPABASE_URL') || '').replace(/\/$/, '');
const key = getEnv(envText, 'SUPABASE_SERVICE_ROLE_KEY');
const headers = { Authorization: `Bearer ${key}`, apikey: key };

async function battleState() {
  const res = await fetch(
    `${url}/rest/v1/arena_battles?select=winner_side,total_rewards_distributed,is_active&id=eq.${battleId}`,
    { headers },
  );
  return (await res.json())?.[0];
}

async function uncreditedCount() {
  const rows = await fetch(
    `${url}/rest/v1/arena_earnings?select=total_earned,points_credited_amount&battle_id=eq.${battleId}&is_winner=eq.true`,
    { headers },
  ).then((r) => r.json());
  return rows.filter(
    (r) => Math.floor(Number(r.total_earned) || 0) > Math.floor(Number(r.points_credited_amount) || 0),
  ).length;
}

for (let attempt = 1; attempt <= maxAttempts; attempt++) {
  console.log(`\n=== Attempt ${attempt}/${maxAttempts} ===`);
  const before = await battleState();
  console.log('Before:', before);
  if (before?.winner_side) {
    console.log('Battle already resolved.');
    process.exit(0);
  }

  const resolve = spawnSync(
    process.execPath,
    [path.join(__dirname, 'invoke-resolve-battle.mjs'), battleId, winnerSide, '--sync'],
    { cwd: ROOT, encoding: 'utf8', stdio: 'pipe' },
  );
  process.stdout.write(resolve.stdout || '');
  process.stderr.write(resolve.stderr || '');

  const afterResolve = await battleState();
  if (afterResolve?.winner_side) {
    console.log('Resolved:', afterResolve);
    process.exit(0);
  }

  const owed = await uncreditedCount();
  if (owed === 0) {
    console.log('No uncredited earnings rows; resolve may have failed for another reason.');
    continue;
  }

  console.log(`Chunk-crediting ${owed} winner row(s)...`);
  const credit = spawnSync(
    process.execPath,
    [path.join(__dirname, 'credit-arena-winners-chunked.mjs'), battleId],
    { cwd: ROOT, encoding: 'utf8', stdio: 'inherit' },
  );
  if (credit.status !== 0) process.exit(credit.status ?? 1);
}

const final = await battleState();
console.log('\nFinal state:', final);
process.exit(final?.winner_side ? 0 : 1);
