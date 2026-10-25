import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Capacitor } from '@capacitor/core';
import { getAddress, type Address } from 'viem';
import { loadActivity, type ActivityItem } from '@/chainWallet/activity';
import { START_URL, DEFAULT_RPC } from '@/chainWallet/chain';
import { useChainWallet } from '@/chainWallet/ChainWalletContext';
import { useHideBalance } from '@/chainWallet/hideBalance';
import type { EthereumToken, WalletNetworkId } from '@/chainWallet/networks';
import { quoteFor } from '@/chainWallet/prices';
import { VAULT_FLAGS, UNSHIELD_FLAGS, type PrivacyFlags } from '@/chainWallet/privacy';
import { routeSend } from '@/chainWallet/routeSend';
import { inspectTx, type InspectedTx } from '@/chainWallet/inspect';
import { RELAYER_PAYER } from '@/chainWallet/relay';
import { addListedToken, loadListedTokens, type ListedToken } from '@/chainWallet/tokens';
import { loadVaultHoldings, type VaultHolding } from '@/chainWallet/tokenNotes';
import { briefAddr } from './briefAddr';
import { useTokenPrices } from '@/hooks/useTokenPrices';
import { hiddenCount, privacyPill as pillText, readDefaultPrivacy, writeDefaultPrivacy } from '@/walletFigma/privacyPrefs';
import { verifyBiometrics } from '@/chainWallet/biometrics';
import {
  addHdAccount,
  autoLockDue,
  checkUnlockPassword,
  currentPassword,
  rememberPassword,
  sessionStore,
  setUnlockPassword,
  touchSession,
} from '@/chainWallet/session';
import { createDisclosureCode, listDisclosureCodes } from '@/chainWallet/disclosure';
import { saveSupportReport } from '@/chainWallet/reports';
import { dappLabel, requestLabel } from '@/chainWallet/wc';
import { useWc } from '@/chainWallet/wcProvider';
import { beforeGo, type NavDecision } from './liveNav';
import { useWalletModeActions } from './ModeShell';
import { addressesFromMnemonic, type AltAddresses } from '@/chainWallet/altChains';
import { qrDataUrl, scanAddressQr } from '@/chainWallet/receiveQr';
import { useDisplayCurrency } from './displayCurrency';

export type LiveTone = 'up' | 'down' | 'flat';
export type LiveIcon = 'arx' | 'btc' | 'eth' | 'usdt' | 'usdc' | 'sol';

export type LiveTok = {
  name: string;
  amount: string;
  value: string;
  change: string;
  tone: LiveTone;
  icon: LiveIcon;
  to: string;
  symbol?: string;
};

export type LiveActivity = {
  day: string;
  age: number;
  items: {
    title: string;
    sub: string;
    amount: string;
    fiat: string;
    kind: 'received' | 'sent' | 'swap' | 'private' | 'vault';
    token: string;
    tint?: string;
    to?: string;
    hash?: string;
    model?: 'public' | 'private' | 'shield' | 'unshield' | 'onchain';
    place?: 'home' | 'vault';
    party?: string;
    network?: 'arxon' | 'ethereum';
  }[];
};

export type LiveSendMode = 'home' | 'vault' | 'private' | 'unshield';

export type LiveInspect = {
  hash: string;
  title: string;
  amount: string;
  fiat: string;
  status: string;
  vault: boolean;
  rows: [string, string][];
  /** Full counterparty address. Shown only on the private receipt. */
  fullTo?: string;
  /** This wallet's address. The receipt shows it in full. Other screens use the short form. */
  fullFrom?: string;
  accountLabel?: string;
};

type LiveFrame = {
  app: true;
  ready: boolean;
  locked: boolean;
  address: string | null;
  accountLabel: string;
  accounts: { index: number; label: string }[];
  accountIndex: number;
  setAccountIndex: (index: number) => Promise<void>;
  total: string;
  day: string;
  dayTone: LiveTone;
  privacyPill: string;
  hidden: boolean;
  toggleHide: () => void;
  tokens: LiveTok[];
  testnetTotal: string;
  testnetTokens: LiveTok[];
  activity: LiveActivity[];
  inspect: LiveInspect | null;
  openTx: (hash: string) => Promise<void>;
  words: string[] | null;
  shielded: string;
  shieldedPk: string | null;
  vaultTokens: VaultHolding[];
  refreshVault: () => Promise<void>;
  publicArx: string;
  sessionPassword: string | null;
  startId: string;
  ensureWords: () => Promise<string[]>;
  importPhrase: (phrase: string) => Promise<void>;
  importKey: (key: string) => Promise<void>;
  setNetwork: (id: WalletNetworkId) => Promise<void>;
  setRpcUrl: (url: string) => Promise<string>;
  testnetAdded: boolean;
  enableTestnet: (rpc?: string) => Promise<void>;
  openFaucet: () => void;
  send: (symbol: string, to: string, amount: string, testnet: boolean, mode?: LiveSendMode, flags?: PrivacyFlags) => Promise<void>;
  chainNetwork: WalletNetworkId;
  unlock: (password: string) => Promise<boolean>;
  unlockBiometric: () => Promise<boolean>;
  persistPassword: (password: string) => Promise<void>;
  addToken: (raw: string) => Promise<string>;
  search: (query: string) => LiveTok[];
  saveDefaults: (flags: PrivacyFlags) => void;
  defaults: PrivacyFlags;
  report: (kind: string, note: string) => void;
  makeCode: (who: string, note: string) => string;
  codes: { code: string; who: string; note: string; at: number; used: boolean }[];
  logout: () => Promise<void>;
  beforeGo: (from: string, to: string, password: string) => Promise<NavDecision>;
  vaultMoveIn: (amount: string) => Promise<void>;
  vaultMoveOut: (amount: string) => Promise<void>;
  wcSessions: { name: string; url: string; topic: string }[];
  wcPeer: { name: string; url: string; detail: string } | null;
  wcKind: 'proposal' | 'request' | null;
  approveWc: () => Promise<void>;
  rejectWc: () => Promise<void>;
  disconnectWc: (topic: string) => Promise<void>;
  pairWc: (uri: string) => Promise<void>;
  receiveAsset: string;
  receiveAddress: string;
  receiveQr: string | null;
  setReceiveAsset: (symbol: string) => void;
  scanQr: () => Promise<string>;
  refresh: () => Promise<void>;
};

const LiveFrameContext = createContext<LiveFrame | null>(null);

export function useLiveFrame() {
  return useContext(LiveFrameContext);
}

function num(v: string | null) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function qty(v: string | null, digits: number) {
  if (v == null) return '—';
  return num(v).toLocaleString(undefined, { maximumFractionDigits: digits });
}

function usd(n: number | null) {
  if (n == null) return '—';
  return n.toLocaleString('en-US', { style: 'currency', currency: 'USD', currencyDisplay: 'narrowSymbol' });
}

/** Mainnet ETH/USDC/USDT: a zero or unknown amount is $0.00, never a dash. */
function mainnetQty(amount: string | null | undefined, digits: number) {
  const n = Number(amount);
  const qtyN = amount == null || amount === '' || !Number.isFinite(n) ? 0 : n;
  return qtyN.toLocaleString(undefined, { maximumFractionDigits: digits, minimumFractionDigits: Math.min(2, digits) });
}

function mainnetFiat(
  amount: string | null | undefined,
  quoteUsd: number | null | undefined,
  format: (usdAmount: number) => string,
) {
  const n = Number(amount);
  const qtyN = amount == null || amount === '' || !Number.isFinite(n) ? 0 : n;
  if (qtyN === 0) return format(0);
  if (quoteUsd != null && Number.isFinite(quoteUsd)) return format(qtyN * quoteUsd);
  return format(0);
}

function mainnetUsdN(amount: string | null | undefined, quoteUsd: number | null | undefined) {
  const n = Number(amount);
  const qtyN = amount == null || amount === '' || !Number.isFinite(n) ? 0 : n;
  if (qtyN === 0) return 0;
  if (quoteUsd != null && Number.isFinite(quoteUsd)) return qtyN * quoteUsd;
  return 0;
}

function toneOf(change: number | null): LiveTone {
  if (change == null || change === 0) return 'flat';
  return change > 0 ? 'up' : 'down';
}

function pct(change: number | null) {
  if (change == null) return '—';
  const sign = change > 0 ? '+' : '';
  return `${sign}${change.toFixed(2)}%`;
}

function short(addr: string) {
  return briefAddr(addr);
}

function isRelayerText(value: string) {
  const text = value.trim().toLowerCase();
  return text === RELAYER_PAYER.toLowerCase() || text.startsWith(briefAddr(RELAYER_PAYER).toLowerCase());
}

function fieldText(value: string) {
  const text = value.trim();
  const hex = text.match(/0x[0-9a-fA-F]{16,}/);
  if (!hex || hex.index == null) return text.length > 48 ? `${text.slice(0, 24)}…` : text;
  const rest = text.slice(hex.index + hex[0].length).replace(/^[\s·.-]+/, '');
  const head = briefAddr(hex[0]);
  if (!rest) return head;
  if (/relayer/i.test(rest)) return `${head} · relayer`;
  return `${head} · ${rest}`;
}

function isEthSymbol(value: string): value is EthereumToken {
  return value === 'ETH' || value === 'USDC' || value === 'USDT';
}

function isArxonSymbol(value: string) {
  const s = value.toUpperCase();
  return s === 'ARX' || s === 'ARXT' || s === 'TARX' || s === 'USDTARX' || s === 'USDCARX';
}

function listedStable(listed: ListedToken[], kind: 'USDT' | 'USDC') {
  const row = listed.find((token) => {
    const s = token.symbol.toUpperCase().replace(/[^A-Z]/g, '');
    return s === kind || s === `${kind}ARX` || s === `ARX${kind}`;
  });
  return row ? `0.00 ${kind === 'USDT' ? 'USDTarx' : 'USDCarx'}` : `0.00 ${kind === 'USDT' ? 'USDTarx' : 'USDCarx'}`;
}

async function openArxonFaucet() {
  const { openExternal } = await import('./openExternal');
  await openExternal(START_URL);
}

function isArxonStable(value: string) {
  const s = value.toUpperCase();
  return s === 'USDTARX' || s === 'USDCARX';
}

export function LiveFrameProvider({ children }: { children: ReactNode }) {
  const wallet = useChainWallet();
  const { prices, refresh: refreshPrices } = useTokenPrices();
  const { format } = useDisplayCurrency();
  const hide = useHideBalance();
  const wc = useWc();
  const mode = useWalletModeActions();
  const [words, setWords] = useState<string[] | null>(null);
  const [activity, setActivity] = useState<LiveActivity[]>([]);
  const [arx, setArx] = useState<string | null>(null);
  const [defaults, setDefaults] = useState(readDefaultPrivacy);
  const [codes, setCodes] = useState(() => listDisclosureCodes());
  const [tick, setTick] = useState(0);
  const [inspect, setInspect] = useState<LiveInspect | null>(null);
  const [listed, setListed] = useState<ListedToken[]>([]);
  const [receiveAsset, setReceiveAsset] = useState('ETH');
  const [receiveQr, setReceiveQr] = useState<string | null>(null);
  const [alt, setAlt] = useState<AltAddresses | null>(null);
  const [testnetAdded, setTestnetAdded] = useState(() => sessionStore.testnetAdded());
  const [vaultTokens, setVaultTokens] = useState<VaultHolding[]>([]);

  const refreshVault = useCallback(async () => {
    try {
      if (wallet.network === 'arxon') await wallet.refreshNotes();
    } catch {
      /* Saved notes still count when the tree read fails. */
    }
    const listedNow = await loadListedTokens();
    setListed(listedNow);
    setVaultTokens(await loadVaultHoldings(wallet.rpcUrl, listedNow));
  }, [wallet.network, wallet.rpcUrl, wallet.refreshNotes]);

  useEffect(() => {
    if (wallet.network === 'arxon') setArx(wallet.balance);
  }, [wallet.network, wallet.balance]);

  useEffect(() => {
    let cancel = false;
    void loadActivity().then((items) => {
      if (!cancel) setActivity(groupActivity(items));
    });
    void loadListedTokens().then((rows) => {
      if (!cancel) setListed(rows);
    });
    return () => {
      cancel = true;
    };
  }, [wallet.address, wallet.balance, wallet.shieldedBalance, wallet.notes.length, wallet.network, wallet.rpcUrl]);

  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState === 'hidden') touchSession();
      if (document.visibilityState === 'visible') {
        void wallet.refreshBalance();
        void refreshPrices();
        void loadActivity().then((items) => setActivity(groupActivity(items)));
      }
      setTick((n) => n + 1);
    };
    const onMove = () => touchSession();
    document.addEventListener('visibilitychange', onVis);
    window.addEventListener('pointerdown', onMove);
    const t = window.setInterval(() => setTick((n) => n + 1), 15_000);
    let appHandle: { remove: () => Promise<void> } | undefined;
    if (Capacitor.isNativePlatform()) {
      void import('@capacitor/app').then(({ App }) =>
        App.addListener('appStateChange', ({ isActive }) => {
          if (!isActive) return;
          void wallet.refreshBalance();
          void refreshPrices();
          void loadActivity().then((items) => setActivity(groupActivity(items)));
        }).then((handle) => {
          appHandle = handle;
        }),
      );
    }
    return () => {
      document.removeEventListener('visibilitychange', onVis);
      window.removeEventListener('pointerdown', onMove);
      window.clearInterval(t);
      void appHandle?.remove();
    };
  }, [wallet.refreshBalance, refreshPrices]);

  useEffect(() => {
    let cancel = false;
    if (!wallet.mnemonic) {
      setAlt(wallet.address ? { eth: wallet.address, btc: null, sol: null } : null);
      return;
    }
    void addressesFromMnemonic(wallet.mnemonic, wallet.accountIndex).then((next) => {
      if (!cancel) setAlt(next);
    });
    return () => {
      cancel = true;
    };
  }, [wallet.mnemonic, wallet.accountIndex, wallet.address]);

  const receiveAddress = (() => {
    const s = receiveAsset.toUpperCase();
    if (s === 'BTC') return alt?.btc || '';
    if (s === 'SOL') return alt?.sol || '';
    return wallet.address || alt?.eth || '';
  })();

  useEffect(() => {
    if (!receiveAddress) {
      setReceiveQr(null);
      return;
    }
    let cancel = false;
    void qrDataUrl(receiveAddress).then((url) => {
      if (!cancel) setReceiveQr(url);
    });
    return () => {
      cancel = true;
    };
  }, [receiveAddress]);

  useEffect(() => {
    if (!wallet.mnemonic) return;
    const next = wallet.mnemonic.trim().split(/\s+/).filter(Boolean);
    if (next.length >= 12) setWords(next);
  }, [wallet.mnemonic]);

  const ensureWords = useCallback(async () => {
    if (words && words.length >= 12) return words;
    if (wallet.mnemonic) {
      const next = wallet.mnemonic.trim().split(/\s+/).filter(Boolean);
      if (next.length >= 12) {
        setWords(next);
        return next;
      }
      throw new Error('Recovery phrase is not available on this device.');
    }
    if (sessionStore.setupPath() === 'import') {
      throw new Error('Import a valid recovery phrase first.');
    }
    const phrase = await wallet.createWallet();
    const next = phrase.trim().split(/\s+/).filter(Boolean);
    if (next.length < 12) throw new Error('Recovery phrase is not available on this device.');
    setWords(next);
    return next;
  }, [wallet, words]);

  const eth = wallet.ethBalances;
  const ethQ = quoteFor('ETH', prices);
  const usdcQ = quoteFor('USDC', prices);
  const usdtQ = quoteFor('USDT', prices);
  const btcQ = quoteFor('BTC', prices);
  const solQ = quoteFor('SOL', prices);
  const ethUsd = mainnetUsdN(eth.ETH, ethQ.usd);
  const usdcUsd = mainnetUsdN(eth.USDC, usdcQ.usd);
  const usdtUsd = mainnetUsdN(eth.USDT, usdtQ.usd);
  const totalN = ethUsd + usdcUsd + usdtUsd;

  const weighted = (() => {
    const rows: [number, number][] = [];
    if (ethUsd != null && ethQ.change24h != null) rows.push([ethUsd, ethQ.change24h]);
    if (usdcUsd != null && usdcQ.change24h != null) rows.push([usdcUsd, usdcQ.change24h]);
    if (usdtUsd != null && usdtQ.change24h != null) rows.push([usdtUsd, usdtQ.change24h]);
    const w = rows.reduce((s, [usdN]) => s + usdN, 0);
    if (!w) return null;
    return rows.reduce((s, [usdN, ch]) => s + usdN * ch, 0) / w;
  })();

  const tokens: LiveTok[] = [
    {
      name: 'Ethereum',
      amount: `${mainnetQty(eth.ETH, 6)} ETH`,
      value: mainnetFiat(eth.ETH, ethQ.usd, format),
      change: pct(ethQ.change24h),
      tone: toneOf(ethQ.change24h),
      icon: 'eth',
      to: 'token-eth',
      symbol: 'ETH',
    },
    {
      name: 'Solana',
      amount: '0.00 SOL',
      value: format(0),
      change: pct(solQ.change24h),
      tone: toneOf(solQ.change24h),
      icon: 'sol',
      to: 'token-sol',
      symbol: 'SOL',
    },
    {
      name: 'Bitcoin',
      amount: '0.00 BTC',
      value: format(0),
      change: pct(btcQ.change24h),
      tone: toneOf(btcQ.change24h),
      icon: 'btc',
      to: 'token-btc',
      symbol: 'BTC',
    },
    {
      name: 'Tether',
      amount: `${mainnetQty(eth.USDT, 2)} USDT`,
      value: mainnetFiat(eth.USDT, usdtQ.usd, format),
      change: pct(usdtQ.change24h),
      tone: toneOf(usdtQ.change24h),
      icon: 'usdt',
      to: 'token-usdt',
      symbol: 'USDT',
    },
    {
      name: 'USD Coin',
      amount: `${mainnetQty(eth.USDC, 2)} USDC`,
      value: mainnetFiat(eth.USDC, usdcQ.usd, format),
      change: pct(usdcQ.change24h),
      tone: toneOf(usdcQ.change24h),
      icon: 'usdc',
      to: 'token-usdc',
      symbol: 'USDC',
    },
  ];

  const testnetTokens: LiveTok[] = testnetAdded
    ? [
        {
          name: 'Arxon',
          amount: `${qty(wallet.network === 'arxon' ? wallet.balance : arx, 4)} ARXt`,
          value: '$0.00',
          change: 'Arxon Testnet',
          tone: 'flat',
          icon: 'arx',
          to: 'token-arx',
          symbol: 'ARXt',
        },
        {
          name: 'Tether',
          amount: listedStable(listed, 'USDT'),
          value: '$0.00',
          change: 'Arxon Testnet',
          tone: 'flat',
          icon: 'usdt',
          to: 'token-usdt',
          symbol: 'USDTarx',
        },
        {
          name: 'USD Coin',
          amount: listedStable(listed, 'USDC'),
          value: '$0.00',
          change: 'Arxon Testnet',
          tone: 'flat',
          icon: 'usdc',
          to: 'token-usdc',
          symbol: 'USDCarx',
        },
      ]
    : [];

  const accounts = sessionStore.accounts();
  const current = accounts.find((row) => row.index === wallet.accountIndex) ?? accounts[0];
  const needsUnlock = wallet.locked || (sessionStore.hasPassword() && !currentPassword() && autoLockDue());
  const startId = !wallet.ready
    ? 'splash'
    : needsUnlock
      ? 'unlock'
      : wallet.address && sessionStore.hasPassword()
        ? 'home'
        : 'splash';

  const send = useCallback(
    async (symbol: string, to: string, amount: string, testnet: boolean, mode: LiveSendMode = 'home', paymentFlags?: PrivacyFlags) => {
      const flags = (testnet ? paymentFlags : undefined) ?? readDefaultPrivacy();
      if (symbol === 'SOL' || symbol === 'BTC') {
        throw new Error(`${symbol} send is not available yet.`);
      }
      if (!testnet && (mode !== 'home' || isArxonSymbol(symbol))) {
        throw new Error('Arxon, Vault and private sends are on Arxon Testnet only.');
      }
      if (mode === 'vault' || mode === 'private' || mode === 'unshield') {
        if (!isArxonSymbol(symbol) && !testnet) {
          throw new Error('Vault and private send are on Arxon Testnet only.');
        }
        if (isArxonStable(symbol) || (testnet && (symbol === 'USDT' || symbol === 'USDC'))) {
          throw new Error('USDT/USDC ARX-20 vault notes are not wired yet.');
        }
        if (wallet.network !== 'arxon') await wallet.setNetwork('arxon');
      }
      if (mode === 'vault') {
        await wallet.sendShielded(amount, paymentFlags ?? VAULT_FLAGS);
        return;
      }
      if (mode === 'unshield') {
        const dest = to.trim();
        if (!/^0x[0-9a-fA-F]{40}$/.test(dest)) throw new Error('Unshield needs a 0x address.');
        await wallet.sendUnshield(getAddress(dest) as Address, amount, paymentFlags ?? UNSHIELD_FLAGS);
        return;
      }
      if (mode === 'private') {
        const dest = to.trim() || wallet.shieldedPk || '';
        if (!dest) throw new Error('Private send needs a shielded destination on Arxon Testnet.');
        const privateFlags = paymentFlags
          ? flags
          : flags.hideSender || flags.hideReceiver || flags.hideAmount
            ? flags
            : VAULT_FLAGS;
        await wallet.sendPrivate(dest, amount, privateFlags);
        return;
      }
      const dest = to.trim();
      if (isArxonStable(symbol)) {
        throw new Error('USDT/USDC ARX-20 transfers are not wired yet.');
      }
      if (testnet || isArxonSymbol(symbol)) {
        if (wallet.network !== 'arxon') await wallet.setNetwork('arxon');
        const routed = routeSend({
          to: dest,
          amount,
          flags,
          notes: wallet.notes,
          publicArx: wallet.balance,
          shieldedPk: wallet.shieldedPk,
        });
        if (routed.kind === 'need-amount' || routed.kind === 'bad-to' || routed.kind === 'need-funds') {
          throw new Error(routed.label);
        }
        if (routed.kind === 'shield') {
          await wallet.sendShielded(amount, flags);
          return;
        }
        if (routed.kind === 'private') {
          if (routed.shieldFirst) await wallet.sendShielded(amount, flags);
          await wallet.sendPrivate(routed.pk, amount, flags);
          return;
        }
        if (routed.kind === 'unshield') {
          if (routed.shieldFirst) await wallet.sendShielded(amount, flags);
          await wallet.sendUnshield(routed.to, amount, flags);
          return;
        }
        await wallet.sendArx(routed.to, amount);
        return;
      }
      if (!/^0x[0-9a-fA-F]{40}$/.test(dest)) {
        throw new Error('Enter a 0x address. This wallet sends on Ethereum and Arxon Testnet.');
      }
      if (!isEthSymbol(symbol)) {
        throw new Error(`${symbol} sends are not available on this wallet.`);
      }
      const addr = getAddress(dest) as Address;
      if (wallet.network !== 'ethereum') await wallet.setNetwork('ethereum');
      await wallet.sendEthereum(symbol, addr, amount);
    },
    [wallet],
  );

  const scanQr = useCallback(() => scanAddressQr(), []);

  const value: LiveFrame = useMemo(() => ({
    app: true,
    ready: wallet.ready,
    locked: wallet.locked || (!!currentPassword() === false && sessionStore.hasPassword() && tick >= 0 && autoLockDue()),
    address: wallet.address,
    accountLabel: current?.label || (wallet.address ? short(wallet.address) : 'Account 01'),
    accounts,
    accountIndex: wallet.accountIndex,
    setAccountIndex: wallet.setAccountIndex,
    total: format(totalN),
    day: weighted == null ? 'Ethereum' : `${weighted > 0 ? '+' : ''}${weighted.toFixed(2)}% Today`,
    dayTone: toneOf(weighted),
    privacyPill: pillText(defaults),
    hidden: hide.hidden,
    toggleHide: hide.toggle,
    tokens,
    testnetTotal: testnetAdded ? qty(wallet.network === 'arxon' ? wallet.balance : arx, 4) : '0.00',
    testnetTokens,
    activity,
    inspect,
    openTx: async (hash: string) => {
      const saved = activity.flatMap((group) => group.items).find((item) => item.hash?.toLowerCase() === hash.toLowerCase());
      const fullTo = saved?.party && /^0x[0-9a-fA-F]{16,}$/.test(saved.party) ? saved.party : undefined;
      const fullFrom = wallet.address || undefined;
      const accountLabel = current?.label || (wallet.address ? short(wallet.address) : 'Account 01');
      const stamp = (base: LiveInspect): LiveInspect => {
        const rows = base.rows.flatMap(([label, value]): [string, string][] => {
          if (label !== 'From' || !isRelayerText(value)) return [[label, value]];
          return fullFrom ? [['From', briefAddr(fullFrom)]] : [];
        });
        if (fullFrom && !rows.some(([label]) => label === 'From')) rows.splice(Math.min(1, rows.length), 0, ['From', briefAddr(fullFrom)]);
        return { ...base, fullTo, fullFrom, accountLabel, rows };
      };
      try {
        const row = await inspectTx(wallet.rpcUrl, hash as `0x${string}`);
        setInspect(stamp(toLiveInspect(row)));
      } catch (e) {
        setInspect(stamp({
          hash,
          title: 'Transaction',
          amount: hash.slice(0, 10),
          fiat: e instanceof Error ? e.message : 'Could not load this transaction',
          status: 'Unknown',
          vault: false,
          rows: [
            ['Hash', `${hash.slice(0, 10)}…${hash.slice(-6)}`],
            ['Network', wallet.network === 'ethereum' ? 'Ethereum' : 'Arxon Testnet'],
          ],
        }));
      }
    },
    words,
    shielded: wallet.shieldedBalance,
    shieldedPk: wallet.shieldedPk,
    vaultTokens,
    refreshVault,
    publicArx: qty(wallet.network === 'arxon' ? wallet.balance : arx, 4),
    sessionPassword: currentPassword(),
    startId,
    ensureWords,
    importPhrase: wallet.importWallet,
    importKey: wallet.importPrivateKey,
    chainNetwork: wallet.network,
    setNetwork: wallet.setNetwork,
    setRpcUrl: wallet.setRpcUrl,
    testnetAdded,
    enableTestnet: async (rpc?: string) => {
      sessionStore.setTestnetAdded(true);
      setTestnetAdded(true);
      await wallet.setRpcUrl(rpc?.trim() || DEFAULT_RPC);
      await wallet.setNetwork('arxon');
    },
    openFaucet: () => {
      void openArxonFaucet();
    },
    send,
    unlock: async (password: string) => {
      const ok = await wallet.unlockSession(password);
      if (ok) rememberPassword(password);
      return ok;
    },
    unlockBiometric: async () => {
      try {
        const result = await verifyBiometrics();
        if (!result.ok) return false;
        const pass = result.password || currentPassword();
        if (pass) {
          rememberPassword(pass);
          return wallet.unlockSession(pass);
        }
        return sessionStore.hasPassword() ? false : true;
      } catch {
        return false;
      }
    },
    persistPassword: async (password: string) => {
      await setUnlockPassword(password);
    },
    addToken: async (raw: string) => {
      const token = await addListedToken(wallet.rpcUrl, raw);
      setListed(await loadListedTokens());
      return `${token.symbol} · ${token.decimals} decimals`;
    },
    search: (query: string) => {
      const q = query.trim().toLowerCase();
      const extra: LiveTok[] = listed
        .filter((row) => (wallet.network === 'arxon' ? row.standard === 'arx20' : row.standard !== 'arx20'))
        .map((row) => ({
        name: row.name,
        amount: row.symbol,
        value: short(row.address),
        change: row.standard === 'arx20' ? 'ARX-20' : 'ERC-20',
        tone: 'flat' as const,
        icon: 'eth' as const,
        to: 'manage',
        symbol: row.symbol,
      }));
      const rows = [...(wallet.network === 'arxon' ? testnetTokens : tokens), ...extra].filter(
        (row) => !q || row.name.toLowerCase().includes(q) || (row.symbol && row.symbol.toLowerCase().includes(q)) || row.value.toLowerCase().includes(q),
      );
      if (/^0x[0-9a-fA-F]{40}$/.test(query.trim())) {
        rows.unshift({
          name: 'Address',
          amount: short(query.trim()),
          value: query.trim(),
          change: 'Look up',
          tone: 'flat',
          icon: 'eth',
          to: 'receive',
          symbol: 'ADDR',
        });
      }
      return rows;
    },
    saveDefaults: (flags: PrivacyFlags) => {
      writeDefaultPrivacy(flags);
      setDefaults(flags);
      if (flags.hideBalance !== hide.hidden && flags.hideBalance) hide.toggle();
    },
    defaults,
    report: (kind, note) => {
      saveSupportReport({ kind, note, diagnostics: true });
    },
    makeCode: (who, note) => {
      const row = createDisclosureCode(who, note);
      setCodes(listDisclosureCodes());
      return row.code;
    },
    codes,
    logout: wallet.logout,
    beforeGo: (from, to, password) =>
      beforeGo({
        from,
        to,
        password,
        wallet: {
          mnemonic: wallet.mnemonic,
          address: wallet.address,
          shieldedPk: wallet.shieldedPk,
          rpcUrl: wallet.rpcUrl,
          network: wallet.network,
          createWallet: wallet.createWallet,
          sendShielded: wallet.sendShielded,
          sendUnshield: wallet.sendUnshield,
          sendPrivate: wallet.sendPrivate,
          setNetwork: wallet.setNetwork,
          setRpcUrl: wallet.setRpcUrl,
          setAccountIndex: wallet.setAccountIndex,
          logout: wallet.logout,
          importWallet: wallet.importWallet,
        },
        openMining: mode?.openMining,
        wc: wc
          ? {
              proposal: wc.proposal,
              request: wc.request,
              sessions: wc.sessions.map((row) => ({ topic: row.topic, name: row.name })),
              approveProposal: wc.approveProposal,
              rejectProposal: wc.rejectProposal,
              approveRequest: wc.approveRequest,
              rejectRequest: wc.rejectRequest,
              pair: wc.pair,
              disconnect: wc.disconnect,
            }
          : null,
      }),
    vaultMoveIn: async (amount: string) => {
      if (wallet.network !== 'arxon') await wallet.setNetwork('arxon');
      await wallet.sendShielded(amount, VAULT_FLAGS);
    },
    vaultMoveOut: async (amount: string) => {
      if (!wallet.address) throw new Error('No account');
      if (wallet.network !== 'arxon') await wallet.setNetwork('arxon');
      await wallet.sendUnshield(wallet.address, amount, UNSHIELD_FLAGS);
    },
    wcSessions: (wc?.sessions ?? []).map((row) => ({ name: row.name, url: row.url, topic: row.topic })),
    wcPeer: wc?.request
      ? { ...requestLabel(wc.request), detail: requestLabel(wc.request).detail }
      : wc?.proposal
        ? { ...dappLabel(wc.proposal), detail: 'See your public address' }
        : null,
    wcKind: wc?.request ? 'request' : wc?.proposal ? 'proposal' : null,
    approveWc: async () => {
      if (wc?.request) {
        await wc.approveRequest();
        return;
      }
      if (wc?.proposal) {
        await wc.approveProposal();
        return;
      }
      throw new Error('No WalletConnect request is waiting. Paste a wc: URI from the dApp to pair.');
    },
    rejectWc: async () => {
      if (wc?.request) {
        await wc.rejectRequest();
        return;
      }
      if (wc?.proposal) {
        await wc.rejectProposal();
      }
    },
    disconnectWc: async (topic: string) => {
      await wc?.disconnect(topic);
    },
    pairWc: async (uri: string) => {
      if (!wc) throw new Error('WalletConnect is not ready.');
      await wc.pair(uri);
    },
    receiveAsset,
    receiveAddress,
    receiveQr,
    setReceiveAsset,
    scanQr,
    refresh: async () => {
      await Promise.all([
        wallet.refreshBalance(),
        refreshPrices(),
        loadActivity().then((items) => setActivity(groupActivity(items))),
      ]);
    },
  }), [
    wallet,
    hide,
    wc,
    mode,
    words,
    activity,
    inspect,
    listed,
    arx,
    defaults,
    codes,
    tokens,
    testnetTokens,
    testnetAdded,
    vaultTokens,
    refreshVault,
    totalN,
    weighted,
    current,
    startId,
    ensureWords,
    send,
    tick,
    receiveAsset,
    receiveAddress,
    receiveQr,
    scanQr,
    alt,
    format,
    refreshPrices,
  ]);

  return <LiveFrameContext.Provider value={value}>{children}</LiveFrameContext.Provider>;
}

function groupActivity(items: ActivityItem[]): LiveActivity[] {
  if (!items.length) return [];
  const now = Date.now();
  const groups = new Map<string, LiveActivity>();
  for (const item of items.slice(0, 40)) {
    const ageDays = Math.floor((now - item.at) / 86_400_000);
    const day = ageDays <= 0 ? 'Today' : ageDays === 1 ? 'Yesterday' : 'Earlier';
    const age = ageDays <= 0 ? 0 : ageDays === 1 ? 1 : 14;
    const current = groups.get(day) ?? { day, age, items: [] };
    const model =
      item.kind === 'shield' || item.kind === 'unshield' || item.kind === 'private'
        ? item.kind
        : item.kind === 'transfer'
          ? 'public'
          : 'onchain';
    const place = model === 'public' || model === 'onchain' ? 'home' : 'vault';
    const kind = place === 'vault' && model !== 'private' ? 'vault' : model === 'private' ? 'private' : 'sent';
    const who = item.kind === 'shield' ? '' : briefAddr(item.to);
    const when = new Date(item.at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    const where = place === 'home' ? 'Home' : 'Vault';
    current.items.push({
      title: model === 'shield' ? 'Shield in' : model === 'unshield' ? 'Unshield' : model === 'private' ? 'Private pay' : model === 'public' ? 'Sent' : 'On-chain',
      sub: `${where}${who ? ` · ${who}` : ''} · ${when}`,
      amount: item.amount ? `${item.amount} ${item.token ?? ''}`.trim() : item.hash.slice(0, 10),
      fiat: item.network === 'ethereum' ? 'Ethereum' : 'Arxon Testnet',
      kind,
      token: item.token ?? 'ARX',
      to: item.kind === 'private' ? 'receipt' : 'tx',
      hash: item.hash,
      model,
      place,
      party: item.to,
      network: item.network === 'ethereum' ? 'ethereum' : 'arxon',
    });
    groups.set(day, current);
  }
  return [...groups.values()];
}

function toLiveInspect(row: InspectedTx): LiveInspect {
  const vault = row.kind === 'shield' || row.kind === 'unshield';
  const title =
    row.kind === 'shield' ? 'Moved to Vault' : row.kind === 'unshield' ? 'Moved to Home' : row.kind === 'private' ? 'Sent privately' : 'Sent';
  const amount = row.valueArx && Number(row.valueArx) > 0 ? `${row.valueArx} ARX` : row.kind === 'private' ? 'Amount hidden' : row.hash.slice(0, 10);
  const hidden = row.rows.filter((item) => item.state === 'hidden').map((item) => item.label);
  return {
    hash: row.hash,
    title,
    amount,
    fiat: row.kind === 'private' ? 'Private' : 'Arxon Testnet',
    status: row.status === 'success' ? 'Confirmed' : row.status === 'reverted' ? 'Reverted' : 'Pending',
    vault,
    rows: [
      ['Date', row.blockNumber ? `Block ${row.blockNumber}` : 'Pending'],
      ...(row.from.toLowerCase() === RELAYER_PAYER.toLowerCase() ? [] : [['From', short(row.from)] as [string, string]]),
      ['To', row.to ? short(row.to) : '—'],
      ['Amount', amount],
      ['Privacy', hidden.length ? hidden.join(', ') : row.kind === 'private' ? 'Private' : 'Public'],
      ...row.rows.slice(0, 4).map((item): [string, string] => [item.label, fieldText(item.value)]),
    ],
  };
}

void hiddenCount;
void checkUnlockPassword;
void addHdAccount;
