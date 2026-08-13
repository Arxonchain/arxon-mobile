# Supabase Auth email (Resend SMTP)

Signup, password reset, and magic-link emails are sent by **Supabase Auth** using **Custom SMTP** (Resend). The app code only sets `emailRedirectTo` / `redirectTo` to `https://arxonchain.xyz/auth/confirm` via `getPublicSiteOrigin()`.

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

### 3. Email templates

**Authentication → Email Templates** — confirm signup & reset password templates should use `{{ .ConfirmationURL }}` (default). Links will use the `emailRedirectTo` / `redirectTo` values from the client (`/auth/confirm` on `arxonchain.xyz`).

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
