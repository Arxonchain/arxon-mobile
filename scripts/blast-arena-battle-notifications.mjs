#!/usr/bin/env node
/**
 * Blast in-app + push notifications for a resolved arena battle.
 * Works before/after migration 20260816190000 (RPC or REST fallback).
 *
 * Usage:
 *   node scripts/blast-arena-battle-notifications.mjs [battle_id] [--no-push]
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const battleId = process.argv[2] || '7af24605-79b3-4af0-956a-e98cb4681964';
const pushEnabled = !process.argv.includes('--no-push');

function loadEnv() {
  const envPath = path.join(__dirname, '..', '.env');
  const env = fs.readFileSync(envPath, 'utf8');
  const get = (k) => {
    const m = env.match(new RegExp(`^${k}=(.+)$`, 'm'));
    return m ? m[1].trim().replace(/^["']|["']$/g, '') : '';
  };
  return {
    url: get('VITE_SUPABASE_URL'),
    serviceKey: get('SUPABASE_SERVICE_ROLE_KEY'),
  };
}

function winnerName(battle) {
  switch (battle.winner_side) {
    case 'a': return battle.side_a_name || 'Side A';
    case 'b': return battle.side_b_name || 'Side B';
    case 'c': return battle.side_c_name || 'Draw';
    case 'none': return 'Void / Tie';
    default: return 'Unknown';
  }
}

async function fetchRetry(url, init, tries = 6) {
  let lastErr;
  for (let i = 0; i < tries; i++) {
    try {
      return await fetch(url, init);
    } catch (e) {
      lastErr = e;
      await new Promise((r) => setTimeout(r, 1500 * (i + 1)));
    }
  }
  throw lastErr;
}

async function main() {
  const { url, serviceKey } = loadEnv();
  if (!url || !serviceKey) throw new Error('Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env');

  const headers = {
    apikey: serviceKey,
    Authorization: `Bearer ${serviceKey}`,
    'Content-Type': 'application/json',
  };

  // Prefer RPC when migration is applied
  const rpcRes = await fetchRetry(`${url}/rest/v1/rpc/blast_arena_battle_notifications`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ p_battle_id: battleId }),
  });

  if (rpcRes.ok) {
    const detail = await rpcRes.json();
    console.log('RPC blast OK:', JSON.stringify(detail, null, 2));
  } else {
    const rpcErr = await rpcRes.text();
    console.warn('RPC unavailable, using REST fallback:', rpcErr.slice(0, 160));

    const [battle] = await fetchRetry(
      `${url}/rest/v1/arena_battles?id=eq.${battleId}&select=id,title,winner_side,side_a_name,side_b_name,side_c_name`,
      { headers },
    ).then((r) => r.json());

    if (!battle?.winner_side) throw new Error(`Battle ${battleId} not found or not resolved`);

    const earnings = await fetchRetry(
      `${url}/rest/v1/arena_earnings?battle_id=eq.${battleId}&select=user_id,is_winner,total_earned,stake_amount`,
      { headers },
    ).then((r) => r.json());

    const existing = await fetchRetry(
      `${url}/rest/v1/user_notifications?notification_type=in.(arena_win,arena_loss,arena_battle_resolved,arena_resolved)&message=like.*${battleId}*&select=id&limit=1`,
      { headers },
    ).then((r) => r.json());

    let inserted = false;
    if (existing?.length) {
      console.log('Blast in-app rows already present — skipping inserts');
    } else {

    const winSide = winnerName(battle);
    const rows = [];
    const resolvedUsers = new Set();

    for (const row of earnings) {
      if (!resolvedUsers.has(row.user_id)) {
        resolvedUsers.add(row.user_id);
        rows.push({
          user_id: row.user_id,
          title: '📊 Battle Resolved',
          message: `[${battleId}] "${battle.title}" is settled. Winning side: ${winSide}. Tap to view your result.`,
          notification_type: 'arena_battle_resolved',
          amount: 0,
        });
      }

      if (row.is_winner) {
        rows.push({
          user_id: row.user_id,
          title: '🏆 Arena Victory!',
          message: `[${battleId}] You won "${battle.title}". ${Number(row.total_earned).toLocaleString()} ARX-P has been credited to your balance!`,
          notification_type: 'arena_win',
          amount: row.total_earned,
        });
      } else {
        rows.push({
          user_id: row.user_id,
          title: '💧 Arena Battle Result',
          message: `[${battleId}] Your side lost "${battle.title}". ${Number(row.stake_amount).toLocaleString()} ARX-P stake was not returned.`,
          notification_type: 'arena_loss',
          amount: -Math.abs(Number(row.stake_amount)),
        });
      }
    }

    for (let i = 0; i < rows.length; i += 50) {
      const chunk = rows.slice(i, i + 50);
      const ins = await fetchRetry(`${url}/rest/v1/user_notifications`, {
        method: 'POST',
        headers: { ...headers, Prefer: 'return=minimal' },
        body: JSON.stringify(chunk),
      });
      if (!ins.ok) throw new Error(`Insert failed: ${ins.status} ${await ins.text()}`);
    }

    console.log('REST blast inserted rows:', rows.length, {
      resolved: resolvedUsers.size,
      wins: earnings.filter((e) => e.is_winner).length,
      losses: earnings.filter((e) => !e.is_winner).length,
    });
    inserted = true;
    }
  }

  if (!pushEnabled) {
    console.log('Push skipped (--no-push)');
    return;
  }

  const earnings = await fetchRetry(
    `${url}/rest/v1/arena_earnings?battle_id=eq.${battleId}&select=user_id,is_winner,total_earned,stake_amount`,
    { headers },
  ).then((r) => r.json());

  const [battle] = await fetchRetry(
    `${url}/rest/v1/arena_battles?id=eq.${battleId}&select=title`,
    { headers },
  ).then((r) => r.json());

  let pushed = 0;
  for (const row of earnings) {
    const title = row.is_winner ? '🏆 You Won!' : '💧 Battle Result';
    const body = row.is_winner
      ? `You won ${Number(row.total_earned).toLocaleString()} ARX-P in "${battle.title}"!`
      : `Your team lost "${battle.title}". ${Number(row.stake_amount).toLocaleString()} ARX-P stake was not returned.`;

    const res = await fetchRetry(`${url}/functions/v1/send-push-notification`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${serviceKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId: row.user_id,
        title,
        body,
        url: '/arena',
        tag: row.is_winner ? 'arena-win' : 'arena-loss',
      }),
    });
    if (res.ok) {
      const json = await res.json();
      if (json.sent > 0) pushed += 1;
    }
  }

  console.log('Push attempts for participants:', earnings.length, 'devices_reached_users:', pushed);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
