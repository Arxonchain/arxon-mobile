import { writeFileSync } from 'node:fs';
import { execSync } from 'node:child_process';

let gitSha = 'local';
try {
  gitSha = execSync('git rev-parse --short HEAD', { encoding: 'utf8' }).trim();
} catch {
  /* not a git repo in CI edge cases */
}

const payload = {
  version: gitSha,
  builtAt: new Date().toISOString(),
};

writeFileSync('public/web-bundle-version.json', `${JSON.stringify(payload, null, 2)}\n`);
console.log('[build] web-bundle-version.json →', payload.version, payload.builtAt);
