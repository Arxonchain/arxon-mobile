# OTA V2 lock (never classic)

Capacitor Play builds load UI from **https://arxon-mobile.pages.dev**.
That host must **always** serve full **V2 UI + games** (same as store AAB).

## Required artifact

| Flag / mode | Value |
|-------------|--------|
| `VITE_ARXON_UI_V2` | `true` |
| `VITE_WORD_FORGE_ENABLED` | `true` |
| Vite mode | `word-forge` |
| Stamp | `web-bundle-version.json` → `uiV2: true`, `wordForge: true`, `mode: "v2-games"` |

Build: `npm run build` (or `build:internal`) — both are locked to word-forge and run `verify:ota-v2`.

## Single production pipeline

| Path | Role |
|------|------|
| **GitHub Actions `deploy-web.yml`** | **Only** production deployer (wrangler `pages deploy`) |
| Cloudflare Pages **Git-connected** builds | **Disabled** by `npm run lock:cf-pages-ota` during deploy (or manually in dashboard) |

If both pipelines are active, a classic CF Git build can race and overwrite a good Actions deploy. That is the usual reason OTA “flips” back to mining-only / blank V2.

### Cloudflare dashboard (manual backup)

Workers & Pages → **arxon-mobile** → Settings:

1. **Builds** → turn off automatic production deployments from Git (or disconnect Git).
2. If Git builds must stay: Build command = `npm ci && npm run build && npm run verify:ota-v2`, output `dist`.
3. Production env vars: `VITE_ARXON_UI_V2=true`, `VITE_WORD_FORGE_ENABLED=true`.

## CI guards

- `deploy-web.yml` — build → verify → deploy → **live** `verify:ota-v2:live` (fails job if pages.dev is classic).
- `guard-ota-v2.yml` — on every push/PR to main: production build + assert `package.json` / env locks.

## Local checks

```bash
npm run build
npm run verify:ota-v2
npm run verify:ota-v2:live
```

After a successful deploy: force-close and reopen the Play app.
