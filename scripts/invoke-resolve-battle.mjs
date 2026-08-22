#!/usr/bin/env node
/**
 * Invoke resolve-arena-battle (CLI v2.90 has no `functions invoke`).
 *
 *   node scripts/invoke-resolve-battle.mjs <battle_id> <winner_side> [--force]
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

const args = process.argv.slice(2).filter((a) => a !== '--force');
const force = process.argv.includes('--force');
const battleId = args[0];
const winnerSide = args[1] || 'a';

if (!battleId) {
  console.error('Usage: node scripts/invoke-resolve-battle.mjs <battle_id> <a|b|c> [--force]');
  process.exit(1);
}

const envText = readEnvText();
const url = (getEnv(envText, 'VITE_SUPABASE_URL') || getEnv(envText, 'SUPABASE_URL') || '').replace(/\/$/, '');
const serviceKey = getEnv(envText, 'SUPABASE_SERVICE_ROLE_KEY') || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error('Need VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env');
  process.exit(1);
}

console.log(`Resolve ${battleId} winner=${winnerSide} queue=false force=${force}`);

const countRes = await fetch(
  `${url}/rest/v1/arena_votes?select=id&battle_id=eq.${battleId}`,
  {
    headers: {
      Authorization: `Bearer ${serviceKey}`,
      apikey: serviceKey,
      Prefer: 'count=exact',
    },
  },
);
console.log('Vote count header:', countRes.headers.get('content-range'));

const battleRes = await fetch(
  `${url}/rest/v1/arena_battles?select=id,title,winner_side,is_active,side_a_power,side_b_power,total_rewards_distributed,ends_at&id=eq.${battleId}`,
  {
    headers: { Authorization: `Bearer ${serviceKey}`, apikey: serviceKey },
  },
);
const battleRows = await battleRes.json();
console.log('Battle before:', JSON.stringify(battleRows?.[0] ?? battleRows, null, 2));

const t0 = performance.now();
const res = await fetch(`${url}/functions/v1/resolve-arena-battle`, {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${serviceKey}`,
    apikey: serviceKey,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    battle_id: battleId,
    winner_side: winnerSide,
    queue: false,
    force,
  }),
});

const text = await res.text();
console.log(`\nHTTP ${res.status} in ${Math.round(performance.now() - t0)} ms`);
try {
  console.log(JSON.stringify(JSON.parse(text), null, 2));
} catch {
  console.log(text.slice(0, 4000));
}

process.exit(res.ok ? 0 : 1);
