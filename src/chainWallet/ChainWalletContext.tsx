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
import { assertKnownAnchor, DEFAULT_RPC, PRECOMPILE, publicClient, walletClient } from './chain';
import {
  fetchEthereumBalances,
  sendEthereumNative,
  sendEthereumToken,
  type EthereumBalances,
} from './ethereum';
import { isWalletNetworkId, type EthereumToken, type WalletNetworkId } from './networks';
import { relayUrl, submitRelayed } from './relay';
import { accountFromMnemonic, newMnemonic } from './keys';
import {
  commitOutputs,
  hydrateLeaves,
  loadLeaves,
  loadLiveNotes,
  loadNotes,
  markSpent,
  notesOnChain,
  pickNote,
  shieldedTotal,
  type StoredNote,
} from './notes';
import { asBits, type PrivacyFlags } from './privacy';
import { proveKeys, proveShield, proveTransfer, proveUnshield, type NoteSecrets } from './prove';
import { storage } from './storage';
import { shieldCalldata, transferCalldata, unshieldCalldata } from './submit801';

const SHIELD_EXPIRY_BLOCKS = 96;
const UNIT = BigInt(1_000_000_000);

type ChainWalletState = {
  ready: boolean;
  mnemonic: string | null;
  address: Address | null;
  shieldedPk: string | null;
  rpcUrl: string;
  network: WalletNetworkId;
  setNetwork: (id: WalletNetworkId) => Promise<void>;
  balance: string | null;
  ethBalances: EthereumBalances;
  rpcError: string | null;
  notesError: string | null;
  notesStatus: string | null;
  keysError: string | null;
  notes: StoredNote[];
  shieldedBalance: string;
  createWallet: () => Promise<string>;
  importWallet: (phrase: string) => Promise<void>;
  logout: () => Promise<void>;
  setRpcUrl: (url: string) => Promise<string>;
  refreshBalance: (rpcOverride?: string) => Promise<void>;
  refreshNotes: () => Promise<void>;
  refreshKeys: () => Promise<void>;
  sendArx: (to: Address, amount: string) => Promise<`0x${string}`>;
  sendEthereum: (token: EthereumToken, to: Address, amount: string) => Promise<`0x${string}`>;
  sendShielded: (amount: string, flags: PrivacyFlags) => Promise<`0x${string}`>;
  sendPrivate: (recipientPk: string, amount: string, flags: PrivacyFlags) => Promise<`0x${string}`>;
  sendUnshield: (to: Address, amount: string, flags: PrivacyFlags) => Promise<`0x${string}`>;
};

const Ctx = createContext<ChainWalletState | null>(null);

function requireWei(amount: string): bigint {
  const wei = parseEther(amount);
    if (wei === BigInt(0) || wei % UNIT !== BigInt(0)) {
    throw new Error('Shielded amounts must be a whole number of 0.000000001 ARX');
  }
  return wei;
}

async function expiryBlock(rpcUrl: string): Promise<number> {
  const block = await publicClient(rpcUrl).getBlockNumber();
  const expiry = Number(block) + SHIELD_EXPIRY_BLOCKS;
  if (!Number.isSafeInteger(expiry) || expiry <= 0) {
    throw new Error('Could not read a block number from RPC');
  }
  return expiry;
}

async function waitOk(rpcUrl: string, hash: `0x${string}`, label: string) {
  const receipt = await publicClient(rpcUrl).waitForTransactionReceipt({
    hash,
    timeout: 180_000,
  });
  if (receipt.status !== 'success') {
    throw new Error(`${label} reverted on chain (${hash}). Open Activity.`);
  }
}

async function secretsToNotes(secrets: NoteSecrets[]) {
  return secrets.map((n) => ({
    cm: n.cm,
    cv: n.cv,
    rho: n.rho,
    amountWei: n.amount_wei,
    pk: n.pk_hex,
  }));
}

async function sendLegacy(
  rpcUrl: string,
  mnemonic: string,
  args: { to: Address; data?: `0x${string}`; value?: bigint; gas?: bigint }
) {
  const client = walletClient(rpcUrl, mnemonic);
  return client.sendTransaction({
    to: args.to,
    data: args.data,
    value: args.value,
    gas: args.gas,
    type: 'legacy' as const,
  } as unknown as Parameters<typeof client.sendTransaction>[0]);
}

export function ChainWalletProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [mnemonic, setMnemonic] = useState<string | null>(null);
  const [rpcUrl, setRpc] = useState(DEFAULT_RPC);
  const [network, setNetworkState] = useState<WalletNetworkId>('arxon');
  const [balance, setBalance] = useState<string | null>(null);
  const [ethBalances, setEthBalances] = useState<EthereumBalances>({ ETH: null, USDC: null, USDT: null });
  const [rpcError, setRpcError] = useState<string | null>(null);
  const [shieldedPk, setShieldedPk] = useState<string | null>(null);
  const [notes, setNotes] = useState<StoredNote[]>([]);
  const [notesError, setNotesError] = useState<string | null>(null);
  const [notesStatus, setNotesStatus] = useState<string | null>(null);
  const [keysError, setKeysError] = useState<string | null>(null);
  const rpcGen = useRef(0);

  const address = useMemo(
    () => (mnemonic ? accountFromMnemonic(mnemonic).address : null),
    [mnemonic]
  );

  const shieldedBalance = useMemo(() => formatEther(shieldedTotal(notes)), [notes]);

  const refreshNotes = useCallback(async () => {
    try {
      setNotesError(null);
      setNotesStatus('Reading note tree from chain…');
      await hydrateLeaves(rpcUrl, (msg) => setNotesStatus(msg));
      setNotesStatus(null);
    } catch (e) {
      setNotesStatus(null);
      setNotesError(e instanceof Error ? e.message : 'Could not read the note tree');
    }
    const leaves = await loadLeaves();
    setNotes(notesOnChain(await loadNotes(), leaves));
  }, [rpcUrl]);

  const ensureKeys = useCallback(async () => {
    const saved = await storage.getShieldedSk();
    try {
      const keys = await proveKeys(saved);
      await storage.setShieldedSk(keys.sk_hex);
      setShieldedPk(keys.pk_hex);
      setKeysError(null);
    } catch (e) {
      setKeysError(e instanceof Error ? e.message : String(e));
      if (saved) setShieldedPk(null);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [saved, storedRpc, storedNetwork] = await Promise.all([
        storage.getMnemonic(),
        storage.getRpc(),
        storage.getNetwork(),
      ]);
      if (cancelled) return;
      if (saved) setMnemonic(saved);
      if (isWalletNetworkId(storedNetwork)) setNetworkState(storedNetwork);
      let rpc = storedRpc;
      if (rpc && rpc.includes('trycloudflare.com')) {
        rpc = DEFAULT_RPC;
        await storage.setRpc(rpc);
      }
      if (rpc) setRpc(rpc);
      setNotes(await loadNotes());
      setReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (ready && mnemonic) void ensureKeys();
  }, [ready, mnemonic, ensureKeys]);

  const refreshBalance = useCallback(async (rpcOverride?: string) => {
    if (!address) {
      setBalance(null);
      setEthBalances({ ETH: null, USDC: null, USDT: null });
      return;
    }
    const gen = ++rpcGen.current;
    if (network === 'ethereum') {
      try {
        const { balances, error } = await fetchEthereumBalances(address);
        if (gen !== rpcGen.current) return;
        setEthBalances(balances);
        setBalance(balances.ETH);
        setRpcError(error);
      } catch (e) {
        if (gen !== rpcGen.current) return;
        setEthBalances({ ETH: null, USDC: null, USDT: null });
        setBalance(null);
        setRpcError(e instanceof Error ? e.message : 'Ethereum RPC unreachable');
      }
      return;
    }
    const url = (rpcOverride ?? rpcUrl).trim() || DEFAULT_RPC;
    try {
      const wei = await publicClient(url).getBalance({ address });
      if (gen !== rpcGen.current) return;
      setBalance(formatEther(wei));
      setRpcError(null);
    } catch (e) {
      if (gen !== rpcGen.current) return;
      setBalance(null);
      setRpcError(e instanceof Error ? e.message : 'Arxon Testnet RPC unreachable');
    }
  }, [address, rpcUrl, network]);

  useEffect(() => {
    void refreshBalance();
  }, [refreshBalance]);

  const createWallet = useCallback(async () => {
    const phrase = newMnemonic();
    await storage.setMnemonic(phrase);
    setMnemonic(phrase);
    return phrase;
  }, []);

  const importWallet = useCallback(async (phrase: string) => {
    const trimmed = phrase.trim().split(/\s+/).join(' ');
    accountFromMnemonic(trimmed);
    await storage.setMnemonic(trimmed);
    setMnemonic(trimmed);
  }, []);

  const logout = useCallback(async () => {
    await storage.clearMnemonic();
    await storage.clearShieldedSk();
    await storage.clearActivity();
    await storage.clearNotes();
    await storage.clearLeaves();
    await storage.clearLeafScanAt();
    setMnemonic(null);
    setBalance(null);
    setEthBalances({ ETH: null, USDC: null, USDT: null });
    setShieldedPk(null);
    setNotes([]);
    setNotesError(null);
    setNotesStatus(null);
  }, []);

  const setRpcUrl = useCallback(async (url: string) => {
    const next = url.trim() || DEFAULT_RPC;
    await storage.setRpc(next);
    setRpc(next);
    return next;
  }, []);

  const setNetwork = useCallback(async (id: WalletNetworkId) => {
    await storage.setNetwork(id);
    setNetworkState(id);
  }, []);

  const sendShielded = useCallback(
    async (amount: string, flags: PrivacyFlags) => {
      if (!mnemonic) throw new Error('No wallet');
      const wei = requireWei(amount);
      const expiry = await expiryBlock(rpcUrl);
      const proof = await proveShield({
        amountWei: wei,
        maskBits: asBits(flags),
        expiryBlock: expiry,
        skHex: await storage.getShieldedSk(),
      });
      await storage.setShieldedSk(proof.sk_hex);
      setShieldedPk(proof.pk_hex);
      const hash = await sendLegacy(rpcUrl, mnemonic, {
        to: PRECOMPILE.submit,
        data: shieldCalldata(proof),
        value: wei,
          gas: BigInt(8_000_000),
      });
      await pushActivity({
        hash,
        kind: 'shield',
        to: PRECOMPILE.submit,
        amount,
        maskBits: asBits(flags),
        at: Date.now(),
        token: 'ARX',
        network: 'arxon',
      });
      await waitOk(rpcUrl, hash, 'Shield');
      await commitOutputs(
        [
          {
            cm: proof.note.cm,
            cv: proof.note.cv,
            rho: proof.note.rho,
            amountWei: proof.note.amount_wei,
            pk: proof.note.pk_hex,
          },
        ],
        proof.pk_hex
      );
      await refreshNotes();
      return hash;
    },
    [mnemonic, rpcUrl, refreshNotes]
  );

  const sendPrivate = useCallback(
    async (recipientPk: string, amount: string, flags: PrivacyFlags) => {
      if (!mnemonic) throw new Error('No wallet');
      const live = await loadLiveNotes(rpcUrl);
      const wei = requireWei(amount);
      const sk = await storage.getShieldedSk();
      if (!sk) throw new Error('No shielded key. Shield once first.');
      const note = pickNote(live.notes, wei);
      const expiry = await expiryBlock(rpcUrl);
      const proof = await proveTransfer({
        amountWei: wei,
        maskBits: asBits(flags),
        expiryBlock: expiry,
        skHex: sk,
        recipientPk,
        note: { amountWei: note.amountWei, rho: note.rho, leafIndex: note.leafIndex },
        leaves: live.leaves,
      });
      await assertKnownAnchor(rpcUrl, proof.anchor);
      const data = transferCalldata(proof);
      const hash = relayUrl(rpcUrl)
        ? await submitRelayed(rpcUrl, data)
          : await sendLegacy(rpcUrl, mnemonic, { to: PRECOMPILE.submit, data, gas: BigInt(8_000_000) });
      await pushActivity({
        hash,
        kind: 'private',
        to: recipientPk,
        amount,
        maskBits: asBits(flags),
        at: Date.now(),
        token: 'ARX',
        network: 'arxon',
      });
      await waitOk(rpcUrl, hash, 'Private transfer');
      await markSpent(note.cm);
      await commitOutputs(await secretsToNotes(proof.notes), shieldedPk);
      await refreshNotes();
      return hash;
    },
    [mnemonic, rpcUrl, refreshNotes, shieldedPk]
  );

  const sendUnshield = useCallback(
    async (to: Address, amount: string, flags: PrivacyFlags) => {
      if (!mnemonic) throw new Error('No wallet');
      const live = await loadLiveNotes(rpcUrl);
      const wei = requireWei(amount);
      const sk = await storage.getShieldedSk();
      if (!sk) throw new Error('No shielded key. Shield once first.');
      const note = pickNote(live.notes, wei);
      const expiry = await expiryBlock(rpcUrl);
      const proof = await proveUnshield({
        amountWei: wei,
        maskBits: asBits(flags),
        expiryBlock: expiry,
        skHex: sk,
        recipient: to,
        note: { amountWei: note.amountWei, rho: note.rho, leafIndex: note.leafIndex },
        leaves: live.leaves,
      });
      await assertKnownAnchor(rpcUrl, proof.anchor);
      const data = unshieldCalldata(proof, to);
      const hash = relayUrl(rpcUrl)
        ? await submitRelayed(rpcUrl, data)
          : await sendLegacy(rpcUrl, mnemonic, { to: PRECOMPILE.submit, data, gas: BigInt(8_000_000) });
      await pushActivity({
        hash,
        kind: 'unshield',
        to,
        amount,
        maskBits: asBits(flags),
        at: Date.now(),
        token: 'ARX',
        network: 'arxon',
      });
      await waitOk(rpcUrl, hash, 'Unshield');
      await markSpent(note.cm);
      await commitOutputs(await secretsToNotes(proof.notes), shieldedPk);
      await refreshNotes();
      return hash;
    },
    [mnemonic, rpcUrl, refreshNotes, shieldedPk]
  );

  const sendArx = useCallback(
    async (to: Address, amount: string) => {
      if (!mnemonic) throw new Error('No wallet');
      const hash = await sendLegacy(rpcUrl, mnemonic, { to, value: parseEther(amount) });
      await pushActivity({
        hash,
        kind: 'transfer',
        to,
        amount,
        maskBits: 0,
        at: Date.now(),
        token: 'ARX',
        network: 'arxon',
      });
      await waitOk(rpcUrl, hash, 'Send');
      return hash;
    },
    [mnemonic, rpcUrl]
  );

  const sendEthereum = useCallback(
    async (token: EthereumToken, to: Address, amount: string) => {
      if (!mnemonic) throw new Error('No wallet');
      const hash =
        token === 'ETH'
          ? await sendEthereumNative(mnemonic, to, amount)
          : await sendEthereumToken(mnemonic, token, to, amount);
      await pushActivity({
        hash,
        kind: 'transfer',
        to,
        amount,
        maskBits: 0,
        at: Date.now(),
        token,
        network: 'ethereum',
      });
      return hash;
    },
    [mnemonic]
  );

  const value: ChainWalletState = {
    ready,
    mnemonic,
    address,
    shieldedPk,
    rpcUrl,
    network,
    setNetwork,
    balance,
    ethBalances,
    rpcError,
    notesError,
    notesStatus,
    keysError,
    notes,
    shieldedBalance,
    createWallet,
    importWallet,
    logout,
    setRpcUrl,
    refreshBalance,
    refreshNotes,
    refreshKeys: ensureKeys,
    sendArx,
    sendEthereum,
    sendShielded,
    sendPrivate,
    sendUnshield,
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useChainWallet() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useChainWallet outside ChainWalletProvider');
  return ctx;
}
