import { describe, expect, it } from 'vitest';
import { PendingTxError, receiptOutcome } from './chain';

describe('receiptOutcome', () => {
  it('treats a successful receipt as success', () => {
    expect(receiptOutcome({ status: 'success' })).toBe('success');
  });

  it('treats a reverted receipt as reverted, not pending', () => {
    expect(receiptOutcome({ status: 'reverted' })).toBe('reverted');
  });

  it('treats a missing receipt as pending', () => {
    expect(receiptOutcome(null)).toBe('pending');
    expect(receiptOutcome(undefined)).toBe('pending');
    expect(receiptOutcome({})).toBe('pending');
  });
});

describe('PendingTxError', () => {
  it('keeps the broadcast hash and tells the user not to send again', () => {
    const hash = '0xabc' as `0x${string}`;
    const err = new PendingTxError(hash);
    expect(err.hash).toBe(hash);
    expect(err.message).toContain(hash);
    expect(err.message).toMatch(/Do not send again/);
  });
});
