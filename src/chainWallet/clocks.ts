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
