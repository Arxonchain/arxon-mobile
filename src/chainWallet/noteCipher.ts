import { blake2b } from '@noble/hashes/blake2b';
import { bytesToHex, hexToBytes, type Hex } from 'viem';

export const NOTE_MAGIC = new TextEncoder().encode('arxon-note-v1');
export const NOTE_VERSION = 1;
export const NOTE_NONCE_LEN = 16;
export const NOTE_PLAIN_LEN = 32 + 8 + 32 + 32;
export const NOTE_MAC_LEN = 32;
export const NOTE_CIPHER_LEN = NOTE_MAGIC.length + 1 + NOTE_NONCE_LEN + NOTE_PLAIN_LEN + NOTE_MAC_LEN;

const ENC_DOMAIN = new TextEncoder().encode('arxon-note-enc-v1');
const MAC_DOMAIN = new TextEncoder().encode('arxon-note-mac-v1');
const XOR_DOMAIN = new TextEncoder().encode('arxon-note-xor-v1');

export type NotePlain = {
  pk: Uint8Array;
  amount: bigint;
  rho: Uint8Array;
  blinding: Uint8Array;
};

function blake256(data: Uint8Array): Uint8Array {
  return blake2b(data, { dkLen: 32 });
}

function concat(...parts: Uint8Array[]): Uint8Array {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let off = 0;
  for (const part of parts) {
    out.set(part, off);
    off += part.length;
  }
  return out;
}

function deriveKey(domain: Uint8Array, pk: Uint8Array): Uint8Array {
  return blake256(concat(domain, pk));
}

function keystream(encKey: Uint8Array, nonce: Uint8Array, len: number): Uint8Array {
  const out = new Uint8Array(len);
  let off = 0;
  let i = 0;
  while (off < len) {
    const idx = new Uint8Array(4);
    idx[0] = (i >>> 24) & 0xff;
    idx[1] = (i >>> 16) & 0xff;
    idx[2] = (i >>> 8) & 0xff;
    idx[3] = i & 0xff;
    const block = blake256(concat(XOR_DOMAIN, encKey, nonce, idx));
    const n = Math.min(32, len - off);
    out.set(block.subarray(0, n), off);
    off += n;
    i += 1;
  }
  return out;
}

function xor(data: Uint8Array, stream: Uint8Array): Uint8Array {
  const out = new Uint8Array(data.length);
  for (let i = 0; i < data.length; i++) out[i] = data[i] ^ stream[i];
  return out;
}

function macEq(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let acc = 0;
  for (let i = 0; i < a.length; i++) acc |= a[i] ^ b[i];
  return acc === 0;
}

function encodePlain(plain: NotePlain): Uint8Array {
  const amount = new Uint8Array(8);
  let n = plain.amount;
  for (let i = 0; i < 8; i++) {
    amount[i] = Number(n & 0xffn);
    n >>= 8n;
  }
  return concat(plain.pk, amount, plain.rho, plain.blinding);
}

function decodePlain(bytes: Uint8Array): NotePlain {
  let amount = 0n;
  for (let i = 7; i >= 0; i--) amount = (amount << 8n) | BigInt(bytes[32 + i]);
  return {
    pk: bytes.slice(0, 32),
    amount,
    rho: bytes.slice(40, 72),
    blinding: bytes.slice(72, 104),
  };
}

function pkBytes(pk: string): Uint8Array | null {
  const raw = pk.trim().replace(/^0x/i, '');
  if (!/^[0-9a-fA-F]{64}$/.test(raw)) return null;
  return hexToBytes(`0x${raw}` as Hex);
}

function asBytes(cipher: Hex | Uint8Array): Uint8Array {
  return typeof cipher === 'string' ? hexToBytes(cipher) : cipher;
}

/** Encrypt note secrets to `plain.pk`. Tests and the Rust prover share this layout. */
export function encryptNote(plain: NotePlain, nonce: Uint8Array): Uint8Array {
  const encKey = deriveKey(ENC_DOMAIN, plain.pk);
  const macKey = deriveKey(MAC_DOMAIN, plain.pk);
  const body = xor(encodePlain(plain), keystream(encKey, nonce, NOTE_PLAIN_LEN));
  const mac = blake256(concat(macKey, nonce, body));
  return concat(NOTE_MAGIC, new Uint8Array([NOTE_VERSION]), nonce, body, mac);
}

/** Trial-decrypt a chain `encrypted_note` as this wallet's shielded pk. */
export function decryptNote(cipher: Hex | Uint8Array, pkHex: string): NotePlain | null {
  const pk = pkBytes(pkHex);
  if (!pk) return null;
  const raw = asBytes(cipher);
  if (raw.length !== NOTE_CIPHER_LEN) return null;
  if (!macEq(raw.subarray(0, NOTE_MAGIC.length), NOTE_MAGIC)) return null;
  if (raw[NOTE_MAGIC.length] !== NOTE_VERSION) return null;
  const nonceAt = NOTE_MAGIC.length + 1;
  const bodyAt = nonceAt + NOTE_NONCE_LEN;
  const macAt = bodyAt + NOTE_PLAIN_LEN;
  const nonce = raw.subarray(nonceAt, bodyAt);
  const body = raw.subarray(bodyAt, macAt);
  const mac = raw.subarray(macAt);
  const encKey = deriveKey(ENC_DOMAIN, pk);
  const macKey = deriveKey(MAC_DOMAIN, pk);
  if (!macEq(blake256(concat(macKey, nonce, body)), mac)) return null;
  const plain = decodePlain(xor(body, keystream(encKey, nonce, NOTE_PLAIN_LEN)));
  if (!macEq(plain.pk, pk)) return null;
  return plain;
}

export function toHex(bytes: Uint8Array): Hex {
  return bytesToHex(bytes);
}

/** Locked against `arxon-zk` `note_cipher::tests::known_vector`. */
export const KNOWN_V1_HEX =
  '0x6172786f6e2d6e6f74652d76310144444444444444444444444444444444ac92ded563be8ceb2ae98ef303b6999826e2077434e42d9f6b6a7f0c19606009246c406901070e0ffcc4766f127c99f6c60faf01fce4ef6283fec17ed17ede6ccfab710e0c88697edd55e052c0de8200f558d7632f4a9d6a06a7cbfbd4ccac4a2807fa14f5e5d69ee6c73a9111fad2ff65d709c280cc52ac6a1a50ca4ed46821d4f543509e0152cc' as Hex;
