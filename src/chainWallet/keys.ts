import { english, generateMnemonic, mnemonicToAccount } from 'viem/accounts';

export function newMnemonic(): string {
  return generateMnemonic(english);
}

export function accountFromMnemonic(mnemonic: string) {
  return mnemonicToAccount(mnemonic.trim());
}
