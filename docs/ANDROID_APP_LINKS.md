# Auth deep links (best-effort) + browser confirm

Email confirm / password-reset links are **branded https** (`https://arxonchain.xyz/auth/confirm…`).  
The **browser SPA is the primary** handler. Opening inside the Play app is best-effort only.

## Important: do not break OTA

Capacitor `server.url` must stay **`https://arxon-mobile.pages.dev`**.

- Never add `android:autoVerify` App Links for the OTA host (`arxon-mobile.pages.dev`).
- Verified App Links / domain verification must not interfere with WebView boot.
- `net::ERR_NAME_NOT_RESOLVED` on pages.dev is **device/network DNS** (Private DNS / VPN), not classic-vs-V2 content. Workaround: Private DNS Off, disable VPN, try Wi‑Fi or `8.8.8.8`.

## Native (v16+)

`AndroidManifest` has a plain `VIEW`/`BROWSABLE` intent filter for:

| Host | Paths |
|------|--------|
| `arxonchain.xyz` / `www.arxonchain.xyz` | `/auth/confirm`, `/reset-password` |

**No `android:autoVerify`.** Users may see an open-with chooser; browser always works.

JS: `AppDeepLinkListener` handles `appUrlOpen` / launch URL for auth + Dice invites after the WebView has loaded.

## assetlinks.json (optional / hub)

Still published for tooling:

- https://arxonchain.xyz/.well-known/assetlinks.json
- https://arxon-mobile.pages.dev/.well-known/assetlinks.json

Package: `xyz.arxonchain.app`

Play App Signing SHA-256 should be in those files if you later re-enable verified App Links.

## Email links

Keep branded https confirm URLs on `arxonchain.xyz`. Do not put `*.supabase.co` verify URLs in templates. See `docs/SUPABASE_RESEND_SMTP.md`.
