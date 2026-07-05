# Depth Watch — local phone testing (NOT public OTA)

The game is **hidden from production** unless `VITE_DEPTH_WATCH_ENABLED=true` at build time.
Default production builds leave the flag off — nothing ships to Cloudflare users.

## 1. Run Supabase SQL (once)

Execute `DEPTH_WATCH.sql` in the Supabase SQL Editor (scores + character unlocks).

## 2. Test in browser (fastest)

```powershell
npm run dev:depth-watch
```

Open the app, log in, tap **Depth Watch** on the dashboard (BETA badge).

## 3. Test on Android (local bundle — no OTA)

```powershell
npm run build:depth-watch
$env:CAPACITOR_BUNDLE_LOCAL = "true"
npx cap sync android
```

Open `android/` in Android Studio → Run on your device.

This bundles `dist/` into the APK. The app will **not** load from arxon-mobile.pages.dev until you rebuild without `CAPACITOR_BUNDLE_LOCAL`.

## 4. Before going public

- [ ] Playtest sectors 1–10 on a real phone
- [ ] Prep sprites (remove white backgrounds, 512×512 PNG) — see `02-ASSET-MAP.md`
- [ ] Remove `BETA` badge / tune difficulty
- [ ] Push to `main` **without** `--mode depth-watch` OR add `VITE_DEPTH_WATCH_ENABLED=true` to Cloudflare env when ready

**Do not push depth-watch builds to GitHub until you approve public release.**
