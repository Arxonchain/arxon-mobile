import { describe, expect, it } from 'vitest';
import {
  briefUser,
  creditedToTheirVaultCopy,
  creditedToWalletCopy,
  creditedToYourPublicCopy,
  creditedToYourVaultCopy,
  recipientCreditedInCopy,
  vaultCreditedInCopy,
  walletReceivesCopy,
} from './txNotify';

const addr = '0x1234567890abcdef1234567890abcdef12345678';

describe('txNotify copy', () => {
  it('shortens a 0x address', () => {
    expect(briefUser(addr)).toBe('0x1234…5678');
  });

  it('matches sender and receive copy', () => {
    expect(walletReceivesCopy('0.5', addr)).toBe('wallet 0x1234…5678 receives 0.5 tARX');
    expect(creditedToTheirVaultCopy('0.5', addr)).toBe('0.5 tARX credited to 0x1234…5678 vault wallet');
    expect(creditedToWalletCopy('0.5', addr)).toBe('0.5 tARX credited to wallet 0x1234…5678');
    expect(creditedToYourVaultCopy('0.5')).toBe('0.5 tARX credited to your vault wallet');
    expect(creditedToYourPublicCopy('0.5')).toBe('0.5 tARX credited to your public wallet');
    expect(recipientCreditedInCopy('6s')).toBe('Recipient will be credited in 6s');
    expect(vaultCreditedInCopy('6s')).toBe('Your vault wallet will be credited in 6s');
  });
});
