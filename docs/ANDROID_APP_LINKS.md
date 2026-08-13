# Android App Links (auth confirm / password reset)

Verified App Links open branded https email URLs in the Arxon app when installed; otherwise the browser SPA handles `/auth/confirm`.

## Hosts & paths

| Host | Paths |
|------|--------|
| `arxonchain.xyz` / `www.arxonchain.xyz` | `/auth/confirm`, `/reset-password` |
| `arxon-mobile.pages.dev` | `/auth/confirm`, `/reset-password` |

Digital Asset Links:

- https://arxonchain.xyz/.well-known/assetlinks.json
- https://arxon-mobile.pages.dev/.well-known/assetlinks.json

Package: `xyz.arxonchain.app`

## Fingerprints in `assetlinks.json`

### Already included (local debug keystore)

Debug SHA-256 (this machine’s `~/.android/debug.keystore`):

`9C:0F:BB:5B:FC:D3:AA:04:84:E3:06:5B:15:8E:22:57:DB:39:63:98:1E:FA:66:C0:01:48:BB:34:2F:B2:90:17`

Useful for `adb` / local debug installs only. Play Store users are signed by **Play App Signing**, not this debug key.

### Required: Play Console (production)

1. [Google Play Console](https://play.google.com/console) → **Arxon** → **Setup** → **App signing**
2. Under **App signing key certificate**, copy **SHA-256 certificate fingerprint**
3. If you also distribute with an **upload key**, copy its SHA-256 too
4. Add both to `sha256_cert_fingerprints` in:
   - `arxon-mobile/public/.well-known/assetlinks.json`
   - `arxon-miner-hub/public/.well-known/assetlinks.json`
5. Redeploy hub (arxonchain.xyz) + OTA (pages.dev)
6. On a device with the Play build: wait a few minutes, then verify (below)

Without the Play signing SHA-256, App Links **will not auto-verify** for Play installs (users may see an open-with disambiguation or stay in the browser).

### Optional: upload / release keystore on your machine

```bash
keytool -list -v -keystore YOUR_UPLOAD.jks -alias YOUR_ALIAS
```

Copy the `SHA256:` line into `assetlinks.json` (keep colons).

## Native binary

App Links require an AAB/APK that includes the `android:autoVerify` intent filters. OTA alone is not enough for verification, but OTA ships the JS `appUrlOpen` handler + `assetlinks.json` on pages.dev.

After uploading a build that contains the filters, bump `public/app-version.json` → `androidMinBuild` if you want to force users onto that binary.

## Verify

### 1. assetlinks served correctly

```bash
curl -sI "https://arxonchain.xyz/.well-known/assetlinks.json"
curl -s "https://arxonchain.xyz/.well-known/assetlinks.json"
curl -sI "https://arxon-mobile.pages.dev/.well-known/assetlinks.json"
curl -s "https://arxon-mobile.pages.dev/.well-known/assetlinks.json"
```

Expect `200`, `Content-Type: application/json`, no redirect.

### 2. Statement list tester

https://developers.google.com/digital-asset-links/tools/generator  
Package: `xyz.arxonchain.app` — use Play App Signing SHA-256.

### 3. Device (adb)

```bash
adb shell pm get-app-links xyz.arxonchain.app
# Look for arxonchain.xyz / arxon-mobile.pages.dev → verified

adb shell am start -a android.intent.action.VIEW \
  -d "https://arxon-mobile.pages.dev/auth/confirm?token_hash=TEST&type=signup" \
  xyz.arxonchain.app
```

Or open a real signup/reset email link on the phone. App should open on confirm UI; without the app, browser SPA should still confirm.

### 4. Re-check verification after Play fingerprint update

```bash
adb shell pm verify-app-links --re-verify xyz.arxonchain.app
adb shell pm get-app-links xyz.arxonchain.app
```

## iOS follow-up

No `ios/` Associated Domains project is in this repo yet. When adding Universal Links:

1. Apple Developer → App ID → Associated Domains
2. Entitlement: `applinks:arxonchain.xyz`, `applinks:arxon-mobile.pages.dev`
3. Host `apple-app-site-association` (no `.json` extension) on both domains
4. Same Capacitor `appUrlOpen` path already handles auth URLs

## Email links

Keep branded https confirm URLs (`arxonchain.xyz` / `arxon-mobile.pages.dev`). Do not put `*.supabase.co` verify URLs in templates. See `docs/SUPABASE_RESEND_SMTP.md`.
