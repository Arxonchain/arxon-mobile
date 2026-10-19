import { useState, type CSSProperties, type ReactNode } from 'react';
import { FigmaImg } from '@/walletFigma/icons';
import { font } from '@/walletFigma/tokens';
import { vaultEntry } from './VaultScreens';
import { useLiveFrame } from './liveFrame';

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
};

const RANGES = ['1H', '1D', '1W', '1M', '1Y', 'All'];

export function TokenScreens({ id, go, back }: { id: string; go: Go; back?: () => void }) {
  const live = useLiveFrame();
  const frame = FRAMES[id] ?? FRAMES['token-arx'];
  const liveTok = live?.app
    ? live.tokens.find((row) => row.name === frame.title) ?? (frame.title === 'Arxon' ? live.testnetTokens[0] : undefined)
    : undefined;
  const amount = liveTok?.amount ?? frame.amount;
  const fiat = liveTok?.value ?? frame.fiat;
  const change = liveTok ? `${liveTok.change}${liveTok.change.includes('Today') ? '' : ''}` : frame.change;
  const vaultLabel = live?.app
    ? (frame.title === 'Arxon' && Number(live.shielded) > 0 ? `${live.shielded} ARX in Vault` : undefined)
    : frame.vault;
  const [range, setRange] = useState('1D');
  const [star, setStar] = useState(false);
  const liveN = liveTok ? Number(liveTok.amount.replace(/[^0-9.]/g, '')) : 0;
  const empty = live?.app ? !(Number.isFinite(liveN) && liveN > 0) : !!frame.empty;
  const activityTop = frame.card ? 636 : 544;
  const rowsTop = frame.card ? 672 : 580;
  const leave = () => (back ? back() : go(empty ? 'home' : 'home-funded', false));
  const sendTo = frame.vaultFunds ? 'send-amount-vault' : 'send-token';
  const swapTo = frame.vaultFunds ? 'swap-vault' : 'swap';

  return (
    <div style={{ position: 'relative', width: 390, height: 844, background: '#050505', overflow: 'hidden', fontFamily: font.sans, color: '#fff' }}>
      <span style={{ position: 'absolute', left: 28, top: 13, fontSize: 15, fontWeight: 600 }}>9:41</span>
      <img src="/wallet-figma/welcome/status.svg" alt="" width={66.6} height={11.33} style={{ position: 'absolute', left: 296, top: 17 }} />
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
        <span style={{ color: liveTok ? (liveTok.tone === 'up' ? '#3ddc84' : liveTok.tone === 'down' ? '#ff5c5c' : '#8b9097') : frame.flat ? '#8b9097' : frame.up ? '#3ddc84' : '#ff5c5c' }}>{change}</span>
      </p>

      {vaultLabel && (
        <button type="button" onClick={() => go(vaultEntry('vault'))} style={pill}>
          <span style={{ color: '#accafe', fontWeight: 500 }}>{vaultLabel}</span>
          <span style={{ color: '#8b9097' }}>· not counted here</span>
        </button>
      )}

      <div style={{ position: 'absolute', left: 18, top: vaultLabel ? 232 : 206, width: 354, height: vaultLabel ? 124 : 150, overflow: 'hidden' }}>
        <img src={art(frame.up ? 'chart-up.svg' : 'chart-down.svg')} alt="" width={354} height={150} />
      </div>

      <div style={{ position: 'absolute', left: 18, top: 372, width: 354, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        {RANGES.map((label) => (
          <button key={label} type="button" onClick={() => setRange(label)} style={{ width: 52, height: 34, border: 'none', borderRadius: 17, background: range === label ? '#2a3447' : 'transparent', color: range === label ? '#accafe' : '#8b9097', fontFamily: font.sans, fontSize: 13, fontWeight: range === label ? 600 : 500, cursor: 'pointer' }}>
            {label}
          </button>
        ))}
      </div>

      <div style={{ position: 'absolute', left: 18, top: 432, width: 354, height: 84, display: 'flex', justifyContent: 'space-between', padding: '0 40px', boxSizing: 'border-box' }}>
        <Action label="Send" onClick={() => go(sendTo)}><FigmaImg src={art('send.svg')} width={24} height={24} /></Action>
        <Action label="Receive" onClick={() => go('receive')}><FigmaImg src={art('receive.svg')} width={24} height={24} /></Action>
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
      {frame.rows && (
        <button type="button" onClick={() => go('activity')} style={{ position: 'absolute', left: 316, top: activityTop + 5, border: 'none', background: 'none', color: '#accafe', fontFamily: font.sans, fontSize: 14, fontWeight: 500, cursor: 'pointer', padding: 0 }}>
          See all
        </button>
      )}
      {frame.empty && (
        <div style={{ position: 'absolute', left: 18, top: 672, width: 354, paddingTop: 28, textAlign: 'center' }}>
          <p style={{ margin: 0, fontSize: 15, fontWeight: 600 }}>No transactions yet</p>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: '#8b9097' }}>{frame.empty}</p>
        </div>
      )}
      {frame.rows?.map((row, index) => (
        <button key={row.title} type="button" onClick={() => go(row.to)} style={{ ...activity, top: rowsTop + index * 64 }}>
          <span style={iconWrap}>
            <FigmaImg src={art(row.tone === 'in' ? 'in.svg' : 'out-private.svg')} width={18} height={18} />
          </span>
          <span style={{ width: 150, display: 'flex', flexDirection: 'column', gap: 2, textAlign: 'left' }}>
            <span style={{ fontSize: 15, fontWeight: 600 }}>{row.title}</span>
            <span style={{ fontSize: 13, color: '#8b9097' }}>{row.sub}</span>
          </span>
          <span style={{ flex: 1 }} />
          <span style={{ width: 110, display: 'flex', flexDirection: 'column', gap: 2, textAlign: 'right' }}>
            <span style={{ fontSize: 15, fontWeight: 600, color: row.tone === 'in' ? '#3ddc84' : '#fff' }}>{row.amount}</span>
            <span style={{ fontSize: 13, color: '#8b9097' }}>{row.fiat}</span>
          </span>
        </button>
      ))}

      <div style={{ position: 'absolute', left: 8, top: 810, width: 375, height: 34, opacity: 0.25, pointerEvents: 'none' }}>
        <div style={{ position: 'absolute', left: '50%', bottom: 8, transform: 'translateX(-50%)', width: 134, height: 5, borderRadius: 100, background: '#fff' }} />
      </div>
    </div>
  );
}

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
