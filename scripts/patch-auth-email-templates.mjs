#!/usr/bin/env node
/**
 * Patch Auth email templates to branded /auth/confirm?token_hash&type links
 * (never expose *.supabase.co/auth/v1/verify in the email body).
 *
 * Also refreshes Site URL + redirect allowlist.
 *
 * Required: SUPABASE_ACCESS_TOKEN (or .deploy/_mgmt_token.tmp)
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const PROJECT_REF = process.env.PROJECT_REF || "oztccmrhiawleucdluwb";
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const tokenFromFile = (() => {
  try {
    return fs
      .readFileSync(path.join(__dirname, "..", ".deploy", "_mgmt_token.tmp"), "utf8")
      .trim();
  } catch {
    return "";
  }
})();
const token = (process.env.SUPABASE_ACCESS_TOKEN || tokenFromFile || "").trim();

if (!token) {
  console.error("Missing SUPABASE_ACCESS_TOKEN (or .deploy/_mgmt_token.tmp)");
  process.exit(1);
}

const api = (p, init = {}) =>
  fetch(`https://api.supabase.com/v1${p}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(init.headers || {}),
    },
  });

/** Prefer RedirectTo (mobile pages.dev vs web), else SiteURL/auth/confirm. */
function brandedConfirmHref(type) {
  return `{{ if .RedirectTo }}{{ .RedirectTo }}?token_hash={{ .TokenHash }}&amp;type=${type}{{ else }}{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&amp;type=${type}{{ end }}`;
}

const confirmationHtml = `<h2>Confirm your email</h2>
<p>Follow the link below to confirm this email address and finish signing up for Arxon.</p>
<p><a href="${brandedConfirmHref("signup")}">Confirm email address</a></p>
<p style="color:#666;font-size:13px">If you did not create an Arxon account, you can ignore this email.</p>`;

const recoveryHtml = `<h2>Reset your password</h2>
<p>We received a request to reset your Arxon password. Follow the link below to choose a new one.</p>
<p><a href="${brandedConfirmHref("recovery")}">Reset password</a></p>
<p style="color:#666;font-size:13px">If you didn't request this, you can safely ignore this email.</p>`;

const magicLinkHtml = `<h2>Your sign-in link</h2>
<p>Follow the link below to sign in to Arxon. This link expires shortly and can only be used once.</p>
<p><a href="${brandedConfirmHref("magiclink")}">Sign in</a></p>`;

const inviteHtml = `<h2>You're invited to Arxon</h2>
<p>Follow the link below to accept your invitation and create your account.</p>
<p><a href="${brandedConfirmHref("invite")}">Accept invitation</a></p>`;

const emailChangeHtml = `<h2>Confirm your new email address</h2>
<p>Follow the link below to confirm {{ .NewEmail }} as your new email address.</p>
<p><a href="${brandedConfirmHref("email_change")}">Confirm new email address</a></p>
<p style="color:#666;font-size:13px">If you didn't request this change, you can safely ignore this email.</p>`;

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
    // Keep Send Email hook off unless explicitly enabled elsewhere — Custom SMTP + templates.
    hook_send_email_enabled: false,
    mailer_subjects_confirmation: "Confirm your Arxon account",
    mailer_templates_confirmation_content: confirmationHtml,
    mailer_subjects_recovery: "Reset your Arxon password",
    mailer_templates_recovery_content: recoveryHtml,
    mailer_subjects_magic_link: "Your Arxon sign-in link",
    mailer_templates_magic_link_content: magicLinkHtml,
    mailer_subjects_invite: "You're invited to Arxon",
    mailer_templates_invite_content: inviteHtml,
    mailer_subjects_email_change: "Confirm your new Arxon email",
    mailer_templates_email_change_content: emailChangeHtml,
  };

  const patchRes = await api(`/projects/${PROJECT_REF}/config/auth`, {
    method: "PATCH",
    body: JSON.stringify(patchBody),
  });
  const patched = await patchRes.json().catch(() => ({}));
  if (!patchRes.ok) {
    console.error("PATCH auth config failed", patchRes.status, patched);
    process.exit(1);
  }

  const confirmSnippet = String(patched.mailer_templates_confirmation_content || "").slice(0, 220);
  const recoverySnippet = String(patched.mailer_templates_recovery_content || "").slice(0, 220);
  const hasSupabaseVerify =
    /supabase\.co\/auth\/v1\/verify/.test(confirmSnippet) ||
    /\{\{\s*\.ConfirmationURL\s*\}\}/.test(confirmSnippet);

  console.log("Updated auth email templates + allowlist:");
  console.log({
    site_url: patched.site_url,
    hook_send_email_enabled: patched.hook_send_email_enabled,
    mailer_autoconfirm: patched.mailer_autoconfirm,
    uri_allow_list: patched.uri_allow_list,
    confirmation_uses_token_hash: /TokenHash/.test(confirmSnippet),
    confirmation_exposes_supabase_verify: hasSupabaseVerify,
    confirmation_snippet: confirmSnippet,
    recovery_snippet: recoverySnippet,
  });

  if (hasSupabaseVerify) {
    console.error("WARNING: confirmation template still looks like default ConfirmationURL / verify");
    process.exit(2);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
