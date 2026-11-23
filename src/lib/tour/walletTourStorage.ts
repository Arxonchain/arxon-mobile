const STORAGE_KEY = 'arxon_wallet_tour_v1';

export type WalletTourStepId =
  | 'welcome'
  | 'mode-toggle'
  | 'wallet-balance'
  | 'wallet-actions'
  | 'wallet-tokens'
  | 'wallet-tabs'
  | 'wallet-tab-testnet'
  | 'testnet-add'
  | 'testnet-portfolio'
  | 'testnet-privacy'
  | 'testnet-wallets'
  | 'testnet-actions'
  | 'testnet-history'
  | 'wallet-account';

export type WalletTourProgress = {
  version: 1;
  finishedAt: string | null;
  skippedAt: string | null;
  lastStep: WalletTourStepId | null;
};

function emptyProgress(): WalletTourProgress {
  return { version: 1, finishedAt: null, skippedAt: null, lastStep: null };
}

export function loadWalletTourProgress(userId: string): WalletTourProgress {
  try {
    const raw = localStorage.getItem(`${STORAGE_KEY}:${userId}`);
    if (!raw) return emptyProgress();
    const parsed = JSON.parse(raw) as WalletTourProgress;
    if (parsed.version !== 1) return emptyProgress();
    return parsed;
  } catch {
    return emptyProgress();
  }
}

export function saveWalletTourProgress(userId: string, progress: WalletTourProgress) {
  try {
    localStorage.setItem(`${STORAGE_KEY}:${userId}`, JSON.stringify(progress));
  } catch {
    /* ignore */
  }
}

export function resetWalletTourProgress(userId: string) {
  try {
    localStorage.removeItem(`${STORAGE_KEY}:${userId}`);
  } catch {
    /* ignore */
  }
}

export function isWalletTourFinished(userId: string): boolean {
  const p = loadWalletTourProgress(userId);
  return Boolean(p.finishedAt || p.skippedAt);
}

export function markWalletTourFinished(userId: string, lastStep: WalletTourStepId) {
  saveWalletTourProgress(userId, {
    version: 1,
    finishedAt: new Date().toISOString(),
    skippedAt: null,
    lastStep,
  });
}

export function markWalletTourSkipped(userId: string, lastStep: WalletTourStepId | null) {
  saveWalletTourProgress(userId, {
    version: 1,
    finishedAt: null,
    skippedAt: new Date().toISOString(),
    lastStep,
  });
}
