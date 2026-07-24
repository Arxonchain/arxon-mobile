/**
 * Production points repair:
 * 1) Credit uncredited mining sessions
 * 2) Backfill Word Forge game_points from progress
 * 3) Recalculate total_points when category sum differs
 *
 * Usage: node scripts/sync-production-points.mjs [--apply]
 * Requires VITE_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY in .env
 */
import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

function loadEnv() {
  try {
    const raw = readFileSync('.env', 'utf8');
    for (const line of raw.split('\n')) {
      const m = line.match(/^([^#=]+)=(.*)$/);
      if (!m) continue;
      const key = m[1].trim();
      const val = m[2].trim().replace(/^"|"$/g, '');
      if (!process.env[key]) process.env[key] = val;
    }
  } catch { /* ignore */ }
}

loadEnv();

const url = process.env.VITE_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const apply = process.argv.includes('--apply');

if (!url || !key) {
  console.error('Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const sb = createClient(url, key);

async function creditUncreditedMining() {
  let offset = 0;
  let credited = 0;
  let errors = 0;
  let points = 0;

  while (true) {
    const { data: sessions, error } = await sb
      .from('mining_sessions')
      .select('id, user_id, arx_mined')
      .eq('is_active', false)
      .is('credited_at', null)
      .gt('arx_mined', 0)
      .order('ended_at', { ascending: true })
      .range(offset, offset + 99);

    if (error) throw error;
    if (!sessions?.length) break;

    for (const session of sessions) {
      const amount = Math.ceil(Number(session.arx_mined || 0));
      if (amount <= 0) continue;

      if (apply) {
        const { error: markErr } = await sb
          .from('mining_sessions')
          .update({ credited_at: new Date().toISOString() })
          .eq('id', session.id)
          .is('credited_at', null);

        if (markErr) {
          errors++;
          continue;
        }

        const { error: rpcErr } = await sb.rpc('increment_user_points', {
          p_user_id: session.user_id,
          p_amount: amount,
          p_type: 'mining',
        });

        if (rpcErr) {
          errors++;
          await sb.from('mining_sessions').update({ credited_at: null }).eq('id', session.id);
          continue;
        }
      }

      credited++;
      points += amount;
    }

    if (sessions.length < 100) break;
    offset += 100;
  }

  return { credited, points, errors };
}

async function backfillWordForgeGamePoints() {
  const { data: rows, error } = await sb
    .from('word_forge_progress')
    .select('user_id, total_words')
    .gt('total_words', 0);

  if (error) throw error;

  let users = 0;
  let restored = 0;

  for (const row of rows ?? []) {
    const expected = row.total_words * 10;
    const { data: up } = await sb
      .from('user_points')
      .select('game_points, total_points, mining_points')
      .eq('user_id', row.user_id)
      .maybeSingle();

    const currentGame = Math.ceil(Number(up?.game_points ?? 0));
    const delta = expected - currentGame;
    if (delta <= 0) continue;

    users++;
    restored += delta;

    if (apply) {
      // Try game type first; fall back to direct update if RPC not migrated yet
      const { error: rpcErr } = await sb.rpc('increment_user_points', {
        p_user_id: row.user_id,
        p_amount: delta,
        p_type: 'game',
      });

      if (rpcErr?.message?.includes('Invalid point type')) {
        const newGame = currentGame + delta;
        await sb.from('user_points').update({
          game_points: newGame,
          mining_points: Math.ceil(Number(up?.mining_points ?? 0)) + delta,
          updated_at: new Date().toISOString(),
        }).eq('user_id', row.user_id);
      }
    }
  }

  return { users, restored };
}

async function fixGamePointsDrift() {
  let offset = 0;
  let fixed = 0;
  let restored = 0;

  while (true) {
    const { data: page } = await sb
      .from('user_points')
      .select('user_id, game_points, total_points, mining_points, task_points, social_points, referral_points')
      .gt('game_points', 0)
      .range(offset, offset + 999);

    if (!page?.length) break;

    for (const p of page) {
      const sum = ['mining_points', 'task_points', 'social_points', 'referral_points', 'game_points']
        .reduce((s, k) => s + Number(p[k] ?? 0), 0);
      const drift = Math.round(sum - Number(p.total_points ?? 0));
      if (drift <= 0) continue;

      fixed++;
      restored += drift;

      if (apply) {
        await sb.from('user_points').update({
          mining_points: Math.ceil(Number(p.mining_points ?? 0) + drift),
          updated_at: new Date().toISOString(),
        }).eq('user_id', p.user_id);
      }
    }

    if (page.length < 1000) break;
    offset += 1000;
  }

  return { fixed, restored };
}

async function fixTotalMismatches() {
  let offset = 0;
  let fixed = 0;

  while (true) {
    const { data: page } = await sb
      .from('user_points')
      .select('user_id, mining_points, task_points, social_points, referral_points, game_points, total_points')
      .range(offset, offset + 999);

    if (!page?.length) break;

    for (const p of page) {
      const sum = ['mining_points', 'task_points', 'social_points', 'referral_points', 'game_points']
        .reduce((s, k) => s + Number(p[k] ?? 0), 0);
      const total = Number(p.total_points ?? 0);
      if (Math.abs(sum - total) <= 1) continue;

      fixed++;
      if (apply) {
        await sb
          .from('user_points')
          .update({ total_points: Math.ceil(sum), updated_at: new Date().toISOString() })
          .eq('user_id', p.user_id);
      }
    }

    if (page.length < 1000) break;
    offset += 1000;
  }

  return { fixed };
}

console.log(apply ? 'APPLY MODE' : 'DRY RUN (pass --apply to execute)');

const mining = await creditUncreditedMining();
console.log('Mining backfill:', mining);

const forge = await backfillWordForgeGamePoints();
console.log('Word Forge game_points:', forge);

const gameDrift = await fixGamePointsDrift();
console.log('Game points total drift:', gameDrift);

const totals = await fixTotalMismatches();
console.log('Total mismatches:', totals);

console.log('Done.');
