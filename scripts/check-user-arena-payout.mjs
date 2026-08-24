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
const email = (process.argv[2] || '').toLowerCase();
const battleId = process.argv[3] || '0bf8f1a9-9188-418e-bfe4-0f20dab4c7e0';

if (!url || !key || !email) {
  console.error('Usage: node scripts/check-user-arena-payout.mjs <email> [battle_id]');
  process.exit(1);
}

const headers = { Authorization: `Bearer ${key}`, apikey: key };

let page = 1;
let user = null;
while (!user) {
  const r = await fetch(`${url}/auth/v1/admin/users?page=${page}&per_page=1000`, { headers });
  const j = await r.json();
  user = (j.users || []).find((u) => u.email?.toLowerCase() === email);
  if (!user && (j.users || []).length < 1000) break;
  page++;
}

if (!user) {
  console.log('User not found:', email);
  process.exit(1);
}

const uid = user.id;
console.log({ email, user_id: uid, battle_id: battleId });

const [profile, votes, earnings, points, battle] = await Promise.all([
  fetch(`${url}/rest/v1/profiles?select=username&user_id=eq.${uid}`, { headers }).then((r) => r.json()),
  fetch(`${url}/rest/v1/arena_votes?select=side,power_spent,created_at&battle_id=eq.${battleId}&user_id=eq.${uid}`, { headers }).then((r) => r.json()),
  fetch(`${url}/rest/v1/arena_earnings?select=*&battle_id=eq.${battleId}&user_id=eq.${uid}`, { headers }).then((r) => r.json()),
  fetch(`${url}/rest/v1/user_points?select=total_points,mining_points,arena_points&user_id=eq.${uid}`, { headers }).then((r) => r.json()),
  fetch(`${url}/rest/v1/arena_battles?select=title,winner_side,total_rewards_distributed&id=eq.${battleId}`, { headers }).then((r) => r.json()),
]);

console.log('battle', battle[0]);
console.log('username', profile[0]?.username);
console.log('votes', votes);
console.log('earnings', earnings[0] || null);
console.log('user_points', points[0] || null);

if (earnings[0]) {
  const e = earnings[0];
  const owed = Number(e.total_earned || 0) - Number(e.points_credited_amount || 0);
  console.log('points_still_owed', owed);
} else {
  const allVotes = await fetch(
    `${url}/rest/v1/arena_votes?select=battle_id,side,power_spent&user_id=eq.${uid}&order=created_at.desc&limit=10`,
    { headers },
  ).then((r) => r.json());
  const allEarnings = await fetch(
    `${url}/rest/v1/arena_earnings?select=battle_id,is_winner,total_earned,points_credited_amount,stake_amount&user_id=eq.${uid}&order=created_at.desc&limit=10`,
    { headers },
  ).then((r) => r.json());
  console.log('recent_votes', allVotes);
  console.log('recent_earnings', allEarnings);
}
