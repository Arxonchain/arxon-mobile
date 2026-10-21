import { hashPassword, openSecret, sealSecret, verifyPassword, type PassRecord, type SecretBox } from './cryptoBox';
import { storage } from './storage';

const LOCK_MINUTES = [5, 10, 20, 30];

export type HdAccount = { index: number; label: string };

export type AutoLock = 'Immediately' | '1 minute' | '5 minutes' | '15 minutes' | '1 hour';

export const AUTOLOCK_MS: Record<AutoLock, number> = {
  Immediately: 0,
  '1 minute': 60_000,
  '5 minutes': 5 * 60_000,
  '15 minutes': 15 * 60_000,
  '1 hour': 60 * 60_000,
};

function parse<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export const sessionStore = {
  getPass: () => parse<PassRecord | null>(localStorage.getItem('arxon.passHash'), null),
  setPass: (record: PassRecord) => localStorage.setItem('arxon.passHash', JSON.stringify(record)),
  clearPass: () => localStorage.removeItem('arxon.passHash'),

  getBox: () => parse<SecretBox | null>(localStorage.getItem('arxon.mnemonicBox'), null),
  setBox: (box: SecretBox) => localStorage.setItem('arxon.mnemonicBox', JSON.stringify(box)),
  clearBox: () => localStorage.removeItem('arxon.mnemonicBox'),

  getSkBox: () => parse<SecretBox | null>(localStorage.getItem('arxon.shieldedSkBox'), null),
  setSkBox: (box: SecretBox) => localStorage.setItem('arxon.shieldedSkBox', JSON.stringify(box)),
  clearSkBox: () => localStorage.removeItem('arxon.shieldedSkBox'),

  getBackup: () => parse<SecretBox | null>(localStorage.getItem('arxon.deviceBackup'), null),
  setBackup: (box: SecretBox) => localStorage.setItem('arxon.deviceBackup', JSON.stringify(box)),

  phraseVerified: () => localStorage.getItem('arxon.phraseVerified') === '1',
  setPhraseVerified: (on: boolean) => localStorage.setItem('arxon.phraseVerified', on ? '1' : '0'),

  biometrics: () => localStorage.getItem('arxon.biometrics') === '1',
  setBiometrics: (on: boolean) => localStorage.setItem('arxon.biometrics', on ? '1' : '0'),

  vaultLock: () => localStorage.getItem('arxon.vaultLock') !== '0',
  setVaultLock: (on: boolean) => localStorage.setItem('arxon.vaultLock', on ? '1' : '0'),

  autoLock: (): AutoLock => {
    const raw = localStorage.getItem('arxon.autoLock') as AutoLock | null;
    return raw && raw in AUTOLOCK_MS ? raw : '5 minutes';
  },
  setAutoLock: (value: AutoLock) => localStorage.setItem('arxon.autoLock', value),

  accounts: (): HdAccount[] => parse<HdAccount[]>(localStorage.getItem('arxon.hdAccounts'), [{ index: 0, label: 'Account 01' }]),
  setAccounts: (rows: HdAccount[]) => localStorage.setItem('arxon.hdAccounts', JSON.stringify(rows)),
  accountIndex: () => Number(localStorage.getItem('arxon.accountIndex') ?? '0') || 0,
  setAccountIndex: (index: number) => localStorage.setItem('arxon.accountIndex', String(index)),

  vaultFails: () => Number(localStorage.getItem('arxon.vaultFails') ?? '0') || 0,
  setVaultFails: (n: number) => localStorage.setItem('arxon.vaultFails', String(n)),
  vaultLockLevel: () => Number(localStorage.getItem('arxon.vaultLockLevel') ?? '0') || 0,
  setVaultLockLevel: (n: number) => localStorage.setItem('arxon.vaultLockLevel', String(n)),
  vaultLockedUntil: () => Number(localStorage.getItem('arxon.vaultLockedUntil') ?? '0') || 0,
  setVaultLockedUntil: (ms: number) => localStorage.setItem('arxon.vaultLockedUntil', String(ms)),

  hasPassword: () => !!localStorage.getItem('arxon.passHash'),

  testnetAdded: () => localStorage.getItem('arxon.testnetAdded') === '1',
  setTestnetAdded: (on: boolean) => localStorage.setItem('arxon.testnetAdded', on ? '1' : '0'),
};

let sessionPassword: string | null = null;
let lastActive = Date.now();

export function rememberPassword(password: string | null) {
  sessionPassword = password;
  lastActive = Date.now();
}

export function currentPassword() {
  return sessionPassword;
}

export function touchSession() {
  lastActive = Date.now();
}

export function autoLockDue() {
  if (!sessionPassword && !sessionStore.hasPassword()) return false;
  const ms = AUTOLOCK_MS[sessionStore.autoLock()];
  if (ms === 0) return document.visibilityState === 'hidden';
  return Date.now() - lastActive >= ms;
}

export async function setUnlockPassword(password: string) {
  sessionStore.setPass(await hashPassword(password));
  rememberPassword(password);
  const mnemonic = await storage.getMnemonic();
  if (mnemonic) {
    sessionStore.setBox(await sealSecret(password, mnemonic));
    await storage.clearMnemonic();
  }
}

export async function checkUnlockPassword(password: string) {
  const record = sessionStore.getPass();
  if (!record) return password.length > 0;
  return verifyPassword(password, record);
}

export async function sealMnemonic(password: string, mnemonic: string) {
  sessionStore.setBox(await sealSecret(password, mnemonic));
}

/** Encrypt with the session password when set. Never keep plaintext next to an encrypted box. */
export async function persistWalletSecret(plain: string) {
  const pass = currentPassword();
  if (pass) {
    await sealMnemonic(pass, plain);
    await storage.clearMnemonic();
    return;
  }
  await storage.setMnemonic(plain);
}

export async function persistShieldedSk(sk: string) {
  const pass = currentPassword();
  if (pass) {
    sessionStore.setSkBox(await sealSecret(pass, sk));
    await storage.clearShieldedSk();
    return;
  }
  await storage.setShieldedSk(sk);
}

export async function readShieldedSk(): Promise<string | null> {
  const pass = currentPassword();
  const box = sessionStore.getSkBox();
  if (box && pass) {
    try {
      return await openSecret(pass, box);
    } catch {
      return null;
    }
  }
  return storage.getShieldedSk();
}

export async function migratePlainSecrets(password: string, mnemonic?: string | null) {
  const plain = mnemonic ?? (await storage.getMnemonic());
  if (plain) {
    await sealMnemonic(password, plain);
    await storage.clearMnemonic();
  }
  const sk = await storage.getShieldedSk();
  if (sk) {
    sessionStore.setSkBox(await sealSecret(password, sk));
    await storage.clearShieldedSk();
  }
}

export async function dropPlainSecretsIfEncrypted() {
  if (sessionStore.getBox()) await storage.clearMnemonic();
  if (sessionStore.getSkBox()) await storage.clearShieldedSk();
}

export async function unlockWithPassword(password: string): Promise<string | null> {
  if (!(await checkUnlockPassword(password))) return null;
  rememberPassword(password);
  const box = sessionStore.getBox();
  if (box) {
    try {
      return await openSecret(password, box);
    } catch {
      return null;
    }
  }
  return storage.getMnemonic();
}

export async function saveDeviceBackup(password: string, mnemonic: string) {
  const box = await sealSecret(password, mnemonic);
  sessionStore.setBackup(box);
  try {
    const blob = new Blob([JSON.stringify({ v: 1, kind: 'arxon-wallet-backup', box })], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'arxon-wallet-backup.json';
    a.click();
    URL.revokeObjectURL(url);
  } catch {
    /* download is optional; the device copy is the real backup */
  }
  return box;
}

export function registerVaultFail() {
  const next = sessionStore.vaultFails() + 1;
  sessionStore.setVaultFails(next);
  if (next >= 5) {
    const level = Math.min(sessionStore.vaultLockLevel(), 3);
    sessionStore.setVaultLockedUntil(Date.now() + LOCK_MINUTES[level] * 60_000);
    sessionStore.setVaultLockLevel(Math.min(level + 1, 3));
    sessionStore.setVaultFails(0);
    return { locked: true as const, until: sessionStore.vaultLockedUntil() };
  }
  return { locked: false as const, fails: next };
}

export function clearVaultFails() {
  sessionStore.setVaultFails(0);
}

export function vaultLockRemaining() {
  return Math.max(0, sessionStore.vaultLockedUntil() - Date.now());
}

export function addHdAccount(label?: string): HdAccount {
  const rows = sessionStore.accounts();
  const index = rows.reduce((max, row) => Math.max(max, row.index), -1) + 1;
  const next: HdAccount = { index, label: label?.trim() || `Account ${String(index + 1).padStart(2, '0')}` };
  sessionStore.setAccounts([...rows, next]);
  sessionStore.setAccountIndex(index);
  return next;
}
