# Deploy Arena Notifications (Mining App)

Fix blocked Arena notification backend on the **Arxon Mining App** Supabase project.

## New battle push (app closed)

When an admin creates a **live** prediction market:

1. DB trigger inserts `arena_new_battle` in-app rows (battle **title**, no UUID).
2. Admin UI calls edge `notify-arena-battle-created` → **FCM broadcast** to all `push_subscriptions`.
3. Cron/schedule on `notify-arena-battle-ends` also processes any pending created pushes (scheduled markets that become live).

Users with OS permission + a registered device get a tray alert **even if the app is closed** — same channel as other Arxon pushes (not the mining local 8h schedule).

**Deploy (after code pull):**

```powershell
$env:SUPABASE_ACCESS_TOKEN = "sbp_..."
# apply new migration + edges (omit --skip-migration once for created_push_at)
node scripts/deploy-arena-backend.mjs --cli
```

**Schedule (Dashboard):** Edge Functions → Schedules → run `notify-arena-battle-ends` every minute (covers end + pending created push).

**Manual test:**

```powershell
# service role in .env — do not paste key in chat
curl.exe -s -X POST "$env:VITE_SUPABASE_URL/functions/v1/notify-arena-battle-created" `
  -H "Authorization: Bearer $env:SUPABASE_SERVICE_ROLE_KEY" `
  -H "apikey: $env:SUPABASE_SERVICE_ROLE_KEY" `
  -H "Content-Type: application/json" `
  -d "{}"
```

---


|             | Mining App (correct)                       | Website (wrong)        |
| ----------- | ------------------------------------------ | ---------------------- |
| Project ref | `oztccmrhiawleucdluwb`                     | `knfpmzjghbjnlnarsivs` |
| URL         | `https://oztccmrhiawleucdluwb.supabase.co` | —                      |


**Symptoms when broken:**

- `send-push-notification` → **401** (service role key mismatch on deployed edge)
- `blast-arena-notifications` → **404** (not deployed)
- Migration `20260816201500_arena_notifications.sql` not applied (no `battle_id` column)
- Deploy script → **403** (PAT scoped to website org, not Mining App)

---

## 1. Create a Supabase Personal Access Token (Mining App org)

1. Open [https://supabase.com/dashboard/account/tokens](https://supabase.com/dashboard/account/tokens) while logged into the account that **owns the Mining App org**.
2. Click **Generate new token**.
3. Name it e.g. `arxon-mining-deploy`.
4. Scope: full account access (or at minimum org/project access that includes `**oztccmrhiawleucdluwb**`).
5. Copy the token — it starts with `sbp_...`.

> **Do not** reuse a token created under the website org. That token can list website projects but returns **403** on Mining App Management API calls.

### Clear any stale token in this shell

```powershell
cd C:\Users\adega\arxon-mobile
Remove-Item Env:SUPABASE_ACCESS_TOKEN -ErrorAction SilentlyContinue
$env:SUPABASE_ACCESS_TOKEN = "sbp_PASTE_MINING_APP_TOKEN_HERE"
```

---

## 2. Verify the token before deploy

### Option A — curl (Management API)

```powershell
curl.exe -s -H "Authorization: Bearer $env:SUPABASE_ACCESS_TOKEN" `
  "https://api.supabase.com/v1/projects/oztccmrhiawleucdluwb"
```

**Success:** JSON with `"id": "oztccmrhiawleucdluwb"` and HTTP 200.

**Failure:** `403` or `"You do not have access to this project"` → wrong account/org token.

### Option B — Supabase CLI (local binary; not `npx` on Windows)

```powershell
supabase projects list
```

**Success:** a row with ref `oztccmrhiawleucdluwb`. On Windows use scoop `supabase.exe`, not `npx supabase`.

### Verify local `.env` points at Mining App

```powershell
Select-String -Path .env -Pattern "VITE_SUPABASE_URL|SUPABASE_SERVICE_ROLE_KEY"
```

Must show `oztccmrhiawleucdluwb`, **not** `knfpmzjghbjnlnarsivs`.

Service role key: Dashboard → **Project Settings → API → `service_role` secret** (Mining App project only).

---

## 3. Run `deploy-arena-backend.mjs`

Applies migration SQL via `/database/query`, then deploys five edge functions.

**Default (all platforms, including Windows):** Management API multipart deploy (manual boundary body; works on Node 24). Falls back to a **local** `supabase` binary if API fails.

**Windows / CLI warning:** `npx supabase` is **broken on win32-x64** (`No matching Supabase CLI binary package found for win32-x64`). Do **not** use `npx supabase`. Install a real binary via scoop, or use the API path below.

```powershell
cd C:\Users\adega\arxon-mobile
$env:SUPABASE_ACCESS_TOKEN = "sbp_PASTE_MINING_APP_TOKEN_HERE"
node scripts/deploy-arena-backend.mjs
```

### Retry after a failed deploy (migration may already be applied)

If you already saw `Applying migration SQL...` succeed, **do not** re-apply SQL — skip migration and deploy functions only:

```powershell
cd C:\Users\adega\arxon-mobile
$env:SUPABASE_ACCESS_TOKEN = "sbp_PASTE_MINING_APP_TOKEN_HERE"
node scripts/deploy-arena-backend.mjs --skip-migration
```

Force Management API only:

```powershell
node scripts/deploy-arena-backend.mjs --skip-migration --api
```

Force local CLI (requires scoop/`SUPABASE_CLI` — never uses broken `npx` on Windows):

```powershell
# Optional if not already on PATH:
# $env:SUPABASE_CLI = "C:\Users\adega\scoop\shims\supabase.exe"
node scripts/deploy-arena-backend.mjs --skip-migration --cli
```

Install scoop supabase (once), then deploy one function manually:

```powershell
scoop bucket add supabase https://github.com/supabase/scoop-bucket.git
scoop install supabase
$env:SUPABASE_ACCESS_TOKEN = "sbp_PASTE_MINING_APP_TOKEN_HERE"
supabase functions deploy send-push-notification --project-ref oztccmrhiawleucdluwb --no-verify-jwt
```

`SUPABASE_ACCESS_TOKEN` must be set in the same PowerShell session; the script passes it through to the local CLI.

### Can I run Supabase CLI in the browser?

**No.** Supabase CLI is **not** available inside the Supabase website. It runs locally in PowerShell (or Terminal) on your PC via a real `supabase.exe` (scoop) — not `npx supabase` on Windows.

**Browser alternative:** Dashboard → **Edge Functions** can edit/deploy some single-file functions in the UI. For this multi-file arena deploy (`index.ts` + `_shared/`*), prefer the PowerShell script above.

### Success output (in order)

```
Skipping migration (--skip-migration).
Windows detected: using Supabase CLI by default ...
Deploying send-push-notification via Supabase CLI (verify_jwt=false)...
Deploying blast-arena-notifications via Supabase CLI (verify_jwt=false)...
Deploying apply-arena-notifications-migration via Supabase CLI (verify_jwt=false)...
Deploying notify-arena-battle-ends via Supabase CLI (verify_jwt=false)...
Deploying resolve-arena-battle via Supabase CLI (verify_jwt=false)...
Arena backend deploy complete.
```

Any line like `POST /database/query 403:` or `POST /functions/deploy 403:` → wrong PAT (step 1).

## `POST /functions/deploy 400: Invalid multipart boundary` → fixed in current `scripts/deploy-arena-backend.mjs` (manual multipart + Windows CLI default). Re-run with `--skip-migration` or `--cli`.

## 4. Verify migration applied

### Dashboard SQL Editor

```sql
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'user_notifications'
  AND column_name IN ('battle_id', 'data');

SELECT proname
FROM pg_proc
WHERE proname IN (
  'blast_arena_battle_notifications',
  'cleanup_arena_battle_notifications',
  'notify_arena_battle_resolved'
);
```

**Success:** `battle_id` (uuid), `data` (jsonb), and all three functions exist.

### PowerShell REST smoke test (service role from `.env`)

```powershell
node -e "
const fs=require('fs');
const env=fs.readFileSync('.env','utf8');
const get=k=>{const m=env.match(new RegExp('^'+k+'=(.+)$','m'));return m?m[1].trim().replace(/^[\"']|[\"']$/g,''):''};
const url=get('VITE_SUPABASE_URL'), key=get('SUPABASE_SERVICE_ROLE_KEY');
fetch(url+'/rest/v1/rpc/blast_arena_battle_notifications',{
  method:'POST',
  headers:{apikey:key,Authorization:'Bearer '+key,'Content-Type':'application/json'},
  body:JSON.stringify({p_battle_id:'00000000-0000-0000-0000-000000000000'})
}).then(r=>r.text()).then(t=>console.log(t.slice(0,200)));
"
```

**Success:** JSON with `"error":"battle_not_resolved"` (RPC exists; fake id is expected).

**Failure:** `"Could not find the function"` → migration not applied; re-run step 3.

---

## 5. Verify edge functions deployed

```powershell
node scripts/probe-arena-edges.mjs
```

**Expected after fix:**


| Function                    | Status  | Body (truncated)                                              |
| --------------------------- | ------- | ------------------------------------------------------------- |
| `send-push-notification`    | **200** | `{"success":true,"sent":0,...}` or `"No subscriptions found"` |
| `blast-arena-notifications` | **200** | `{"ok":true,"battle_id":"...","inApp":{...}}`                 |


**Before fix:** `send-push-notification` **401**, `blast-arena-notifications` **404**.

Manual probe (optional):

```powershell
node scripts/probe-push-auth.mjs
```

All three auth modes (`service_only`, `service+apikey`, `anon_auth`) should return **200**, not 401.

List deployed functions (Management API):

```powershell
curl.exe -s -H "Authorization: Bearer $env:SUPABASE_ACCESS_TOKEN" `
  "https://api.supabase.com/v1/projects/oztccmrhiawleucdluwb/functions" | node -e "let s='';process.stdin.on('data',d=>s+=d);process.stdin.on('end',()=>{const j=JSON.parse(s);(j.functions||j).forEach(f=>console.log(f.slug||f.name));});"
```

Must include: `send-push-notification`, `blast-arena-notifications`, `notify-arena-battle-ends`, `resolve-arena-battle`.

---

## 6. Run blast script (test battle)

Test battle: `7af24605-79b3-4af0-956a-e98cb4681964`

### In-app + push (full blast)

```powershell
node scripts/blast-arena-battle-notifications.mjs 7af24605-79b3-4af0-956a-e98cb4681964
```

### In-app only (no FCM)

```powershell
node scripts/blast-arena-battle-notifications.mjs 7af24605-79b3-4af0-956a-e98cb4681964 --no-push
```

### Expected edge success

```json
{
  "ok": true,
  "battle_id": "7af24605-79b3-4af0-956a-e98cb4681964",
  "inApp": {
    "ok": true,
    "winners": <N>,
    "losers": <N>,
    "resolved_rows": <participants>
  },
  "push": {
    "pushed": <devices that accepted>,
    "attempted": <earnings rows>,
    "errors": []
  }
}
```

Fallback REST path logs `Push summary:` with `devices_sent` (same meaning as `push.pushed`).

Verify no UUIDs in user-visible text:

```powershell
node scripts/verify-arena-notifs.mjs
```

**Success:** `uuid_in_text_count 0`, sample messages contain battle **title** only.

Check subscription count (~1000 expected):

```powershell
node -e "
const fs=require('fs');const e=fs.readFileSync('.env','utf8');
const g=k=>{const m=e.match(new RegExp('^'+k+'=(.+)$','m'));return m?m[1].trim().replace(/^[\"']|[\"']$/g,''):''};
fetch(g('VITE_SUPABASE_URL')+'/rest/v1/push_subscriptions?select=id',{headers:{apikey:g('SUPABASE_SERVICE_ROLE_KEY'),Authorization:'Bearer '+g('SUPABASE_SERVICE_ROLE_KEY'),Prefer:'count=exact'}})
.then(r=>console.log('push_subscriptions:',r.headers.get('content-range')));
"
```

---

## 7. Notification types and message formats

All user-visible text uses the battle **title** in quotes — **never** the battle UUID. The app strips any stray UUIDs via `displayNotificationTitle` / `displayNotificationMessage`.


| Type                    | When                               | Title                  | Message pattern                                                     |
| ----------------------- | ---------------------------------- | ---------------------- | ------------------------------------------------------------------- |
| `arena_new_battle`      | Battle goes active (DB trigger)    | ⚔️ New Arena Battle!   | `A new prediction market is live: "<title>". Stake your ARX-P now!` |
| `arena_battle_end`      | Staking closes (cron every minute) | ⏱️ Battle Closed       | `Staking closed for "<title>". Results coming soon — check Arena!`  |
| `arena_battle_resolved` | Battle resolved                    | 📊 Battle Resolved     | `"<title>" resolved — winner: <side name>.`                         |
| `arena_win`             | Participant won                    | 🏆 Arena Victory!      | `You won "<title>" on <side>. +<amount> ARX-P credited!`            |
| `arena_loss`            | Participant lost                   | 💧 Arena Battle Result | `Your pick lost in "<title>". <stake> ARX-P stake lost.`            |


Push payloads (FCM) use shorter bodies, still title-based:

- Resolved: `"<title>" is settled — winner: <side>.`
- Win: `You won <amount> ARX-P in "<title>"!`
- Loss: `"<title>" — <stake> ARX-P stake was not returned.`

Deep link: `/arena/prediction-market`

---

## 8. App-side checklist

1. **Profile → Notifications** — enable Arena toggles (`arenaLive` for new/end, `arenaResults` for resolved/win/loss).
2. Accept OS notification permission when prompted (Android 13+).
3. **Force-close** the Play app (swipe away from recents), then reopen (Capacitor loads OTA bundle).
4. Confirm OTA is V2 games bundle:

```powershell
npm run verify:ota-v2:live
```

Expect `uiV2: true`, `wordForge: true`, `mode: "v2-games"` at `https://arxon-mobile.pages.dev/web-bundle-version.json`.

If notifications UI is stale, redeploy OTA via GitHub Actions `deploy-web` (not classic CF Git build). See `docs/OTA_V2_LOCK.md`.

---

## 9. Edge secrets (Mining App Dashboard)

**Dashboard → Edge Functions → Secrets** on project `oztccmrhiawleucdluwb`:


| Secret                     | Purpose                          | Verify                                                          |
| -------------------------- | -------------------------------- | --------------------------------------------------------------- |
| `FIREBASE_SERVICE_ACCOUNT` | FCM v1 for Android native tokens | Valid JSON service account for Firebase project `arxon-cb305`   |
| `FIREBASE_PROJECT_ID`      | Optional override                | `arxon-cb305` (default in code)                                 |
| `VAPID_PUBLIC_KEY`         | Web push (Capacitor WebView)     | Must match app constant in `src/hooks/usePushNotifications.tsx` |
| `VAPID_PRIVATE_KEY`        | Web push signing                 | Pair of public key above                                        |


VAPID public key embedded in app:

```
BH83wzlnSpDzR3jxVWOmlPVnSWMxzKy6XABCoR5BThesZTX3Lkt_cJZmze_gDsReh5_IeBXIjb-ijbluwf0I2_w
```

Supabase auto-injects `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` into edge runtime — do not paste the website project's service role key.

After changing secrets, redeploy affected functions (step 3) or use Dashboard **Redeploy**.

---

## 10. Troubleshooting

### 403 on `deploy-arena-backend.mjs`


| Cause                                         | Fix                                                                    |
| --------------------------------------------- | ---------------------------------------------------------------------- |
| PAT from website org / wrong Supabase account | Create new token under Mining App owner (step 1)                       |
| Token expired or revoked                      | Regenerate at Account → Access Tokens                                  |
| Wrong project ref in script                   | Script hardcodes `oztccmrhiawleucdluwb` — do not change to website ref |


### 400 `Invalid multipart boundary` on `/functions/deploy`


| Cause                                                                      | Fix                                                                                                                                                     |
| -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Node `FormData` + `fetch` broke the multipart boundary (common on Windows) | Use latest script (manual multipart body + correct `Content-Type` boundary). Default path is Management API.                                            |
| Retry after migration already applied                                      | `node scripts/deploy-arena-backend.mjs --skip-migration`                                                                                                |
| Prefer local CLI (Windows: scoop, not `npx`)                               | `node scripts/deploy-arena-backend.mjs --skip-migration --cli` or `supabase functions deploy <name> --project-ref oztccmrhiawleucdluwb --no-verify-jwt` |


### `No matching Supabase CLI binary package found for win32-x64`


| Cause                                | Fix                                                                                                                  |
| ------------------------------------ | -------------------------------------------------------------------------------------------------------------------- |
| `npx supabase` has no Windows binary | Do not use `npx`. Install scoop supabase, set `$env:SUPABASE_CLI`, or run the script **without** `--cli` (API path). |


### 401 on `send-push-notification`


| Cause                                                          | Fix                                                                                 |
| -------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| `.env` `SUPABASE_SERVICE_ROLE_KEY` is from **website** project | Copy Mining App service_role from Dashboard → API                                   |
| Request missing `apikey` header                                | Scripts send both `Authorization` and `apikey`; match `scripts/probe-push-auth.mjs` |
| Edge `SUPABASE_SERVICE_ROLE_KEY` out of sync                   | Redeploy functions (step 3); Supabase re-injects project keys                       |
| Using anon JWT instead of service role                         | Use service_role key, not publishable/anon key                                      |


### 404 on `blast-arena-notifications`


| Cause                        | Fix                                                |
| ---------------------------- | -------------------------------------------------- |
| Function never deployed      | Run `node scripts/deploy-arena-backend.mjs`        |
| Wrong Supabase URL in `.env` | Must be `https://oztccmrhiawleucdluwb.supabase.co` |


### `devices_sent: 0` / `push.pushed: 0`


| Cause                                | Fix                                                  |
| ------------------------------------ | ---------------------------------------------------- |
| Missing `FIREBASE_SERVICE_ACCOUNT`   | Set edge secret (step 9)                             |
| Invalid/expired FCM tokens           | Normal for stale rows; function prunes bad tokens    |
| User disabled Arena prefs in app     | Enable Arena notifications in Profile settings       |
| No `push_subscriptions` row for user | User must open app, grant permission, stay logged in |
| VAPID mismatch (web push only)       | Align Dashboard `VAPID_PUBLIC_KEY` with app constant |
| Battle not resolved                  | `winner_side` must be set on battle row              |


### In-app rows missing but push works (or vice versa)

- In-app: requires migration + `blast_arena_battle_notifications` RPC.
- Push: requires `send-push-notification` + Firebase/VAPID secrets.
- Run with `--no-push` to isolate in-app path.

### Messages still contain UUIDs

- Re-blast after migration (cleanup + blast): default script runs cleanup.
- Old rows may predate migration; `cleanup_arena_battle_notifications` removes them.

---

## Quick reference commands

```powershell
cd C:\Users\adega\arxon-mobile

# 1. Set Mining App PAT
$env:SUPABASE_ACCESS_TOKEN = "sbp_..."

# 2. Verify PAT
curl.exe -s -H "Authorization: Bearer $env:SUPABASE_ACCESS_TOKEN" `
  "https://api.supabase.com/v1/projects/oztccmrhiawleucdluwb"

# 3. Deploy edge functions (skip migration if first run already applied SQL)
node scripts/deploy-arena-backend.mjs --skip-migration
# or: node scripts/deploy-arena-backend.mjs --skip-migration --cli

# 4. Probe edges
npm run probe:arena-edges
# optional: npm run probe:push-auth

# 5. Blast test battle
node scripts/blast-arena-battle-notifications.mjs 7af24605-79b3-4af0-956a-e98cb4681964

# 6. Verify message quality
npm run verify:arena-notifs

# 7. Confirm live OTA bundle
npm run verify:ota-v2:live
```

