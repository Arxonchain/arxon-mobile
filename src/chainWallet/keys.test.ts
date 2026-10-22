import { describe, expect, it } from 'vitest';
import { assertWalletSecret, isValidMnemonic, looksLikePrivateKey } from './keys';

const validPhrase = 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';
const validKey = '0x1111111111111111111111111111111111111111111111111111111111111111';

describe('wallet secret checks', () => {
  it('accepts a checksummed 12-word phrase and rejects junk words', () => {
    expect(isValidMnemonic(validPhrase)).toBe(true);
    expect(isValidMnemonic('canyon river amber north silver garden orbit maple quiet harbor velvet stone')).toBe(false);
    expect(isValidMnemonic('abandon abandon abandon')).toBe(false);
  });

  it('accepts a 64-character private key and rejects short hex', () => {
    expect(looksLikePrivateKey(validKey)).toBe(true);
    expect(looksLikePrivateKey(validKey.slice(2))).toBe(true);
    expect(looksLikePrivateKey('abcd1234')).toBe(false);
  });

  it('throws a clear error for the wrong secret type', () => {
    expect(() => assertWalletSecret('not a phrase', 'phrase')).toThrow(/valid 12 or 24-word/);
    expect(() => assertWalletSecret('abcd', 'key')).toThrow(/64-character private key/);
    expect(() => assertWalletSecret(validPhrase, 'phrase')).not.toThrow();
    expect(() => assertWalletSecret(validKey, 'key')).not.toThrow();
  });
});
