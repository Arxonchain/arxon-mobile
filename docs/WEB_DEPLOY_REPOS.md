# Web deploy repos

Leaderboard and other **arxonchain.xyz** web UI changes do **not** ship from this repo.

| Surface | Repo | Deploy target |
|---------|------|---------------|
| **Web** (arxonchain.xyz, www) | [Arxonchain/arxon-miner-hub](https://github.com/Arxonchain/arxon-miner-hub) | Vercel (auto on push to default branch) |
| **Mobile OTA** (Capacitor shell) | `arxon-mobile` | Cloudflare Pages (`arxon-mobile.pages.dev`) via GitHub Actions `deploy-web` |
| **Play Store AAB** | `arxon-mobile` | Internal / production build |

Both repos talk to the **same Supabase project**. Global mining leaderboard must read `user_points.total_points` only (via `fetchGlobalLeaderboard`); do not merge `arena_team_leaderboard` stake/profit into mining totals.

## Leaderboard fix (2026-09)

- **Bug:** `useLeaderboard` in miner-hub merged `arena_team_leaderboard.total_staked + net_profit` onto mining points → inflated web numbers vs mobile.
- **Fix:** Shared `fetchGlobalLeaderboard` queries `user_points.total_points`, falls back to `leaderboard_view.total_points`. Cache key `arxon:leaderboard:miners:v8`.
- **DB:** `leaderboard_view` already selects `up.total_points` from `user_points` — no migration required when DB is shared.

## After changing miner-hub

1. Push to `Arxonchain/arxon-miner-hub` — Vercel redeploys arxonchain.xyz.
2. Hard-refresh or clear site data if stale v6 cache persists locally.
