import { useState, type CSSProperties, type ReactNode } from 'react';
import { FigmaImg } from '@/walletFigma/icons';
import { font } from '@/walletFigma/tokens';
import { vaultEntry } from './VaultScreens';
import { useLiveFrame } from './liveFrame';
import { useAppHidesFigmaChrome } from './appChrome';
import { useWalletNetwork } from './WalletTabs';
import { LivePriceChart } from './LivePriceChart';
import { useDisplayCurrency } from './displayCurrency';
import { CHART_RANGES, RANGE_SUFFIX, pricedChartSymbol, type ChartRange } from '@/chainWallet/marketChart';
import { useMarketChart } from '@/hooks/useMarketChart';
import { useTokenPrices } from '@/hooks/useTokenPrices';
import { formatPct, formatUsd, quoteFor } from '@/chainWallet/prices';
import { CoinLogo } from './HomeMarket';
import { PullHint, sheetGlass } from './LiveScroll';
import { usePullRefresh } from './pullRefresh';
import { useMarketFavs } from './marketFavs';

const art = (name: string) => `/wallet-figma/token/${name}`;
type Go = (id: string, remember?: boolean) => void;

type Row = { title: string; sub: string; amount: string; fiat: string; tone: 'in' | 'out'; to: string };
type Card = { kind: 'fund' | 'receive' | 'privacy'; title: string; body: string; to: string };

const FRAMES: Record<string, {
  title: string;
  amount: string;
  fiat: string;
  change: string;
  up: boolean;
  flat?: boolean;
  vault?: string;
  card?: Card;
  empty?: string;
  rows?: Row[];
  vaultFunds?: boolean;
}> = {
  'token-arx': {
    title: 'Arxon', amount: '0.00 ARX', fiat: '$0.00', change: '+2.10% Today', up: true,
    card: { kind: 'fund', title: 'Fund your wallet', body: 'Buy or receive ARX to get started', to: 'receive' },
    empty: 'Your ARX activity will show up here.',
  },
  'token-btc': {
    title: 'Bitcoin', amount: '0.00 BTC', fiat: '$0.00', change: '-0.37% Today', up: false,
    card: { kind: 'receive', title: 'Receive BTC', body: 'Share your address to get started', to: 'receive' },
    empty: 'Your BTC activity will show up here.',
  },
  'token-eth': {
    title: 'Ethereum', amount: '0.00 ETH', fiat: '$0.00', change: '+0.66% Today', up: true,
    card: { kind: 'receive', title: 'Receive ETH', body: 'Share your address to get started', to: 'receive' },
    empty: 'Your ETH activity will show up here.',
  },
  'token-arx-funded': {
    title: 'Arxon', amount: '2,400.00 ARX', fiat: '$1,008.00', change: '+2.10% Today', up: true,
    card: { kind: 'privacy', title: 'Balance privacy', body: 'Hidden from public view', to: 'balance-privacy' },
    rows: [
      { title: 'Received', sub: 'From arx1q7…m2d9', amount: '+500.00 ARX', fiat: '$210.00', tone: 'in', to: 'tx' },
      { title: 'Sent privately', sub: 'To arx1q8x4…t7c2', amount: 'Amount hidden', fiat: 'Hidden', tone: 'out', to: 'receipt' },
    ],
  },
  'token-btc-funded': {
    title: 'Bitcoin', amount: '0.0021 BTC', fiat: '$187.60', change: '-0.37% Today', up: false,
    rows: [
      { title: 'Received', sub: 'From bc1q8…x9k2', amount: '+0.0021 BTC', fiat: '$187.60', tone: 'in', to: 'tx' },
      { title: 'Sent', sub: 'To bc1q3…7tr4', amount: '-0.0003 BTC', fiat: '$26.80', tone: 'out', to: 'tx' },
    ],
  },
  'token-eth-funded': {
    title: 'Ethereum', amount: '0.0185 ETH', fiat: '$53.00', change: '+0.66% Today', up: true,
    rows: [
      { title: 'Received', sub: 'From 0x9f2…4dm1', amount: '+0.0185 ETH', fiat: '$53.00', tone: 'in', to: 'tx' },
      { title: 'Sent', sub: 'To 0x4e1…c9d0', amount: '-0.0040 ETH', fiat: '$11.66', tone: 'out', to: 'tx' },
    ],
  },
  'token-usdt': {
    title: 'Tether', amount: '120.00 USDT', fiat: '$120.00', change: '+0.01% Today', up: true, vaultFunds: true,
    vault: '40.00 USDT in Vault',
    rows: [
      { title: 'Received', sub: 'From 0x7b3…e2a8', amount: '+150.00 USDT', fiat: '$150.00', tone: 'in', to: 'tx' },
      { title: 'Sent', sub: 'To 0x1c9…f5b6', amount: '-30.00 USDT', fiat: '$30.00', tone: 'out', to: 'tx' },
    ],
  },
  'token-arx-split': {
    title: 'Arxon', amount: '1,400.00 ARX', fiat: '$588.00', change: '+2.10% Today', up: true, vaultFunds: true,
    vault: '1,000.00 ARX in Vault',
    card: { kind: 'privacy', title: 'Balance privacy', body: 'Hidden from public view', to: 'balance-privacy' },
    rows: [
      { title: 'Received', sub: 'From arx1q7…m2d9', amount: '+500.00 ARX', fiat: '$210.00', tone: 'in', to: 'tx' },
      { title: 'Sent privately', sub: 'To arx1q8x4…t7c2', amount: 'Amount hidden', fiat: 'Hidden', tone: 'out', to: 'receipt' },
    ],
  },
  'token-usdc': {
    title: 'USD Coin', amount: '30.00 USDC', fiat: '$30.00', change: '0.00% Today', up: true, flat: true, vaultFunds: true,
    vault: '30.00 USDC in Vault',
    rows: [
      { title: 'Received', sub: 'From 0x4d2…a91c', amount: '+50.00 USDC', fiat: '$50.00', tone: 'in', to: 'tx' },
      { title: 'Sent', sub: 'To 0x6e5…c310', amount: '-20.00 USDC', fiat: '$20.00', tone: 'out', to: 'tx' },
    ],
  },
  'token-sol': {
    title: 'Solana', amount: '0.00 SOL', fiat: '$0.00', change: '0.00% Today', up: true, flat: true,
    card: { kind: 'receive', title: 'Receive SOL', body: 'Share your address to get started', to: 'receive' },
    empty: 'Your SOL activity will show up here.',
  },
};

export function TokenScreens({ id, go, back }: { id: string; go: Go; back?: () => void }) {
  const live = useLiveFrame();
  const hideChrome = useAppHidesFigmaChrome();
  const net = useWalletNetwork();
  const { format } = useDisplayCurrency();
  const frame = FRAMES[id] ?? FRAMES['token-arx'];
  const liveTok = live?.app
    ? (net === 'testnet' ? live.testnetTokens : live.tokens).find((row) => row.name === frame.title)
      ?? (frame.title === 'Arxon' ? live.testnetTokens[0] : undefined)
    : undefined;
  const marketSym = live?.app ? pricedChartSymbol(liveTok?.symbol ?? titleSymbol(frame.title)) : null;
  const { prices } = useTokenPrices();
  const spot = marketSym ? quoteFor(marketSym, prices) : null;
  const spotUp = (spot?.change24h ?? 0) > 0;
  const spotDown = (spot?.change24h ?? 0) < 0;
  const [range, setRange] = useState<ChartRange>('1D');
  const chart = useMarketChart(live?.app ? marketSym : null, range);
  const chartMove = chart.change;
  const amount = liveTok?.amount ?? frame.amount;
  const fiat = liveTok?.value ?? frame.fiat;
  const change = live?.app && chartMove != null
    ? `${chartMove > 0 ? '+' : ''}${chartMove.toFixed(2)}% ${RANGE_SUFFIX[range]}`
    : liveTok
      ? liveTok.change
      : frame.change;
  const changeUp = live?.app && chartMove != null
    ? chartMove > 0
    : liveTok
      ? liveTok.tone === 'up'
      : frame.up && !frame.flat;
  const changeFlat = live?.app && chartMove != null
    ? chartMove === 0
    : liveTok
      ? liveTok.tone === 'flat'
      : !!frame.flat;
  const vaultLabel = live?.app ? undefined : frame.vault;
  const [star, setStar] = useState(false);
  const favs = useMarketFavs();
  const liveSymbol = liveTok?.symbol ?? titleSymbol(frame.title);
  const liveStar = favs.has(liveSymbol);
  const liveN = liveTok ? Number(liveTok.amount.replace(/[^0-9.]/g, '')) : 0;
  const empty = live?.app ? !(Number.isFinite(liveN) && liveN > 0) : !!frame.empty;
  const liveRows = live?.app
    ? live.activity.flatMap((group) => group.items).filter((row) => {
        const sym = liveTok?.symbol ?? '';
        return !sym || row.token === sym || row.token === `t${sym}` || ((sym === 'ARX' || sym === 'ARXt' || sym === 'tARX') && (row.token === 'ARX' || row.token === 'tARX' || row.token === 'ARXt' || !row.token));
      }).slice(0, 2)
    : undefined;
  const activityTop = frame.card ? 636 : 544;
  const rowsTop = frame.card ? 672 : 580;
  const leave = () => {
    if (back) {
      back();
      return;
    }
    go(live?.app && net === 'testnet' ? 'testnet' : (empty ? 'home' : 'home-funded'), false);
  };
  const sendTo = live?.app ? 'send-token' : frame.vaultFunds ? 'send-amount-vault' : 'send-token';
  const swapTo = live?.app ? 'swap' : frame.vaultFunds ? 'swap-vault' : 'swap';

  if (live?.app) {
    return (
      <LiveToken
        title={frame.title}
        amount={amount}
        fiat={fiat}
        change={change}
        changeUp={changeUp}
        changeFlat={changeFlat}
        vaultLabel={vaultLabel}
        marketSym={marketSym}
        spotUsd={formatUsd(spot?.usd) || '—'}
        range={range}
        setRange={setRange}
        chart={chart}
        format={format}
        liveRows={liveRows ?? []}
        empty={empty}
        emptyCopy={frame.empty ?? 'Your activity will show up here.'}
        sendTo={sendTo}
        swapTo={swapTo}
        symbol={liveSymbol}
        icon={tokenIcon(frame.title)}
        star={liveStar}
        onStar={() => favs.toggle(liveSymbol)}
        go={go}
        leave={leave}
        onReceive={() => { live.setReceiveAsset(liveTok?.symbol ?? titleSymbol(frame.title)); go('receive'); }}
      />
    );
  }

  return (
    <div style={{ position: 'relative', width: 390, height: 844, background: '#050505', overflow: 'hidden', fontFamily: font.sans, color: '#fff' }}>
      {hideChrome ? null : (
      <>
      <span style={{ position: 'absolute', left: 28, top: 13, fontSize: 15, fontWeight: 600 }}>9:41</span>
      <img src="/wallet-figma/welcome/status.svg" alt="" width={66.6} height={11.33} style={{ position: 'absolute', left: 296, top: 17 }} />
      </>
      )}
      <button type="button" aria-label="Back" onClick={leave} style={{ ...round, left: 18, top: 56 }}>
        <FigmaImg src={art('chev.svg')} width={20} height={20} />
      </button>
      <p style={{ position: 'absolute', left: 95, top: 65.5, width: 200, margin: 0, textAlign: 'center', fontSize: 17, fontWeight: 600 }}>{frame.title}</p>
      <button type="button" aria-label={star ? 'Unstar' : 'Star'} aria-pressed={star} onClick={() => setStar((v) => !v)} style={{ ...round, left: 332, top: 56, opacity: star ? 1 : 0.9 }}>
        <FigmaImg src={art('star.svg')} width={20} height={20} />
      </button>

      <p style={{ position: 'absolute', left: 22, top: 118, margin: 0, fontSize: 34, fontWeight: 700 }}>{amount}</p>
      <p style={{ position: 'absolute', left: 22, top: 166, margin: 0, display: 'flex', gap: 12, fontSize: 15, fontWeight: 500 }}>
        <span style={{ color: '#8b9097' }}>{fiat}</span>
        <span style={{ color: changeFlat ? '#8b9097' : changeUp ? '#3ddc84' : '#ff5c5c' }}>{change}</span>
      </p>

      {vaultLabel && (
        <button type="button" onClick={() => go(vaultEntry('vault'))} style={pill}>
          <span style={{ color: '#accafe', fontWeight: 500 }}>{vaultLabel}</span>
          <span style={{ color: '#8b9097' }}>· not counted here</span>
        </button>
      )}

      <div style={{ position: 'absolute', left: 18, top: vaultLabel ? 232 : 206, width: 354, height: vaultLabel ? 124 : 150, overflow: 'hidden' }}>
        {live?.app ? (
          <LivePriceChart symbol={marketSym} points={chart.points} loading={chart.loading} error={chart.error} width={354} height={vaultLabel ? 124 : 150} formatUsd={format} />
        ) : (
          <img src={art(frame.up ? 'chart-up.svg' : 'chart-down.svg')} alt="" width={354} height={150} />
        )}
      </div>

      <div style={{ position: 'absolute', left: 18, top: 372, width: 354, height: 36, display: 'flex', alignItems: 'center', gap: 8 }}>
        {live?.app && marketSym ? (
          <span style={{ flex: '0 0 auto', minWidth: 72 }}>
            <span style={{ display: 'block', fontSize: 13, fontWeight: 700, lineHeight: 1.1 }}>{formatUsd(spot?.usd) || '—'}</span>
            <span style={{ display: 'block', marginTop: 2, fontSize: 11, fontWeight: 600, color: spotUp ? '#3ddc84' : spotDown ? '#f25252' : '#8c8f99' }}>{formatPct(spot?.change24h) || '—'}</span>
          </span>
        ) : null}
        <span style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          {CHART_RANGES.map((label) => (
            <button key={label} type="button" onClick={() => setRange(label)} style={{ width: live?.app && marketSym ? 40 : 52, height: 34, border: 'none', borderRadius: 17, background: range === label ? '#2a3447' : 'transparent', color: range === label ? '#accafe' : '#8b9097', fontFamily: font.sans, fontSize: 13, fontWeight: range === label ? 600 : 500, cursor: 'pointer' }}>
              {label}
            </button>
          ))}
        </span>
      </div>

      <div style={{ position: 'absolute', left: 18, top: 432, width: 354, height: 84, display: 'flex', justifyContent: 'space-between', padding: '0 40px', boxSizing: 'border-box' }}>
        <Action label="Send" onClick={() => go(sendTo)}><FigmaImg src={art('send.svg')} width={24} height={24} /></Action>
        <Action label="Receive" onClick={() => { live?.setReceiveAsset(liveTok?.symbol ?? titleSymbol(frame.title)); go('receive'); }}><FigmaImg src={art('receive.svg')} width={24} height={24} /></Action>
        <Action label="Swap" onClick={() => go(swapTo)}><FigmaImg src={art('swap.svg')} width={24} height={24} /></Action>
      </div>

      {frame.card && (
        <button type="button" onClick={() => go(frame.card!.to)} style={card}>
          <span style={iconWrap}>
            {frame.card.kind === 'fund' && <FigmaImg src={art('plus.svg')} width={24} height={24} />}
            {frame.card.kind === 'receive' && <FigmaImg src={art('down.svg')} width={24} height={24} />}
            {frame.card.kind === 'privacy' && <FigmaImg src={art('shield.svg')} width={20} height={20} />}
          </span>
          <span style={{ width: 200, display: 'flex', flexDirection: 'column', gap: 3, textAlign: 'left' }}>
            <span style={{ fontSize: 15, fontWeight: 600 }}>{frame.card.title}</span>
            <span style={{ fontSize: 13, color: '#8b9097' }}>{frame.card.body}</span>
          </span>
          <span style={{ flex: 1 }} />
          <FigmaImg src={art('chev-right.svg')} width={18} height={18} />
        </button>
      )}

      <p style={{ position: 'absolute', left: 18, top: activityTop, margin: 0, fontSize: 18, fontWeight: 700 }}>Recent activity</p>
      {(liveRows ? liveRows.length > 0 : frame.rows) && (
        <button type="button" onClick={() => go('activity')} style={{ position: 'absolute', left: 286, top: activityTop - 6, minWidth: 72, minHeight: 40, border: 'none', background: 'none', color: '#accafe', fontFamily: font.sans, fontSize: 14, fontWeight: 500, cursor: 'pointer', padding: '8px 4px', display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
          See all
        </button>
      )}
      {(live?.app ? !liveRows?.length : frame.empty) && (
        <div style={{ position: 'absolute', left: 18, top: 672, width: 354, paddingTop: 28, textAlign: 'center' }}>
          <p style={{ margin: 0, fontSize: 15, fontWeight: 600 }}>No transactions yet</p>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: '#8b9097' }}>{frame.empty ?? 'Your activity will show up here.'}</p>
        </div>
      )}
      {(liveRows ?? frame.rows)?.map((row, index) => {
        const inbound = 'tone' in row ? row.tone === 'in' : row.kind === 'received';
        const hash = 'hash' in row ? row.hash : undefined;
        return (
        <button key={row.title + row.sub} type="button" onClick={() => {
          if (hash) void live?.openTx(hash, { detail: 'full' });
          go(row.to || 'tx');
        }} style={{ ...activity, top: rowsTop + index * 64 }}>
          <span style={iconWrap}>
            <FigmaImg src={art(inbound ? 'in.svg' : 'out-private.svg')} width={18} height={18} />
          </span>
          <span style={{ width: 150, display: 'flex', flexDirection: 'column', gap: 2, textAlign: 'left' }}>
            <span style={{ fontSize: 15, fontWeight: 600 }}>{row.title}</span>
            <span style={{ fontSize: 13, color: '#8b9097' }}>{row.sub}</span>
          </span>
          <span style={{ flex: 1 }} />
          <span style={{ width: 110, display: 'flex', flexDirection: 'column', gap: 2, textAlign: 'right' }}>
            <span style={{ fontSize: 15, fontWeight: 600, color: inbound ? '#3ddc84' : '#fff' }}>{row.amount}</span>
            <span style={{ fontSize: 13, color: '#8b9097' }}>{row.fiat}</span>
          </span>
        </button>
        );
      })}

      {hideChrome ? null : (
      <div style={{ position: 'absolute', left: 8, top: 810, width: 375, height: 34, opacity: 0.25, pointerEvents: 'none' }}>
        <div style={{ position: 'absolute', left: '50%', bottom: 8, transform: 'translateX(-50%)', width: 134, height: 5, borderRadius: 100, background: '#fff' }} />
      </div>
      )}
    </div>
  );
}

function tokenIcon(title: string): 'btc' | 'eth' | 'sol' | 'usdt' | 'usdc' | 'arx' {
  if (title === 'Bitcoin') return 'btc';
  if (title === 'Solana') return 'sol';
  if (title === 'Arxon') return 'arx';
  if (title === 'Tether') return 'usdt';
  if (title === 'USD Coin') return 'usdc';
  return 'eth';
}

function titleSymbol(title: string) {
  if (title === 'Bitcoin') return 'BTC';
  if (title === 'Solana') return 'SOL';
  if (title === 'Arxon') return 'tARX';
  if (title === 'Tether') return 'USDT';
  if (title === 'USD Coin') return 'USDC';
  return 'ETH';
}

function StarMark({ on }: { on: boolean }) {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden>
      <path
        d="M10 2.92l2.17 4.5 4.91.66-3.58 3.42.83 4.92L10 14.17l-4.33 2.25.83-4.92-3.58-3.42 4.91-.66L10 2.92Z"
        fill={on ? '#accafe' : 'none'}
        stroke={on ? '#accafe' : '#fff'}
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function LiveToken({
  title, amount, fiat, change, changeUp, changeFlat, vaultLabel, marketSym, spotUsd,
  range, setRange, chart, format, liveRows, empty, emptyCopy, sendTo, swapTo, symbol, icon, star, onStar, go, leave, onReceive,
}: {
  title: string;
  amount: string;
  fiat: string;
  change: string;
  changeUp: boolean;
  changeFlat: boolean;
  vaultLabel?: string;
  marketSym: ReturnType<typeof pricedChartSymbol>;
  spotUsd: string;
  range: ChartRange;
  setRange: (v: ChartRange) => void;
  chart: ReturnType<typeof useMarketChart>;
  format: (usd: number) => string;
  liveRows: { title: string; sub: string; amount: string; fiat?: string; tone?: string; kind?: string; hash?: string; to?: string }[];
  empty: boolean;
  emptyCopy: string;
  sendTo: string;
  swapTo: string;
  symbol: string;
  icon: ReturnType<typeof tokenIcon>;
  star: boolean;
  onStar: () => void;
  go: Go;
  leave: () => void;
  onReceive: () => void;
}) {
  const live = useLiveFrame();
  const qty = amount.replace(/\s+[A-Za-z]+$/, '');
  const changeShort = change.replace(/\s+(Today|24h|1H|1D|1W|1M|1Y|All)$/i, '');
  const pull = usePullRefresh(() => live?.refresh?.());
  return (
    <div style={{ position: 'relative', width: 390, height: 844, overflow: 'hidden', fontFamily: font.sans, color: '#fff', background: '#050505' }}>
      <div
        className="arxon-token-scroll"
        style={{ position: 'absolute', left: 0, top: 0, right: 0, bottom: 78, overflowY: 'auto', WebkitOverflowScrolling: 'touch', padding: 'max(54px, env(safe-area-inset-top, 0px)) 18px 16px', boxSizing: 'border-box' }}
        onTouchStart={live?.app ? pull.onTouchStart : undefined}
        onTouchMove={live?.app ? pull.onTouchMove : undefined}
        onTouchEnd={live?.app ? pull.onTouchEnd : undefined}
      >
        {live?.app ? <PullHint pull={pull.pull} busy={pull.busy} /> : null}
        <div style={{ display: 'flex', alignItems: 'center', minHeight: 44, marginBottom: 8 }}>
          <button type="button" aria-label="Back" onClick={leave} style={liveRound}>
            <FigmaImg src={art('chev.svg')} width={20} height={20} />
          </button>
          <span style={{ flex: 1 }} />
          <button type="button" aria-label={star ? 'Remove from favourites' : 'Add to favourites'} aria-pressed={star} onClick={onStar} style={liveRound}>
            <StarMark on={star} />
          </button>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
          {icon === 'arx' ? (
            <span style={{ width: 44, height: 44, borderRadius: 22, background: '#90b9ff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <FigmaImg src="/wallet-figma/home/arx-mask.png" width={22} height={16} />
            </span>
          ) : (
            <CoinLogo kind={icon} />
          )}
          <div style={{ minWidth: 0 }}>
            <p style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>{symbol} ({title})</p>
            <p style={{ margin: '4px 0 0', fontSize: 22, fontWeight: 700 }}>{spotUsd}</p>
          </div>
          <span style={{ marginLeft: 'auto', flexShrink: 0, minHeight: 28, padding: '0 10px', borderRadius: 14, display: 'inline-flex', alignItems: 'center', fontSize: 12, fontWeight: 700, whiteSpace: 'nowrap', background: changeFlat ? 'rgba(140,143,153,0.16)' : changeUp ? 'rgba(61,220,132,0.16)' : 'rgba(242,82,82,0.16)', color: changeFlat ? '#8c8f99' : changeUp ? '#3ddc84' : '#f25252' }}>
            {changeUp && !changeFlat ? '↑ ' : !changeUp && !changeFlat ? '↓ ' : ''}{changeShort}
          </span>
        </div>
        <div style={{ margin: '8px -6px 4px', height: 196, overflow: 'hidden' }}>
          <LivePriceChart symbol={marketSym} points={chart.points} loading={chart.loading} error={chart.error} width={354} height={196} formatUsd={format} endDot />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 6, margin: '12px 0 16px' }}>
          {CHART_RANGES.map((label) => {
            const on = range === label;
            return (
              <button
                key={label}
                type="button"
                onClick={() => setRange(label)}
                style={{
                  flex: 1,
                  height: 32,
                  border: 'none',
                  borderRadius: 16,
                  background: on ? '#accafe' : 'rgba(28,32,37,0.9)',
                  color: on ? '#0c1018' : '#8b9097',
                  fontFamily: font.sans,
                  fontSize: 12,
                  fontWeight: on ? 700 : 500,
                  cursor: 'pointer',
                }}
              >
                {label}
              </button>
            );
          })}
        </div>
        <div style={{ ...sheetGlass, borderRadius: 18, display: 'flex', alignItems: 'stretch', padding: '14px 0' }}>
          <div style={{ flex: 1, textAlign: 'center' }}>
            <p style={{ margin: 0, fontSize: 12, color: '#8c8f99' }}>Balance</p>
            <p style={{ margin: '6px 0 0', fontSize: 16, fontWeight: 700 }}>{qty || amount}</p>
          </div>
          <div style={{ width: 1, background: 'rgba(255,255,255,0.08)' }} />
          <div style={{ flex: 1, textAlign: 'center' }}>
            <p style={{ margin: 0, fontSize: 12, color: '#8c8f99' }}>Value</p>
            <p style={{ margin: '6px 0 0', fontSize: 16, fontWeight: 700 }}>{fiat || spotUsd}</p>
          </div>
        </div>
        {vaultLabel ? (
          <button type="button" onClick={() => go(vaultEntry('vault'))} style={{ marginTop: 10, width: '100%', border: 'none', ...sheetGlass, borderRadius: 14, padding: '10px 12px', color: '#accafe', fontFamily: font.sans, fontSize: 13, fontWeight: 500, cursor: 'pointer', textAlign: 'left' }}>
            {vaultLabel} · not counted here
          </button>
        ) : null}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '18px 0 8px' }}>
          <span style={{ fontSize: 16, fontWeight: 700 }}>Recent</span>
          {liveRows.length > 0 ? (
            <button type="button" onClick={() => go('activity')} style={{ border: 'none', background: 'none', color: '#accafe', fontFamily: font.sans, fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>See all</button>
          ) : null}
        </div>
        {empty || liveRows.length === 0 ? (
          <p style={{ margin: 0, fontSize: 13, color: '#8b9097' }}>{emptyCopy}</p>
        ) : liveRows.map((row) => {
          const inbound = row.tone === 'in' || row.kind === 'received';
          return (
            <button
              key={row.title + row.sub}
              type="button"
              onClick={() => {
                if (row.hash) void live?.openTx(row.hash, { detail: 'full' });
                go(row.to || 'tx');
              }}
              style={{ width: '100%', marginBottom: 8, border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(10,12,16,0.88)', borderRadius: 16, padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 10, color: '#fff', fontFamily: font.sans, cursor: 'pointer', textAlign: 'left' }}
            >
              <span style={{ flex: 1, minWidth: 0 }}>
                <span style={{ display: 'block', fontSize: 14, fontWeight: 600 }}>{row.title}</span>
                <span style={{ display: 'block', marginTop: 2, fontSize: 12, color: '#8b9097' }}>{row.sub}</span>
              </span>
              <span style={{ fontSize: 14, fontWeight: 700, color: inbound ? '#3ddc84' : '#fff' }}>{row.amount}</span>
            </button>
          );
        })}
      </div>
      <div style={{ position: 'absolute', left: 0, right: 0, bottom: 'max(40px, calc(28px + env(safe-area-inset-bottom, 0px)))', display: 'flex', justifyContent: 'center', gap: 8, padding: '0 24px', pointerEvents: 'none' }}>
        <button type="button" onClick={() => go(swapTo)} style={{ ...ghostBtn, pointerEvents: 'auto' }}>Swap</button>
        <button type="button" onClick={onReceive} style={{ ...ghostBtn, pointerEvents: 'auto' }}>Receive</button>
        <button type="button" onClick={() => go(sendTo)} style={{ ...sendBtn, pointerEvents: 'auto' }}>Send {symbol}</button>
      </div>
    </div>
  );
}

const liveRound: CSSProperties = { width: 40, height: 40, borderRadius: 20, border: 'none', background: 'rgba(28,32,37,0.72)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', padding: 0 };
const ghostBtn: CSSProperties = { flex: '0 0 auto', height: 38, minWidth: 86, padding: '0 14px', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 12, background: 'rgba(16,18,24,0.92)', color: '#fff', fontFamily: font.sans, fontSize: 13, fontWeight: 600, cursor: 'pointer' };
const sendBtn: CSSProperties = { flex: '0 0 auto', height: 38, minWidth: 96, padding: '0 14px', border: 'none', borderRadius: 12, background: '#accafe', color: '#0c1018', fontFamily: font.sans, fontSize: 13, fontWeight: 700, cursor: 'pointer' };

function Action({ label, onClick, children }: { label: string; onClick: () => void; children: ReactNode }) {
  return (
    <button type="button" onClick={onClick} style={{ width: 78, height: 84, border: 'none', background: 'none', color: '#fff', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, padding: 0, cursor: 'pointer', fontFamily: font.sans, fontSize: 14 }}>
      <span style={{ width: 58, height: 58, borderRadius: 29, background: '#1c2025', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{children}</span>
      {label}
    </button>
  );
}

const round: CSSProperties = { position: 'absolute', width: 40, height: 40, borderRadius: 20, border: 'none', background: '#1c2025', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', padding: 0 };
const pill: CSSProperties = { position: 'absolute', left: 18, top: 194, display: 'flex', gap: 6, alignItems: 'center', background: '#1c2025', border: '1px solid rgba(172,202,254,0.35)', borderRadius: 14, padding: '5px 12px', fontFamily: font.sans, fontSize: 12, cursor: 'pointer' };
const card: CSSProperties = { position: 'absolute', left: 18, top: 532, width: 354, height: 76, boxSizing: 'border-box', background: '#11161f', border: '1px solid #2a3447', borderRadius: 14, display: 'flex', alignItems: 'center', gap: 14, padding: '0 16px', color: '#fff', fontFamily: font.sans, cursor: 'pointer' };
const iconWrap: CSSProperties = { width: 40, height: 40, borderRadius: 20, background: '#1c2025', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 };
const activity: CSSProperties = { position: 'absolute', left: 18, width: 354, height: 64, border: 'none', background: 'none', color: '#fff', display: 'flex', alignItems: 'center', gap: 12, padding: 0, cursor: 'pointer', fontFamily: font.sans };
