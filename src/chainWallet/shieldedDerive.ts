import { blake2b } from '@noble/hashes/blake2b';
import { pbkdf2 } from '@noble/hashes/pbkdf2';
import { sha512 } from '@noble/hashes/sha512';
import { bytesToHex, type Hex } from 'viem';

/** Pallas base modulus, little-endian. Same bytes as arxon-zk `PALLAS_BASE_MODULUS_LE`. */
const PALLAS_P_LE = new Uint8Array([
  0x01, 0x00, 0x00, 0x00, 0xed, 0x30, 0x2d, 0x99, 0x1b, 0xf9, 0x4c, 0x09, 0xfc, 0x98, 0x46, 0x22,
  0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x40,
]);

const DOMAIN = new TextEncoder().encode('arxon-shielded-sk-v1');

function concat(...parts: Uint8Array[]) {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let off = 0;
  for (const part of parts) {
    out.set(part, off);
    off += part.length;
  }
  return out;
}

function canonical(le: Uint8Array) {
  for (let i = 31; i >= 0; i--) {
    if (le[i] < PALLAS_P_LE[i]) return true;
    if (le[i] > PALLAS_P_LE[i]) return false;
  }
  return false;
}

function seedFromMnemonic(mnemonic: string) {
  return pbkdf2(sha512, mnemonic.normalize('NFKD'), 'mnemonic'.normalize('NFKD'), { c: 2048, dkLen: 64 });
}

/** Spending key determined by the 12-word phrase so a new device can open the same vault. */
export function deriveShieldedSkHex(mnemonic: string, accountIndex = 0): Hex {
  const seed = seedFromMnemonic(mnemonic.trim());
  const idx = new Uint8Array(4);
  idx[0] = accountIndex & 0xff;
  idx[1] = (accountIndex >>> 8) & 0xff;
  idx[2] = (accountIndex >>> 16) & 0xff;
  idx[3] = (accountIndex >>> 24) & 0xff;
  for (let n = 0; n < 256; n++) {
    const h = blake2b(concat(DOMAIN, seed, idx, new Uint8Array([n])), { dkLen: 32 });
    if (canonical(h)) return bytesToHex(h) as Hex;
  }
  throw new Error('Could not derive a shielded key from this phrase.');
}
