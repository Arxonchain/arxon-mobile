# Sentry (errors + session replay) — Arxon mobile / OTA

Sentry captures **JavaScript errors**, **stack traces**, and optional **session replay** (what the user did before a crash). This is separate from **k6** (load testing).

## 1. Create a Sentry account (free tier)

1. Open [https://sentry.io/signup/](https://sentry.io/signup/) and sign up (GitHub login is fine).
2. Choose **Create a project**.
3. Platform: **React**.
4. Alert frequency: **I'll create my own alerts later** (or default).
5. Project name: e.g. `arxon-mobile-ota`.
6. Copy the **DSN** (looks like `https://xxxx@o123456.ingest.us.sentry.io/7654321`). You will **not** need the full onboarding snippet—we already wired the app.

### Is the free plan enough?

Sentry’s **Developer (free)** plan is usually enough to start:

- **Errors**: thousands of events per month (enough for a growing app if you fix recurring bugs).
- **Session Replay**: limited replay minutes/month; we sample normal sessions and **record 100% when an error happens** to stay within quota.
- **Performance tracing**: small quota on free; can disable or lower sample rate.

Check current limits: [https://sentry.io/pricing/](https://sentry.io/pricing/). Upgrade only if you hit quotas or need longer replay retention.

## 2. Local `.env`

Add to `.env` / `.env.local` (never commit the DSN to a public repo if you treat it as sensitive—it’s client-visible in the bundle anyway):

```env
VITE_SENTRY_DSN=https://YOUR_KEY@oYOUR_ORG.ingest.sentry.io/YOUR_PROJECT_ID
# Optional: 0.0–1.0, default 0.1 in production
# VITE_SENTRY_REPLAY_SAMPLE_RATE=0.1
```

Restart `npm run dev` after changing env.

Without `VITE_SENTRY_DSN`, Sentry stays **off** (no cost, no events).

## 3. Production / OTA (GitHub Actions)

In **GitHub → repo → Settings → Secrets and variables → Actions**, add:

| Secret | Value |
|--------|--------|
| `VITE_SENTRY_DSN` | Same DSN from the Sentry project |

Redeploy via **Deploy Web** workflow (push to `main` or workflow_dispatch).

Releases are tagged as `arxon-mobile@<git-sha>` matching `web-bundle-version.json`.

## 4. Optional: readable stack traces (source maps)

1. Sentry → **Settings → Auth Tokens** → Create token with **Project: Read & Write** and **Release: Admin**.
2. GitHub secrets:

   - `SENTRY_AUTH_TOKEN`
   - `SENTRY_ORG` (slug from Sentry URL, e.g. `my-org`)
   - `SENTRY_PROJECT` (e.g. `arxon-mobile-ota`)

3. Next OTA build uploads source maps automatically when those secrets exist.

## 5. Using the dashboard

- **Issues**: grouped errors with count, users, last seen.
- **Replays**: open an issue → **Replays** tab (if replay was captured).
- **Releases**: filter by `arxon-mobile@<sha>` to match an OTA deploy.

## 6. User identity (support)

After login, the app sets Sentry user to **Supabase user id** only (no email in Sentry by default). Match Discord tickets to issues via user id.

## 7. Privacy

Replay masks text by default. Do not enable `sendDefaultPii` without updating your privacy policy.
