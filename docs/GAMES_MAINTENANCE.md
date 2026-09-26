# Games maintenance mode (Dice + Word Forge)

When Supabase is on **Free / Nano** and you need to **protect CPU and Auth/API quotas**, enable:

```env
VITE_GAMES_MAINTENANCE=true
```

## What stays on

- Home / mining (dashboard)
- Arena **prediction markets** (staking / resolve)
- Wallet, profile, tasks, referrals, leaderboard, notifications

## What shows maintenance

- All `/arena/dice/*` routes
- All `/word-forge/*` and `/games`
- Dice invite links `/d/:code`, `/r/:code`

Users see a full-screen message with **Back to Home** / **Open Arena**.

## OTA deploy

GitHub Actions **Deploy Web** currently sets `VITE_GAMES_MAINTENANCE=false`. Set it to `true` only when Dice / Word Forge must stay off.

Confirm live: `web-bundle-version.json` → `"gamesMaintenance": true`.

## Resume games after upgrade

1. Supabase: upgrade plan / restore capacity.
2. Set `VITE_GAMES_MAINTENANCE=false` (or remove) in deploy workflow / secrets.
3. Redeploy OTA; users force-close and reopen the app.
