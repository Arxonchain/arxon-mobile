import type { TourStepConfig } from './steps';
import type { WalletTourStepId } from './walletTourStorage';

export type WalletTourStepConfig = TourStepConfig & {
  id: WalletTourStepId;
  walletScreen?: string;
};

export const WALLET_TOUR_STEPS: WalletTourStepConfig[] = [
  {
    id: 'welcome',
    title: 'Your Arxon wallet',
    message: 'Home holds your funds. Testnet is for tARX, Shield, and the 4-tx tasks. Tap Start.',
    accent: 'hsl(215 55% 62%)',
  },
  {
    id: 'mode-toggle',
    title: 'Wallet or Mining',
    message: 'Wallet is this chain wallet. Mining is ARX-P, tasks, and Arena. Switch anytime from Home.',
    walletScreen: 'home-funded',
    target: 'mode-toggle',
    accent: 'hsl(190 85% 55%)',
    card: 'bottom',
  },
  {
    id: 'wallet-balance',
    title: 'Total balance',
    message: 'This is your Home balance. Copy the address from the card to receive on this account.',
    walletScreen: 'home-funded',
    target: 'wallet-balance',
    accent: 'hsl(190 85% 55%)',
    card: 'bottom',
  },
  {
    id: 'wallet-actions',
    title: 'Move funds',
    message: 'Send, Deposit, Swap, and Buy. Deposit shows a QR. Send asks for an address and amount.',
    walletScreen: 'home-funded',
    target: 'wallet-actions',
    accent: 'hsl(38 90% 55%)',
    card: 'bottom',
  },
  {
    id: 'wallet-tokens',
    title: 'Tokens',
    message: 'Each row is a token on this account. Open one for receive, send, and history. Manage hides tokens you do not use.',
    walletScreen: 'home-funded',
    target: 'wallet-tokens',
    accent: 'hsl(215 55% 62%)',
    card: 'top',
  },
  {
    id: 'wallet-tabs',
    title: 'Bottom tabs',
    message: 'Home, Market, Explore, Testnet, and Account. Testnet is a separate home for tARX — it is not Mining.',
    walletScreen: 'home-funded',
    target: 'wallet-tabs',
    accent: 'hsl(190 85% 55%)',
    card: 'top',
  },
  {
    id: 'wallet-tab-testnet',
    title: 'Open Testnet',
    message: 'Tap Testnet. You add Arxon testnet once, then faucet, send, shield, and private pay live here.',
    walletScreen: 'testnet',
    target: 'wallet-tab-Testnet',
    accent: 'hsl(155 50% 52%)',
    card: 'top',
  },
  {
    id: 'testnet-add',
    title: 'Add Arxon Testnet',
    message: 'Tap Add Arxon Testnet (chain 7171). Tokens stay hidden until this network is on the account.',
    walletScreen: 'testnet',
    target: 'testnet-add',
    accent: 'hsl(155 50% 52%)',
    card: 'bottom',
  },
  {
    id: 'testnet-portfolio',
    title: 'tARX portfolio',
    message: 'Public plus shielded tARX. This is testnet value — not your Home ETH or mining ARX-P.',
    walletScreen: 'testnet',
    target: 'testnet-portfolio',
    accent: 'hsl(190 85% 55%)',
    card: 'bottom',
  },
  {
    id: 'testnet-privacy',
    title: 'Shield & private pay',
    message: 'Shield moves tARX into the vault. Private pay sends shielded. Unshield brings it back to public.',
    walletScreen: 'testnet',
    target: 'testnet-privacy',
    accent: 'hsl(270 70% 68%)',
    card: 'bottom',
  },
  {
    id: 'testnet-wallets',
    title: 'Public and shielded',
    message: 'Public ARX wallet is visible tARX. Shielded wallet is the vault. Open either card for its book.',
    walletScreen: 'testnet',
    target: 'testnet-wallets',
    accent: 'hsl(215 55% 62%)',
    card: 'bottom',
  },
  {
    id: 'testnet-actions',
    title: 'Send, deposit, faucet',
    message: 'Send and Deposit use tARX. Faucet tops up testnet. Swap is for testnet pairs when a quote exists.',
    walletScreen: 'testnet',
    target: 'testnet-actions',
    accent: 'hsl(38 90% 55%)',
    card: 'top',
  },
  {
    id: 'testnet-history',
    title: 'Testnet history',
    message: 'Shield, private pay, and unshield land here. Mining 4-tx tasks count only the wallet you connected.',
    walletScreen: 'testnet',
    target: 'testnet-history',
    accent: 'hsl(155 50% 52%)',
    card: 'top',
  },
  {
    id: 'wallet-account',
    title: 'Account',
    message: 'Backup, security, networks, and help. Come back here if you need to replay this guide later.',
    walletScreen: 'account',
    target: 'wallet-tab-Account',
    accent: 'hsl(215 55% 62%)',
    card: 'top',
  },
];

export function nextWalletTourStepId(
  currentId: WalletTourStepId,
  shouldSkip: (id: WalletTourStepId) => boolean,
): WalletTourStepId | null {
  const idx = WALLET_TOUR_STEPS.findIndex((s) => s.id === currentId);
  for (let i = idx + 1; i < WALLET_TOUR_STEPS.length; i++) {
    const id = WALLET_TOUR_STEPS[i].id;
    if (!shouldSkip(id)) return id;
  }
  return null;
}
