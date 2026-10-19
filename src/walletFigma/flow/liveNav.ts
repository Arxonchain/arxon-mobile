import type { PrivacyFlags } from '@/chainWallet/privacy';
import { addHdAccount, currentPassword, saveDeviceBackup, sessionStore, setUnlockPassword } from '@/chainWallet/session';
import { enableBiometrics, verifyBiometrics } from '@/chainWallet/biometrics';
import { createDisclosureCode } from '@/chainWallet/disclosure';
import { saveSupportReport } from '@/chainWallet/reports';
import { writeDefaultPrivacy } from '@/walletFigma/privacyPrefs';
import { setVaultLockRequired } from './VaultScreens';

export type NavDecision = { block?: boolean; replace?: string; note?: string };

type WalletApi = {
  mnemonic: string | null;
  address: string | null;
  shieldedPk: string | null;
  rpcUrl: string;
  network: 'ethereum' | 'arxon';
  createWallet: () => Promise<string>;
  sendShielded: (amount: string, flags: PrivacyFlags) => Promise<string>;
  sendUnshield: (to: `0x${string}`, amount: string, flags: PrivacyFlags) => Promise<string>;
  sendPrivate: (pk: string, amount: string, flags: PrivacyFlags) => Promise<string>;
  setNetwork: (id: 'ethereum' | 'arxon') => Promise<void>;
  setRpcUrl: (url: string) => Promise<string>;
  setAccountIndex: (index: number) => Promise<void>;
  logout: () => Promise<void>;
};

type LiveNavInput = {
  from: string;
  to: string;
  password: string;
  wallet: WalletApi;
  openMining?: () => void;
  wc?: {
    proposal: unknown;
    request: unknown;
    sessions: { topic: string; name: string }[];
    approveProposal: () => Promise<void>;
    rejectProposal: () => Promise<void>;
    approveRequest: () => Promise<void>;
    rejectRequest: () => Promise<void>;
    pair: (uri: string) => Promise<void>;
    disconnect: (topic: string) => Promise<void>;
  } | null;
};

export async function beforeGo(input: LiveNavInput): Promise<NavDecision> {
  const { from, to, password, wallet, openMining, wc } = input;

  if (from === 'create' && (to === 'backup' || to === 'backup-manual')) {
    if (password.length >= 8) await setUnlockPassword(password);
    if (!wallet.mnemonic) await wallet.createWallet();
    return {};
  }

  if (to === 'drive-confirm') {
    return {
      note: 'Google Drive is not connected. Confirm your password to save an encrypted backup on this device.',
    };
  }

  if (to === 'drive-done') {
    const secret = wallet.mnemonic;
    const pass = currentPassword() || password;
    if (!secret || !pass) {
      return { block: true, note: 'Google Drive is not connected, and there is no password to encrypt a device backup.' };
    }
    await saveDeviceBackup(pass, secret);
    return {
      replace: 'ready-skip',
      note: 'Google Drive is not connected. An encrypted backup was saved on this device.',
    };
  }

  if (from === 'face' && to === 'ready-skip') {
    try {
      await enableBiometrics();
    } catch (e) {
      return {
        note: e instanceof Error ? e.message : 'Face ID is not available on this device.',
      };
    }
    if (!wallet.mnemonic) await wallet.createWallet();
    return {};
  }

  if (to === 'ready-skip' || to === 'phrase-done' || (from === 'phrase-confirm' && to === 'phrase-done')) {
    if (to === 'phrase-done') sessionStore.setPhraseVerified(true);
    if (!wallet.mnemonic) await wallet.createWallet();
    return {};
  }

  if (to === 'swap-success' || to === 'swap-review' && from === 'swap') {
    if (to === 'swap-success') {
      return { block: true, note: 'No swap quote is available. This wallet does not run a DEX.' };
    }
  }
  if (to === 'swap-success') {
    return { block: true, note: 'No swap quote is available. This wallet does not run a DEX.' };
  }

  if (to === 'buy-status') {
    return { block: true, note: 'This provider is not connected yet.' };
  }

  if (to === 'vault-pending' || to === 'priv-pending' || to === 'unshield-pending') {
    return { block: true, note: 'Confirm from the Vault review uses the live send path. Nothing was broadcast from this shortcut.' };
  }

  if (to === 'claim-done') {
    return { block: true, note: 'Claim did not credit Account ARX. Open Mining to claim ARX-P, or try again when a mint path exists.' };
  }

  if (to === 'mine-entry' || to === 'mine-dash' || to === 'mine-ready' || to === 'mine-access' || to === 'mine-bg') {
    openMining?.();
    return { block: true };
  }

  if (from === 'add-account' && to === 'accounts') {
    const row = addHdAccount();
    await wallet.setAccountIndex(row.index);
    return { note: `${row.label} created from your recovery phrase.` };
  }

  if (to === 'dapp' && !wc?.proposal && !wc?.request) {
    return {
      note: 'No WalletConnect request is waiting. Paste a wc: URI from the dApp to pair. This overlay does not invent a connection.',
    };
  }

  if (from === 'dapp' && (to === 'home' || to === 'home-funded')) {
    return { replace: 'home' };
  }

  if (from === 'dapp-tx' && to === 'send-success') {
    if (!wc?.request) {
      return { block: true, note: 'No WalletConnect transaction is waiting. Nothing was signed.' };
    }
    try {
      await wc.approveRequest();
      return { replace: 'home' };
    } catch (e) {
      return { block: true, note: e instanceof Error ? e.message : 'Could not approve that request.' };
    }
  }
  if (from === 'dapp-tx' && (to === 'home' || to === 'home-funded')) {
    try {
      await wc?.rejectRequest();
    } catch {
      /* reject is best-effort */
    }
    return { replace: 'home' };
  }

  if (to === 'code-ready') {
    const row = createDisclosureCode('Lawyer', '');
    return { note: `Code ${row.code} saved on this device. It is single-use and is not a key.` };
  }

  if (from === 'report' && to === 'help') {
    saveSupportReport({ kind: 'Other', note: 'Report from Account', diagnostics: true });
    return { note: 'Report saved on this device. No keys or balances were included.' };
  }

  if (to === 'testnet') {
    await wallet.setNetwork('arxon');
    return {};
  }
  if (to === 'home' || to.startsWith('home-') || to === 'more') {
    await wallet.setNetwork('ethereum');
    return {};
  }

  if (to === 'network' && from === 'receive') {
    return {};
  }

  if (from === 'defaults' && to === 'privacy') {
    return {};
  }

  if (to === 'arxswap' || (from === 'arxswap' && to === 'dapp')) {
    return {
      note: 'Arxswap is a WalletConnect dApp, not an in-app DEX. Paste a wc: URI from the dApp to pair.',
    };
  }
  if (from === 'dapp' && to !== 'home' && to !== 'home-funded' && !wc?.proposal) {
    return {};
  }

  setVaultLockRequired(sessionStore.vaultLock());
  return {};
}

export { writeDefaultPrivacy };
