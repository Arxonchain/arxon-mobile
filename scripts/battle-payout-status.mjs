#!/usr/bin/env node
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
const headers = { Authorization: `Bearer ${key}`, apikey: key };
const id = process.argv[2] || '0bf8f1a9-9188-418e-bfe4-0f20dab4c7e0';

async function count(table) {
  const r = await fetch(`${url}/rest/v1/${table}?select=id&battle_id=eq.${id}`, {
    headers: { ...headers, Prefer: 'count=exact' },
  });
  return r.headers.get('content-range');
}

console.log('battle_id', id);
console.log('arena_earnings', await count('arena_earnings'));
console.log('arena_staking_rewards', await count('arena_staking_rewards'));
const b = await fetch(`${url}/rest/v1/arena_battles?select=*&id=eq.${id}`, { headers });
console.log('battle', JSON.stringify((await b.json())[0], null, 2));
