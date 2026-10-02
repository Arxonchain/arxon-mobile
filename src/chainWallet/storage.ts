const MNEMONIC_KEY = 'arxon.mnemonic';
const RPC_KEY = 'arxon.rpc';
const ACTIVITY_KEY = 'arxon.activity';

function read(key: string): string | null {
  try {
    return globalThis.localStorage?.getItem(key) ?? null;
  } catch {
    return null;
  }
}

function write(key: string, value: string): void {
  globalThis.localStorage?.setItem(key, value);
}

function remove(key: string): void {
  globalThis.localStorage?.removeItem(key);
}

export const chainStorage = {
  getMnemonic: () => Promise.resolve(read(MNEMONIC_KEY)),
  setMnemonic: (mnemonic: string) => {
    write(MNEMONIC_KEY, mnemonic);
    return Promise.resolve();
  },
  clearMnemonic: () => {
    remove(MNEMONIC_KEY);
    return Promise.resolve();
  },
  getRpc: () => Promise.resolve(read(RPC_KEY)),
  setRpc: (rpc: string) => {
    write(RPC_KEY, rpc);
    return Promise.resolve();
  },
  getActivity: () => Promise.resolve(read(ACTIVITY_KEY)),
  setActivity: (json: string) => {
    write(ACTIVITY_KEY, json);
    return Promise.resolve();
  },
  clearActivity: () => {
    remove(ACTIVITY_KEY);
    return Promise.resolve();
  },
};
