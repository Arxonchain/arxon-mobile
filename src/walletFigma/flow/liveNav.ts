import type { PrivacyFlags } from '@/chainWallet/privacy';
import { addHdAccount, currentPassword, sessionStore, setUnlockPassword } from '@/chainWallet/session';
import { enableBiometrics } from '@/chainWallet/biometrics';
import { writeDefaultPrivacy } from '@/walletFigma/privacyPrefs';
import { downloadDriveBackup, driveConfigured, uploadDriveBackup } from '@/chainWallet/googleDrive';
import { setVaultLockRequired } from './VaultScreens';
import { resolvePhraseWords } from './phraseWords';

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
  importWallet: (phrase: string) => Promise<void>;
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

function phraseWordCount(mnemonic: string | null) {
  return mnemonic ? mnemonic.trim().split(/\s+/).filter(Boolean).length : 0;
}

export async function beforeGo(input: LiveNavInput): Promise<NavDecision> {
  const { from, to, password, wallet, openMining, wc } = input;

  if (from === 'slide16' && (to === 'create' || to === 'caution1')) {
    sessionStore.setSetupPath('create');
    if (!wallet.mnemonic) await wallet.createWallet();
    return to === 'create' ? { replace: 'caution1' } : {};
  }

  if (from === 'slide16' && to === 'import') {
    sessionStore.setSetupPath('import');
    return {};
  }

  if (from === 'import' && (to === 'phrase-confirm' || to === 'create')) {
    sessionStore.setSetupPath('import');
    return {};
  }

  if (from === 'import' && (to === 'ready-skip' || to === 'home' || to.startsWith('home-'))) {
    sessionStore.setSetupPath('import');
    return { replace: phraseWordCount(wallet.mnemonic) >= 12 ? 'phrase-confirm' : 'create' };
  }

  if ((from === 'phrase-confirm' || from === 'phrase-shown') && (to === 'phrase-done' || to === 'create')) {
    const resolved = resolvePhraseWords({
      app: true,
      words: wallet.mnemonic ? wallet.mnemonic.trim().split(/\s+/) : null,
    });
    if (!resolved.usable && sessionStore.setupPath() !== 'import') {
      return { block: true, note: 'Recovery phrase is not ready to confirm.' };
    }
    sessionStore.setPhraseVerified(true);
    return to === 'create' ? {} : { replace: 'create' };
  }

  if (from === 'create' && (to === 'backup' || to === 'backup-manual' || to === 'ready-skip')) {
    if (password.length < 8) {
      return { block: true, note: 'Create a password of at least 8 characters.' };
    }
    await setUnlockPassword(password);
    if (!wallet.mnemonic) await wallet.createWallet();
    if (to === 'ready-skip') sessionStore.setSetupPath(null);
    return {};
  }

  if (to === 'drive-confirm') {
    if (!driveConfigured()) {
      return {
        block: true,
        note: 'Set VITE_GOOGLE_DRIVE_CLIENT_ID to your Google OAuth web client ID, then rebuild. Drive backup was not started.',
      };
    }
    try {
      const { connectGoogleDrive } = await import('@/chainWallet/googleDrive');
      await connectGoogleDrive();
      return { note: 'Google account connected. Confirm your password to encrypt the backup.' };
    } catch (e) {
      return { block: true, note: e instanceof Error ? e.message : 'Google Drive sign-in failed.' };
    }
  }

  if (to === 'drive-done') {
    const pass = currentPassword() || password;
    if (!pass) {
      return { block: true, note: 'Enter the wallet password to encrypt the Google Drive backup.' };
    }
    try {
      try {
        const restored = await downloadDriveBackup(pass);
        await wallet.importWallet(restored);
        return { note: 'Wallet restored from Google Drive.' };
      } catch (e) {
        const msg = e instanceof Error ? e.message : '';
        if (!msg.includes('No Arxon backup')) {
          return { block: true, note: msg || 'Google Drive backup failed.' };
        }
      }
      if (!wallet.mnemonic) {
        return { block: true, note: 'No wallet on this device and no Google Drive backup opened with that password.' };
      }
      const box = await uploadDriveBackup(pass, wallet.mnemonic);
      sessionStore.setBackup(box);
      return { note: 'Encrypted backup saved to Google Drive.' };
    } catch (e) {
      return { block: true, note: e instanceof Error ? e.message : 'Google Drive backup failed.' };
    }
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
    if (!sessionStore.hasPassword()) return { replace: 'create' };
    return {};
  }

  if (to === 'ready-skip' || to === 'phrase-done') {
    if (to === 'phrase-done') sessionStore.setPhraseVerified(true);
    if (!wallet.mnemonic) await wallet.createWallet();
    if (!sessionStore.hasPassword()) return { replace: 'create' };
    sessionStore.setSetupPath(null);
    return to === 'phrase-done' ? { replace: 'create' } : {};
  }

  if (to === 'swap-success') {
    return { block: true, note: 'Coming soon' };
  }

  if (to === 'send-privacy' && wallet.network !== 'arxon') {
    return { block: true, note: 'Privacy is available on Arxon Testnet only.' };
  }

  if (to === 'buy-status') {
    return { block: true, note: 'Coming soon' };
  }

  if (to === 'vault-pending' || to === 'priv-pending' || to === 'unshield-pending') {
    return { block: true, note: 'Confirm from the Vault review uses the live send path. Nothing was broadcast from this shortcut.' };
  }

  if (to === 'claim-done') {
    return { block: true, note: 'Coming soon' };
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
    return { block: true, note: 'Coming soon' };
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

  if (to === 'testnet') {
    if (sessionStore.testnetAdded()) await wallet.setNetwork('arxon');
    return {};
  }
  if (
    to.startsWith('vault') ||
    to.startsWith('priv-') ||
    to.startsWith('unshield-') ||
    to === 'send-amount-vault'
  ) {
    if (!sessionStore.testnetAdded()) return { replace: 'testnet' };
    await wallet.setNetwork('arxon');
    return {};
  }
  if (to === 'home' || to.startsWith('home-') || (to === 'more' && from !== 'testnet')) {
    if (!sessionStore.hasPassword()) return { replace: 'create' };
    sessionStore.setSetupPath(null);
    await wallet.setNetwork('ethereum');
    return {};
  }

  if (to === 'network' && from === 'receive') {
    return {};
  }

  if (from === 'defaults' && to === 'privacy') {
    return {};
  }

  if (from === 'dapp' && to !== 'home' && to !== 'home-funded' && !wc?.proposal) {
    return {};
  }

  setVaultLockRequired(sessionStore.vaultLock());
  return {};
}

export { writeDefaultPrivacy };
