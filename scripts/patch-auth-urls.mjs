#!/usr/bin/env node
/**
 * Patch Auth Site URL + redirect allowlist (no Resend key required).
 * Also forces mailer_autoconfirm=false and optionally disables Send Email hook
 * so Custom SMTP alone can deliver mail without 504s.
 *
 * Required: SUPABASE_ACCESS_TOKEN (Dashboard → Account → Access Tokens)
 * Optional: DISABLE_SEND_EMAIL_HOOK=true
 */
const PROJECT_REF = process.env.PROJECT_REF || "oztccmrhiawleucdluwb";
const token = (process.env.SUPABASE_ACCESS_TOKEN || "").trim();
const disableHook =
  String(process.env.DISABLE_SEND_EMAIL_HOOK || "true").toLowerCase() !== "false";

if (!token) {
  console.error("Missing SUPABASE_ACCESS_TOKEN");
  process.exit(1);
}

const api = (path, init = {}) =>
  fetch(`https://api.supabase.com/v1${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(init.headers || {}),
    },
  });

const requiredRedirects = [
  "https://arxonchain.xyz/**",
  "https://www.arxonchain.xyz/**",
  "https://arxon-mobile.pages.dev/**",
  "https://arxonchain.xyz/auth/confirm",
  "https://www.arxonchain.xyz/auth/confirm",
  "https://arxon-mobile.pages.dev/auth/confirm",
  "https://arxonchain.xyz/reset-password",
  "https://arxon-mobile.pages.dev/reset-password",
  "http://localhost:5173/**",
  "http://localhost:8080/**",
];

async function main() {
  const getRes = await api(`/projects/${PROJECT_REF}/config/auth`);
  const current = await getRes.json().catch(() => ({}));
  if (!getRes.ok) {
    console.error("GET auth config failed", getRes.status, current);
    process.exit(1);
  }

  const existingRedirects = String(current.uri_allow_list || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  const uriAllowList = Array.from(new Set([...existingRedirects, ...requiredRedirects])).join(",");

  const patchBody = {
    site_url: "https://arxonchain.xyz",
    uri_allow_list: uriAllowList,
    mailer_autoconfirm: false,
    external_email_enabled: true,
    mailer_secure_email_change_enabled: true,
  };

  if (disableHook) {
    // Prefer Custom SMTP (Resend) over a flaky Send Email hook that 504s signup.
    patchBody.hook_send_email_enabled = false;
  }

  const patchRes = await api(`/projects/${PROJECT_REF}/config/auth`, {
    method: "PATCH",
    body: JSON.stringify(patchBody),
  });
  const patched = await patchRes.json().catch(() => ({}));
  if (!patchRes.ok) {
    console.error("PATCH auth config failed", patchRes.status, patched);
    process.exit(1);
  }

  console.log("Updated auth config:");
  console.log({
    site_url: patched.site_url,
    mailer_autoconfirm: patched.mailer_autoconfirm,
    external_email_enabled: patched.external_email_enabled,
    hook_send_email_enabled: patched.hook_send_email_enabled,
    smtp_host: patched.smtp_host,
    uri_allow_list: patched.uri_allow_list,
  });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
