import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { getAddress, type Address } from 'viem';
import { activityLabel, loadActivity, type ActivityItem } from '@/chainWallet/activity';
import { useChainWallet } from '@/chainWallet/ChainWalletContext';
import { useHideBalance } from '@/chainWallet/hideBalance';
import type { EthereumToken, WalletNetworkId } from '@/chainWallet/networks';
import { quoteFor, usdFromAmount } from '@/chainWallet/prices';
import { VAULT_FLAGS, UNSHIELD_FLAGS, type PrivacyFlags } from '@/chainWallet/privacy';
import { routeSend } from '@/chainWallet/routeSend';
import { addListedToken, loadListedTokens } from '@/chainWallet/tokens';
import { useTokenPrices } from '@/hooks/useTokenPrices';
import { hiddenCount, privacyPill as pillText, readDefaultPrivacy, writeDefaultPrivacy } from '@/walletFigma/privacyPrefs';
import { enableBiometrics, verifyBiometrics } from '@/chainWallet/biometrics';
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
import { useWc } from '@/chainWallet/wcProvider';
import { beforeGo, type NavDecision } from './liveNav';
import { useWalletModeActions } from './ModeShell';

export type LiveTone = 'up' | 'down' | 'flat';
export type LiveIcon = 'arx' | 'btc' | 'eth' | 'usdt' | 'usdc';

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
  }[];
};

export type LiveSendMode = 'home' | 'vault' | 'private' | 'unshield';

type LiveFrame = {
  app: true;
  ready: boolean;
  locked: boolean;
  address: string | null;
  accountLabel: string;
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
  words: string[] | null;
  shielded: string;
  sessionPassword: string | null;
  startId: string;
  ensureWords: () => Promise<string[]>;
  importPhrase: (phrase: string) => Promise<void>;
  importKey: (key: string) => Promise<void>;
  setNetwork: (id: WalletNetworkId) => Promise<void>;
  setRpcUrl: (url: string) => Promise<string>;
  send: (symbol: string, to: string, amount: string, testnet: boolean, mode?: LiveSendMode) => Promise<void>;
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
  return n.toLocaleString(undefined, { style: 'currency', currency: 'USD' });
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
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

function isEthSymbol(value: string): value is EthereumToken {
  return value === 'ETH' || value === 'USDC' || value === 'USDT';
}

export function LiveFrameProvider({ children }: { children: ReactNode }) {
  const wallet = useChainWallet();
  const { prices } = useTokenPrices();
  const hide = useHideBalance();
  const wc = useWc();
  const mode = useWalletModeActions();
  const [words, setWords] = useState<string[] | null>(null);
  const [activity, setActivity] = useState<LiveActivity[]>([]);
  const [arx, setArx] = useState<string | null>(null);
  const [defaults, setDefaults] = useState(readDefaultPrivacy);
  const [codes, setCodes] = useState(() => listDisclosureCodes());
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (wallet.network === 'arxon') setArx(wallet.balance);
  }, [wallet.network, wallet.balance]);

  useEffect(() => {
    let cancel = false;
    void loadActivity().then((items) => {
      if (!cancel) setActivity(groupActivity(items));
    });
    return () => {
      cancel = true;
    };
  }, [wallet.address, wallet.balance, wallet.network]);

  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState === 'hidden') touchSession();
      setTick((n) => n + 1);
    };
    const onMove = () => touchSession();
    document.addEventListener('visibilitychange', onVis);
    window.addEventListener('pointerdown', onMove);
    const t = window.setInterval(() => setTick((n) => n + 1), 15_000);
    return () => {
      document.removeEventListener('visibilitychange', onVis);
      window.removeEventListener('pointerdown', onMove);
      window.clearInterval(t);
    };
  }, []);

  const ensureWords = useCallback(async () => {
    if (words && words.length >= 12) return words;
    if (wallet.mnemonic && wallet.mnemonic.trim().split(/\s+/).length >= 12) {
      const next = wallet.mnemonic.trim().split(/\s+/);
      setWords(next);
      return next;
    }
    const created = await wallet.createWallet();
    const next = created.trim().split(/\s+/);
    setWords(next);
    return next;
  }, [wallet, words]);

  const eth = wallet.ethBalances;
  const ethUsd = usdFromAmount(eth.ETH, quoteFor('ETH', prices).usd);
  const usdcUsd = usdFromAmount(eth.USDC, quoteFor('USDC', prices).usd);
  const usdtUsd = usdFromAmount(eth.USDT, quoteFor('USDT', prices).usd);
  const parts = [ethUsd, usdcUsd, usdtUsd].filter((n): n is number => n != null);
  const totalN = parts.length ? parts.reduce((a, b) => a + b, 0) : null;
  const ethQ = quoteFor('ETH', prices);
  const usdcQ = quoteFor('USDC', prices);
  const usdtQ = quoteFor('USDT', prices);

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
      name: 'Arxon',
      amount: `${qty(arx, 4)} ARX`,
      value: 'No USD price',
      change: 'Arxon Testnet',
      tone: 'flat',
      icon: 'arx',
      to: 'token-arx',
      symbol: 'ARX',
    },
    {
      name: 'Bitcoin',
      amount: '0.00 BTC',
      value: '$0.00',
      change: 'Not on this wallet',
      tone: 'flat',
      icon: 'btc',
      to: 'token-btc',
      symbol: 'BTC',
    },
    {
      name: 'Ethereum',
      amount: `${qty(eth.ETH, 6)} ETH`,
      value: usd(ethUsd),
      change: pct(ethQ.change24h),
      tone: toneOf(ethQ.change24h),
      icon: 'eth',
      to: 'token-eth',
      symbol: 'ETH',
    },
    {
      name: 'Tether',
      amount: `${qty(eth.USDT, 2)} USDT`,
      value: usd(usdtUsd),
      change: pct(usdtQ.change24h),
      tone: toneOf(usdtQ.change24h),
      icon: 'usdt',
      to: 'token-usdt',
      symbol: 'USDT',
    },
    {
      name: 'USD Coin',
      amount: `${qty(eth.USDC, 2)} USDC`,
      value: usd(usdcUsd),
      change: pct(usdcQ.change24h),
      tone: toneOf(usdcQ.change24h),
      icon: 'usdc',
      to: 'token-usdc',
      symbol: 'USDC',
    },
  ];

  const testnetTokens: LiveTok[] = [
    {
      name: 'Arxon',
      amount: `${qty(wallet.network === 'arxon' ? wallet.balance : arx, 4)} tARX`,
      value: 'No USD price',
      change: 'Arxon Testnet',
      tone: 'flat',
      icon: 'arx',
      to: 'token-arx',
      symbol: 'ARX',
    },
  ];

  const accounts = sessionStore.accounts();
  const current = accounts.find((row) => row.index === wallet.accountIndex) ?? accounts[0];
  const needsUnlock = wallet.locked || (sessionStore.hasPassword() && !currentPassword() && autoLockDue());
  const startId = !wallet.ready
    ? 'splash'
    : needsUnlock
      ? 'unlock'
      : wallet.address
        ? 'home'
        : 'splash';

  const send = useCallback(
    async (symbol: string, to: string, amount: string, testnet: boolean, mode: LiveSendMode = 'home') => {
      const flags = readDefaultPrivacy();
      if (mode === 'vault' || symbol === 'ARX' && testnet && mode !== 'home') {
        /* continue */
      }
      if (mode === 'vault') {
        if (wallet.network !== 'arxon') await wallet.setNetwork('arxon');
        if (symbol !== 'ARX' && symbol !== 'tARX') {
          throw new Error('Only ARX can move to the Vault on this build. USDT/USDC vault sends need Arxon ARX-20.');
        }
        await wallet.sendShielded(amount, VAULT_FLAGS);
        return;
      }
      if (mode === 'unshield') {
        const dest = to.trim();
        if (!/^0x[0-9a-fA-F]{40}$/.test(dest)) throw new Error('Unshield needs a 0x address.');
        if (wallet.network !== 'arxon') await wallet.setNetwork('arxon');
        await wallet.sendUnshield(getAddress(dest) as Address, amount, UNSHIELD_FLAGS);
        return;
      }
      if (mode === 'private') {
        if (wallet.network !== 'arxon') await wallet.setNetwork('arxon');
        await wallet.sendPrivate(to.trim(), amount, flags.hideSender || flags.hideReceiver || flags.hideAmount ? flags : VAULT_FLAGS);
        return;
      }
      const dest = to.trim();
      if (testnet || symbol === 'ARX' || symbol === 'tARX') {
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
      if (symbol !== 'ETH' && wallet.network === 'ethereum' && mode === 'vault') {
        throw new Error('USDT and USDC on Ethereum cannot move to the Vault.');
      }
      const addr = getAddress(dest) as Address;
      if (wallet.network !== 'ethereum') await wallet.setNetwork('ethereum');
      await wallet.sendEthereum(symbol, addr, amount);
    },
    [wallet],
  );

  const value: LiveFrame = useMemo(() => ({
    app: true,
    ready: wallet.ready,
    locked: wallet.locked || (!!currentPassword() === false && sessionStore.hasPassword() && tick >= 0 && autoLockDue()),
    address: wallet.address,
    accountLabel: current?.label || (wallet.address ? short(wallet.address) : 'Account 01'),
    total: usd(totalN),
    day: weighted == null ? 'Ethereum' : `${weighted > 0 ? '+' : ''}${weighted.toFixed(2)}% Today`,
    dayTone: toneOf(weighted),
    privacyPill: pillText(defaults),
    hidden: hide.hidden,
    toggleHide: hide.toggle,
    tokens,
    testnetTotal: qty(wallet.network === 'arxon' ? wallet.balance : arx, 4),
    testnetTokens,
    activity,
    words,
    shielded: wallet.shieldedBalance,
    sessionPassword: currentPassword(),
    startId,
    ensureWords,
    importPhrase: wallet.importWallet,
    importKey: wallet.importPrivateKey,
    setNetwork: wallet.setNetwork,
    setRpcUrl: wallet.setRpcUrl,
    send,
    unlock: async (password: string) => {
      const ok = await wallet.unlockSession(password);
      if (ok) rememberPassword(password);
      return ok;
    },
    unlockBiometric: async () => {
      const ok = await verifyBiometrics();
      if (!ok) return false;
      const pass = currentPassword();
      if (pass) return wallet.unlockSession(pass);
      return sessionStore.hasPassword() ? false : true;
    },
    persistPassword: async (password: string) => {
      await setUnlockPassword(password);
    },
    addToken: async (raw: string) => {
      const token = await addListedToken(wallet.rpcUrl, raw);
      return `${token.symbol} · ${token.decimals} decimals`;
    },
    search: (query: string) => {
      const q = query.trim().toLowerCase();
      const rows = tokens.filter(
        (row) => !q || row.name.toLowerCase().includes(q) || (row.symbol && row.symbol.toLowerCase().includes(q)),
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
  }), [
    wallet,
    hide,
    wc,
    mode,
    words,
    activity,
    arx,
    defaults,
    codes,
    tokens,
    testnetTokens,
    totalN,
    weighted,
    current,
    startId,
    ensureWords,
    send,
    tick,
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
    const kind =
      item.kind === 'shield' || item.kind === 'unshield'
        ? 'vault'
        : item.kind === 'private'
          ? 'private'
          : 'sent';
    current.items.push({
      title: activityLabel(item.kind),
      sub: `${item.hash.slice(0, 8)}…${item.hash.slice(-4)}${item.network === 'ethereum' ? ' · Ethereum' : ' · Arxon Testnet'}`,
      amount: item.amount ? `${item.amount} ${item.token ?? ''}`.trim() : item.hash.slice(0, 10),
      fiat: item.network === 'ethereum' ? 'Ethereum' : 'Arxon Testnet',
      kind,
      token: item.token ?? 'ARX',
      to: item.kind === 'private' ? 'receipt' : 'tx',
      hash: item.hash,
    });
    groups.set(day, current);
  }
  return [...groups.values()];
}

void hiddenCount;
void loadListedTokens;
void checkUnlockPassword;
void addHdAccount;
void enableBiometrics;
