#!/usr/bin/env node
/**
 * Clean + re-blast arena notifications for a resolved battle.
 *
 * Usage:
 *   node scripts/blast-arena-battle-notifications.mjs [battle_id] [--no-push] [--no-cleanup]
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const battleId = process.argv[2] || '7af24605-79b3-4af0-956a-e98cb4681964';
const pushEnabled = !process.argv.includes('--no-push');
const cleanupEnabled = !process.argv.includes('--no-cleanup');

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

  // Prefer unified edge function (cleanup + in-app + FCM)
  const edgeRes = await fetchRetry(`${url}/functions/v1/blast-arena-notifications`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ battle_id: battleId, cleanup: cleanupEnabled, push: pushEnabled }),
  });

  if (edgeRes.ok) {
    const detail = await edgeRes.json();
    console.log('Edge blast OK:', JSON.stringify(detail, null, 2));
    return;
  }

  const edgeErr = await edgeRes.text();
  console.warn('Edge blast unavailable, using REST fallback:', edgeErr.slice(0, 200));

  const [battle] = await fetchRetry(
    `${url}/rest/v1/arena_battles?id=eq.${battleId}&select=id,title,winner_side,side_a_name,side_b_name,side_c_name`,
    { headers },
  ).then((r) => r.json());

  if (!battle?.winner_side) throw new Error(`Battle ${battleId} not found or not resolved`);

  if (cleanupEnabled) {
    const cleanupRpc = await fetchRetry(`${url}/rest/v1/rpc/cleanup_arena_battle_notifications`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ p_battle_id: battleId }),
    });
    if (cleanupRpc.ok) {
      console.log('Cleanup deleted rows:', await cleanupRpc.json());
    } else {
      const del = await fetchRetry(
        `${url}/rest/v1/user_notifications?message=like.*${battleId}*`,
        { method: 'DELETE', headers: { ...headers, Prefer: 'return=representation' } },
      );
      const deleted = del.ok ? await del.json() : [];
      console.log('REST cleanup deleted:', Array.isArray(deleted) ? deleted.length : 0);
    }
  }

  const rpcRes = await fetchRetry(`${url}/rest/v1/rpc/blast_arena_battle_notifications`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ p_battle_id: battleId }),
  });

  if (rpcRes.ok) {
    console.log('RPC blast OK:', JSON.stringify(await rpcRes.json(), null, 2));
  } else {
    const earnings = await fetchRetry(
      `${url}/rest/v1/arena_earnings?battle_id=eq.${battleId}&select=user_id,is_winner,total_earned,stake_amount`,
      { headers },
    ).then((r) => r.json());

    const winSide = winnerName(battle);
    const rows = [];
    const resolvedUsers = new Set();

    for (const row of earnings) {
      if (!resolvedUsers.has(row.user_id)) {
        resolvedUsers.add(row.user_id);
        rows.push({
          user_id: row.user_id,
          title: '📊 Battle Resolved',
          message: `"${battle.title}" is settled — winner: ${winSide}. Tap to view your result.`,
          notification_type: 'arena_battle_resolved',
          amount: 0,
        });
      }

      if (row.is_winner) {
        rows.push({
          user_id: row.user_id,
          title: '🏆 Arena Victory!',
          message: `You won "${battle.title}" on ${winSide}. +${Number(row.total_earned).toLocaleString()} ARX-P credited!`,
          notification_type: 'arena_win',
          amount: row.total_earned,
        });
      } else {
        rows.push({
          user_id: row.user_id,
          title: '💧 Arena Battle Result',
          message: `Your pick lost in "${battle.title}". ${Number(row.stake_amount).toLocaleString()} ARX-P stake was not returned.`,
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
  }

  if (!pushEnabled) {
    console.log('Push skipped (--no-push)');
    return;
  }

  const earnings = await fetchRetry(
    `${url}/rest/v1/arena_earnings?battle_id=eq.${battleId}&select=user_id,is_winner,total_earned,stake_amount`,
    { headers },
  ).then((r) => r.json());

  const winSide = winnerName(battle);
  let devicesSent = 0;
  let usersReached = 0;
  const pushErrors = new Set();
  const seen = new Set();

  for (const row of earnings) {
    const targets = [];

    if (!seen.has(row.user_id)) {
      seen.add(row.user_id);
      targets.push({
        title: '📊 Battle Resolved',
        body: `"${battle.title}" is settled — winner: ${winSide}.`,
        tag: `arena-resolved-${battleId}`,
      });
    }

    targets.push(row.is_winner
      ? {
          title: '🏆 You Won!',
          body: `You won ${Number(row.total_earned).toLocaleString()} ARX-P in "${battle.title}"!`,
          tag: `arena-win-${battleId}`,
        }
      : {
          title: '💧 Battle Result',
          body: `"${battle.title}" — ${Number(row.stake_amount).toLocaleString()} ARX-P stake was not returned.`,
          tag: `arena-loss-${battleId}`,
        });

    for (const t of targets) {
      const res = await fetchRetry(`${url}/functions/v1/send-push-notification`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          userId: row.user_id,
          title: t.title,
          body: t.body,
          url: '/arena/prediction-market',
          tag: t.tag,
          data: { battle_id: battleId, type: 'arena_battle_resolved' },
        }),
      });
      const json = res.ok ? await res.json() : { error: await res.text() };
      if (json.sent > 0) {
        devicesSent += json.sent;
        usersReached += 1;
      }
      if (json.error) pushErrors.add(String(json.error).slice(0, 120));
    }
  }

  console.log('Push summary:', {
    participants: earnings.length,
    users_reached: usersReached,
    devices_sent: devicesSent,
    errors: [...pushErrors],
  });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
