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

export const FLAG_COPY: { key: keyof PrivacyFlags; label: string; hint: string }[] = [
  { key: 'hideSender', label: 'Hide sender', hint: 'Who spends stays in the proof. Private pay / Unshield gas is the relayer, not your EVM from.' },
  { key: 'hideReceiver', label: 'Hide receiver', hint: 'Who is paid stays in the proof' },
  { key: 'hideAmount', label: 'Hide amount', hint: 'Value is committed, not published' },
  { key: 'hideBalance', label: 'Hide balance', hint: 'Front-end only in v1; chain balance stays public' },
];

export function flagSummary(flags: PrivacyFlags): string {
  const on = FLAG_COPY.filter((item) => flags[item.key]).map((item) => item.label);
  return on.length ? on.join(' · ') : 'All public';
}
