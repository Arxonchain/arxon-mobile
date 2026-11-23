import type { StoredNote } from './notes';

export type WalletEnvelope = {
  v: 2;
  mnemonic: string;
  sk?: string;
  notes?: StoredNote[];
};

/** Open a raw phrase or a v2 JSON envelope. Never returns key material in logs. */
export function parseWalletSecret(raw: string): WalletEnvelope {
  const trimmed = raw.trim();
  if (trimmed.startsWith('{')) {
    try {
      const parsed = JSON.parse(trimmed) as Partial<WalletEnvelope>;
      if (typeof parsed?.mnemonic === 'string' && parsed.mnemonic.trim()) {
        return {
          v: 2,
          mnemonic: parsed.mnemonic.trim().split(/\s+/).join(' '),
          sk: typeof parsed.sk === 'string' && parsed.sk.length > 8 ? parsed.sk : undefined,
          notes: Array.isArray(parsed.notes) ? parsed.notes : undefined,
        };
      }
    } catch {
      /* v1 phrase */
    }
  }
  return { v: 2, mnemonic: trimmed.split(/\s+/).join(' ') };
}
