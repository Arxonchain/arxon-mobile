#!/usr/bin/env node
/**
 * Generate SEND_EMAIL_HOOK_SECRET and print Mining App setup steps.
 * Does NOT read or use website project keys.
 *
 * Optional: SUPABASE_ACCESS_TOKEN with Mining App Owner privileges can
 * upsert the secret + enable the Auth Send Email hook.
 */
import crypto from "node:crypto";
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

const raw = crypto.randomBytes(32).toString("base64url");
const hookSecret = `v1,whsec_${raw}`;
const fromEmail =
  (process.env.RESEND_FROM_EMAIL || "").trim() ||
  "Arxon <security@arxonchain.xyz>";

console.log("Generated SEND_EMAIL_HOOK_SECRET (save once; not printed again by dashboard):");
console.log(hookSecret);
console.log("");
console.log("Dashboard steps (Mining App only — oztccmrhiawleucdluwb):");
console.log("1) Edge Functions → Secrets:");
console.log("   RESEND_API_KEY     = <Mining App Resend key — already set>");
console.log(`   RESEND_FROM_EMAIL  = ${fromEmail}`);
console.log("   SEND_EMAIL_HOOK_SECRET = <value above>");
console.log("2) Authentication → Hooks → Send Email:");
console.log(
  `   HTTPS URL = https://${PROJECT_REF}.supabase.co/functions/v1/send-email`
);
console.log("   Secret   = same SEND_EMAIL_HOOK_SECRET");
console.log("3) Do NOT paste website/arxon-web Resend keys into Mining App.");

if (!token) {
  console.log("\nNo SUPABASE_ACCESS_TOKEN — skipped API enable.");
  process.exit(0);
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

const secretsRes = await api(`/projects/${PROJECT_REF}/secrets`, {
  method: "POST",
  body: JSON.stringify([
    { name: "SEND_EMAIL_HOOK_SECRET", value: hookSecret },
    { name: "RESEND_FROM_EMAIL", value: fromEmail },
  ]),
});
console.log("\nSecrets upsert status:", secretsRes.status);
if (!secretsRes.ok) {
  console.log(await secretsRes.text().then((t) => t.slice(0, 300)));
}

const patchRes = await api(`/projects/${PROJECT_REF}/config/auth`, {
  method: "PATCH",
  body: JSON.stringify({
    hook_send_email_enabled: true,
    hook_send_email_uri: `https://${PROJECT_REF}.supabase.co/functions/v1/send-email`,
    hook_send_email_secrets: hookSecret,
    // Do not touch smtp_pass / website keys.
  }),
});
console.log("Auth hook enable status:", patchRes.status);
if (!patchRes.ok) {
  console.log(await patchRes.text().then((t) => t.slice(0, 300)));
} else {
  const patched = await patchRes.json();
  console.log({
    hook_send_email_enabled: patched.hook_send_email_enabled,
    hook_send_email_uri: patched.hook_send_email_uri,
    smtp_host: patched.smtp_host,
  });
}
