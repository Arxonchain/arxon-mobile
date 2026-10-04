/** Frozen packing from pallet-privacy PrivacyMask::as_bits. Do not reorder. */
export type PrivacyFlags = {
  hideSender: boolean;
  hideReceiver: boolean;
  hideAmount: boolean;
  hideBalance: boolean;
};

export const DEFAULT_FLAGS: PrivacyFlags = {
  hideSender: false,
  hideReceiver: false,
  hideAmount: false,
  hideBalance: false,
};

/** Shield into the vault: notes are fully private. The public door (amount leaving 0x) stays visible. */
export const VAULT_FLAGS: PrivacyFlags = {
  hideSender: true,
  hideReceiver: true,
  hideAmount: true,
  hideBalance: false,
};

/** Unshield to a public 0x: payout address and amount are public; spender can stay hidden. */
export const UNSHIELD_FLAGS: PrivacyFlags = {
  hideSender: true,
  hideReceiver: false,
  hideAmount: false,
  hideBalance: false,
};

export function asBits(flags: PrivacyFlags): number {
  let bits = 0;
  if (flags.hideSender) bits |= 1;
  if (flags.hideReceiver) bits |= 2;
  if (flags.hideAmount) bits |= 4;
  if (flags.hideBalance) bits |= 8;
  return bits;
}

export function fromBits(bits: number): PrivacyFlags {
  return {
    hideSender: (bits & 1) !== 0,
    hideReceiver: (bits & 2) !== 0,
    hideAmount: (bits & 4) !== 0,
    hideBalance: (bits & 8) !== 0,
  };
}

export function needsShieldedProof(flags: PrivacyFlags): boolean {
  return flags.hideSender || flags.hideReceiver || flags.hideAmount;
}

export const SEND_FLAGS: { key: 'hideSender' | 'hideReceiver' | 'hideAmount'; label: string }[] = [
  { key: 'hideSender', label: 'Hide sender' },
  { key: 'hideReceiver', label: 'Hide receiver' },
  { key: 'hideAmount', label: 'Hide amount' },
];

export const FLAG_COPY = SEND_FLAGS;

export function flagSummary(flags: PrivacyFlags): string {
  const on = FLAG_COPY.filter((item) => flags[item.key]).map((item) => item.label);
  return on.length ? on.join(' · ') : 'All public';
}
