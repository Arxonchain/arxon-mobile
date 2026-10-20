import { hmac } from '@noble/hashes/hmac';
import { sha256 } from '@noble/hashes/sha256';
import { sha512 } from '@noble/hashes/sha512';
import { ripemd160 } from '@noble/hashes/ripemd160';
import { pbkdf2 } from '@noble/hashes/pbkdf2';
import { mnemonicToAccount } from 'viem/accounts';

export type AltAddresses = {
  eth: string;
  btc: string | null;
  sol: string | null;
};

export async function addressesFromMnemonic(mnemonic: string, addressIndex = 0): Promise<AltAddresses> {
  const eth = mnemonicToAccount(mnemonic.trim(), { addressIndex }).address;
  let btc: string | null = null;
  let sol: string | null = null;
  try {
    btc = await bitcoinAddress(mnemonic, addressIndex);
  } catch {
    btc = null;
  }
  try {
    sol = await solanaAddress(mnemonic, addressIndex);
  } catch {
    sol = null;
  }
  return { eth, btc, sol };
}

function seedFromMnemonic(mnemonic: string) {
  return pbkdf2(sha512, mnemonic.normalize('NFKD'), 'mnemonic'.normalize('NFKD'), { c: 2048, dkLen: 64 });
}

async function bitcoinAddress(mnemonic: string, index: number) {
  const [{ HDKey }, { bech32 }] = await Promise.all([import('@scure/bip32'), import('@scure/base')]);
  const child = HDKey.fromMasterSeed(seedFromMnemonic(mnemonic)).derive(`m/84'/0'/0'/0/${index}`);
  if (!child.publicKey) throw new Error('No BTC key');
  const hash = ripemd160(sha256(child.publicKey));
  return bech32.encode('bc', [0, ...bech32.toWords(hash)]);
}

async function solanaAddress(mnemonic: string, index: number) {
  const [{ ed25519 }, { base58 }] = await Promise.all([import('@noble/curves/ed25519.js'), import('@scure/base')]);
  const seed = seedFromMnemonic(mnemonic);
  const master = hmac(sha512, new TextEncoder().encode('ed25519 seed'), seed);
  let key = master.slice(0, 32);
  let chain = master.slice(32);
  const path = [44 + 0x80000000, 501 + 0x80000000, index + 0x80000000, 0x80000000];
  for (const step of path) {
    const data = new Uint8Array(37);
    data[0] = 0;
    data.set(key, 1);
    data[33] = (step >>> 24) & 0xff;
    data[34] = (step >>> 16) & 0xff;
    data[35] = (step >>> 8) & 0xff;
    data[36] = step & 0xff;
    const next = hmac(sha512, chain, data);
    key = next.slice(0, 32);
    chain = next.slice(32);
  }
  return base58.encode(ed25519.getPublicKey(key));
}
