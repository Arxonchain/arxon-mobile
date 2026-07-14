/**
 * Generates SQL to seed word_forge_dictionary from client dictionary.
 * Run: node scripts/seed-word-forge-dictionary.mjs > seed.sql
 * Then apply via Supabase SQL editor.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dir = dirname(fileURLToPath(import.meta.url));
const dictPath = join(__dir, '../src/features/word-forge/data/dictionary.ts');
const raw = readFileSync(dictPath, 'utf8');
const match = raw.match(/const RAW = `([\s\S]*?)`/);
if (!match) throw new Error('Could not parse dictionary RAW');
const words = [...new Set(match[1].trim().split(/\s+/).map((w) => w.toUpperCase()))];
const lines = words.map((w) => `('${w}')`).join(',\n');
const sql = `-- Seed ${words.length} words\nINSERT INTO public.word_forge_dictionary (word) VALUES\n${lines}\nON CONFLICT (word) DO NOTHING;\n`;
writeFileSync(join(__dir, '../supabase/seed-word-forge-dictionary.sql'), sql);
console.log(`Wrote ${words.length} words to supabase/seed-word-forge-dictionary.sql`);
