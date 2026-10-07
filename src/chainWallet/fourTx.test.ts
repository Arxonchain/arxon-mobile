import { describe, expect, it } from 'vitest';
import type { Hex } from 'viem';

import type { ActivityItem } from './activity';
import { PRECOMPILE } from './chain';
import { classifyUnshield, detectFourTx, utcDateKey, type FourTxSlot } from './fourTx';
import type { InspectedTx } from './inspect';

const USER = '0x1111111111111111111111111111111111111111';
const OTHER = '0x2222222222222222222222222222222222222222';
const DAY = Date.parse('2026-10-07T15:00:00.000Z');

function hash(n: number): Hex {
  return `0x${n.toString(16).padStart(64, '0')}` as Hex;
}

function item(partial: Partial<ActivityItem> & Pick<ActivityItem, 'kind' | 'hash'>): ActivityItem {
  return {
    to: USER,
    amount: '1',
    maskBits: 0,
    at: DAY,
    token: 'tARX',
    network: 'arxon',
    clocks: { tapAt: DAY, sentAt: DAY + 1, inBlockAt: DAY + 2 },
    ...partial,
  };
}

function inspectUnshield(payout: string, hashValue: Hex): InspectedTx {
  return {
    hash: hashValue,
    status: 'success',
    blockNumber: '1',
    from: '0xf55260F227cb6A1b5a4CafB4DD365A0531B41fa7',
    to: PRECOMPILE.submit,
    valueArx: '0',
    kind: 'unshield',
    rows: [{ label: 'Payout', value: payout, state: 'public' }],
  };
}

describe('four-tx daily set', () => {
  it('uses UTC date', () => {
    expect(utcDateKey(Date.parse('2026-10-07T23:59:59.000Z'))).toBe('2026-10-07');
    expect(utcDateKey(Date.parse('2026-10-08T00:00:00.000Z'))).toBe('2026-10-08');
  });

  it('treats unshield payout vs user 0x as self vs other', () => {
    const self = item({ kind: 'unshield', hash: hash(1), to: USER });
    const other = item({ kind: 'unshield', hash: hash(2), to: OTHER });
    expect(classifyUnshield(self, USER)).toBe('self');
    expect(classifyUnshield(other, USER)).toBe('other');
  });

  it('reads PUBLIC Payout from inspect when local to is the 0x0801 relayer target', () => {
    const row = item({ kind: 'unshield', hash: hash(3), to: PRECOMPILE.submit });
    expect(classifyUnshield(row, USER)).toBeNull();
    expect(classifyUnshield(row, USER, inspectUnshield(OTHER, hash(3)))).toBe('other');
    expect(classifyUnshield(row, USER, inspectUnshield(USER, hash(3)))).toBe('self');
  });

  it('requires all four included native txs the same UTC day', () => {
    const rows: ActivityItem[] = [
      item({ kind: 'shield', hash: hash(10), to: PRECOMPILE.submit }),
      item({ kind: 'private', hash: hash(11), to: '0x'.padEnd(66, 'ab') }),
      item({ kind: 'unshield', hash: hash(12), to: USER }),
      item({ kind: 'unshield', hash: hash(13), to: OTHER }),
    ];
    const found = detectFourTx({ items: rows, user: USER, now: DAY });
    expect(found.complete).toBe(true);
    expect(found.proof?.unshieldSelfPayout.toLowerCase()).toBe(USER.toLowerCase());
    expect(found.proof?.unshieldOtherPayout.toLowerCase()).toBe(OTHER.toLowerCase());
  });

  it('does not credit when one slot is missing', () => {
    const rows: ActivityItem[] = [
      item({ kind: 'shield', hash: hash(10), to: PRECOMPILE.submit }),
      item({ kind: 'private', hash: hash(11), to: '0x'.padEnd(66, 'ab') }),
      item({ kind: 'unshield', hash: hash(12), to: USER }),
    ];
    expect(detectFourTx({ items: rows, user: USER, now: DAY }).complete).toBe(false);
  });

  it('ignores Processing (no In block) and failed kinds', () => {
    const rows: ActivityItem[] = [
      item({ kind: 'shield', hash: hash(10), to: PRECOMPILE.submit }),
      item({ kind: 'private', hash: hash(11), clocks: { tapAt: DAY } }),
      item({ kind: 'unshield', hash: hash(12), to: USER }),
      item({ kind: 'unshield', hash: hash(13), to: OTHER }),
    ];
    const found = detectFourTx({ items: rows, user: USER, now: DAY });
    expect(found.privatePay).toBeNull();
    expect(found.complete).toBe(false);
  });

  it('does not treat Shield as Private', () => {
    const rows: ActivityItem[] = [
      item({ kind: 'shield', hash: hash(10), to: PRECOMPILE.submit }),
      item({ kind: 'shield', hash: hash(11), to: PRECOMPILE.submit }),
      item({ kind: 'unshield', hash: hash(12), to: USER }),
      item({ kind: 'unshield', hash: hash(13), to: OTHER }),
    ];
    expect(detectFourTx({ items: rows, user: USER, now: DAY }).privatePay).toBeNull();
  });

  it('ignores extra txs and ethereum rows', () => {
    const rows: ActivityItem[] = [
      item({ kind: 'shield', hash: hash(10), to: PRECOMPILE.submit }),
      item({ kind: 'shield', hash: hash(99), to: PRECOMPILE.submit }),
      item({ kind: 'private', hash: hash(11), to: '0x'.padEnd(66, 'ab') }),
      item({ kind: 'unshield', hash: hash(12), to: USER }),
      item({ kind: 'unshield', hash: hash(13), to: OTHER }),
      item({ kind: 'unshield', hash: hash(14), to: OTHER }),
      item({
        kind: 'transfer',
        hash: hash(15),
        network: 'ethereum',
        token: 'ETH',
      }),
    ];
    const found = detectFourTx({ items: rows, user: USER, now: DAY });
    expect(found.complete).toBe(true);
    expect(found.proof?.shieldHash).toBe(hash(10));
  });
});

describe('four-tx slot labels', () => {
  it('keeps the required set names', () => {
    const slots: FourTxSlot[] = ['shield', 'private', 'unshield_self', 'unshield_other'];
    expect(slots).toHaveLength(4);
  });
});
