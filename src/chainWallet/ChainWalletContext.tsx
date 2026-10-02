import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { formatEther, parseEther, type Address } from 'viem';

import { pushActivity } from './activity';
import { DEFAULT_RPC, publicClient, walletClient } from './chain';
import { accountFromMnemonic, newMnemonic } from './keys';
import { chainStorage } from './storage';

type ChainWalletState = {
  ready: boolean;
  mnemonic: string | null;
  address: Address | null;
  rpcUrl: string;
  balance: string | null;
  rpcError: string | null;
  createWallet: () => Promise<string>;
  importWallet: (phrase: string) => Promise<void>;
  logout: () => Promise<void>;
  setRpcUrl: (url: string) => Promise<string>;
  refreshBalance: (rpcOverride?: string) => Promise<void>;
  sendArx: (to: Address, amount: string) => Promise<`0x${string}`>;
};

const Ctx = createContext<ChainWalletState | null>(null);

async function waitOk(rpcUrl: string, hash: `0x${string}`, label: string) {
  const receipt = await publicClient(rpcUrl).waitForTransactionReceipt({
    hash,
    timeout: 180_000,
  });
  if (receipt.status !== 'success') {
    throw new Error(`${label} reverted on chain (${hash}). Open Activity.`);
  }
}

export function ChainWalletProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [mnemonic, setMnemonic] = useState<string | null>(null);
  const [rpcUrl, setRpc] = useState(DEFAULT_RPC);
  const [balance, setBalance] = useState<string | null>(null);
  const [rpcError, setRpcError] = useState<string | null>(null);
  const rpcGen = useRef(0);

  const address = useMemo(
    () => (mnemonic ? accountFromMnemonic(mnemonic).address : null),
    [mnemonic]
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [saved, storedRpc] = await Promise.all([
        chainStorage.getMnemonic(),
        chainStorage.getRpc(),
      ]);
      if (cancelled) return;
      if (saved) setMnemonic(saved);
      let rpc = storedRpc;
      if (rpc && rpc.includes('trycloudflare.com')) {
        rpc = DEFAULT_RPC;
        await chainStorage.setRpc(rpc);
      }
      if (rpc) setRpc(rpc);
      setReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const refreshBalance = useCallback(
    async (rpcOverride?: string) => {
      if (!address) {
        setBalance(null);
        return;
      }
      const url = (rpcOverride ?? rpcUrl).trim() || DEFAULT_RPC;
      const gen = ++rpcGen.current;
      try {
        const wei = await publicClient(url).getBalance({ address });
        if (gen !== rpcGen.current) return;
        setBalance(formatEther(wei));
        setRpcError(null);
      } catch (e) {
        if (gen !== rpcGen.current) return;
        setBalance(null);
        setRpcError(e instanceof Error ? e.message : 'RPC unreachable');
      }
    },
    [address, rpcUrl]
  );

  useEffect(() => {
    void refreshBalance();
  }, [refreshBalance]);

  const createWallet = useCallback(async () => {
    const phrase = newMnemonic();
    await chainStorage.setMnemonic(phrase);
    setMnemonic(phrase);
    return phrase;
  }, []);

  const importWallet = useCallback(async (phrase: string) => {
    const trimmed = phrase.trim().split(/\s+/).join(' ');
    accountFromMnemonic(trimmed);
    await chainStorage.setMnemonic(trimmed);
    setMnemonic(trimmed);
  }, []);

  const logout = useCallback(async () => {
    await chainStorage.clearMnemonic();
    await chainStorage.clearActivity();
    setMnemonic(null);
    setBalance(null);
  }, []);

  const setRpcUrl = useCallback(async (url: string) => {
    const next = url.trim() || DEFAULT_RPC;
    await chainStorage.setRpc(next);
    setRpc(next);
    return next;
  }, []);

  const sendArx = useCallback(
    async (to: Address, amount: string) => {
      if (!mnemonic) throw new Error('No wallet');
      const client = walletClient(rpcUrl, mnemonic);
      const hash = await client.sendTransaction({
        to,
        value: parseEther(amount),
        type: 'legacy' as const,
      } as unknown as Parameters<typeof client.sendTransaction>[0]);
      await pushActivity({
        hash,
        kind: 'transfer',
        to,
        amount,
        at: Date.now(),
      });
      await waitOk(rpcUrl, hash, 'Send');
      return hash;
    },
    [mnemonic, rpcUrl]
  );

  const value: ChainWalletState = {
    ready,
    mnemonic,
    address,
    rpcUrl,
    balance,
    rpcError,
    createWallet,
    importWallet,
    logout,
    setRpcUrl,
    refreshBalance,
    sendArx,
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useChainWallet() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useChainWallet outside ChainWalletProvider');
  return ctx;
}
