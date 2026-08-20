#!/usr/bin/env node
/** Compare auth header combos for send-push-notification. */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const env = fs.readFileSync(path.join(__dirname, '..', '.env'), 'utf8');
const get = (k) => {
  const m = env.match(new RegExp(`^${k}=(.+)$`, 'm'));
  return m ? m[1].trim().replace(/^["']|["']$/g, '') : '';
};

const url = get('VITE_SUPABASE_URL');
const key = get('SUPABASE_SERVICE_ROLE_KEY');
const anon = get('VITE_SUPABASE_PUBLISHABLE_KEY') || get('VITE_SUPABASE_ANON_KEY');
const headers = { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' };
const userId = '09380368-3779-4f7b-8607-b8e9318b5839';

for (const label of ['service_only', 'service+apikey', 'anon_auth']) {
  let h;
  if (label === 'service_only') h = { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' };
  else if (label === 'service+apikey') h = headers;
  else h = { apikey: anon, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' };

  const r = await fetch(`${url}/functions/v1/send-push-notification`, {
    method: 'POST',
    headers: h,
    body: JSON.stringify({ userId, title: 'probe', body: 'probe', url: '/' }),
  });
  console.log(label, r.status, await r.json());
}
