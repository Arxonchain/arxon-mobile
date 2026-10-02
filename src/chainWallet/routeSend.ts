import { parseEther, type Address } from 'viem';

import { needsShieldedProof, type PrivacyFlags } from './privacy';
import type { StoredNote } from './notes';

export type Dest =
  | { kind: 'empty' }
  | { kind: 'bad' }
  | { kind: 'public'; address: Address }
  | { kind: 'shielded'; pk: string };

export type SendRoute =
  | { kind: 'need-amount'; label: string }
  | { kind: 'bad-to'; label: string }
  | { kind: 'need-funds'; label: string }
  | { kind: 'public'; to: Address; label: string }
  | { kind: 'shield'; label: string }
  | { kind: 'private'; pk: string; shieldFirst: boolean; label: string }
  | { kind: 'unshield'; to: Address; shieldFirst: boolean; label: string };

export function isShieldedPk(value: string): boolean {
  return /^0x[0-9a-fA-F]{64}$/.test(value.trim());
}

export function parseDest(to: string): Dest {
  const t = to.trim();
  if (!t) return { kind: 'empty' };
  if (isShieldedPk(t)) return { kind: 'shielded', pk: t };
  if (/^0x[0-9a-fA-F]{40}$/.test(t)) return { kind: 'public', address: t as Address };
  return { kind: 'bad' };
}

export function hasCoveringNote(notes: StoredNote[], amountWei: bigint): boolean {
  return notes.some((n) => !n.spent && BigInt(n.amountWei) >= amountWei);
}

export function routeSend(input: {
  to: string;
  amount: string;
  flags: PrivacyFlags;
  notes: StoredNote[];
  publicArx: string | null;
  shieldedPk: string | null;
}): SendRoute {
  if (!input.amount || Number(input.amount) <= 0) {
    return { kind: 'need-amount', label: 'Enter how much ARX.' };
  }
  let wei: bigint;
  try {
    wei = parseEther(input.amount);
  } catch {
    return { kind: 'need-amount', label: 'Enter a valid ARX amount.' };
  }

  const dest = parseDest(input.to);
  if (dest.kind === 'bad') {
    return {
      kind: 'bad-to',
      label: 'Paste a public 0x address (40 hex) or a shielded key (64 hex). Leave To blank to hold ARX in your private balance.',
    };
  }

  const noteOk = hasCoveringNote(input.notes, wei);
  let publicOk = false;
  try {
    publicOk = input.publicArx != null && parseEther(input.publicArx) >= wei;
  } catch {
    publicOk = false;
  }
  const privateFlags = needsShieldedProof(input.flags);

  if (dest.kind === 'empty') {
    if (!publicOk) {
      return { kind: 'need-funds', label: 'Need public ARX to move into your private balance.' };
    }
    return { kind: 'shield', label: 'Move public ARX into a note you own (shield in).' };
  }

  if (dest.kind === 'public') {
    if (!privateFlags) {
      if (!publicOk) {
        return { kind: 'need-funds', label: 'Not enough public ARX for a transparent send.' };
      }
      return { kind: 'public', to: dest.address, label: 'Public send to that 0x. Nothing is hidden on-chain.' };
    }
    if (noteOk) {
      return {
        kind: 'unshield',
        to: dest.address,
        shieldFirst: false,
        label: 'Pay that 0x from a note (unshield). Payout address stays public. Relayer pays gas.',
      };
    }
    if (publicOk) {
      return {
        kind: 'unshield',
        to: dest.address,
        shieldFirst: true,
        label: 'Shield in, then unshield to that 0x. Two proofs. Payout address stays public.',
      };
    }
    return { kind: 'need-funds', label: 'Need a spendable note or public ARX to pay that 0x privately.' };
  }

  const own =
    !!input.shieldedPk && dest.pk.toLowerCase() === input.shieldedPk.toLowerCase();
  if (own && !noteOk && publicOk) {
    return { kind: 'shield', label: 'That is your shielded key. This deposits public ARX into a note you own.' };
  }
  if (noteOk) {
    return {
      kind: 'private',
      pk: dest.pk,
      shieldFirst: false,
      label: own
        ? 'Private pay to your own shielded key. Relayer pays gas.'
        : 'Private pay to that shielded key. Relayer pays gas.',
    };
  }
  if (publicOk) {
    return {
      kind: 'private',
      pk: dest.pk,
      shieldFirst: true,
      label: 'Shield in, then private pay. Two proofs. Relayer pays the second hop.',
    };
  }
  return {
    kind: 'need-funds',
    label: 'Need a spendable note or public ARX to private-pay that key.',
  };
}
