import { english, generateMnemonic, mnemonicToAccount, privateKeyToAccount } from 'viem/accounts';
import { hexToBytes, type Hex } from 'viem';

export function newMnemonic(): string {
  return generateMnemonic(english);
}

export function accountFromMnemonic(mnemonic: string, addressIndex = 0) {
  return mnemonicToAccount(mnemonic.trim(), { addressIndex });
}

export function resolveAccount(secret: string, addressIndex = 0) {
  const trimmed = secret.trim();
  if (/^(0x)?[0-9a-fA-F]{64}$/.test(trimmed)) return accountFromPrivateKey(trimmed);
  return mnemonicToAccount(trimmed, { addressIndex });
}

export function accountFromPrivateKey(raw: string) {
  const hex = raw.trim().replace(/^0x/i, '');
  if (!/^[0-9a-fA-F]{64}$/.test(hex)) {
    throw new Error('Enter a 64-character private key.');
  }
  return privateKeyToAccount(`0x${hex}` as Hex);
}

export function looksLikePrivateKey(raw: string) {
  const hex = raw.trim().replace(/^0x/i, '');
  return /^[0-9a-fA-F]{64}$/.test(hex);
}

export function bytesFromPrivateKey(raw: string) {
  return hexToBytes(`0x${raw.trim().replace(/^0x/i, '')}` as Hex);
}
