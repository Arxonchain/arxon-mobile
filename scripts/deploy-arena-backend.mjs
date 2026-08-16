#!/usr/bin/env node
/**
 * Apply arena notifications migration + deploy edge functions.
 * Requires SUPABASE_ACCESS_TOKEN (Dashboard → Account → Access Tokens).
 *
 * Usage:
 *   SUPABASE_ACCESS_TOKEN=sbp_... node scripts/deploy-arena-backend.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const PROJECT_REF = 'oztccmrhiawleucdluwb';
const API = `https://api.supabase.com/v1/projects/${PROJECT_REF}`;

function read(file) {
  return fs.readFileSync(path.join(ROOT, file), 'utf8');
}

function bundleFunction(entrypoint, extraFiles = []) {
  const files = [{ name: entrypoint, content: read(`supabase/functions/${entrypoint}`) }];
  for (const f of extraFiles) {
    files.push({ name: f, content: read(`supabase/functions/${f}`) });
  }
  return files;
}

async function mgmt(pathname, { method = 'GET', body } = {}) {
  const token = process.env.SUPABASE_ACCESS_TOKEN;
  if (!token) throw new Error('Set SUPABASE_ACCESS_TOKEN (sbp_...)');
  const res = await fetch(`${API}${pathname}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let data;
  try { data = JSON.parse(text); } catch { data = text; }
  if (!res.ok) throw new Error(`${method} ${pathname} ${res.status}: ${text.slice(0, 400)}`);
  return data;
}

async function deployFunction(name, entrypoint, extraFiles = [], verifyJwt = false) {
  const slug = name;
  const files = bundleFunction(entrypoint, extraFiles);
  console.log(`Deploying ${name} (${files.length} files, verify_jwt=${verifyJwt})...`);
  return mgmt('/functions/deploy', {
    method: 'POST',
    body: {
      slug,
      name,
      entrypoint_path: path.basename(entrypoint),
      verify_jwt: verifyJwt,
      files,
    },
  });
}

async function applyMigration() {
  const sql = read('supabase/migrations/20260816201500_arena_notifications.sql');
  console.log('Applying migration SQL...');
  return mgmt('/database/query', { method: 'POST', body: { query: sql } });
}

async function main() {
  await applyMigration();
  const shared = ['_shared/adminAuth.ts', '_shared/arenaNotifications.ts'];

  await deployFunction('send-push-notification', 'send-push-notification/index.ts', ['_shared/adminAuth.ts'], false);
  await deployFunction('blast-arena-notifications', 'blast-arena-notifications/index.ts', shared, false);
  await deployFunction('apply-arena-notifications-migration', 'apply-arena-notifications-migration/index.ts', [], false);
  await deployFunction('notify-arena-battle-ends', 'notify-arena-battle-ends/index.ts', ['_shared/adminAuth.ts'], false);
  await deployFunction('resolve-arena-battle', 'resolve-arena-battle/index.ts', shared, false);

  console.log('Arena backend deploy complete.');
}

main().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});
