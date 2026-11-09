import { showTrayNotification } from '@/lib/showTrayNotification';

export function notifyTx(title: string, body: string, tag: string) {
  void showTrayNotification(title, body, { tag, url: '/' });
}

/** Short 0x / shielded key for notification copy. */
export function briefUser(value: string) {
  const text = value.trim();
  if (/^0x[0-9a-fA-F]{40,}$/.test(text)) return `${text.slice(0, 6)}…${text.slice(-4)}`;
  if (text.length > 18) return `${text.slice(0, 8)}…`;
  return text || 'wallet';
}

export function walletReceivesCopy(amount: string, to: string) {
  return `wallet ${briefUser(to)} receives ${amount} tARX`;
}

export function creditedToWalletCopy(amount: string, to: string) {
  return `${amount} tARX credited to wallet ${briefUser(to)}`;
}

export function creditedToTheirVaultCopy(amount: string, to: string) {
  return `${amount} tARX credited to ${briefUser(to)} vault wallet`;
}

export function creditedToYourVaultCopy(amount: string) {
  return `${amount} tARX credited to your vault wallet`;
}

export function creditedToYourPublicCopy(amount: string) {
  return `${amount} tARX credited to your public wallet`;
}

export function recipientCreditedInCopy(eta: string) {
  return `Recipient will be credited in ${eta}`;
}

export function vaultCreditedInCopy(eta: string) {
  return `Your vault wallet will be credited in ${eta}`;
}

export const TITLE_PRIVATE = 'Sent (private pay)';
export const TITLE_UNSHIELD = 'withdrawal (unshield)';
export const TITLE_SHIELD = 'deposit (shield)';
export const TITLE_RECEIVED = 'Received deposit';
