#!/usr/bin/env node
/**
 * Credit arena winners via chunked increment_user_points RPC calls from Node.
 * Workaround when credit_arena_battle_earnings hits Postgres statement_timeout
 * (500-point loop inside one SQL statement). Each RPC call stays under timeout.
 *
 * Usage: node scripts/credit-arena-winners-chunked.mjs <battle_id>
 */
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
const battleId = process.argv[2];

if (!url || !key || !battleId) {
  console.error('Usage: node scripts/credit-arena-winners-chunked.mjs <battle_id>');
  process.exit(1);
}

const headers = {
  Authorization: `Bearer ${key}`,
  apikey: key,
  'Content-Type': 'application/json',
};

async function rpc(name, args, retries = 5) {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(`${url}/rest/v1/rpc/${name}`, {
        method: 'POST',
        headers,
        body: JSON.stringify(args),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(`${name}: ${res.status} ${JSON.stringify(body)}`);
      return body;
    } catch (err) {
      if (i === retries - 1) throw err;
      await new Promise((r) => setTimeout(r, 1000 * (i + 1)));
    }
  }
}

async function patchEarnings(userId, credited) {
  const res = await fetch(
    `${url}/rest/v1/arena_earnings?battle_id=eq.${battleId}&user_id=eq.${userId}`,
    {
      method: 'PATCH',
      headers: { ...headers, Prefer: 'return=representation' },
      body: JSON.stringify({ points_credited_amount: credited }),
    },
  );
  if (!res.ok) throw new Error(`patch earnings ${userId}: ${await res.text()}`);
}

const earnings = await fetch(
  `${url}/rest/v1/arena_earnings?select=id,user_id,total_earned,points_credited_amount&battle_id=eq.${battleId}&is_winner=eq.true`,
  { headers },
).then((r) => r.json());

let totalCredited = 0;
for (const row of earnings) {
  const target = Math.floor(Number(row.total_earned) || 0);
  const startCredited = Math.floor(Number(row.points_credited_amount) || 0);
  let credited = startCredited;
  let owed = target - credited;
  if (owed <= 0) {
    console.log(`${row.user_id}: already credited (${credited})`);
    continue;
  }

  console.log(`${row.user_id}: crediting ${owed} (was ${credited}/${target})`);
  let ops = 0;
  while (owed > 0) {
    const chunk = Math.min(owed, 500);
    await rpc('increment_user_points', {
      p_user_id: row.user_id,
      p_amount: chunk,
      p_type: 'arena',
    });
    credited += chunk;
    owed -= chunk;
    ops += 1;
    if (ops % 100 === 0 || owed === 0) {
      await patchEarnings(row.user_id, credited);
      process.stdout.write(`  ... ${credited}/${target}\n`);
    }
  }
  await patchEarnings(row.user_id, credited);
  const newlyCredited = credited - startCredited;
  try {
    await rpc('log_points_ledger_entry', {
      p_user_id: row.user_id,
      p_amount: newlyCredited,
      p_type: 'arena_reward',
      p_description: `Arena battle winnings (+${newlyCredited} ARX-P)`,
      p_source_type: 'arena_earning',
      p_source_id: row.id,
    });
  } catch (ledgerErr) {
    console.warn('Ledger log skipped:', ledgerErr.message);
  }
  totalCredited += newlyCredited;
}

console.log('Done. Total newly credited:', totalCredited);
