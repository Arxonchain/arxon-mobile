#!/usr/bin/env node
/** Verify arena blast copy has no UUIDs in user-visible text. */
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
const battleId = process.argv[2] || '7af24605-79b3-4af0-956a-e98cb4681964';
const uuidRe = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;

const headers = { apikey: key, Authorization: `Bearer ${key}` };

const rows = await fetch(
  `${url}/rest/v1/user_notifications?select=id,notification_type,title,message&or=(message.ilike.*${battleId}*,title.ilike.*${battleId}*)&limit=5`,
  { headers },
).then((r) => r.json());

const arenaRows = await fetch(
  `${url}/rest/v1/user_notifications?select=id,notification_type,title,message&notification_type=in.(arena_win,arena_loss,arena_battle_resolved,arena_resolved)&message=ilike.*Netflix*&limit=5`,
  { headers },
).then((r) => r.json());

const withUuid = [...(Array.isArray(rows) ? rows : []), ...(Array.isArray(arenaRows) ? arenaRows : [])]
  .filter((r) => uuidRe.test(r.message || '') || uuidRe.test(r.title || ''));

console.log('sample_arena', JSON.stringify(Array.isArray(arenaRows) ? arenaRows.slice(0, 2) : arenaRows, null, 2));
console.log('uuid_in_text_count', withUuid.length);
console.log(
  'push_subs',
  await fetch(`${url}/rest/v1/push_subscriptions?select=id`, { headers, Prefer: 'count=exact' }).then((r) =>
    r.headers.get('content-range'),
  ),
);
