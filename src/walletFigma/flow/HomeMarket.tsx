import { useMemo, useState, type CSSProperties } from 'react';
import { FigmaImg } from '@/walletFigma/icons';
import { formatPct, formatUsd, quoteFor, type PricedSymbol } from '@/chainWallet/prices';
import { useTokenPrices } from '@/hooks/useTokenPrices';
import { useMarketChart } from '@/hooks/useMarketChart';
import { font } from '@/walletFigma/tokens';
import { MarketSpark } from './LivePriceChart';
import { pickWalletTab, useWalletNetwork, WalletTabs, type WalletTabName } from './WalletTabs';
import { useLiveFrame } from './liveFrame';
import { BackChip, FROST_PLACEHOLDER_CSS, frostField, frostInput, PullHint, sheetGlass } from './LiveScroll';
import { usePullRefresh } from './pullRefresh';
import { useAppHidesFigmaChrome } from './appChrome';
import { tabTarget, vaultEntry } from './VaultScreens';
import { useMarketFavs } from './marketFavs';

type Go = (id: string, remember?: boolean) => void;
type MarketChip = 'All' | 'Favourite' | 'Top Gainers' | 'Top Losers';

const MARKET: { name: string; symbol: PricedSymbol; to: string; icon: 'btc' | 'eth' | 'sol' | 'usdt' | 'usdc' }[] = [
  { name: 'Ethereum', symbol: 'ETH', to: 'token-eth', icon: 'eth' },
  { name: 'Bitcoin', symbol: 'BTC', to: 'token-btc', icon: 'btc' },
  { name: 'Solana', symbol: 'SOL', to: 'token-sol', icon: 'sol' },
  { name: 'Tether', symbol: 'USDT', to: 'token-usdt', icon: 'usdt' },
  { name: 'USD Coin', symbol: 'USDC', to: 'token-usdc', icon: 'usdc' },
];

const CHIPS: MarketChip[] = ['All', 'Favourite', 'Top Gainers', 'Top Losers'];

export function MarketScreen({ go, back }: { go: Go; back?: () => void }) {
  const live = useLiveFrame();
  const hideChrome = useAppHidesFigmaChrome();
  const net = useWalletNetwork();
  const top = live?.app ? 'max(72px, env(safe-area-inset-top, 0px))' : hideChrome ? 16 : 58;
  const [query, setQuery] = useState('');
  const [chip, setChip] = useState<MarketChip>('All');
  const { prices, refresh: refreshPrices } = useTokenPrices();
  const { favs, has: isFav } = useMarketFavs();
  const pull = usePullRefresh(async () => {
    await Promise.allSettled([live?.refresh?.(), refreshPrices()]);
  });

  const coins = useMemo(() => {
    const q = query.trim().toLowerCase();
    let rows = MARKET.filter((coin) => !q || coin.name.toLowerCase().includes(q) || coin.symbol.toLowerCase().includes(q));
    if (chip === 'Favourite') {
      rows = rows.filter((coin) => isFav(coin.symbol));
    } else if (chip === 'Top Gainers') {
      rows = [...rows].sort((a, b) => (quoteFor(b.symbol, prices).change24h ?? -Infinity) - (quoteFor(a.symbol, prices).change24h ?? -Infinity))
        .filter((coin) => (quoteFor(coin.symbol, prices).change24h ?? 0) > 0);
    } else if (chip === 'Top Losers') {
      rows = [...rows].sort((a, b) => (quoteFor(a.symbol, prices).change24h ?? Infinity) - (quoteFor(b.symbol, prices).change24h ?? Infinity))
        .filter((coin) => (quoteFor(coin.symbol, prices).change24h ?? 0) < 0);
    }
    return rows;
  }, [query, chip, prices, favs, isFav]);

  return (
    <div style={{ position: 'relative', width: 390, height: 844, background: '#050505', overflow: 'hidden', fontFamily: font.sans, color: '#fff' }}>
      {live?.app ? <style>{FROST_PLACEHOLDER_CSS}</style> : null}
      {hideChrome ? null : (
        <div style={{ position: 'absolute', left: 0, top: 0, width: 390, height: 44 }}>
          <span style={{ position: 'absolute', left: 21, top: 14, width: 54, textAlign: 'center', fontSize: 14, fontWeight: 600, letterSpacing: -0.28 }}>9:41</span>
          <img src="/wallet-figma/welcome/status.svg" alt="" width={66.6} height={11.33} style={{ position: 'absolute', left: 288.67, top: 17.33 }} />
        </div>
      )}
      <div
        className="arxon-token-scroll"
        style={{ position: 'absolute', left: 0, top, width: 390, bottom: 0, overflowY: 'auto', WebkitOverflowScrolling: 'touch', touchAction: 'pan-y', boxSizing: 'border-box', padding: '8px 18px calc(88px + env(safe-area-inset-bottom, 0px))' }}
        onTouchStart={live?.app ? pull.onTouchStart : undefined}
        onTouchMove={live?.app ? pull.onTouchMove : undefined}
        onTouchEnd={live?.app ? pull.onTouchEnd : undefined}
      >
        {live?.app ? <PullHint pull={pull.pull} busy={pull.busy} /> : null}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
          {live?.app && back ? <BackChip onBack={back} /> : null}
          <p style={{ margin: 0, flex: 1, fontSize: 28, fontWeight: 700 }}>Market</p>
        </div>
        <label style={live?.app ? { ...searchBox, ...frostField } : searchBox}>
          <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden>
            <circle cx="7" cy="7" r="5" fill="none" stroke={live?.app ? '#3a4254' : '#8c8f99'} strokeWidth="1.6" />
            <path d="M11 11l3 3" fill="none" stroke={live?.app ? '#3a4254' : '#8c8f99'} strokeWidth="1.6" strokeLinecap="round" />
          </svg>
          <input
            className={live?.app ? 'frost-input' : undefined}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search coins"
            aria-label="Search coins"
            style={live?.app ? frostInput : searchInput}
          />
        </label>
        <div className="arxon-token-scroll" style={{ display: 'flex', gap: 8, overflowX: 'auto', WebkitOverflowScrolling: 'touch', margin: '14px 0 18px', paddingBottom: 2 }}>
          {CHIPS.map((label) => {
            const on = chip === label;
            return (
              <button
                key={label}
                type="button"
                onClick={() => setChip(label)}
                style={{
                  flexShrink: 0,
                  height: 34,
                  padding: '0 14px',
                  border: 'none',
                  borderRadius: 17,
                  background: on ? '#accafe' : 'rgba(28,32,37,0.92)',
                  color: on ? '#0c1018' : '#fff',
                  fontFamily: font.sans,
                  fontSize: 13,
                  fontWeight: on ? 600 : 500,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                }}
              >
                {label}
              </button>
            );
          })}
        </div>
        <p style={{ margin: '0 0 10px', fontSize: 18, fontWeight: 700 }}>The List</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {coins.length === 0 ? (
            <p style={{ margin: 0, fontSize: 13, color: '#8b9097' }}>{chip === 'Favourite' ? 'No favourite coins yet. Star a coin on its page.' : 'No coins in this filter.'}</p>
          ) : coins.map((coin) => (
            <MarketRow key={coin.symbol} coin={coin} go={go} prices={prices} />
          ))}
        </div>
      </div>
      <WalletTabs
        active="Market"
        onSelect={(tab: WalletTabName) => {
          if (tab === 'Market') return;
          pickWalletTab(net, tab, go, {
            home: net === 'testnet' ? 'testnet' : tabTarget('home'),
            vault: net === 'testnet' ? vaultEntry('vault') : tabTarget('vault'),
            history: 'activity',
          });
        }}
      />
    </div>
  );
}

export function HomeMarket({ go, showTitle = true }: { go: Go; showTitle?: boolean }) {
  const { prices } = useTokenPrices();
  return (
    <section style={{ marginTop: showTitle ? 8 : 0, width: '100%' }}>
      {showTitle ? <p style={{ margin: '0 0 10px', fontSize: 16, fontWeight: 700 }}>Market</p> : null}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {MARKET.map((coin) => (
          <MarketRow key={coin.symbol} coin={coin} go={go} prices={prices} />
        ))}
      </div>
    </section>
  );
}

function FavStar() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden>
      <path d="M6 1.15 7.28 3.8l2.92.4-2.13 2.04.52 2.9L6 7.82 4.41 9.14l.52-2.9L2.8 4.2l2.92-.4L6 1.15Z" fill="#accafe" />
    </svg>
  );
}

function MarketRow({
  coin,
  go,
  prices,
}: {
  coin: (typeof MARKET)[number];
  go: Go;
  prices: ReturnType<typeof useTokenPrices>['prices'];
}) {
  const { has } = useMarketFavs();
  const starred = has(coin.symbol);
  const chart = useMarketChart(coin.symbol, '1D');
  const q = quoteFor(coin.symbol, prices);
  const change = formatPct(q.change24h);
  const up = (q.change24h ?? 0) > 0;
  const down = (q.change24h ?? 0) < 0;
  return (
    <button type="button" onClick={() => go(coin.to)} style={coinCard}>
      {starred ? (
        <span aria-label="Favourite" style={{ width: 16, height: 16, borderRadius: 8, background: 'rgba(172,202,254,0.16)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <FavStar />
        </span>
      ) : null}
      <CoinLogo kind={coin.icon} />
      <span style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
        <span style={name}>{coin.name}</span>
        <span style={sub}>{coin.symbol}</span>
      </span>
      <MarketSpark points={chart.points} />
      <span style={{ textAlign: 'right', flexShrink: 0, minWidth: 76 }}>
        <span style={name}>{formatUsd(q.usd) || '—'}</span>
        <span style={{ ...sub, color: up ? '#3ddc84' : down ? '#f25252' : '#8c8f99' }}>{change || '—'}</span>
      </span>
    </button>
  );
}

export function CoinLogo({ kind }: { kind: (typeof MARKET)[number]['icon'] }) {
  if (kind === 'btc') return <FigmaImg src="/wallet-figma/home/btc.svg" width={40} height={40} />;
  if (kind === 'eth') {
    return (
      <span style={logoWrap('#627eeb')}>
        <FigmaImg src="/wallet-figma/home/eth.svg" width={16} height={25} />
      </span>
    );
  }
  if (kind === 'sol') {
    return <img src="/wallet-figma/welcome/sol.png" alt="" width={40} height={40} style={{ borderRadius: 20, objectFit: 'cover', flexShrink: 0 }} />;
  }
  if (kind === 'usdt') return <img src="/wallet-figma/home/usdt.png" alt="" width={40} height={40} style={{ borderRadius: 20, objectFit: 'cover', flexShrink: 0 }} />;
  return (
    <span style={logoWrap('#2775ca')}>
      <FigmaImg src="/wallet-figma/home/usdc.svg" width={12} height={22} />
    </span>
  );
}

function logoWrap(bg: string): CSSProperties {
  return { width: 40, height: 40, borderRadius: 20, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 };
}

const coinCard: CSSProperties = {
  width: '100%',
  minHeight: 72,
  display: 'flex',
  alignItems: 'center',
  gap: 12,
  border: '1px solid rgba(255,255,255,0.08)',
  background: 'rgba(12,14,20,0.92)',
  color: '#fff',
  padding: '12px 14px',
  cursor: 'pointer',
  fontFamily: font.sans,
  boxSizing: 'border-box',
  borderRadius: 18,
  boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.06)',
};
const name: CSSProperties = { display: 'block', fontSize: 15, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' };
const sub: CSSProperties = { display: 'block', marginTop: 2, fontSize: 12, color: '#8c8f99' };
const searchBox: CSSProperties = {
  height: 48,
  boxSizing: 'border-box',
  display: 'flex',
  alignItems: 'center',
  gap: 10,
  padding: '0 14px',
  borderRadius: 16,
  ...sheetGlass,
};
const searchInput: CSSProperties = {
  flex: 1,
  minWidth: 0,
  border: 'none',
  outline: 'none',
  background: 'transparent',
  color: '#fff',
  fontFamily: font.sans,
  fontSize: 15,
};
