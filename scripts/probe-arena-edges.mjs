#!/usr/bin/env node
/** Post-deploy smoke test for arena notification edge functions. */
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

async function probe(name, body = {}) {
  const r = await fetch(`${url}/functions/v1/${name}`, {
    method: 'POST',
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  const t = await r.text();
  console.log(`${name}: ${r.status} ${t.slice(0, 400)}`);
}

await probe('send-push-notification', {
  userId: '00000000-0000-0000-0000-000000000001',
  title: 'probe',
  body: 'probe',
});
await probe('blast-arena-notifications', {
  battle_id: '7af24605-79b3-4af0-956a-e98cb4681964',
  cleanup: false,
  push: false,
});
