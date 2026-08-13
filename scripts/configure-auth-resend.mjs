#!/usr/bin/env node
/**
 * Configure Arxon Mining App (oztccmrhiawleucdluwb) Auth email delivery via Resend SMTP
 * and optionally enable the send-email Auth Hook.
 *
 * Required env:
 *   SUPABASE_ACCESS_TOKEN  - Personal access token (Owner/Admin)
 *   RESEND_API_KEY         - Resend API key (re_...)
 *
 * Optional env:
 *   RESEND_FROM_EMAIL      - e.g. "Arxon <noreply@your-verified-domain.com>"
 *   SEND_EMAIL_HOOK_SECRET - if set, also enables HTTPS Send Email Hook
 *   PROJECT_REF            - default oztccmrhiawleucdluwb
 *   ENABLE_HOOK=true       - enable send-email hook (requires SEND_EMAIL_HOOK_SECRET)
 */

const PROJECT_REF = process.env.PROJECT_REF || "oztccmrhiawleucdluwb";
const token = (process.env.SUPABASE_ACCESS_TOKEN || "").trim();
const resendKey = (process.env.RESEND_API_KEY || "").trim();
const fromEmail =
  (process.env.RESEND_FROM_EMAIL || "").trim() || "Arxon <onboarding@resend.dev>";
const hookSecret = (process.env.SEND_EMAIL_HOOK_SECRET || "").trim();
const enableHook = String(process.env.ENABLE_HOOK || "").toLowerCase() === "true";

if (!token) {
  console.error("Missing SUPABASE_ACCESS_TOKEN");
  process.exit(1);
}
if (!resendKey) {
  console.error("Missing RESEND_API_KEY");
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

async function main() {
  console.log("Reading current auth config…");
  const getRes = await api(`/projects/${PROJECT_REF}/config/auth`);
  const current = await getRes.json().catch(() => ({}));
  if (!getRes.ok) {
    console.error("GET auth config failed", getRes.status, current);
    process.exit(1);
  }

  const siteUrl = current.site_url || "https://arxonchain.xyz";
  const existingRedirects = String(current.uri_allow_list || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  const requiredRedirects = [
    "https://arxonchain.xyz/**",
    "https://www.arxonchain.xyz/**",
    "https://arxon-mobile.pages.dev/**",
    "https://arxonchain.xyz/auth/confirm",
    "https://www.arxonchain.xyz/auth/confirm",
    "https://arxon-mobile.pages.dev/auth/confirm",
    "http://localhost:5173/**",
    "http://localhost:8080/**",
  ];

  const uriAllowList = Array.from(new Set([...existingRedirects, ...requiredRedirects])).join(",");

  // Prefer Resend SMTP — restores Auth mail for signup/recover/OTP without a hook.
  // Port 465 = SMTPS (Resend recommended).
  const smtpAdmin = fromEmail.includes("<")
    ? fromEmail.replace(/^.*<([^>]+)>.*$/, "$1")
    : fromEmail;

  const patchBody = {
    external_email_enabled: true,
    mailer_autoconfirm: false,
    mailer_secure_email_change_enabled: true,
    smtp_admin_email: smtpAdmin,
    smtp_host: "smtp.resend.com",
    smtp_port: "465",
    smtp_user: "resend",
    smtp_pass: resendKey,
    smtp_sender_name: "Arxon",
    site_url: siteUrl.includes("arxon") ? siteUrl : "https://arxonchain.xyz",
    uri_allow_list: uriAllowList,
    // Raise email rate limit above default custom-SMTP 30/hr when field is supported
    rate_limit_email_sent: 100,
  };

  if (enableHook && hookSecret) {
    patchBody.hook_send_email_enabled = true;
    patchBody.hook_send_email_uri =
      `https://${PROJECT_REF}.supabase.co/functions/v1/send-email`;
    patchBody.hook_send_email_secrets = hookSecret.startsWith("v1,")
      ? hookSecret
      : `v1,whsec_${hookSecret}`;
  }

  console.log("Patching auth config (Resend SMTP + redirect allowlist)…");
  const patchRes = await api(`/projects/${PROJECT_REF}/config/auth`, {
    method: "PATCH",
    body: JSON.stringify(patchBody),
  });
  const patched = await patchRes.json().catch(() => ({}));
  if (!patchRes.ok) {
    console.error("PATCH auth config failed", patchRes.status, patched);
    process.exit(1);
  }

  console.log("Auth config updated:");
  console.log({
    site_url: patched.site_url,
    smtp_host: patched.smtp_host,
    smtp_port: patched.smtp_port,
    smtp_admin_email: patched.smtp_admin_email,
    smtp_sender_name: patched.smtp_sender_name,
    mailer_autoconfirm: patched.mailer_autoconfirm,
    external_email_enabled: patched.external_email_enabled,
    hook_send_email_enabled: patched.hook_send_email_enabled,
    uri_allow_list: patched.uri_allow_list,
  });

  // Best-effort: set edge secrets for send-email hook / other mail functions
  console.log("Setting edge function secrets (RESEND_*)…");
  const secretsBody = [
    { name: "RESEND_API_KEY", value: resendKey },
    { name: "RESEND_FROM_EMAIL", value: fromEmail },
  ];
  if (hookSecret) {
    secretsBody.push({
      name: "SEND_EMAIL_HOOK_SECRET",
      value: hookSecret.startsWith("v1,") ? hookSecret : `v1,whsec_${hookSecret}`,
    });
  }

  const secRes = await api(`/projects/${PROJECT_REF}/secrets`, {
    method: "POST",
    body: JSON.stringify(secretsBody),
  });
  if (!secRes.ok) {
    const secErr = await secRes.text();
    console.warn("Secrets update warning:", secRes.status, secErr.slice(0, 300));
    console.warn("Set secrets manually if needed: RESEND_API_KEY, RESEND_FROM_EMAIL, SEND_EMAIL_HOOK_SECRET");
  } else {
    console.log("Edge secrets upserted.");
  }

  console.log("\nDone. Test: signup confirm + password reset on arxonchain.xyz and arxon-mobile.pages.dev");
  console.log("Force-close/reopen Play app after OTA if mobile UI changes were deployed.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
