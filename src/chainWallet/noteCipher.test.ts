import { describe, expect, it } from 'vitest';

import {
  decryptNote,
  encryptNote,
  KNOWN_V1_HEX,
  NOTE_CIPHER_LEN,
  NOTE_MAGIC,
  toHex,
} from './noteCipher';

function fill(byte: number, len: number) {
  return new Uint8Array(len).fill(byte);
}

const SAMPLE = {
  pk: fill(0x11, 32),
  amount: 42n,
  rho: fill(0x22, 32),
  blinding: fill(0x33, 32),
};

describe('note cipher v1', () => {
  it('roundtrips secrets to the recipient pk', () => {
    const cipher = encryptNote(SAMPLE, fill(0x44, 16));
    expect(cipher.length).toBe(NOTE_CIPHER_LEN);
    expect(cipher.subarray(0, NOTE_MAGIC.length)).toEqual(NOTE_MAGIC);
    const opened = decryptNote(cipher, '0x' + '11'.repeat(32));
    expect(opened?.amount).toBe(42n);
    expect(opened?.rho).toEqual(SAMPLE.rho);
    expect(opened?.blinding).toEqual(SAMPLE.blinding);
  });

  it('rejects another wallet key and the old dummy label', () => {
    const cipher = encryptNote(SAMPLE, fill(0x44, 16));
    expect(decryptNote(cipher, '0x' + '55'.repeat(32))).toBeNull();
    expect(decryptNote(NOTE_MAGIC, '0x' + '11'.repeat(32))).toBeNull();
  });

  it('matches the Rust known vector', () => {
    const cipher = encryptNote(SAMPLE, fill(0x44, 16));
    expect(toHex(cipher)).toBe(KNOWN_V1_HEX);
    const opened = decryptNote(KNOWN_V1_HEX, '0x' + '11'.repeat(32));
    expect(opened?.amount).toBe(42n);
    expect(opened?.pk).toEqual(SAMPLE.pk);
  });
});
