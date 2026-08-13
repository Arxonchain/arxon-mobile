import { Webhook } from "npm:standardwebhooks@1.0.0";

/**
 * Supabase Auth "Send Email" hook → Resend API.
 *
 * Critical:
 * - Links go to the app `/auth/confirm?token_hash&type` (JS verifyOtp).
 *   Do NOT use GET `/auth/v1/verify` — mail scanners / prefetch can auto-login.
 * - Keep cold starts fast (npm: import, short Resend timeout) so Auth's ~10s hook budget is met.
 *
 * Secrets: RESEND_API_KEY, SEND_EMAIL_HOOK_SECRET
 * Optional: RESEND_FROM_EMAIL
 */

type EmailActionType =
  | "signup"
  | "invite"
  | "magiclink"
  | "recovery"
  | "email_change"
  | "email"
  | "reauthentication"
  | string;

type HookPayload = {
  user: { email?: string };
  email_data: {
    token?: string;
    token_hash?: string;
    redirect_to?: string;
    email_action_type?: EmailActionType;
    site_url?: string;
    token_new?: string;
    token_hash_new?: string;
  };
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, webhook-id, webhook-timestamp, webhook-signature",
};

function subjectFor(action: EmailActionType): string {
  switch (action) {
    case "signup":
    case "invite":
      return "Confirm your Arxon account";
    case "recovery":
      return "Reset your Arxon password";
    case "magiclink":
    case "email":
      return "Your Arxon sign-in link";
    case "email_change":
      return "Confirm your new Arxon email";
    case "reauthentication":
      return "Your Arxon verification code";
    default:
      return "Arxon account email";
  }
}

/**
 * App-side confirm URL. Prefetch/bots that only HTTP GET won't run verifyOtp.
 */
function buildConfirmUrl(tokenHash: string, action: string, redirectTo: string): string {
  let base = (redirectTo || "").trim();
  if (!base) {
    base = "https://arxonchain.xyz/auth/confirm";
  }

  try {
    const u = new URL(base);
    if (!u.pathname.includes("/auth/confirm")) {
      u.pathname = "/auth/confirm";
    }
    u.hash = "";
    u.search = "";
    u.searchParams.set("token_hash", tokenHash);
    u.searchParams.set("type", action);
    return u.toString();
  } catch {
    const fallback = new URL("https://arxonchain.xyz/auth/confirm");
    fallback.searchParams.set("token_hash", tokenHash);
    fallback.searchParams.set("type", action);
    return fallback.toString();
  }
}

function htmlBody(action: EmailActionType, verifyUrl: string, otp?: string): string {
  const safeUrl = verifyUrl.replace(/"/g, "&quot;");
  if (action === "reauthentication" && otp) {
    return `<div style="font-family:system-ui,sans-serif;line-height:1.5;color:#111">
      <h2>Your verification code</h2>
      <p>Use this code to continue in Arxon:</p>
      <p style="font-size:28px;letter-spacing:4px;font-weight:700">${otp}</p>
      <p style="color:#666;font-size:13px">If you did not request this, you can ignore this email.</p>
    </div>`;
  }

  const headings: Record<string, string> = {
    signup: "Confirm your email",
    invite: "You're invited to Arxon",
    recovery: "Reset your password",
    magiclink: "Sign in to Arxon",
    email: "Sign in to Arxon",
    email_change: "Confirm your new email",
  };
  const heading = headings[action] || "Continue in Arxon";
  const cta =
    action === "recovery"
      ? "Reset password"
      : action === "magiclink" || action === "email"
        ? "Sign in"
        : "Confirm email";

  const otpLine =
    otp && (action === "signup" || action === "recovery" || action === "magiclink" || action === "email")
      ? `<p style="color:#444">Or enter this code: <strong style="letter-spacing:2px">${otp}</strong></p>`
      : "";

  return `<div style="font-family:system-ui,sans-serif;line-height:1.5;color:#111">
    <h2>${heading}</h2>
    <p><a href="${safeUrl}" style="display:inline-block;background:#111;color:#fff;padding:12px 18px;border-radius:8px;text-decoration:none">${cta}</a></p>
    ${otpLine}
    <p style="color:#666;font-size:13px;word-break:break-all">If the button does not work, open this link:<br/>${safeUrl}</p>
    <p style="color:#666;font-size:13px">If you did not request this, you can ignore this email.</p>
  </div>`;
}

function textBody(action: EmailActionType, verifyUrl: string, otp?: string): string {
  if (action === "reauthentication" && otp) {
    return `Your Arxon verification code is ${otp}`;
  }
  const label =
    action === "recovery"
      ? "Reset your password"
      : action === "magiclink" || action === "email"
        ? "Sign in"
        : "Confirm your email";
  const otpLine = otp ? `\n\nOr use code: ${otp}` : "";
  return `${label} for Arxon:\n${verifyUrl}${otpLine}\n\nIf you did not request this, ignore this email.`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405, headers: corsHeaders });
  }

  const resendKey = (Deno.env.get("RESEND_API_KEY") || "").trim();
  const hookSecretRaw = (Deno.env.get("SEND_EMAIL_HOOK_SECRET") || "").trim();
  const fromEmail =
    (Deno.env.get("RESEND_FROM_EMAIL") || "").trim() || "Arxon <onboarding@resend.dev>";

  if (!resendKey) {
    console.error("send-email misconfigured: missing RESEND_API_KEY");
    return new Response(JSON.stringify({ error: { message: "RESEND_API_KEY missing" } }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (!hookSecretRaw) {
    console.error("send-email misconfigured: missing SEND_EMAIL_HOOK_SECRET");
    return new Response(JSON.stringify({ error: { message: "SEND_EMAIL_HOOK_SECRET missing" } }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const payload = await req.text();
  const headers = Object.fromEntries(req.headers);
  const hookSecret = hookSecretRaw.replace(/^v1,whsec_/, "");

  try {
    const wh = new Webhook(hookSecret);
    const event = wh.verify(payload, headers) as HookPayload;
    const email = (event.user?.email || "").trim();
    const action = (event.email_data?.email_action_type || "signup") as EmailActionType;
    const tokenHash = event.email_data?.token_hash || "";
    const redirectTo = event.email_data?.redirect_to || "";
    const otp = event.email_data?.token || "";

    if (!email) {
      throw new Error("Missing user email in hook payload");
    }

    const notifyOnly = [
      "password_changed_notification",
      "email_changed_notification",
      "phone_changed_notification",
      "identity_linked_notification",
      "identity_unlinked_notification",
      "mfa_factor_enrolled_notification",
      "mfa_factor_unenrolled_notification",
    ];

    let verifyUrl = "";
    if (!notifyOnly.includes(action) && tokenHash) {
      verifyUrl = buildConfirmUrl(tokenHash, action, redirectTo);
    }

    const subject = subjectFor(action);
    const html = notifyOnly.includes(action)
      ? `<div style="font-family:system-ui,sans-serif"><p>Your Arxon account was updated (${action}).</p></div>`
      : htmlBody(action, verifyUrl, otp);
    const text = notifyOnly.includes(action)
      ? `Your Arxon account was updated (${action}).`
      : textBody(action, verifyUrl, otp);

    console.log("send-email dispatch", {
      action,
      toDomain: email.split("@")[1] || "?",
      hasVerifyUrl: !!verifyUrl,
      linkHost: (() => {
        try {
          return verifyUrl ? new URL(verifyUrl).host : "";
        } catch {
          return "";
        }
      })(),
      from: fromEmail,
    });

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 7_500);
    let emailRes: Response;
    let emailRaw = "";
    try {
      emailRes = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: fromEmail,
          to: [email],
          subject,
          html,
          text,
        }),
        signal: controller.signal,
      });
      emailRaw = await emailRes.text();
    } finally {
      clearTimeout(timeout);
    }

    if (!emailRes!.ok) {
      console.error("Resend API error", {
        status: emailRes!.status,
        snippet: emailRaw.slice(0, 400),
      });
      return new Response(
        JSON.stringify({
          error: {
            http_code: emailRes!.status,
            message: `Resend send failed: ${emailRaw.slice(0, 200)}`,
          },
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    return new Response(JSON.stringify({}), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const aborted = error instanceof DOMException && error.name === "AbortError";
    console.error("send-email hook error", aborted ? "resend_timeout" : message);
    return new Response(
      JSON.stringify({
        error: {
          http_code: aborted ? 504 : 401,
          message: aborted ? "Email provider timed out" : message,
        },
      }),
      {
        status: aborted ? 500 : 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
