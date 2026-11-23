/** User-facing copy for unexpected failures. Never dump backend/SQL/stack text. */

export type PublicErrorKind =
  | 'network'
  | 'timeout'
  | 'session'
  | 'claim'
  | 'mining'
  | 'wallet'
  | 'transfer'
  | 'upload'
  | 'play'
  | 'account'
  | 'verify'
  | 'auth'
  | 'notice'
  | 'unknown';

export const PUBLIC_ERROR_COPY: Record<PublicErrorKind, { title: string; hint: string }> = {
  network: {
    title: 'No connection',
    hint: 'Check Wi‑Fi or mobile data, then try again.',
  },
  timeout: {
    title: 'Taking too long',
    hint: 'Pull down to refresh, or close and reopen.',
  },
  session: {
    title: 'Sign in needed',
    hint: 'Sign out and sign in again, then retry.',
  },
  claim: {
    title: "Couldn't claim",
    hint: 'Pull down to refresh, then try again.',
  },
  mining: {
    title: "Mining didn't update",
    hint: 'Pull down to refresh, or close and reopen.',
  },
  wallet: {
    title: "Wallet didn't connect",
    hint: 'Close and reopen, then try again.',
  },
  transfer: {
    title: "Transfer didn't send",
    hint: 'Check the receiver and amount, then try again.',
  },
  upload: {
    title: "Photo didn't save",
    hint: 'Try again, or close and reopen.',
  },
  play: {
    title: "Match didn't load",
    hint: 'Pull down to refresh, or close and reopen.',
  },
  account: {
    title: "Request didn't go through",
    hint: 'Pull down to refresh, or close and reopen.',
  },
  verify: {
    title: "Couldn't save",
    hint: 'Pull down to refresh, then try again.',
  },
  auth: {
    title: "Couldn't sign in",
    hint: 'Check your details, then try again.',
  },
  notice: {
    title: 'Check this',
    hint: 'Fix the highlighted field, then try again.',
  },
  unknown: {
    title: 'Something went wrong',
    hint: 'Pull down to refresh, or close and reopen.',
  },
};

export const PUBLIC_ERROR_TITLE = PUBLIC_ERROR_COPY.unknown.title;
export const PUBLIC_ERROR_HINT = PUBLIC_ERROR_COPY.unknown.hint;

const TECHNICAL = /supabase|postgres|pgrst|postgrest|jwt|rpc\b|sql\b|exception|stack trace|violates|permission denied|row-level|rls\b|column |undefined|is not a function|failed to fetch|networkerror|edge function|status code|relation |schema |uuid|json\b|syntax error|null value|foreign key|duplicate key|timeout-or-duplicate|captcha_token|cors\b|xhr\b|typeerror|referenceerror|database error|could not find|does not exist|schema cache|\bhint:|\berr_[a-z0-9_]+|net::|chrome-error|cannot read propert|econnrefused|enotfound|\b500\b|\b502\b|\b503\b|\b504\b/i;

export function looksLikeInternalError(text: unknown): boolean {
  if (typeof text !== 'string') return false;
  const t = text.trim();
  if (!t) return false;
  if (TECHNICAL.test(t)) return true;
  if (t.length > 110) return true;
  if (/[{}\[\]\\]/.test(t)) return true;
  if (/\bat\s+\S+\s+\(/.test(t)) return true;
  return false;
}

export function classifyPublicError(text: unknown, fallback: PublicErrorKind = 'unknown'): PublicErrorKind {
  const t = typeof text === 'string' ? text.toLowerCase() : '';
  if (!t) return fallback;
  if (/offline|failed to fetch|networkerror|no connection|internet|wifi|dns|err_name|err_connection/.test(t)) return 'network';
  if (/timeout|timed out|taking too long|504|deadline/.test(t)) return 'timeout';
  if (/jwt|session expired|not authenticated|sign in needed|unauthor/.test(t)) return 'session';
  if (/claim|check-in|checkin|reward/.test(t)) return 'claim';
  if (/mining/.test(t)) return 'mining';
  if (/wallet|invalid wallet/.test(t)) return 'wallet';
  if (/transfer|nexus|receiver/.test(t)) return 'transfer';
  if (/upload|avatar|photo|image|file too large|invalid file/.test(t)) return 'upload';
  if (/dice|match|lobby|duel|rumble/.test(t)) return 'play';
  if (/delet|account request/.test(t)) return 'account';
  if (/verif|country|age/.test(t)) return 'verify';
  if (/password|sign in|sign up|login|email|auth|credentials/.test(t)) return 'auth';
  return fallback;
}

export function resolvePublicError(err?: unknown, kind?: PublicErrorKind) {
  const raw = err instanceof Error ? err.message : typeof err === 'string' ? err : '';
  const resolvedKind = kind ?? classifyPublicError(raw);
  const copy = PUBLIC_ERROR_COPY[resolvedKind];
  if (err) console.error(err);
  return { kind: resolvedKind, title: copy.title, hint: copy.hint };
}

export function publicErrorHint(err?: unknown): string {
  if (err) console.error(err);
  return PUBLIC_ERROR_HINT;
}

export function publicFacingMessage(err?: unknown, fallback = PUBLIC_ERROR_HINT): string {
  const msg = err instanceof Error ? err.message : typeof err === 'string' ? err : '';
  if (!msg || looksLikeInternalError(msg)) {
    if (err && err !== msg) console.error(err);
    return fallback;
  }
  return msg;
}

export function publicErrorToast(err?: unknown, kind?: PublicErrorKind) {
  const resolved = resolvePublicError(err, kind);
  return {
    title: resolved.title,
    description: resolved.hint,
    variant: 'destructive' as const,
    errorKind: resolved.kind,
  };
}

export function sanitizeToastCopy(input: {
  title?: unknown;
  description?: unknown;
  variant?: string;
  errorKind?: PublicErrorKind;
}) {
  const title = typeof input.title === 'string' ? input.title : undefined;
  const description = typeof input.description === 'string' ? input.description : undefined;
  const combined = [title, description].filter(Boolean).join(' ');
  if (looksLikeInternalError(description) || looksLikeInternalError(title) || looksLikeInternalError(combined)) {
    const resolved = resolvePublicError(combined, input.errorKind);
    return { title: resolved.title, description: resolved.hint, errorKind: resolved.kind };
  }
  if (input.variant !== 'destructive') return { title, description, errorKind: input.errorKind };
  return {
    title,
    description,
    errorKind: input.errorKind ?? classifyPublicError(combined, 'notice'),
  };
}
