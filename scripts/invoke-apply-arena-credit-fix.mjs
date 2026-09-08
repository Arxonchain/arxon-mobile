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

const res = await fetch(`${url}/functions/v1/apply-arena-credit-fix`, {
  method: 'POST',
  headers: { Authorization: `Bearer ${key}`, apikey: key, 'Content-Type': 'application/json' },
  body: '{}',
});
console.log(res.status, await res.text());
