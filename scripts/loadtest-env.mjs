import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');

function readEnvText() {
  let text = '';
  for (const file of ['.env', '.env.local']) {
    const p = path.join(root, file);
    if (!fs.existsSync(p)) continue;
    text += fs.readFileSync(p, 'utf8') + '\n';
  }
  return text.replace(/^\uFEFF/, '');
}

function getEnv(text, key) {
  const m = text.match(new RegExp(`^${key}=(.+)$`, 'm'));
  return m ? m[1].trim().replace(/^["']|["']$/g, '') : '';
}

const envText = readEnvText();

export const supabaseUrl = (
  getEnv(envText, 'VITE_SUPABASE_URL') ||
  getEnv(envText, 'SUPABASE_URL') ||
  process.env.VITE_SUPABASE_URL ||
  process.env.SUPABASE_URL ||
  ''
).replace(/\/$/, '');

export const anonKey =
  getEnv(envText, 'VITE_SUPABASE_PUBLISHABLE_KEY') ||
  getEnv(envText, 'VITE_SUPABASE_ANON_KEY') ||
  getEnv(envText, 'SUPABASE_ANON_KEY') ||
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  process.env.VITE_SUPABASE_ANON_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  '';

export function requireSupabaseEnv() {
  if (!supabaseUrl || !anonKey) {
    console.error('Need VITE_SUPABASE_URL and publishable/anon key in .env');
    process.exit(1);
  }
}

export function authHeaders(extra = {}) {
  return {
    'Content-Type': 'application/json',
    apikey: anonKey,
    Authorization: `Bearer ${extra.token || anonKey}`,
    ...extra.headers,
  };
}
