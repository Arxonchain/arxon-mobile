import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { persistWalletSecret, rememberPassword, sessionStore } from './session';

function memoryStorage() {
  const map = new Map<string, string>();
  return {
    getItem: (key: string) => map.get(key) ?? null,
    setItem: (key: string, value: string) => {
      map.set(key, value);
    },
    removeItem: (key: string) => {
      map.delete(key);
    },
    clear: () => map.clear(),
  };
}

describe('persistWalletSecret', () => {
  const previous = globalThis.localStorage;

  beforeEach(() => {
    Object.defineProperty(globalThis, 'localStorage', { value: memoryStorage(), configurable: true });
    rememberPassword(null);
  });

  afterEach(() => {
    rememberPassword(null);
    if (previous) Object.defineProperty(globalThis, 'localStorage', { value: previous, configurable: true });
  });

  it('keeps plaintext only when no wallet password is set', async () => {
    await persistWalletSecret('canyon river amber north silver garden orbit maple quiet harbor velvet stone');
    expect(localStorage.getItem('arxon.mnemonic')).toContain('canyon');
    expect(sessionStore.getBox()).toBeNull();
  });

  it('encrypts then deletes plaintext when a password is in session', async () => {
    rememberPassword('Arxon123!');
    await persistWalletSecret('canyon river amber north silver garden orbit maple quiet harbor velvet stone');
    expect(localStorage.getItem('arxon.mnemonic')).toBeNull();
    expect(sessionStore.getBox()).toBeTruthy();
  });
});
