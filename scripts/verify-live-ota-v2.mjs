/**
 * Post-deploy / CI check against the live Capacitor OTA host.
 * Fails if pages.dev is down, classic, or missing V2+games markers.
 */
const ORIGIN = process.env.OTA_ORIGIN || 'https://arxon-mobile.pages.dev';

async function fetchText(path) {
  const res = await fetch(`${ORIGIN}${path}`, { cache: 'no-store' });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} for ${path}`);
  }
  return { res, text: await res.text() };
}

function mustInclude(blob, label, patterns) {
  const ok = patterns.some((p) => (typeof p === 'string' ? blob.includes(p) : p.test(blob)));
  if (!ok) {
    throw new Error(`live bundle missing ${label}`);
  }
}

const versionRes = await fetchText('/web-bundle-version.json');
let version;
try {
  version = JSON.parse(versionRes.text);
} catch {
  throw new Error('web-bundle-version.json is not valid JSON');
}

if (version.uiV2 !== true || version.wordForge !== true || version.mode !== 'v2-games') {
  console.error('[verify-live-ota-v2] FAIL — classic or incomplete stamp:', version);
  process.exit(1);
}

const html = (await fetchText('/')).text;
const scriptMatch = html.match(/src="(\/assets\/index-[^"]+\.js)"/);
if (!scriptMatch) {
  console.error('[verify-live-ota-v2] FAIL — no index JS in HTML');
  process.exit(1);
}

const indexJs = (await fetchText(scriptMatch[1])).text;
// App is code-split; follow a few dynamic imports so we scan the real router chunk.
const importPaths = [...indexJs.matchAll(/import\("\.\/([^"]+\.js)"\)/g)].map((m) => m[1]);
const chunks = [indexJs];
for (const rel of importPaths.slice(0, 8)) {
  try {
    const t = (await fetchText(`/assets/${rel}`)).text;
    chunks.push(t);
    const nested = [...t.matchAll(/import\("\.\/([^"]+\.js)"\)/g)].map((m) => m[1]);
    for (const n of nested.slice(0, 20)) {
      try {
        chunks.push((await fetchText(`/assets/${n}`)).text);
      } catch {
        /* optional chunk */
      }
    }
  } catch {
    /* optional */
  }
}
const blob = chunks.join('\n');

mustInclude(blob, '/games', ['/games']);
mustInclude(blob, 'GamingHub or WordForge', [/GamingHub/, /WordForgePage/, '/word-forge']);
mustInclude(blob, 'Dice', ['DiceHub', '/arena/dice']);
mustInclude(blob, 'ArenaV2', ['ArenaV2']);
mustInclude(blob, 'Mining App Supabase project', ['oztccmrhiawleucdluwb']);
if (blob.includes('knfpmzjghbjnlnarsivs')) {
  throw new Error('live bundle contains forbidden website Supabase project ref');
}

console.log('[verify-live-ota-v2] OK', {
  origin: ORIGIN,
  version: version.version,
  builtAt: version.builtAt,
  uiV2: version.uiV2,
  wordForge: version.wordForge,
  mode: version.mode,
  index: scriptMatch[1],
});
