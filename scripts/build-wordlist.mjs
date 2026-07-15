/**
 * Builds the full Word Forge dictionary from the `word-list` package
 * (SCOWL-based standard English word list, ~275k words).
 *
 * Output: src/features/word-forge/data/wordlist.txt — uppercase words,
 * 3-10 letters, A-Z only, one per line. Imported by dictionary.ts via ?raw.
 *
 * Run: node scripts/build-wordlist.mjs
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import wordListPath from 'word-list';

const __dir = dirname(fileURLToPath(import.meta.url));

const words = readFileSync(wordListPath, 'utf8')
  .split('\n')
  .filter((w) => /^[a-z]{3,10}$/.test(w))
  .map((w) => w.toUpperCase());

const unique = [...new Set(words)].sort();
const outPath = join(__dir, '../src/features/word-forge/data/wordlist.txt');
writeFileSync(outPath, unique.join('\n'));

const bytes = unique.join('\n').length;
console.log(`Wrote ${unique.length} words (${(bytes / 1024).toFixed(0)} KB) to ${outPath}`);
