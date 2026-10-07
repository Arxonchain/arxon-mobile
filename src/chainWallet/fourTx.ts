import type { Address, Hex } from 'viem';

import type { ActivityItem } from './activity';
import { PRECOMPILE } from './chain';
import type { InspectedTx } from './inspect';

export const FOUR_TX_ARX_P = 2500;

export type FourTxSlot = 'shield' | 'private' | 'unshield_self' | 'unshield_other';

export type FourTxProof = {
  utcDate: string;
  wallet: Address;
  shieldHash: Hex;
  privateHash: Hex;
  unshieldSelfHash: Hex;
  unshieldOtherHash: Hex;
  unshieldSelfPayout: Address;
  unshieldOtherPayout: Address;
};

export type FourTxProgress = {
  utcDate: string;
  shield: ActivityItem | null;
  privatePay: ActivityItem | null;
  unshieldSelf: ActivityItem | null;
  unshieldOther: ActivityItem | null;
  complete: boolean;
  proof: FourTxProof | null;
};

const HASH = /^0x[0-9a-fA-F]{64}$/;
const ADDR = /^0x[0-9a-fA-F]{40}$/;

export function utcDateKey(ms = Date.now()): string {
  return new Date(ms).toISOString().slice(0, 10);
}

export function isTxHash(value: string): value is Hex {
  return HASH.test(value);
}

export function isAddress(value: string): value is Address {
  return ADDR.test(value);
}

function sameAddr(a: string, b: string) {
  return a.toLowerCase() === b.toLowerCase();
}

function isSubmit(value: string) {
  return sameAddr(value, PRECOMPILE.submit);
}

export function isNativeArxonTx(item: ActivityItem): boolean {
  if (item.network === 'ethereum') return false;
  const token = (item.token ?? 'tARX').toUpperCase();
  return token === 'TARX' || token === 'ARX';
}

/** Included on chain (In block), not still Processing. */
export function isIncludedLocal(item: ActivityItem, inspected?: InspectedTx | null): boolean {
  if (inspected) return inspected.status === 'success';
  return item.clocks?.inBlockAt != null;
}

export function payoutFromInspect(tx: InspectedTx | null | undefined): Address | null {
  if (!tx || tx.kind !== 'unshield') return null;
  const row = tx.rows.find((r) => r.label === 'Payout');
  if (!row || !isAddress(row.value)) return null;
  return row.value;
}

export function unshieldPayout(item: ActivityItem, inspected?: InspectedTx | null): Address | null {
  const fromInspect = payoutFromInspect(inspected);
  if (fromInspect) return fromInspect;
  if (isAddress(item.to) && !isSubmit(item.to)) return item.to;
  return null;
}

export function classifyUnshield(
  item: ActivityItem,
  user: string,
  inspected?: InspectedTx | null
): 'self' | 'other' | null {
  if (item.kind !== 'unshield') return null;
  const payout = unshieldPayout(item, inspected);
  if (!payout || !isAddress(user)) return null;
  return sameAddr(payout, user) ? 'self' : 'other';
}

export function detectFourTx(input: {
  items: ActivityItem[];
  user: string | null | undefined;
  now?: number;
  inspected?: Partial<Record<string, InspectedTx>>;
}): FourTxProgress {
  const utcDate = utcDateKey(input.now ?? Date.now());
  const empty: FourTxProgress = {
    utcDate,
    shield: null,
    privatePay: null,
    unshieldSelf: null,
    unshieldOther: null,
    complete: false,
    proof: null,
  };
  if (!input.user || !isAddress(input.user)) return empty;

  const day = input.items.filter((item) => {
    if (!isNativeArxonTx(item)) return false;
    if (utcDateKey(item.at) !== utcDate) return false;
    const inspected = input.inspected?.[item.hash.toLowerCase()];
    return isIncludedLocal(item, inspected);
  });

  const shield = day.find((item) => item.kind === 'shield') ?? null;
  const privatePay = day.find((item) => item.kind === 'private') ?? null;
  const unshieldSelf =
    day.find((item) => classifyUnshield(item, input.user as string, input.inspected?.[item.hash.toLowerCase()]) === 'self') ??
    null;
  const unshieldOther =
    day.find((item) => classifyUnshield(item, input.user as string, input.inspected?.[item.hash.toLowerCase()]) === 'other') ??
    null;

  const complete = !!(shield && privatePay && unshieldSelf && unshieldOther);
  const selfPayout = unshieldSelf
    ? unshieldPayout(unshieldSelf, input.inspected?.[unshieldSelf.hash.toLowerCase()])
    : null;
  const otherPayout = unshieldOther
    ? unshieldPayout(unshieldOther, input.inspected?.[unshieldOther.hash.toLowerCase()])
    : null;

  const proof =
    complete &&
    shield &&
    privatePay &&
    unshieldSelf &&
    unshieldOther &&
    selfPayout &&
    otherPayout &&
    isTxHash(shield.hash) &&
    isTxHash(privatePay.hash) &&
    isTxHash(unshieldSelf.hash) &&
    isTxHash(unshieldOther.hash)
      ? {
          utcDate,
          wallet: input.user as Address,
          shieldHash: shield.hash,
          privateHash: privatePay.hash,
          unshieldSelfHash: unshieldSelf.hash,
          unshieldOtherHash: unshieldOther.hash,
          unshieldSelfPayout: selfPayout,
          unshieldOtherPayout: otherPayout,
        }
      : null;

  return { utcDate, shield, privatePay, unshieldSelf, unshieldOther, complete: !!proof, proof };
}
