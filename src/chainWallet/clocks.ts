export type TxPhase = 'Processing' | 'Proved' | 'In block';

export type TxClocks = {
  tapAt: number;
  provedAt?: number;
  sentAt?: number;
  inBlockAt?: number;
};

export type TxPhaseFn = (phase: TxPhase) => void;

export function startClocks(): TxClocks {
  return { tapAt: Date.now() };
}

export function stampProved(clocks: TxClocks) {
  clocks.provedAt = Date.now();
}

export function stampSent(clocks: TxClocks) {
  clocks.sentAt = Date.now();
}

export function stampInBlock(clocks: TxClocks) {
  clocks.inBlockAt = Date.now();
}

export function formatClockMs(ms: number): string {
  if (!Number.isFinite(ms) || ms < 0) return '0ms';
  if (ms < 1000) return `${Math.round(ms)}ms`;
  return `${Math.round(ms / 1000)}s`;
}

/** Prove wall time from tap. Not mixed with inclusion. */
export function provedText(clocks?: TxClocks | null): string | null {
  if (!clocks?.provedAt) return null;
  return `Proved ${formatClockMs(clocks.provedAt - clocks.tapAt)}`;
}

/** Inclusion wait from send accepted. Not mixed with prove. */
export function inBlockText(clocks?: TxClocks | null): string | null {
  if (!clocks?.inBlockAt || !clocks.sentAt) return null;
  return `In block ${formatClockMs(clocks.inBlockAt - clocks.sentAt)}`;
}

export function proveMs(clocks: TxClocks): number | null {
  if (!clocks.provedAt) return null;
  return clocks.provedAt - clocks.tapAt;
}

export function includeMs(clocks: TxClocks): number | null {
  if (!clocks.inBlockAt || !clocks.sentAt) return null;
  return clocks.inBlockAt - clocks.sentAt;
}

const LAST_INCLUDE_KEY = 'arxon.lastIncludeMs';
const DEFAULT_INCLUDE_MS = 12_000;

export function rememberIncludeMs(ms: number) {
  if (!Number.isFinite(ms) || ms < 500 || ms > 120_000) return;
  try {
    localStorage.setItem(LAST_INCLUDE_KEY, String(Math.round(ms)));
  } catch {
    /* private mode */
  }
}

/** Expected include wait after submit. Last measured, else two 6s slots. */
export function etaIncludeMs(): number {
  try {
    const n = Number(localStorage.getItem(LAST_INCLUDE_KEY));
    if (Number.isFinite(n) && n >= 1_000 && n <= 60_000) return n;
  } catch {
    /* private mode */
  }
  return DEFAULT_INCLUDE_MS;
}

export function etaSecondsLabel(ms = etaIncludeMs()): string {
  return `${Math.max(1, Math.round(ms / 1000))}s`;
}

export function logTxClocks(kind: string, hash: string, clocks: TxClocks) {
  const prove = proveMs(clocks);
  const include = includeMs(clocks);
  console.info('[arxon-tx]', {
    kind,
    hash,
    prove_ms: prove,
    include_ms: include,
    prove: prove == null ? null : formatClockMs(prove),
    include: include == null ? null : formatClockMs(include),
  });
}
