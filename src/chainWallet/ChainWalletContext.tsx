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

import { pushActivity, saveClocks } from './activity';
import { assertKnownAnchor, DEFAULT_RPC, liveRpcUrl, PendingTxError, PRECOMPILE, publicClient, waitIncluded, walletClient } from './chain';
import {
  includeMs,
  logTxClocks,
  rememberIncludeMs,
  startClocks,
  stampInBlock,
  stampProved,
  stampSent,
  type TxClocks,
  type TxPhaseFn,
} from './clocks';
import {
  fetchEthereumBalances,
  sendEthereumNative,
  sendEthereumToken,
  type EthereumBalances,
} from './ethereum';
import { isWalletNetworkId, type EthereumToken, type WalletNetworkId } from './networks';
import { submitRelayed } from './relay';
import {
  TITLE_PRIVATE,
  TITLE_SHIELD,
  TITLE_UNSHIELD,
  creditedToTheirVaultCopy,
  creditedToWalletCopy,
  creditedToYourVaultCopy,
  notifyTx,
  walletReceivesCopy,
} from './txNotify';
import { assertWalletSecret, newMnemonic, resolveAccount } from './keys';
import {
  currentPassword,
  dropPlainSecretsIfEncrypted,
  migratePlainSecrets,
  persistShieldedSk,
  persistWalletSecret,
  readShieldedSk,
  sessionStore,
  unlockWithPassword,
} from './session';
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
import { scanIncomingNotes } from './scanNotes';
import { asBits, type PrivacyFlags } from './privacy';
import { proveKeys, proveShield, proveTransfer, proveUnshield, warmProver, type NoteSecrets } from './prove';
import { storage } from './storage';
import { shieldCalldata, transferCalldata, unshieldCalldata } from './submit801';

const SHIELD_EXPIRY_BLOCKS = 96;
const UNIT = BigInt(1_000_000_000);

type ChainWalletState = {
  ready: boolean;
  mnemonic: string | null;
  accountIndex: number;
  locked: boolean;
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
  importPrivateKey: (key: string) => Promise<void>;
  setAccountIndex: (index: number) => Promise<void>;
  unlockSession: (password: string) => Promise<boolean>;
  lockSession: () => Promise<void>;
  logout: () => Promise<void>;
  setRpcUrl: (url: string) => Promise<string>;
  refreshBalance: (rpcOverride?: string) => Promise<void>;
  refreshNotes: () => Promise<void>;
  refreshKeys: () => Promise<void>;
  sendArx: (to: Address, amount: string) => Promise<`0x${string}`>;
  sendEthereum: (token: EthereumToken, to: Address, amount: string) => Promise<`0x${string}`>;
  sendShielded: (amount: string, flags: PrivacyFlags, onPhase?: TxPhaseFn) => Promise<`0x${string}`>;
  sendPrivate: (
    recipientPk: string,
    amount: string,
    flags: PrivacyFlags,
    onPhase?: TxPhaseFn
  ) => Promise<`0x${string}`>;
  sendUnshield: (
    to: Address,
    amount: string,
    flags: PrivacyFlags,
    onPhase?: TxPhaseFn
  ) => Promise<`0x${string}`>;
};

const Ctx = createContext<ChainWalletState | null>(null);

function requireWei(amount: string): bigint {
  const wei = parseEther(amount);
    if (wei === BigInt(0) || wei % UNIT !== BigInt(0)) {
    throw new Error('Shielded amounts must be a whole number of 0.000000001 tARX');
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

async function settleAfterSubmit(
  rpcUrl: string,
  hash: `0x${string}`,
  clocks: TxClocks,
  kind: string,
  amount: string,
  afterOk: () => Promise<void>,
  confirmedTitle: string,
  confirmedBody: string,
) {
  try {
    const receipt = await waitIncluded(rpcUrl, hash);
    stampInBlock(clocks);
    const included = includeMs(clocks);
    if (included != null) rememberIncludeMs(included);
    await saveClocks(hash, clocks);
    logTxClocks(kind, hash, clocks);
    if (receipt.status !== 'success') {
      notifyTx('Send failed', `${amount} tARX did not go through.`, `tx-fail-${hash}`);
      return;
    }
    await afterOk();
    notifyTx(confirmedTitle, confirmedBody, `tx-ok-${hash}`);
  } catch (e) {
    if (e instanceof PendingTxError) {
      notifyTx('Still sending', `${amount} tARX is still going through.`, `tx-wait-${hash}`);
      return;
    }
    notifyTx('Send failed', e instanceof Error ? e.message : `${kind} failed`, `tx-fail-${hash}`);
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
  args: { to: Address; data?: `0x${string}`; value?: bigint; gas?: bigint },
  addressIndex = 0,
) {
  const client = walletClient(rpcUrl, mnemonic, addressIndex);
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
  const [accountIndex, setAccountIndexState] = useState(0);
  const [locked, setLocked] = useState(false);
  const [rpcUrl, setRpc] = useState(DEFAULT_RPC);
  const [network, setNetworkState] = useState<WalletNetworkId>('ethereum');
  const [balance, setBalance] = useState<string | null>(null);
  const [ethBalances, setEthBalances] = useState<EthereumBalances>({ ETH: null, USDC: null, USDT: null });
  const [rpcError, setRpcError] = useState<string | null>(null);
  const [shieldedPk, setShieldedPk] = useState<string | null>(null);
  const [notes, setNotes] = useState<StoredNote[]>([]);
  const [notesError, setNotesError] = useState<string | null>(null);
  const [notesStatus, setNotesStatus] = useState<string | null>(null);
  const [keysError, setKeysError] = useState<string | null>(null);
  const rpcGen = useRef(0);
  const pendingCms = useRef(new Set<string>());

  const address = useMemo(() => {
    if (!mnemonic) return null;
    try {
      return resolveAccount(mnemonic, accountIndex).address;
    } catch {
      return null;
    }
  }, [mnemonic, accountIndex]);

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
    if (!shieldedPk) return;
    try {
      const added = await scanIncomingNotes(rpcUrl, shieldedPk, (msg) => setNotesStatus(msg));
      setNotesStatus(null);
      if (added > 0) {
        setNotes(notesOnChain(await loadNotes(), await loadLeaves()));
      }
    } catch {
      setNotesStatus(null);
    }
  }, [rpcUrl, shieldedPk]);

  const ensureKeys = useCallback(async () => {
    const saved = await readShieldedSk();
    try {
      const keys = await proveKeys(saved);
      await persistShieldedSk(keys.sk_hex);
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
      await dropPlainSecretsIfEncrypted();
      const plain = sessionStore.getBox() ? null : saved;
      setAccountIndexState(sessionStore.accountIndex());
      const needsLock = sessionStore.hasPassword() && (!!plain || !!sessionStore.getBox());
      setLocked(needsLock);
      if (plain && !needsLock) setMnemonic(plain);
      if (isWalletNetworkId(storedNetwork)) setNetworkState(storedNetwork);
      let rpc = liveRpcUrl(storedRpc);
      if (rpc !== storedRpc) await storage.setRpc(rpc);
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

  useEffect(() => {
    if (!ready) return;
    const warm = () => {
      void warmProver();
    };
    let idle = 0;
    const t = window.setTimeout(() => {
      const ric = window.requestIdleCallback;
      if (typeof ric === 'function') {
        idle = ric(warm, { timeout: 8000 });
      } else {
        warm();
      }
    }, 4000);
    return () => {
      window.clearTimeout(t);
      if (idle && typeof window.cancelIdleCallback === 'function') {
        window.cancelIdleCallback(idle);
      }
    };
  }, [ready]);

  useEffect(() => {
    if (ready && mnemonic && shieldedPk) void refreshNotes();
  }, [ready, mnemonic, shieldedPk, refreshNotes]);

  const refreshBalance = useCallback(async (rpcOverride?: string) => {
    if (!address) {
      setBalance(null);
      setEthBalances({ ETH: null, USDC: null, USDT: null });
      return;
    }
    const gen = ++rpcGen.current;
    const url = (rpcOverride ?? rpcUrl).trim() || DEFAULT_RPC;

    const ethTask = fetchEthereumBalances(address)
      .then((r) => ({ ok: true as const, r }))
      .catch((e: unknown) => ({ ok: false as const, e }));
    const arxTask = publicClient(url)
      .getBalance({ address })
      .then((wei) => ({ ok: true as const, wei }))
      .catch((e: unknown) => ({ ok: false as const, e }));

    const [ethRes, arxRes] = await Promise.all([ethTask, arxTask]);
    if (gen !== rpcGen.current) return;

    if (ethRes.ok) {
      setEthBalances(ethRes.r.balances);
      if (network === 'ethereum') {
        setBalance(ethRes.r.balances.ETH);
        setRpcError(ethRes.r.error);
      }
    } else {
      setEthBalances({ ETH: null, USDC: null, USDT: null });
      if (network === 'ethereum') {
        setBalance(null);
        setRpcError(ethRes.e instanceof Error ? ethRes.e.message : 'Ethereum RPC unreachable');
      }
    }

    if (arxRes.ok) {
      if (network === 'arxon') {
        setBalance(formatEther(arxRes.wei));
        setRpcError(null);
      }
    } else if (network === 'arxon') {
      setBalance(null);
      setRpcError(arxRes.e instanceof Error ? arxRes.e.message : 'Arxon Testnet RPC unreachable');
    }
  }, [address, rpcUrl, network]);

  useEffect(() => {
    void refreshBalance();
  }, [refreshBalance]);

  const createWallet = useCallback(async () => {
    const phrase = newMnemonic();
    await persistWalletSecret(phrase);
    setMnemonic(phrase);
    setLocked(false);
    return phrase;
  }, []);

  const importWallet = useCallback(async (phrase: string) => {
    const trimmed = phrase.trim().split(/\s+/).join(' ');
    assertWalletSecret(trimmed, 'phrase');
    resolveAccount(trimmed, 0);
    sessionStore.markImported();
    await persistWalletSecret(trimmed);
    setMnemonic(trimmed);
    setLocked(false);
  }, []);

  const importPrivateKey = useCallback(async (key: string) => {
    assertWalletSecret(key, 'key');
    resolveAccount(key, 0);
    sessionStore.markImported();
    await persistWalletSecret(key.trim());
    setMnemonic(key.trim());
    setLocked(false);
  }, []);

  const setAccountIndex = useCallback(async (index: number) => {
    sessionStore.setAccountIndex(index);
    setAccountIndexState(index);
  }, []);

  const unlockSession = useCallback(async (password: string) => {
    const secret = await unlockWithPassword(password);
    if (!secret) return false;
    await migratePlainSecrets(password, secret);
    setMnemonic(secret);
    setLocked(false);
    return true;
  }, []);

  const lockSession = useCallback(async () => {
    if (sessionStore.hasPassword()) {
      await dropPlainSecretsIfEncrypted();
      setMnemonic(null);
      setLocked(true);
    }
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
    sessionStore.clearPass();
    sessionStore.clearBox();
    sessionStore.clearSkBox();
    sessionStore.setPhraseVerified(false);
    sessionStore.setSetupPath(null);
    sessionStore.clearImported();
    setLocked(false);
  }, []);

  const setRpcUrl = useCallback(async (url: string) => {
    const next = liveRpcUrl(url);
    await storage.setRpc(next);
    setRpc(next);
    return next;
  }, []);

  const setNetwork = useCallback(async (id: WalletNetworkId) => {
    await storage.setNetwork(id);
    setNetworkState(id);
  }, []);

  const sendShielded = useCallback(
    async (amount: string, flags: PrivacyFlags, onPhase?: TxPhaseFn) => {
      if (!mnemonic) throw new Error('No wallet');
      const clocks = startClocks();
      onPhase?.('Processing');
      const wei = requireWei(amount);
      const expiry = await expiryBlock(rpcUrl);
      const proof = await proveShield({
        amountWei: wei,
        maskBits: asBits(flags),
        expiryBlock: expiry,
        skHex: await readShieldedSk(),
      });
      stampProved(clocks);
      onPhase?.('Proved');
      await persistShieldedSk(proof.sk_hex);
      setShieldedPk(proof.pk_hex);
      const hash = await sendLegacy(rpcUrl, mnemonic, {
        to: PRECOMPILE.submit,
        data: shieldCalldata(proof),
        value: wei,
          gas: BigInt(8_000_000),
      }, accountIndex);
      stampSent(clocks);
      await pushActivity({
        hash,
        kind: 'shield',
        to: PRECOMPILE.submit,
        amount,
        maskBits: asBits(flags),
        at: clocks.tapAt,
        token: 'tARX',
        network: 'arxon',
        clocks: { ...clocks },
      });
      notifyTx(TITLE_SHIELD, creditedToYourVaultCopy(amount), `tx-sent-${hash}`);
      void settleAfterSubmit(rpcUrl, hash, clocks, 'shield', amount, async () => {
        onPhase?.('In block');
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
      }, TITLE_SHIELD, creditedToYourVaultCopy(amount));
      return hash;
    },
    [mnemonic, rpcUrl, refreshNotes, accountIndex]
  );

  const sendPrivate = useCallback(
    async (recipientPk: string, amount: string, flags: PrivacyFlags, onPhase?: TxPhaseFn) => {
      if (!mnemonic) throw new Error('No wallet');
      const clocks = startClocks();
      onPhase?.('Processing');
      const live = await loadLiveNotes(rpcUrl);
      const wei = requireWei(amount);
      const sk = await readShieldedSk();
      if (!sk) throw new Error('No shielded key. Shield once first.');
      const note = pickNote(
        live.notes.filter((row) => !pendingCms.current.has(row.cm.toLowerCase())),
        wei,
      );
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
      stampProved(clocks);
      onPhase?.('Proved');
      await assertKnownAnchor(rpcUrl, proof.anchor);
      const data = transferCalldata(proof);
      const hash = await submitRelayed(rpcUrl, data);
      stampSent(clocks);
      await pushActivity({
        hash,
        kind: 'private',
        to: recipientPk,
        amount,
        maskBits: asBits(flags),
        at: clocks.tapAt,
        token: 'tARX',
        network: 'arxon',
        clocks: { ...clocks },
      });
      pendingCms.current.add(note.cm.toLowerCase());
      notifyTx(TITLE_PRIVATE, walletReceivesCopy(amount, recipientPk), `tx-sent-${hash}`);
      void settleAfterSubmit(rpcUrl, hash, clocks, 'private pay', amount, async () => {
        onPhase?.('In block');
        pendingCms.current.delete(note.cm.toLowerCase());
        await markSpent(note.cm);
        await commitOutputs(await secretsToNotes(proof.notes), shieldedPk);
        await refreshNotes();
      }, TITLE_PRIVATE, creditedToTheirVaultCopy(amount, recipientPk)).finally(() => {
        pendingCms.current.delete(note.cm.toLowerCase());
      });
      return hash;
    },
    [mnemonic, rpcUrl, refreshNotes, shieldedPk]
  );

  const sendUnshield = useCallback(
    async (to: Address, amount: string, flags: PrivacyFlags, onPhase?: TxPhaseFn) => {
      if (!mnemonic) throw new Error('No wallet');
      const clocks = startClocks();
      onPhase?.('Processing');
      const live = await loadLiveNotes(rpcUrl);
      const wei = requireWei(amount);
      const sk = await readShieldedSk();
      if (!sk) throw new Error('No shielded key. Shield once first.');
      const note = pickNote(
        live.notes.filter((row) => !pendingCms.current.has(row.cm.toLowerCase())),
        wei,
      );
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
      stampProved(clocks);
      onPhase?.('Proved');
      await assertKnownAnchor(rpcUrl, proof.anchor);
      const data = unshieldCalldata(proof, to);
      const hash = await submitRelayed(rpcUrl, data);
      stampSent(clocks);
      await pushActivity({
        hash,
        kind: 'unshield',
        to,
        amount,
        maskBits: asBits(flags),
        at: clocks.tapAt,
        token: 'tARX',
        network: 'arxon',
        clocks: { ...clocks },
      });
      pendingCms.current.add(note.cm.toLowerCase());
      notifyTx(TITLE_UNSHIELD, walletReceivesCopy(amount, to), `tx-sent-${hash}`);
      void settleAfterSubmit(rpcUrl, hash, clocks, 'unshield', amount, async () => {
        onPhase?.('In block');
        pendingCms.current.delete(note.cm.toLowerCase());
        await markSpent(note.cm);
        await commitOutputs(await secretsToNotes(proof.notes), shieldedPk);
        await refreshNotes();
        await refreshBalance();
      }, TITLE_UNSHIELD, creditedToWalletCopy(amount, to)).finally(() => {
        pendingCms.current.delete(note.cm.toLowerCase());
      });
      return hash;
    },
    [mnemonic, rpcUrl, refreshNotes, refreshBalance, shieldedPk]
  );

  const sendArx = useCallback(
    async (to: Address, amount: string) => {
      if (!mnemonic) throw new Error('No wallet');
      const clocks = startClocks();
      const hash = await sendLegacy(rpcUrl, mnemonic, { to, value: parseEther(amount) }, accountIndex);
      stampSent(clocks);
      await pushActivity({
        hash,
        kind: 'transfer',
        to,
        amount,
        maskBits: 0,
        at: clocks.tapAt,
        token: 'tARX',
        network: 'arxon',
        clocks: { ...clocks },
      });
      notifyTx('Sent', walletReceivesCopy(amount, to), `tx-sent-${hash}`);
      void settleAfterSubmit(rpcUrl, hash, clocks, 'send', amount, async () => {
        await refreshBalance();
      }, 'Sent', creditedToWalletCopy(amount, to));
      return hash;
    },
    [mnemonic, rpcUrl, accountIndex, refreshBalance]
  );

  const sendEthereum = useCallback(
    async (token: EthereumToken, to: Address, amount: string) => {
      if (!mnemonic) throw new Error('No wallet');
      const hash =
        token === 'ETH'
          ? await sendEthereumNative(mnemonic, to, amount, undefined, accountIndex)
          : await sendEthereumToken(mnemonic, token, to, amount, undefined, accountIndex);
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
    [mnemonic, accountIndex]
  );

  const value: ChainWalletState = {
    ready,
    mnemonic,
    accountIndex,
    locked,
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
    importPrivateKey,
    setAccountIndex,
    unlockSession,
    lockSession,
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
