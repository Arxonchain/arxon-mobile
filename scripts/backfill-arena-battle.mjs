#!/usr/bin/env node
/** Run backfill_undercredited_arena_battle for one battle (avoids SQL editor timeout). */
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
const battleId = process.argv[2];

if (!url || !key) {
  console.error('Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env');
  process.exit(1);
}
if (!battleId) {
  console.error('Usage: node scripts/backfill-arena-battle.mjs <battle_id>');
  process.exit(1);
}

const headers = {
  Authorization: `Bearer ${key}`,
  apikey: key,
  'Content-Type': 'application/json',
};

const res = await fetch(`${url}/rest/v1/rpc/backfill_undercredited_arena_battle`, {
  method: 'POST',
  headers,
  body: JSON.stringify({ p_battle_id: battleId }),
});

const body = await res.json().catch(() => ({}));
if (!res.ok) {
  console.error('Backfill failed:', res.status, body);
  process.exit(1);
}

console.log('Backfill result:', JSON.stringify(body, null, 2));
