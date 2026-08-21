#!/usr/bin/env node
/**
 * Apply arena notifications migration + deploy edge functions.
 * Requires SUPABASE_ACCESS_TOKEN (Dashboard → Account → Access Tokens).
 *
 * Full guide: docs/DEPLOY_ARENA_NOTIFICATIONS.md
 *
 * Usage:
 *   $env:SUPABASE_ACCESS_TOKEN="sbp_..."; node scripts/deploy-arena-backend.mjs
 *   node scripts/deploy-arena-backend.mjs --skip-migration
 *   node scripts/deploy-arena-backend.mjs --skip-migration --cli
 *   node scripts/deploy-arena-backend.mjs --api   # force Management API
 *
 * Windows notes:
 *   - Default is Management API (manual multipart; works on Node 24).
 *   - `npx supabase` has no win32-x64 binary — do not rely on it.
 *   - Prefer scoop: `scoop install supabase` → C:\Users\adega\scoop\shims\supabase.exe
 *   - Or set SUPABASE_CLI to a local supabase.exe path.
 */
import fs from 'node:fs';
import path from 'node:path';
import { randomBytes } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const PROJECT_REF = 'oztccmrhiawleucdluwb';
const API = `https://api.supabase.com/v1/projects/${PROJECT_REF}`;
const IS_WIN = process.platform === 'win32';

const FORCE_CLI = process.argv.includes('--cli');
const FORCE_API = process.argv.includes('--api');
const SKIP_MIGRATION = process.argv.includes('--skip-migration');

const WINDOWS_CLI_CANDIDATES = [
  String.raw`C:\Users\adega\scoop\shims\supabase.exe`,
  String.raw`C:\supabase\supabase.exe`,
];

function read(file) {
  return fs.readFileSync(path.join(ROOT, file), 'utf8');
}

function requireToken() {
  const token = process.env.SUPABASE_ACCESS_TOKEN;
  if (!token) throw new Error('Set SUPABASE_ACCESS_TOKEN (sbp_...)');
  return token;
}

function fileExists(p) {
  try {
    return Boolean(p) && fs.existsSync(p) && fs.statSync(p).isFile();
  } catch {
    return false;
  }
}

function whichSupabase() {
  const cmd = IS_WIN ? 'where' : 'which';
  const result = spawnSync(cmd, ['supabase'], {
    encoding: 'utf8',
    shell: IS_WIN,
  });
  if (result.status !== 0) return null;
  const line = (result.stdout || '')
    .split(/\r?\n/)
    .map((s) => s.trim())
    .find(Boolean);
  return line && fileExists(line) ? line : null;
}

/**
 * Resolve a real supabase binary. Never use `npx supabase` on Windows —
 * the npm package has no win32-x64 binary.
 *
 * Order: SUPABASE_CLI → PATH → common install paths → (non-Windows only) npx.
 */
function resolveSupabaseCli() {
  const fromEnv = process.env.SUPABASE_CLI?.trim();
  if (fromEnv) {
    if (!fileExists(fromEnv)) {
      throw new Error(
        `SUPABASE_CLI is set to "${fromEnv}" but that file does not exist.`,
      );
    }
    return { mode: 'binary', path: fromEnv };
  }

  const fromPath = whichSupabase();
  if (fromPath) return { mode: 'binary', path: fromPath };

  if (IS_WIN) {
    for (const candidate of WINDOWS_CLI_CANDIDATES) {
      if (fileExists(candidate)) return { mode: 'binary', path: candidate };
    }
    return null;
  }

  return { mode: 'npx' };
}

function windowsCliInstallHint() {
  return [
    'No local Supabase CLI binary found for Windows.',
    'npx supabase cannot be used: the package has no win32-x64 binary.',
    '',
    'Install via scoop, then retry:',
    '  scoop bucket add supabase https://github.com/supabase/scoop-bucket.git',
    '  scoop install supabase',
    '',
    'Or point at an existing binary:',
    '  $env:SUPABASE_CLI = "C:\\Users\\adega\\scoop\\shims\\supabase.exe"',
    '',
    'Or deploy without CLI (Management API):',
    '  node scripts/deploy-arena-backend.mjs --skip-migration',
    '  # or explicitly: node scripts/deploy-arena-backend.mjs --skip-migration --api',
  ].join('\n');
}

/**
 * Bundle sources for Management API deploy.
 * Entrypoint is always basename `index.ts`. Shared imports use `../_shared/...`
 * in source, so uploaded part names must match those relative paths.
 */
function bundleFunction(slug, extraFiles = []) {
  const files = [
    {
      name: 'index.ts',
      content: read(`supabase/functions/${slug}/index.ts`),
    },
  ];
  for (const f of extraFiles) {
    // e.g. _shared/adminAuth.ts -> ../_shared/adminAuth.ts (matches import path)
    const partName = f.startsWith('../') ? f : `../${f}`;
    files.push({
      name: partName,
      content: read(`supabase/functions/${f.replace(/^\.\.\//, '')}`),
    });
  }
  return files;
}

/**
 * Build multipart/form-data manually so Content-Type boundary matches the body.
 * Avoids Node FormData + Blob + fetch "Invalid multipart boundary" on Windows/Node 24.
 */
function buildMultipart(parts) {
  const boundary = `----ArxonBoundary${randomBytes(16).toString('hex')}`;
  const chunks = [];

  for (const part of parts) {
    chunks.push(`--${boundary}\r\n`);
    if (part.filename != null) {
      chunks.push(
        `Content-Disposition: form-data; name="${part.name}"; filename="${part.filename}"\r\n`,
      );
      chunks.push(`Content-Type: ${part.contentType || 'application/octet-stream'}\r\n\r\n`);
    } else {
      chunks.push(`Content-Disposition: form-data; name="${part.name}"\r\n`);
      if (part.contentType) {
        chunks.push(`Content-Type: ${part.contentType}\r\n\r\n`);
      } else {
        chunks.push(`\r\n`);
      }
    }
    chunks.push(part.body);
    chunks.push(`\r\n`);
  }
  chunks.push(`--${boundary}--\r\n`);

  const body = Buffer.concat(
    chunks.map((c) => (typeof c === 'string' ? Buffer.from(c, 'utf8') : c)),
  );
  return {
    body,
    contentType: `multipart/form-data; boundary=${boundary}`,
  };
}

async function mgmtJson(pathname, { method = 'GET', body } = {}) {
  const token = requireToken();
  const res = await fetch(`${API}${pathname}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`${method} ${pathname} ${res.status}: ${text.slice(0, 400)}`);
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

/**
 * Management API expects multipart/form-data:
 *   metadata — JSON { name, entrypoint_path, verify_jwt }
 *   file     — one part per source file (filename = path in bundle)
 * See https://supabase.com/docs/reference/api/v1-deploy-a-function
 *
 * Content-Type MUST include the same boundary used in the body (set via buildMultipart).
 */
async function deployFunctionApi(name, extraFiles = [], verifyJwt = false) {
  const token = requireToken();
  const files = bundleFunction(name, extraFiles);
  console.log(`Deploying ${name} via Management API (${files.length} files, verify_jwt=${verifyJwt})...`);

  const parts = [
    {
      name: 'metadata',
      contentType: 'application/json',
      body: JSON.stringify({
        name,
        entrypoint_path: 'index.ts',
        verify_jwt: verifyJwt,
      }),
    },
  ];
  for (const f of files) {
    parts.push({
      name: 'file',
      filename: f.name,
      contentType: 'application/typescript',
      body: f.content,
    });
  }

  const { body, contentType } = buildMultipart(parts);
  const url = `${API}/functions/deploy?slug=${encodeURIComponent(name)}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': contentType,
    },
    body,
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`POST /functions/deploy ${res.status}: ${text.slice(0, 400)}`);
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function deployFunctionCli(name, verifyJwt = false, cli = resolveSupabaseCli()) {
  if (!cli) {
    throw new Error(windowsCliInstallHint());
  }

  const token = requireToken();
  console.log(
    `Deploying ${name} via Supabase CLI (${cli.mode === 'npx' ? 'npx' : cli.path}, verify_jwt=${verifyJwt})...`,
  );

  let command;
  let args;
  if (cli.mode === 'npx') {
    command = 'npx';
    args = ['supabase', 'functions', 'deploy', name, '--project-ref', PROJECT_REF];
  } else {
    command = cli.path;
    args = ['functions', 'deploy', name, '--project-ref', PROJECT_REF];
  }
  if (!verifyJwt) args.push('--no-verify-jwt');

  const result = spawnSync(command, args, {
    cwd: ROOT,
    stdio: 'inherit',
    env: {
      ...process.env,
      SUPABASE_ACCESS_TOKEN: token,
    },
    shell: IS_WIN && cli.mode === 'npx',
  });
  if (result.error) {
    throw new Error(`CLI deploy failed for ${name}: ${result.error.message}`);
  }
  if (result.status !== 0) {
    if (IS_WIN && cli.mode === 'npx') {
      throw new Error(
        [
          `CLI deploy failed for ${name} (exit ${result.status ?? 'unknown'}).`,
          'On Windows, npx supabase often fails with "No matching Supabase CLI binary package found for win32-x64".',
          windowsCliInstallHint(),
        ].join('\n'),
      );
    }
    throw new Error(`CLI deploy failed for ${name} (exit ${result.status ?? 'unknown'})`);
  }
}

/**
 * Deploy strategy:
 * - --cli  → local binary only (Windows never falls back to broken npx)
 * - --api  → Management API only
 * - default → API first; on failure, retry with local CLI if available
 */
async function deployFunction(name, extraFiles = [], verifyJwt = false) {
  if (FORCE_CLI) {
    const cli = resolveSupabaseCli();
    if (!cli || (IS_WIN && cli.mode === 'npx')) {
      throw new Error(windowsCliInstallHint());
    }
    deployFunctionCli(name, verifyJwt, cli);
    return;
  }

  if (FORCE_API) {
    return deployFunctionApi(name, extraFiles, verifyJwt);
  }

  try {
    return await deployFunctionApi(name, extraFiles, verifyJwt);
  } catch (err) {
    console.warn(`Management API deploy failed for ${name}: ${err.message}`);
    const cli = resolveSupabaseCli();
    if (!cli || (IS_WIN && cli.mode === 'npx')) {
      throw new Error(
        [
          `Management API deploy failed and no usable local Supabase CLI was found.`,
          err.message,
          '',
          windowsCliInstallHint(),
        ].join('\n'),
      );
    }
    console.warn(`Retrying via local Supabase CLI (${cli.path || 'npx'})...`);
    deployFunctionCli(name, verifyJwt, cli);
  }
}

async function applyMigration() {
  const files = [
    'supabase/migrations/20260816201500_arena_notifications.sql',
    'supabase/migrations/20260820120000_arena_new_battle_push.sql',
    'supabase/migrations/20260820143000_fix_arena_create_trigger_hang.sql',
  ];
  for (const file of files) {
    const sql = read(file);
    console.log(`Applying migration SQL via /database/query: ${file}...`);
    try {
      await mgmtJson('/database/query', { method: 'POST', body: { query: sql } });
      console.log(`  OK: ${file}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.warn(`  Management API migration failed for ${file}: ${msg}`);
      console.warn(
        [
          '',
          'Apply this file manually in the Dashboard (no downtime):',
          '  1. Open https://supabase.com/dashboard/project/oztccmrhiawleucdluwb/sql/new',
          `  2. Paste the contents of ${file}`,
          '  3. Click Run',
          '  4. Re-run: node scripts/deploy-arena-backend.mjs --skip-migration --cli',
          '',
        ].join('\n'),
      );
      throw err;
    }
  }
}

const ARENA_FUNCTIONS = [
  ['send-push-notification', ['_shared/adminAuth.ts'], false],
  ['blast-arena-notifications', ['_shared/adminAuth.ts', '_shared/arenaNotifications.ts'], false],
  ['apply-arena-notifications-migration', ['_shared/adminAuth.ts'], false],
  ['notify-arena-battle-ends', ['_shared/adminAuth.ts', '_shared/arenaNotifications.ts'], false],
  ['notify-arena-battle-created', ['_shared/adminAuth.ts', '_shared/arenaNotifications.ts'], false],
  ['resolve-arena-battle', ['_shared/adminAuth.ts', '_shared/arenaNotifications.ts', '_shared/arenaResolveIdempotency.ts'], false],
  ['auto-resolve-battles', ['_shared/adminAuth.ts', '_shared/arenaResolveIdempotency.ts'], false],
  ['arena-ai-prediction', ['_shared/adminAuth.ts'], false],
];

async function main() {
  const cli = resolveSupabaseCli();
  if (FORCE_CLI) {
    if (!cli || (IS_WIN && cli.mode === 'npx')) {
      throw new Error(windowsCliInstallHint());
    }
    console.log(`Using Supabase CLI (--cli): ${cli.path}`);
  } else if (FORCE_API) {
    console.log('Using Management API (--api).');
  } else {
    console.log(
      IS_WIN
        ? 'Windows: preferring Management API multipart deploy (pass --cli to force local supabase.exe).'
        : 'Preferring Management API multipart deploy (falls back to CLI on failure).',
    );
    if (cli?.mode === 'binary') {
      console.log(`Local Supabase CLI available for fallback: ${cli.path}`);
    } else if (IS_WIN) {
      console.log('No local supabase.exe found; API-only unless you install scoop supabase.');
    }
  }

  if (!SKIP_MIGRATION) {
    try {
      await applyMigration();
    } catch (err) {
      if (FORCE_CLI) {
        console.warn(
          'Continuing with CLI function deploy only. Apply migrations in SQL Editor, then you are done after this deploy.',
        );
      } else {
        throw err;
      }
    }
  } else {
    console.log('Skipping migration (--skip-migration).');
  }

  for (const [name, extraFiles, verifyJwt] of ARENA_FUNCTIONS) {
    await deployFunction(name, extraFiles, verifyJwt);
  }

  console.log('Arena backend deploy complete.');
}

main().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});
