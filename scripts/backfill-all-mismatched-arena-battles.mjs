#!/usr/bin/env node
/** Backfill every battle where winner total_earned != total_rewards_distributed (one RPC per battle). */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
let text = '';
for (const f of ['.env', '.env.local']) {
  const p = path.join(__dirname, '..', f);
  if (fs.existsSync(p)) text += fs.readFileSync(p, 'utf8') + '\n';
}
const get = (k) => {
  const m = text.match(new RegExp(`^${k}=(.+)$`, 'm'));
  return m ? m[1].trim().replace(/^["']|["']$/g, '') : '';
};

const url = (get('VITE_SUPABASE_URL') || '').replace(/\/$/, '');
const key = get('SUPABASE_SERVICE_ROLE_KEY');

if (!url || !key) {
  console.error('Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env');
  process.exit(1);
}

const headers = {
  Authorization: `Bearer ${key}`,
  apikey: key,
  'Content-Type': 'application/json',
};

const listRes = await fetch(
  `${url}/rest/v1/arena_battles?select=id,title,total_rewards_distributed,winner_side&winner_side=not.is.null&winner_side=neq.none&order=ends_at.desc`,
  { headers },
);
if (!listRes.ok) {
  console.error('Failed to list battles', listRes.status, await listRes.text());
  process.exit(1);
}
const battles = await listRes.json();

const mismatched = [];
for (const b of battles) {
  const sumRes = await fetch(
    `${url}/rest/v1/arena_earnings?select=total_earned&battle_id=eq.${b.id}&is_winner=eq.true`,
    { headers },
  );
  const rows = await sumRes.json();
  const sum = rows.reduce((s, r) => s + Number(r.total_earned || 0), 0);
  const expected = Number(b.total_rewards_distributed || 0);
  if (Math.abs(expected - sum) > 1) {
    mismatched.push({ ...b, sum_earned: sum, gap: expected - sum });
  }
}

console.log(`Found ${mismatched.length} mismatched battle(s)`);
for (const b of mismatched) {
  console.log(`\nBackfilling ${b.title} (${b.id}) gap=${b.gap}...`);
  const res = await fetch(`${url}/rest/v1/rpc/backfill_undercredited_arena_battle`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ p_battle_id: b.id }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    console.error('  FAILED', res.status, body);
  } else {
    console.log('  OK', JSON.stringify(body));
  }
}
