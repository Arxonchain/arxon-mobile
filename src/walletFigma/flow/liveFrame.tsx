import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { getAddress, type Address } from 'viem';
import { activityLabel, loadActivity, type ActivityItem } from '@/chainWallet/activity';
import { useChainWallet } from '@/chainWallet/ChainWalletContext';
import type { EthereumToken, WalletNetworkId } from '@/chainWallet/networks';
import { quoteFor, usdFromAmount } from '@/chainWallet/prices';
import { useTokenPrices } from '@/hooks/useTokenPrices';

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
  }[];
};

type LiveFrame = {
  app: true;
  address: string | null;
  accountLabel: string;
  total: string;
  day: string;
  tokens: LiveTok[];
  testnetTotal: string;
  testnetTokens: LiveTok[];
  activity: LiveActivity[];
  words: string[] | null;
  ensureWords: () => Promise<string[]>;
  importPhrase: (phrase: string) => Promise<void>;
  setNetwork: (id: WalletNetworkId) => Promise<void>;
  send: (symbol: string, to: string, amount: string, testnet: boolean) => Promise<void>;
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
  const [words, setWords] = useState<string[] | null>(null);
  const [activity, setActivity] = useState<LiveActivity[]>([]);
  const [arx, setArx] = useState<string | null>(null);

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

  const ensureWords = useCallback(async () => {
    if (words && words.length >= 12) return words;
    if (wallet.mnemonic) {
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

  const tokens: LiveTok[] = [
    {
      name: 'Arxon',
      amount: `${qty(arx, 4)} ARX`,
      value: 'No USD price',
      change: 'Arxon Testnet',
      tone: 'flat',
      icon: 'arx',
      to: 'token-arx',
    },
    {
      name: 'Bitcoin',
      amount: '0.00 BTC',
      value: '$0.00',
      change: 'Not on this wallet',
      tone: 'flat',
      icon: 'btc',
      to: 'token-btc',
    },
    {
      name: 'Ethereum',
      amount: `${qty(eth.ETH, 6)} ETH`,
      value: usd(ethUsd),
      change: pct(ethQ.change24h),
      tone: toneOf(ethQ.change24h),
      icon: 'eth',
      to: 'token-eth',
    },
    {
      name: 'Tether',
      amount: `${qty(eth.USDT, 2)} USDT`,
      value: usd(usdtUsd),
      change: pct(usdtQ.change24h),
      tone: toneOf(usdtQ.change24h),
      icon: 'usdt',
      to: 'token-usdt',
    },
    {
      name: 'USD Coin',
      amount: `${qty(eth.USDC, 2)} USDC`,
      value: usd(usdcUsd),
      change: pct(usdcQ.change24h),
      tone: toneOf(usdcQ.change24h),
      icon: 'usdc',
      to: 'token-usdc',
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
    },
  ];

  const value: LiveFrame = {
    app: true,
    address: wallet.address,
    accountLabel: wallet.address ? short(wallet.address) : 'Account 01',
    total: usd(totalN),
    day: 'Ethereum',
    tokens,
    testnetTotal: qty(wallet.network === 'arxon' ? wallet.balance : arx, 4),
    testnetTokens,
    activity,
    words,
    ensureWords,
    importPhrase: wallet.importWallet,
    setNetwork: wallet.setNetwork,
    send: async (symbol, to, amount, testnet) => {
      const dest = to.trim();
      if (!/^0x[0-9a-fA-F]{40}$/.test(dest)) {
        throw new Error('Enter a 0x address. This wallet sends on Ethereum and Arxon Testnet.');
      }
      const addr = getAddress(dest) as Address;
      if (testnet || symbol === 'ARX' || symbol === 'tARX') {
        if (wallet.network !== 'arxon') await wallet.setNetwork('arxon');
        await wallet.sendArx(addr, amount);
        return;
      }
      if (!isEthSymbol(symbol)) {
        throw new Error(`${symbol} sends are not available on this wallet.`);
      }
      if (wallet.network !== 'ethereum') await wallet.setNetwork('ethereum');
      await wallet.sendEthereum(symbol, addr, amount);
    },
  };

  return <LiveFrameContext.Provider value={value}>{children}</LiveFrameContext.Provider>;
}

function groupActivity(items: ActivityItem[]): LiveActivity[] {
  if (!items.length) return [];
  return [{
    day: 'On this phone',
    age: 0,
    items: items.slice(0, 12).map((item) => ({
      title: activityLabel(item.kind),
      sub: `${item.hash.slice(0, 8)}…${item.hash.slice(-4)}${item.network === 'ethereum' ? ' · Ethereum' : ' · Arxon Testnet'}`,
      amount: item.amount ? `${item.amount} ${item.token ?? ''}`.trim() : item.hash.slice(0, 10),
      fiat: item.network === 'ethereum' ? 'Ethereum' : 'Arxon Testnet',
      kind: item.kind === 'shield' || item.kind === 'unshield' ? 'vault' : item.kind === 'private' ? 'private' : 'sent',
      token: item.token ?? 'ARX',
      to: 'tx',
    })),
  }];
}
