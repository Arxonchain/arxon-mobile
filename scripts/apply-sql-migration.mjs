#!/usr/bin/env node
/** Apply one migration file via Supabase Management API /database/query */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const PROJECT_REF = 'oztccmrhiawleucdluwb';

function readEnvText() {
  let text = '';
  for (const file of ['.env', '.env.local']) {
    const p = path.join(ROOT, file);
    if (fs.existsSync(p)) text += fs.readFileSync(p, 'utf8') + '\n';
  }
  const tokenPath = path.join(ROOT, '.deploy', '_mgmt_token.tmp');
  if (fs.existsSync(tokenPath)) text += `SUPABASE_ACCESS_TOKEN=${fs.readFileSync(tokenPath, 'utf8').trim()}\n`;
  return text;
}

function getEnv(text, key) {
  const m = text.match(new RegExp(`^${key}=(.+)$`, 'm'));
  return m ? m[1].trim().replace(/^["']|["']$/g, '') : '';
}

const file = process.argv[2];
if (!file) {
  console.error('Usage: node scripts/apply-sql-migration.mjs <migration.sql>');
  process.exit(1);
}

const token = process.env.SUPABASE_ACCESS_TOKEN || getEnv(readEnvText(), 'SUPABASE_ACCESS_TOKEN');
if (!token) {
  console.error('Need SUPABASE_ACCESS_TOKEN in env or .deploy/_mgmt_token.tmp');
  process.exit(1);
}

const sql = fs.readFileSync(path.join(ROOT, file), 'utf8');
console.log(`Applying ${file} (${sql.length} bytes)...`);

const res = await fetch(`https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`, {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ query: sql }),
});

const body = await res.text();
if (!res.ok) {
  console.error(`Failed ${res.status}:`, body.slice(0, 2000));
  process.exit(1);
}

console.log('OK:', body.slice(0, 500));
