const MNEMONIC_KEY = 'arxon.mnemonic';
const RPC_KEY = 'arxon.rpc';
const ACTIVITY_KEY = 'arxon.activity';
const SHIELDED_SK_KEY = 'arxon.shieldedSk';
const NOTES_KEY = 'arxon.notes';
const LEAVES_KEY = 'arxon.leaves';
const LEAF_SCAN_KEY = 'arxon.leafScanAt';
const WC_PROJECT_KEY = 'arxon.wcProjectId';

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

export const storage = {
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
  getShieldedSk: () => Promise.resolve(read(SHIELDED_SK_KEY)),
  setShieldedSk: (sk: string) => {
    write(SHIELDED_SK_KEY, sk);
    return Promise.resolve();
  },
  clearShieldedSk: () => {
    remove(SHIELDED_SK_KEY);
    return Promise.resolve();
  },
  getNotes: () => Promise.resolve(read(NOTES_KEY)),
  setNotes: (json: string) => {
    write(NOTES_KEY, json);
    return Promise.resolve();
  },
  clearNotes: () => {
    remove(NOTES_KEY);
    return Promise.resolve();
  },
  getLeaves: () => Promise.resolve(read(LEAVES_KEY)),
  setLeaves: (json: string) => {
    write(LEAVES_KEY, json);
    return Promise.resolve();
  },
  clearLeaves: () => {
    remove(LEAVES_KEY);
    return Promise.resolve();
  },
  getLeafScanAt: () => Promise.resolve(read(LEAF_SCAN_KEY)),
  setLeafScanAt: (block: string) => {
    write(LEAF_SCAN_KEY, block);
    return Promise.resolve();
  },
  clearLeafScanAt: () => {
    remove(LEAF_SCAN_KEY);
    return Promise.resolve();
  },
  getWcProjectId: () => Promise.resolve(read(WC_PROJECT_KEY)),
  setWcProjectId: (id: string) => {
    write(WC_PROJECT_KEY, id);
    return Promise.resolve();
  },
};

export const chainStorage = storage;
