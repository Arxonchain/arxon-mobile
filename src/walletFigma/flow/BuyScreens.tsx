import { useState, type CSSProperties, type ReactNode } from 'react';
import { FigmaImg } from '@/walletFigma/icons';
import { font } from '@/walletFigma/tokens';
import { formatUsd, quoteFor, type PricedSymbol } from '@/chainWallet/prices';
import { useTokenPrices } from '@/hooks/useTokenPrices';
import { useLiveFrame } from './liveFrame';
import { useAppHidesFigmaChrome } from './appChrome';
import { CoinLogo } from './HomeMarket';

const art = (name: string) => `/wallet-figma/buy/${name}`;
type Go = (id: string, remember?: boolean) => void;
type Icon = 'btc' | 'eth' | 'sol' | 'usdt' | 'usdc';
type Asset = { name: string; symbol: PricedSymbol; icon: Icon };

const PROVIDER = 1.5;
const CHIPS = [50, 100, 250];
const SCREENS = new Set(['buy', 'buy-review', 'buy-status']);
const ASSETS: Asset[] = [
  { name: 'Ethereum', symbol: 'ETH', icon: 'eth' },
  { name: 'Bitcoin', symbol: 'BTC', icon: 'btc' },
  { name: 'Solana', symbol: 'SOL', icon: 'sol' },
  { name: 'Tether', symbol: 'USDT', icon: 'usdt' },
  { name: 'USD Coin', symbol: 'USDC', icon: 'usdc' },
];

export function isBuyScreen(id: string) {
  return SCREENS.has(id);
}

export function BuyScreens({ id, go, back }: { id: string; go: Go; back?: () => void }) {
  const { prices } = useTokenPrices();
  const [asset, setAsset] = useState<Asset | null>(null);
  const [amount, setAmount] = useState('100');
  const [hide, setHide] = useState(true);
  const dollars = Number(amount);
  const ready = Number.isFinite(dollars) && dollars > 0;
  const shown = ready ? dollars : 100;
  const usd = asset ? quoteFor(asset.symbol, prices).usd : null;
  const qty = usd && usd > 0 ? shown / usd : 0;
  const total = shown + PROVIDER;
  const leave = () => (back ? back() : go('home', false));
  const coin = asset ?? ASSETS[0];

  return (
    <div style={{ position: 'relative', width: 390, height: 844, background: '#050505', overflow: 'hidden', fontFamily: font.sans, color: '#fff' }}>
      <PhoneStatus />
      {id === 'buy' && !asset && <Pick prices={prices} onPick={setAsset} leave={leave} />}
      {id === 'buy' && asset && (
        <Amount
          asset={asset}
          amount={amount}
          setAmount={setAmount}
          qty={ready && usd && usd > 0 ? dollars / usd : 0}
          usd={usd}
          ready={ready}
          go={go}
          onBack={() => setAsset(null)}
        />
      )}
      {id === 'buy-review' && (
        <Review
          asset={coin}
          dollars={shown}
          qty={qty}
          usd={usd}
          total={total}
          hide={hide}
          setHide={setHide}
          go={go}
          leave={() => go('buy')}
        />
      )}
      {id === 'buy-status' && <Status asset={coin} qty={qty} total={total} hide={hide} go={go} />}
      <HomeBar />
    </div>
  );
}

function Pick({
  prices,
  onPick,
  leave,
}: {
  prices: ReturnType<typeof useTokenPrices>['prices'];
  onPick: (asset: Asset) => void;
  leave: () => void;
}) {
  return (
    <>
      <Back onClick={leave} />
      <p style={title}>Buy crypto</p>
      <p style={{ position: 'absolute', left: 24, top: 112, margin: 0, width: 342, fontSize: 15, color: '#8b9097', lineHeight: 1.4 }}>Choose the token you want to buy with a card.</p>
      <div style={{ position: 'absolute', left: 18, top: 160, width: 354, bottom: 24, overflowY: 'auto' }}>
        <div style={{ background: '#1c2126', borderRadius: 16, overflow: 'hidden' }}>
          {ASSETS.map((coin, index) => {
            const q = quoteFor(coin.symbol, prices);
            return (
              <button
                key={coin.symbol}
                type="button"
                onClick={() => onPick(coin)}
                style={{ ...row, borderTop: index ? '1px solid #29333d' : 'none' }}
              >
                <CoinLogo kind={coin.icon} />
                <span style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
                  <span style={name}>{coin.name}</span>
                  <span style={sub}>{coin.symbol}</span>
                </span>
                <span style={{ textAlign: 'right', flexShrink: 0 }}>
                  <span style={name}>{formatUsd(q.usd) || '—'}</span>
                  <span style={{ ...sub, color: '#accafe' }}>Buy</span>
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </>
  );
}

function Amount({
  asset,
  amount,
  setAmount,
  qty,
  usd,
  ready,
  go,
  onBack,
}: {
  asset: Asset;
  amount: string;
  setAmount: (v: string) => void;
  qty: number;
  usd: number | null;
  ready: boolean;
  go: Go;
  onBack: () => void;
}) {
  const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0', '⌫'];
  const selected = CHIPS.find((chip) => String(chip) === amount);
  return (
    <>
      <Back onClick={onBack} />
      <p style={title}>Buy {asset.symbol}</p>
      <p style={{ position: 'absolute', left: 0, top: 136, width: 390, margin: 0, textAlign: 'center', fontSize: 64, fontWeight: 700, lineHeight: 1.15 }}>${showDollars(amount)}</p>
      <p style={{ position: 'absolute', left: 0, top: 226, width: 390, margin: 0, textAlign: 'center', fontSize: 15, color: '#8b9097' }}>
        ≈ {qty.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 6 })} {asset.symbol}
      </p>
      <div style={{ position: 'absolute', left: 59, top: 266, display: 'flex', gap: 10 }}>
        {CHIPS.map((chip) => (
          <button key={chip} type="button" onClick={() => setAmount(String(chip))} style={{ width: 84, height: 32, borderRadius: 16, border: 'none', background: selected === chip ? '#2a3447' : '#1c2025', color: selected === chip ? '#accafe' : '#8b9097', fontFamily: font.sans, fontSize: 14, fontWeight: 500, cursor: 'pointer' }}>${chip}</button>
        ))}
      </div>
      <button type="button" onClick={onBack} style={{ position: 'absolute', left: 18, top: 314, width: 354, height: 64, boxSizing: 'border-box', background: '#1c2025', borderRadius: 16, display: 'flex', alignItems: 'center', gap: 12, padding: '0 16px 0 12px', border: 'none', color: '#fff', fontFamily: font.sans, cursor: 'pointer' }}>
        <CoinLogo kind={asset.icon} />
        <span style={{ flex: 1, textAlign: 'left' }}>
          <span style={{ display: 'block', fontSize: 12, color: '#8b9097' }}>Buying</span>
          <span style={{ display: 'block', marginTop: 2, fontSize: 15, fontWeight: 600 }}>{asset.name}</span>
        </span>
        <span style={{ color: '#accafe', fontSize: 13, fontWeight: 600 }}>Change</span>
      </button>
      <div style={{ position: 'absolute', left: 18, top: 386, width: 354, height: 64, boxSizing: 'border-box', background: '#1c2025', borderRadius: 16, display: 'flex', alignItems: 'center', gap: 12, padding: '0 16px 0 12px' }}>
        <span style={{ width: 40, height: 40, borderRadius: 20, background: '#2a3447', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <FigmaImg src={art('dollar.svg')} width={18} height={18} />
        </span>
        <span>
          <span style={{ display: 'block', fontSize: 12, color: '#8b9097' }}>Pay with</span>
          <span style={{ display: 'block', marginTop: 2, fontSize: 15, fontWeight: 600 }}>Card or bank transfer</span>
        </span>
      </div>
      <div style={{ position: 'absolute', left: 18, top: 468, width: 354, display: 'flex', flexWrap: 'wrap' }}>
        {keys.map((key) => (
          <button key={key} type="button" aria-label={key === '⌫' ? 'Backspace' : key} onClick={() => setAmount(punch(amount, key))} style={keyBtn}>
            {key === '⌫' ? <FigmaImg src="/wallet-figma/send/backspace.svg" width={24} height={24} /> : key}
          </button>
        ))}
      </div>
      <button type="button" disabled={!ready || !usd} onClick={() => go('buy-review')} style={{ ...primary, top: 716, background: ready && usd ? '#accafe' : '#1c2025', color: ready && usd ? '#0c1018' : '#5c5f64' }}>Review order</button>
    </>
  );
}

function Review({
  asset,
  dollars,
  qty,
  usd,
  total,
  hide,
  setHide,
  go,
  leave,
}: {
  asset: Asset;
  dollars: number;
  qty: number;
  usd: number | null;
  total: number;
  hide: boolean;
  setHide: (v: boolean) => void;
  go: Go;
  leave: () => void;
}) {
  const live = useLiveFrame();
  const [err, setErr] = useState<string | null>(null);
  return (
    <>
      <Back onClick={leave} />
      <p style={title}>Review order</p>
      <div style={{ position: 'absolute', left: 18, top: 124, width: 354, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ background: '#1c2025', borderRadius: 16, padding: '18px 20px' }}>
          <p style={kicker}>You pay</p>
          <p style={{ margin: '4px 0 0', fontSize: 32, fontWeight: 700 }}>${money(dollars)}</p>
          <div style={{ height: 10 }} />
          <p style={kicker}>You receive</p>
          <p style={{ margin: '4px 0 0', fontSize: 32, fontWeight: 700, color: '#accafe' }}>{qty.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 6 })} {asset.symbol}</p>
        </div>
        <div style={{ background: '#1c2025', borderRadius: 16, padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 14, fontSize: 14 }}>
          <Line label="Token" value={`${asset.name} · ${asset.symbol}`} />
          <Line label="Rate" value={usd ? `1 ${asset.symbol} = ${formatUsd(usd)}` : '—'} />
          <Line label="Provider fee" value={`$${money(PROVIDER)}`} />
          <Line label="Network fee" value="$0.00" />
          <Line label="Deliver to" value={live?.app ? `${live.accountLabel}${live.address ? ` · ${live.address.slice(0, 6)}…${live.address.slice(-4)}` : ''}` : 'Account 01 · arx1q7…m2d9'} />
          <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700 }}>
            <span>Total</span>
            <span>${money(total)}</span>
          </div>
        </div>
        <div style={{ height: 72, boxSizing: 'border-box', background: '#1c2025', borderRadius: 16, display: 'flex', alignItems: 'center', gap: 12, padding: '0 12px' }}>
          <span style={{ width: 36, height: 36, borderRadius: 18, background: '#2a3447', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <FigmaImg src="/wallet-figma/send/shield-sm.svg" width={16} height={16} />
          </span>
          <span style={{ flex: 1 }}>
            <span style={{ display: 'block', fontSize: 15, fontWeight: 600 }}>Hide my balance</span>
            <span style={{ display: 'block', marginTop: 2, fontSize: 13, color: '#8b9097' }}>Keep your balance off public view</span>
          </span>
          <button type="button" aria-label="Hide my balance" aria-pressed={hide} onClick={() => setHide(!hide)} style={iconBtn}>
            <FigmaImg src={hide ? '/wallet-figma/send/toggle-on.svg' : '/wallet-figma/send/toggle-off.svg'} width={hide ? 46 : 48} height={28} />
          </button>
        </div>
      </div>
      <p style={{ position: 'absolute', left: 16, top: 714, width: 358, margin: 0, textAlign: 'center', fontSize: 12, color: '#8b9097' }}>By continuing you agree to the provider’s terms.</p>
      {err ? <p style={{ position: 'absolute', left: 24, top: 690, width: 342, margin: 0, color: '#f25252', fontSize: 12 }}>{err}</p> : null}
      <button type="button" onClick={() => {
        if (live?.app) {
          setErr('Coming soon');
          return;
        }
        go('buy-status');
      }} style={{ ...primary, top: 744 }}>Pay ${money(total)}</button>
    </>
  );
}

function Status({ asset, qty, total, hide, go }: { asset: Asset; qty: number; total: number; hide: boolean; go: Go }) {
  const qtyText = qty.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 6 });
  return (
    <>
      <div style={{ position: 'absolute', left: 0, top: 110, width: 390, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
        <div style={{ width: 88, height: 88, borderRadius: 44, boxSizing: 'border-box', background: '#1c2a44', border: '1px solid #accafe', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <FigmaImg src={art('check-lg.svg')} width={32} height={32} />
        </div>
        <div style={{ height: 8 }} />
        <p style={{ margin: 0, fontSize: 24, fontWeight: 700 }}>Payment processing</p>
        <p style={{ margin: 0, width: 300, textAlign: 'center', fontSize: 14, color: '#8b9097', lineHeight: 1.3 }}>{qtyText} {asset.symbol} will arrive in your wallet in a few minutes.</p>
      </div>
      <div style={{ position: 'absolute', left: 18, top: 400, width: 354, boxSizing: 'border-box', background: '#1c2025', borderRadius: 16, padding: 20, display: 'flex', flexDirection: 'column', gap: 18 }}>
        <Step icon={<span style={{ width: 24, height: 24, borderRadius: 12, background: '#3ddc84', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><FigmaImg src={art('check.svg')} width={20} height={20} /></span>} title="Order placed" body={`$${money(total)} charged`} />
        <Step icon={<span style={{ width: 24, height: 24, boxSizing: 'border-box', borderRadius: 12, border: '2px solid #accafe', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><span style={{ width: 10, height: 10, borderRadius: 5, background: '#accafe' }} /></span>} title="Provider confirming" body="Usually under 5 minutes" />
        <Step icon={<span style={{ width: 24, height: 24, boxSizing: 'border-box', borderRadius: 12, border: '2px solid #5c5f64' }} />} title="Delivered to wallet" body={`${qtyText} ${asset.symbol}${hide ? ' · balance hidden' : ''}`} muted />
      </div>
      <button type="button" onClick={() => go('activity')} style={{ ...primary, top: 676 }}>View activity</button>
      <button type="button" onClick={() => go('home')} style={{ position: 'absolute', left: 16, top: 744, width: 358, height: 52, borderRadius: 14, border: '1px solid #2a3447', background: '#11161f', color: '#fff', fontFamily: font.sans, fontSize: 16, fontWeight: 600, cursor: 'pointer' }}>Done</button>
    </>
  );
}

function Line({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
      <span style={{ color: '#8b9097' }}>{label}</span>
      <span style={{ fontWeight: 500, textAlign: 'right' }}>{value}</span>
    </div>
  );
}

function Step({ icon, title, body, muted = false }: { icon: ReactNode; title: string; body: string; muted?: boolean }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
      {icon}
      <span>
        <span style={{ display: 'block', fontSize: 15, fontWeight: 600, color: muted ? '#8b9097' : '#fff' }}>{title}</span>
        <span style={{ display: 'block', marginTop: 2, fontSize: 13, color: '#8b9097' }}>{body}</span>
      </span>
    </div>
  );
}

function Back({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" aria-label="Back" onClick={onClick} style={{ position: 'absolute', left: 18, top: 56, width: 40, height: 40, borderRadius: 20, border: 'none', background: '#1c2025', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', padding: 0 }}>
      <FigmaImg src="/wallet-figma/find/chev.svg" width={20} height={20} />
    </button>
  );
}

function PhoneStatus() {
  const hide = useAppHidesFigmaChrome();
  if (hide) return null;
  return (
    <>
      <span style={{ position: 'absolute', left: 21, top: 14, width: 54, textAlign: 'center', fontSize: 14, fontWeight: 600, letterSpacing: -0.28 }}>9:41</span>
      <img src="/wallet-figma/welcome/status.svg" alt="" width={66.6} height={11.33} style={{ position: 'absolute', left: 288.67, top: 17.33 }} />
    </>
  );
}

function HomeBar() {
  const hide = useAppHidesFigmaChrome();
  if (hide) return null;
  return (
    <div style={{ position: 'absolute', left: 8, top: 810, width: 375, height: 34, opacity: 0.25, pointerEvents: 'none' }}>
      <div style={{ position: 'absolute', left: '50%', bottom: 8, transform: 'translateX(-50%)', width: 134, height: 5, borderRadius: 100, background: '#fff' }} />
    </div>
  );
}

function punch(prev: string, key: string) {
  if (key === '⌫') return prev.length <= 1 ? '0' : prev.slice(0, -1).replace(/\.$/, '') || '0';
  if (key === '.' && prev.includes('.')) return prev;
  if (prev === '0' && key !== '.') return key;
  return `${prev}${key}`;
}

function showDollars(amount: string) {
  if (amount === '0') return '0';
  const [whole, frac] = amount.split('.');
  const grouped = Number(whole || '0').toLocaleString('en-US');
  return frac !== undefined ? `${grouped}.${frac}` : grouped;
}

function money(value: number) {
  return value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

const title: CSSProperties = { position: 'absolute', left: 70, top: 65.5, width: 250, margin: 0, textAlign: 'center', fontSize: 17, fontWeight: 700 };
const kicker: CSSProperties = { margin: 0, fontSize: 13, color: '#8b9097' };
const primary: CSSProperties = { position: 'absolute', left: 16, width: 358, height: 52, borderRadius: 14, border: 'none', background: '#accafe', color: '#0c1018', fontFamily: font.sans, fontSize: 16, fontWeight: 600, cursor: 'pointer' };
const keyBtn: CSSProperties = { width: 118, height: 48, border: 'none', background: 'none', color: '#fff', fontFamily: font.sans, fontSize: 26, fontWeight: 500, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' };
const iconBtn: CSSProperties = { border: 'none', background: 'none', padding: 0, cursor: 'pointer', display: 'flex', flexShrink: 0 };
const row: CSSProperties = { width: '100%', height: 64, minHeight: 64, maxHeight: 64, border: 'none', background: 'none', color: '#fff', fontFamily: font.sans, display: 'flex', alignItems: 'center', gap: 12, padding: '0 14px', cursor: 'pointer', boxSizing: 'border-box' };
const name: CSSProperties = { display: 'block', fontSize: 15, fontWeight: 600 };
const sub: CSSProperties = { display: 'block', marginTop: 2, fontSize: 12, color: '#8c8f99' };
