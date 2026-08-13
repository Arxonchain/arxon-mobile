/**
 * Ensure Cloudflare Pages project `arxon-mobile` cannot overwrite Actions OTA
 * with a classic Git-connected build.
 *
 * Uses CLOUDFLARE_API_TOKEN + CLOUDFLARE_ACCOUNT_ID.
 * - Disables automatic production (and preview) deployments from Git
 * - Forces production build command / env to V2+games if Git builds remain
 */
const PROJECT = process.env.CF_PAGES_PROJECT || 'arxon-mobile';
const ACCOUNT = (process.env.CLOUDFLARE_ACCOUNT_ID || '').trim();
const TOKEN = (process.env.CLOUDFLARE_API_TOKEN || '').trim();

if (!ACCOUNT || !TOKEN) {
  console.error('[lock-cf-pages] CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN are required');
  process.exit(1);
}

const base = `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT}/pages/projects/${PROJECT}`;
const headers = {
  Authorization: `Bearer ${TOKEN}`,
  'Content-Type': 'application/json',
};

async function api(method, body) {
  const res = await fetch(base, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json();
  if (!json.success) {
    const err = JSON.stringify(json.errors || json, null, 2);
    throw new Error(`${method} failed: ${err}`);
  }
  return json.result;
}

const project = await api('GET');
const source = project.source || null;
const buildConfig = project.build_config || {};

console.log('[lock-cf-pages] current', {
  name: project.name,
  production_branch: project.production_branch,
  build_command: buildConfig.command || buildConfig.build_command,
  destination_dir: buildConfig.destination_dir || buildConfig.build_output_dir,
  has_git_source: Boolean(source),
  production_deployments_enabled: source?.config?.production_deployments_enabled,
  preview_deployment_setting: source?.config?.preview_deployment_setting,
  deployments_enabled: source?.config?.deployments_enabled,
});

const patch = {
  build_config: {
    ...buildConfig,
    // If a Git build ever runs, it must be V2+games + verify (never classic).
    build_command: 'npm ci && npm run build && npm run verify:ota-v2',
    command: 'npm ci && npm run build && npm run verify:ota-v2',
    destination_dir: buildConfig.destination_dir || buildConfig.build_output_dir || 'dist',
    build_output_dir: buildConfig.build_output_dir || buildConfig.destination_dir || 'dist',
  },
  deployment_configs: {
    ...(project.deployment_configs || {}),
    production: {
      ...((project.deployment_configs || {}).production || {}),
      env_vars: {
        ...(((project.deployment_configs || {}).production || {}).env_vars || {}),
        VITE_ARXON_UI_V2: { type: 'plain_text', value: 'true' },
        VITE_WORD_FORGE_ENABLED: { type: 'plain_text', value: 'true' },
      },
    },
  },
};

// Prefer a single pipeline: Actions deploy-web only.
if (source?.config) {
  patch.source = {
    ...source,
    config: {
      ...source.config,
      deployments_enabled: false,
      production_deployments_enabled: false,
      preview_deployment_setting: 'none',
    },
  };
}

const updated = await api('PATCH', patch);
console.log('[lock-cf-pages] updated', {
  build_command:
    updated.build_config?.command ||
    updated.build_config?.build_command ||
    patch.build_config.build_command,
  production_deployments_enabled: updated.source?.config?.production_deployments_enabled,
  preview_deployment_setting: updated.source?.config?.preview_deployment_setting,
  deployments_enabled: updated.source?.config?.deployments_enabled,
});
console.log(
  '[lock-cf-pages] OK — Git auto-deploys disabled (or hardened). Production OTA = Actions deploy-web only.',
);
