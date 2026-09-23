# Full-app maintenance mode

When Supabase or core services are unstable and users cannot reliably sign in or mine, enable:

```env
VITE_APP_MAINTENANCE=true
```

## User experience

- Opening the app (mobile OTA or web) shows a **single maintenance screen** — no login, sign-up, or mining UI.
- Copy explains the pause is temporary, the team is fixing the platform, and users will get an **in-app announcement and notification** when service returns.

## Mobile (OTA / Capacitor)

GitHub Actions **Deploy Web** sets `VITE_APP_MAINTENANCE=true` alongside V2 games build flags.

Confirm live: `https://arxon-mobile.pages.dev/web-bundle-version.json` → `"appMaintenance": true`.

Users should **force-close and reopen** the Play app after deploy.

## Web (arxonchain.xyz / arxon-miner-hub)

Set `VITE_APP_MAINTENANCE=true` in **Cloudflare Pages** (or your host) environment variables, then trigger a **production rebuild**.

## Resume normal service

1. Confirm Supabase health (auth, REST, realtime).
2. Set `VITE_APP_MAINTENANCE=false` or remove it in deploy workflow / host env.
3. Redeploy OTA and web; publish announcement + push as usual.

## Relation to games-only maintenance

| Flag | Effect |
|------|--------|
| `VITE_GAMES_MAINTENANCE=true` | Dice + Word Forge only; mining/arena stay on |
| `VITE_APP_MAINTENANCE=true` | **Entire app** blocked (takes precedence at app root) |

When full-app maintenance is on, games maintenance is irrelevant until you turn full-app maintenance off.
