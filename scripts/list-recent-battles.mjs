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
const url = (get('VITE_SUPABASE_URL') || get('SUPABASE_URL') || '').replace(/\/$/, '');
const key = get('SUPABASE_SERVICE_ROLE_KEY');
const headers = { Authorization: `Bearer ${key}`, apikey: key };

const pending = await fetch(
  `${url}/rest/v1/arena_battles?select=id,title,winner_side,is_active,ends_at,side_a_power,side_b_power&order=ends_at.desc&limit=10`,
  { headers },
);
const rows = await pending.json();
console.log('URL:', url);
console.log('Recent battles:');
for (const b of rows) {
  console.log(`- ${b.id} | ${b.title} | winner=${b.winner_side} active=${b.is_active} ends=${b.ends_at}`);
}
