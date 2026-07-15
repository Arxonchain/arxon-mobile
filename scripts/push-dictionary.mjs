/**
 * Pushes the full wordlist into the word_forge_dictionary table using the
 * service-role key from .env (PostgREST upsert, duplicates ignored).
 *
 * Run: node scripts/push-dictionary.mjs
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dir = dirname(fileURLToPath(import.meta.url));

function readEnv() {
  const raw = readFileSync(join(__dir, '../.env'), 'utf8');
  const out = {};
  for (const line of raw.split('\n')) {
    const m = line.match(/^([A-Z_]+)="?([^"\r\n]+)"?/);
    if (m) out[m[1]] = m[2];
  }
  return out;
}

const env = readEnv();
const url = env.VITE_SUPABASE_URL;
const key = env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) throw new Error('Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env');

const wordlist = readFileSync(join(__dir, '../src/features/word-forge/data/wordlist.txt'), 'utf8')
  .split('\n')
  .map((w) => w.trim().toUpperCase())
  .filter((w) => /^[A-Z]{3,10}$/.test(w));

const dictTs = readFileSync(join(__dir, '../src/features/word-forge/data/dictionary.ts'), 'utf8');
const match = dictTs.match(/const RAW = `([\s\S]*?)`/);
const curated = match ? match[1].trim().split(/\s+/).map((w) => w.toUpperCase()) : [];

const words = [...new Set([...wordlist, ...curated])].sort();
console.log(`Pushing ${words.length} words...`);

const BATCH = 5000;
let pushed = 0;
for (let i = 0; i < words.length; i += BATCH) {
  const batch = words.slice(i, i + BATCH).map((word) => ({ word }));
  const res = await fetch(`${url}/rest/v1/word_forge_dictionary?on_conflict=word`, {
    method: 'POST',
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
      Prefer: 'resolution=ignore-duplicates,return=minimal',
    },
    body: JSON.stringify(batch),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Batch ${i / BATCH + 1} failed (${res.status}): ${text}`);
  }
  pushed += batch.length;
  console.log(`  ${pushed}/${words.length}`);
}
console.log('Done.');
