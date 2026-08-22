/**
 * Signup email domain policy — blocks disposable / farm domains observed in production.
 */

/** Exact domains blocked (lowercase). Extend as abuse patterns appear. */
const BLOCKED_DOMAINS = new Set([
  // Temp / throwaway
  "tempmail.ing",
  "tempmail.img",
  "mailpwr.com",
  "spymail.one",
  "sharebot.net",
  "drmail.in",
  "streetwormail.com",
  "ronaldofmail.com",
  "getnada.com",
  "mailinator.com",
  "guerrillamail.com",
  "yopmail.com",
  "10minutemail.com",
  "fakeinbox.com",
  "trashmail.com",
  "sharklasers.com",
  // Observed signup-farm clusters (Arxon production)
  "cico.my.id",
  "theeditai.com",
  "animateany.com",
  "animatimg.com",
  "aniimate.net",
  "gettranslation.app",
  "deepask.app",
  "3dkai.com",
  "bigonla.com",
  "trocipad.com",
]);

/** Substrings in domain — block if any match (catches variants). */
const BLOCKED_DOMAIN_SUBSTRINGS = [
  "tempmail",
  "sharebot",
  "mailpwr",
  "spymail",
  "guerrillamail",
  "mailinator",
  "yopmail",
  "10minutemail",
  "fakeinbox",
  "trashmail",
  "throwaway",
  "disposable",
  "spamgourmet",
  "getnada",
  "mailsac",
  "maildrop",
  "temp-mail",
  "tmpmail",
  "fakemail",
  "spambox",
];

export function normalizeEmailDomain(email: string): string | null {
  const trimmed = email.trim().toLowerCase();
  const at = trimmed.lastIndexOf("@");
  if (at < 1 || at === trimmed.length - 1) return null;
  const domain = trimmed.slice(at + 1);
  if (!/^[a-z0-9.-]+\.[a-z]{2,}$/.test(domain)) return null;
  return domain;
}

/** Returns user-facing rejection message, or null if allowed. */
export function getSignupEmailRejection(email: string): string | null {
  const domain = normalizeEmailDomain(email);
  if (!domain) {
    return "Enter a valid email address.";
  }

  if (BLOCKED_DOMAINS.has(domain)) {
    return "This email provider is not allowed. Please use a personal email (e.g. Gmail, Outlook, Hotmail).";
  }

  for (const needle of BLOCKED_DOMAIN_SUBSTRINGS) {
    if (domain.includes(needle)) {
      return "Temporary or disposable email addresses are not allowed.";
    }
  }

  return null;
}
