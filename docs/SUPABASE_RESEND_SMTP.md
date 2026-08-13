# Supabase Auth email (Resend SMTP)

Signup, password reset, and magic-link emails are sent by **Supabase Auth** using **Custom SMTP** (Resend). The app code only sets `emailRedirectTo` / `redirectTo` to `https://arxonchain.xyz/auth/confirm` via `getPublicSiteOrigin()`.

**Android App Links:** those same branded https confirm URLs open in the Play app when installed (see `docs/ANDROID_APP_LINKS.md`). Browser SPA remains the fallback.

## Supabase Dashboard checklist

### 1. Custom SMTP (Resend)

**Authentication → Email → SMTP Settings → Enable Custom SMTP**

| Field | Value |
|-------|-------|
| Host | `smtp.resend.com` |
| Port | `465` (SSL) or `587` (TLS) |
| Username | `resend` |
| Password | Your **Resend API key** (`re_…`) |
| Sender email | `noreply@arxonchain.xyz` (or another verified `@arxonchain.xyz` address) |
| Sender name | `ARXON` |

In [Resend](https://resend.com): verify the `arxonchain.xyz` domain and create an API key with send access.

### 2. Site URL & redirect allow list

**Authentication → URL Configuration**

| Setting | Value |
|---------|-------|
| Site URL | `https://arxonchain.xyz` |
| Redirect URLs | `https://arxonchain.xyz/**` |
| | `https://www.arxonchain.xyz/**` |
| | `https://arxon-mobile.pages.dev/**` (Capacitor OTA / mobile) |
| | `https://arxonchain.xyz/auth/confirm` |
| | `https://arxon-mobile.pages.dev/auth/confirm` |
| | `http://localhost:5173/**` (local dev) |

Also run (Owner PAT + Resend key):

```bash
$env:SUPABASE_ACCESS_TOKEN="sbp_..."
$env:RESEND_API_KEY="re_..."
$env:RESEND_FROM_EMAIL="ARXON <noreply@arxonchain.xyz>"
node scripts/configure-auth-resend.mjs
```

### 3. Email templates (branded links — required)

**Authentication → Email Templates** — do **not** use `{{ .ConfirmationURL }}` (that exposes `*.supabase.co/auth/v1/verify`).

Use TokenHash links so the email only shows your app host:

**Confirm sign up** button href:

```html
<a href="{{ if .RedirectTo }}{{ .RedirectTo }}?token_hash={{ .TokenHash }}&type=signup{{ else }}{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=signup{{ end }}">Confirm email address</a>
```

**Reset password** button href:

```html
<a href="{{ if .RedirectTo }}{{ .RedirectTo }}?token_hash={{ .TokenHash }}&type=recovery{{ else }}{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery{{ end }}">Reset password</a>
```

Expected hosts in the email: `arxonchain.xyz` or `arxon-mobile.pages.dev` only.

Or run (Mining App Owner PAT):

```bash
$env:SUPABASE_ACCESS_TOKEN="sbp_..."
node scripts/patch-auth-email-templates.mjs
```

### 3b. Edge Function secret (for auth-signup / auth-recover / send-email)

Dashboard → **Edge Functions → Secrets** on Mining App (`oztccmrhiawleucdluwb`):

| Name | Value |
|------|-------|
| `RESEND_API_KEY` | Mining App Resend API key (not the website project key) |
| `RESEND_FROM_EMAIL` | `Arxon <security@arxonchain.xyz>` (optional) |

Optional Send Email hook (covers GoTrue-native mailers if enabled):

```bash
# Mining App Owner PAT required to auto-enable; otherwise paste secrets in Dashboard
node scripts/enable-send-email-hook.mjs
```

Also set Edge secret `SEND_EMAIL_HOOK_SECRET` and point Auth → Hooks → Send Email at:
`https://oztccmrhiawleucdluwb.supabase.co/functions/v1/send-email`

Auth **Custom SMTP** password and Edge `RESEND_API_KEY` are separate settings — both should use the **Mining App** Resend key, never the website/arxon-web key.

### 4. Confirm email enabled

**Authentication → Providers → Email** — keep **Confirm email** enabled so new users must verify via Resend.

### 5. Edge function secret (optional)

If deploying the `auth-signup` edge function, set:

```
PUBLIC_SITE_URL=https://arxonchain.xyz
```

## Frontend env (Cloudflare Pages / Vercel)

```
VITE_PUBLIC_SITE_URL=https://arxonchain.xyz
```

This ensures auth email links always point at production, even when testing from `*.pages.dev` preview URLs.

## What changed in code

- Removed the `auth-signup` **admin auto-confirm fallback** from client signup — it skipped confirmation emails.
- `getPublicSiteOrigin()` forces `https://arxonchain.xyz` for email redirect links.
- `auth-signup` edge function now uses the standard `/auth/v1/signup` path (sends email via Resend) instead of admin `email_confirm: true`.
