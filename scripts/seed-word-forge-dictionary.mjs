/**
 * Generates SQL to seed word_forge_dictionary from the full client wordlist
 * (src/features/word-forge/data/wordlist.txt — built by build-wordlist.mjs)
 * plus the curated words embedded in dictionary.ts.
 *
 * Run: node scripts/seed-word-forge-dictionary.mjs
 * Output: supabase/seed-word-forge-dictionary.sql (batched INSERTs)
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dir = dirname(fileURLToPath(import.meta.url));

const wordlist = readFileSync(join(__dir, '../src/features/word-forge/data/wordlist.txt'), 'utf8')
  .split('\n')
  .map((w) => w.trim().toUpperCase())
  .filter((w) => /^[A-Z]{3,10}$/.test(w));

const dictTs = readFileSync(join(__dir, '../src/features/word-forge/data/dictionary.ts'), 'utf8');
const match = dictTs.match(/const RAW = `([\s\S]*?)`/);
const curated = match ? match[1].trim().split(/\s+/).map((w) => w.toUpperCase()) : [];

const words = [...new Set([...wordlist, ...curated])].sort();

const BATCH = 10000;
const chunks = [];
for (let i = 0; i < words.length; i += BATCH) {
  const values = words.slice(i, i + BATCH).map((w) => `('${w}')`).join(',');
  chunks.push(`INSERT INTO public.word_forge_dictionary (word) VALUES ${values} ON CONFLICT (word) DO NOTHING;`);
}

const sql = `-- Seed ${words.length} words (full standard English, 3-10 letters)\n${chunks.join('\n')}\n`;
writeFileSync(join(__dir, '../supabase/seed-word-forge-dictionary.sql'), sql);
console.log(`Wrote ${words.length} words in ${chunks.length} batches to supabase/seed-word-forge-dictionary.sql`);
