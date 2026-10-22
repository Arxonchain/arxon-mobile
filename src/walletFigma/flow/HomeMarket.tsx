import type { CSSProperties } from 'react';
import { FigmaImg } from '@/walletFigma/icons';
import { formatPct, formatUsd, quoteFor, type PricedSymbol } from '@/chainWallet/prices';
import { useTokenPrices } from '@/hooks/useTokenPrices';
import { useMarketChart } from '@/hooks/useMarketChart';
import { font } from '@/walletFigma/tokens';
import { MarketSpark } from './LivePriceChart';

type Go = (id: string, remember?: boolean) => void;

const MARKET: { name: string; symbol: PricedSymbol; to: string; icon: 'btc' | 'eth' | 'sol' | 'usdt' | 'usdc' }[] = [
  { name: 'Ethereum', symbol: 'ETH', to: 'token-eth', icon: 'eth' },
  { name: 'Bitcoin', symbol: 'BTC', to: 'token-btc', icon: 'btc' },
  { name: 'Solana', symbol: 'SOL', to: 'token-sol', icon: 'sol' },
  { name: 'Tether', symbol: 'USDT', to: 'token-usdt', icon: 'usdt' },
  { name: 'USD Coin', symbol: 'USDC', to: 'token-usdc', icon: 'usdc' },
];

export function HomeMarket({ go }: { go: Go }) {
  const { prices } = useTokenPrices();
  return (
    <section style={{ marginTop: 8, width: '100%' }}>
      <p style={{ margin: '0 0 4px', fontSize: 16, fontWeight: 700 }}>Market</p>
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {MARKET.map((coin) => (
          <MarketRow key={coin.symbol} coin={coin} go={go} prices={prices} />
        ))}
      </div>
    </section>
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
  const chart = useMarketChart(coin.symbol, '1D');
  const q = quoteFor(coin.symbol, prices);
  const change = formatPct(q.change24h);
  const up = (q.change24h ?? 0) > 0;
  const down = (q.change24h ?? 0) < 0;
  return (
    <button type="button" onClick={() => go(coin.to)} style={row}>
      <CoinLogo kind={coin.icon} />
      <span style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
        <span style={name}>{coin.name}</span>
        <span style={sub}>{coin.symbol}</span>
      </span>
      <MarketSpark points={chart.points} />
      <span style={{ textAlign: 'right', flexShrink: 0, minWidth: 72 }}>
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

const row: CSSProperties = {
  width: '100%',
  height: 64,
  minHeight: 64,
  maxHeight: 64,
  display: 'flex',
  alignItems: 'center',
  gap: 10,
  border: 'none',
  background: 'none',
  color: '#fff',
  padding: 0,
  cursor: 'pointer',
  fontFamily: font.sans,
  boxSizing: 'border-box',
  overflow: 'hidden',
};
const name: CSSProperties = { display: 'block', fontSize: 15, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' };
const sub: CSSProperties = { display: 'block', marginTop: 2, fontSize: 12, color: '#8c8f99' };
