import { describe, expect, it } from 'vitest';
import { isLiveSendDest, parseTokenQty } from './sendDest';

describe('isLiveSendDest', () => {
  it('accepts EVM 0x addresses', () => {
    expect(isLiveSendDest('0x1111111111111111111111111111111111111111', false)).toBe(true);
  });

  it('rejects sample arx1 contacts even on testnet', () => {
    expect(isLiveSendDest('arx1q8x4…t7c2n4p', true)).toBe(false);
    expect(isLiveSendDest('arx1q3k9d2a', false)).toBe(false);
  });

  it('accepts a 32-byte shielded key on testnet only', () => {
    const pk = `0x${'ab'.repeat(32)}`;
    expect(isLiveSendDest(pk, true)).toBe(true);
    expect(isLiveSendDest(pk, false)).toBe(false);
  });

  it('accepts Bitcoin and Solana addresses only for those sends', () => {
    expect(isLiveSendDest('bc1qcr8te4kr609gcawutmrza0j4xv80jy8z306fyu', false, { symbol: 'BTC' })).toBe(true);
    expect(isLiveSendDest('0x1111111111111111111111111111111111111111', false, { symbol: 'BTC' })).toBe(false);
    expect(isLiveSendDest('HAgk14JpMQLgt6rVgv7cBQFJWFto5Dqxi472uT3DKpqk', false, { symbol: 'SOL' })).toBe(true);
    expect(isLiveSendDest('HAgk14JpMQLgt6rVgv7cBQFJWFto5Dqxi472uT3DKpqk', false, { symbol: 'USDT', chain: 'solana' })).toBe(true);
    expect(isLiveSendDest('0x1111111111111111111111111111111111111111', false, { symbol: 'USDT', chain: 'ethereum' })).toBe(true);
  });
});

describe('parseTokenQty', () => {
  it('reads the numeric amount out of live token copy', () => {
    expect(parseTokenQty('1.250000 ETH')).toBe(1.25);
    expect(parseTokenQty('0.00 ARXt')).toBe(0);
  });
});
