import { useEffect, useState, type CSSProperties } from 'react';
import { FigmaImg } from '@/walletFigma/icons';
import { font } from '@/walletFigma/tokens';
import { useLiveFrame } from './liveFrame';
import { useAppHidesFigmaChrome } from './appChrome';

const art = (name: string) => `/wallet-figma/swap/${name}`;
type Go = (id: string, remember?: boolean) => void;
type Side = 'pay' | 'recv';

type Tok = { id: string; name: string; symbol: string; home: number; vault: number; fiat: number; change: string; up: boolean | null };

const TOKENS: Tok[] = [
  { id: 'arx', name: 'Arxon', symbol: 'ARX', home: 2400, vault: 1000, fiat: 1008, change: '+2.10%', up: true },
  { id: 'btc', name: 'Bitcoin', symbol: 'BTC', home: 0.0021, vault: 0, fiat: 187.6, change: '-0.37%', up: false },
  { id: 'eth', name: 'Ethereum', symbol: 'ETH', home: 0.0185, vault: 0, fiat: 53, change: '+0.66%', up: true },
  { id: 'usdt', name: 'Tether', symbol: 'USDT', home: 120, vault: 40, fiat: 120, change: '0.00%', up: null },
  { id: 'usdc', name: 'USD Coin', symbol: 'USDC', home: 30, vault: 30, fiat: 30, change: '0.00%', up: null },
];

const SCREENS = new Set(['swap', 'swap-token', 'swap-review', 'swap-success', 'swap-vault']);
const FEE = 0.0004;

export function isSwapScreen(id: string) {
  return SCREENS.has(id);
}

export function SwapScreens({ id, go, back }: { id: string; go: Go; back?: () => void }) {
  const [pay, setPay] = useState('arx');
  const [recv, setRecv] = useState('btc');
  const [amount, setAmount] = useState('0');
  const [side, setSide] = useState<Side>('pay');
  const [query, setQuery] = useState('');
  const [vaultMode, setVaultMode] = useState(id === 'swap-vault');
  const payTok = TOKENS.find((token) => token.id === pay) ?? TOKENS[0];
  const recvTok = TOKENS.find((token) => token.id === recv) ?? TOKENS[1];
  const numeric = Number(amount);
  const ready = Number.isFinite(numeric) && numeric > 0;
  const quote = ready ? numeric * pairRate(pay, recv) : 0;
  const shownPay = ready ? numeric : 100;
  const shownQuote = ready ? quote : 0.0004;
  const leave = () => (back ? back() : go(vaultMode ? 'home-vaulted' : 'home-funded', false));

  useEffect(() => {
    if (id === 'swap-vault') setVaultMode(true);
    if (id === 'swap') setVaultMode(false);
  }, [id]);

  function openPicker(next: Side) {
    setSide(next);
    setQuery('');
    go('swap-token');
  }

  function choose(tokenId: string) {
    if (side === 'pay') {
      if (tokenId === recv) setRecv(pay);
      setPay(tokenId);
    } else {
      if (tokenId === pay) setPay(recv);
      setRecv(tokenId);
    }
    setAmount('0');
    if (back) back();
    else go(vaultMode ? 'swap-vault' : 'swap', false);
  }

  function flip() {
    setPay(recv);
    setRecv(pay);
    setAmount('0');
  }

  const form = (
    <SwapForm
      pay={payTok}
      recv={recvTok}
      amount={amount}
      quote={quote}
      vaultMode={vaultMode}
      ready={ready}
      onAmount={setAmount}
      onPick={openPicker}
      onFlip={flip}
      onReview={() => go('swap-review')}
      go={go}
      leave={leave}
    />
  );

  return (
    <div style={{ position: 'relative', width: 390, height: 844, background: '#050505', overflow: 'hidden', fontFamily: font.sans, color: '#fff' }}>
      <style>{`.swap-amt::placeholder{color:#5c5f64}.swap-search::placeholder{color:#8b9097}`}</style>
      {id !== 'swap-review' && id !== 'swap-success' && form}
      {id === 'swap-token' && <Picker query={query} setQuery={setQuery} onChoose={choose} onClose={leave} />}
      {id === 'swap-review' && (
        <Review pay={payTok} recv={recvTok} amount={shownPay} quote={pay === 'arx' && recv === 'btc' ? shownQuote : quote || shownQuote} go={go} leave={() => (back ? back() : go(vaultMode ? 'swap-vault' : 'swap', false))} />
      )}
      {id === 'swap-success' && <Success amount={pay === 'arx' && recv === 'btc' ? shownQuote : quote || 0.0004} symbol={recvTok.symbol} go={go} />}
    </div>
  );
}

function SwapForm({ pay, recv, amount, quote, vaultMode, ready, onAmount, onPick, onFlip, onReview, go, leave }: {
  pay: Tok; recv: Tok; amount: string; quote: number; vaultMode: boolean; ready: boolean;
  onAmount: (v: string) => void; onPick: (side: Side) => void; onFlip: () => void; onReview: () => void; go: Go; leave: () => void;
}) {
  const payBal = cardBalance(pay, vaultMode);
  const recvBal = cardBalance(recv, vaultMode);
  const over = payBal > 0 && Number(amount) > payBal;
  const canReview = ready && !over;
  return (
    <>
      <PhoneStatus />
      <Back onClick={leave} />
      <p style={title}>Swap</p>
      <Card label="You pay" balance={payBal} token={pay} amount={showAmount(amount)} muted={false} over={over} onPick={() => onPick('pay')} onAmount={onAmount} editable />
      <div style={{ position: 'absolute', left: 18, top: 270, width: 354 }}>
        <CardStatic label="You receive" balance={recvBal} token={recv} amount={quote > 0 ? showQuote(quote) : '0'} muted={quote === 0} onPick={() => onPick('recv')} />
      </div>
      <button type="button" aria-label="Swap direction" onClick={onFlip} style={flipBtn}>
        <FigmaImg src={art('flip.svg')} width={20} height={20} />
      </button>
      <div style={{ position: 'absolute', left: 32, top: 424, width: 322 }}>
        <Quote pay={pay} recv={recv} />
      </div>
      {vaultMode && pay.vault > 0 && (
        <div style={{ position: 'absolute', left: 18, top: 556, width: 354, boxSizing: 'border-box', background: '#1c2025', borderRadius: 14, padding: '12px 16px' }}>
          <p style={{ margin: 0, fontSize: 12, color: '#8b9097' }}>{showBal(pay.vault)} {pay.symbol} in your Vault isn’t available to swap.</p>
          <button type="button" onClick={() => go('move-home')} style={{ marginTop: 4, border: 'none', background: 'none', padding: 0, color: '#accafe', fontFamily: font.sans, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Move to Home</button>
        </div>
      )}
      <button type="button" disabled={!canReview} onClick={onReview} style={{ ...action, top: 712, background: canReview ? '#accafe' : '#1c2025', color: canReview ? '#0c1018' : '#5c5f64' }}>{canReview ? 'Review' : 'Enter an amount'}</button>
      <HomeBar />
    </>
  );
}

function Card({ label, balance, token, amount, muted, over, onPick, onAmount, editable }: {
  label: string; balance: number; token: Tok; amount: string; muted: boolean; over: boolean; onPick: () => void; onAmount: (v: string) => void; editable?: boolean;
}) {
  return (
    <div style={{ position: 'absolute', left: 18, top: 120, width: 354, height: 136, boxSizing: 'border-box', background: '#1c2025', borderRadius: 16, padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#8b9097' }}>
        <span>{label}</span>
        <span>Balance {showBal(balance)}</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, height: 52 }}>
        <TokenChip token={token} onClick={onPick} />
        {editable ? (
          <input className="swap-amt" aria-label={label} inputMode="decimal" value={amount === '0' ? '' : amount} placeholder="0" onChange={(e) => onAmount(clean(e.target.value))} style={{ ...amtInput, color: over ? '#f55c5c' : '#fff' }} />
        ) : (
          <span style={{ marginLeft: 'auto', fontSize: 34, fontWeight: 700, color: muted ? '#5c5f64' : '#fff' }}>{amount}</span>
        )}
      </div>
      <p style={{ margin: 0, fontSize: 13, color: '#8b9097' }}>≈ ${((Number(amount) || 0) * usd(token)).toFixed(2)}</p>
    </div>
  );
}

function CardStatic(props: { label: string; balance: number; token: Tok; amount: string; muted: boolean; onPick: () => void }) {
  return (
    <div style={{ width: 354, height: 136, boxSizing: 'border-box', background: '#1c2025', borderRadius: 16, padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#8b9097' }}>
        <span>{props.label}</span>
        <span>Balance {showBal(props.balance)}</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, height: 52 }}>
        <TokenChip token={props.token} onClick={props.onPick} />
        <span style={{ marginLeft: 'auto', fontSize: 34, fontWeight: 700, color: props.muted ? '#5c5f64' : '#fff' }}>{props.amount}</span>
      </div>
      <p style={{ margin: 0, fontSize: 13, color: '#8b9097' }}>≈ $0.00</p>
    </div>
  );
}

function Quote({ pay, recv }: { pay: Tok; recv: Tok }) {
  const rate = pairRate(pay.id, recv.id);
  return (
    <>
      <Row label="Rate" value={`1 ${pay.symbol} ≈ ${showRate(rate)} ${recv.symbol}`} />
      <Row label="Slippage" value="0.5%" />
      <Row label="Network fee" value={`${FEE} ${pay.symbol}`} />
    </>
  );
}

function Picker({ query, setQuery, onChoose, onClose }: { query: string; setQuery: (v: string) => void; onChoose: (id: string) => void; onClose: () => void }) {
  const q = query.trim().toLowerCase();
  const rows = TOKENS.filter((token) => !q || token.name.toLowerCase().includes(q) || token.symbol.toLowerCase().includes(q));
  return (
    <>
      <button type="button" aria-label="Close" onClick={onClose} style={{ position: 'absolute', inset: 0, border: 'none', background: 'rgba(0,0,0,0.6)', padding: 0, cursor: 'pointer' }} />
      <div style={{ position: 'absolute', left: 0, top: 363, width: 390, boxSizing: 'border-box', background: '#11161f', border: '1px solid #2a3447', borderBottom: 'none', borderRadius: '24px 24px 0 0', padding: '10px 16px 34px' }}>
        <div style={{ width: 36, height: 4, borderRadius: 2, background: '#5c5f64', margin: '0 auto' }} />
        <p style={{ margin: '14px 0 0', fontSize: 20, fontWeight: 700 }}>Select token</p>
        <label style={{ marginTop: 14, height: 44, borderRadius: 14, background: '#1c2025', display: 'flex', alignItems: 'center', gap: 10, padding: '0 14px' }}>
          <FigmaImg src={art('search.svg')} width={20} height={20} />
          <input className="swap-search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search tokens" aria-label="Search tokens" style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', color: '#fff', fontFamily: font.sans, fontSize: 14 }} />
        </label>
        <div style={{ marginTop: 8 }}>
          {rows.map((token) => (
            <button key={token.id} type="button" onClick={() => onChoose(token.id)} style={{ width: '100%', height: 64, border: 'none', background: 'none', color: '#fff', fontFamily: font.sans, display: 'flex', alignItems: 'center', gap: 12, padding: 0, cursor: 'pointer' }}>
              <Mark token={token} large />
              <span style={{ flex: 1, textAlign: 'left' }}>
                <span style={{ display: 'block', fontSize: 16, fontWeight: 500 }}>{token.name}</span>
                <span style={{ display: 'block', marginTop: 2, fontSize: 13, color: '#8b9097' }}>{showBal(token.home)} {token.symbol}</span>
              </span>
              <span style={{ textAlign: 'right' }}>
                <span style={{ display: 'block', fontSize: 16, fontWeight: 500 }}>${token.fiat.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                <span style={{ display: 'block', marginTop: 2, fontSize: 13, color: token.up === null ? '#8b9097' : token.up ? '#3ddc84' : '#ff5c5c' }}>{token.change}</span>
              </span>
            </button>
          ))}
        </div>
      </div>
    </>
  );
}

function Review({ pay, recv, amount, quote, go, leave }: { pay: Tok; recv: Tok; amount: number; quote: number; go: Go; leave: () => void }) {
  const live = useLiveFrame();
  const [err, setErr] = useState<string | null>(null);
  const rate = pairRate(pay.id, recv.id);
  const total = amount + FEE;
  return (
    <>
      <PhoneStatus />
      <Back onClick={leave} />
      <p style={title}>Review swap</p>
      <div style={{ position: 'absolute', left: 18, top: 118, width: 354, height: 120, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
        <p style={{ margin: 0, fontSize: 14, color: '#8b9097' }}>You pay</p>
        <p style={{ margin: 0, fontSize: 40, fontWeight: 700 }}>{amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {pay.symbol}</p>
        <p style={{ margin: 0, fontSize: 15, color: '#8b9097' }}>≈ ${(amount * usd(pay)).toFixed(2)}</p>
      </div>
      <div style={{ position: 'absolute', left: 18, top: 262, width: 354, boxSizing: 'border-box', background: '#1c2025', borderRadius: 16, padding: 16 }}>
        <Row label="You receive" value={`${showQuote(quote)} ${recv.symbol}`} />
        <Row label="Rate" value={`1 ${pay.symbol} ≈ ${showRate(rate)} ${recv.symbol}`} />
        <Row label="Slippage" value="0.5%" />
        <div style={{ height: 36, display: 'flex', alignItems: 'center', gap: 6, fontSize: 14 }}>
          <span style={{ flex: 1, color: '#8b9097' }}>Privacy</span>
          <FigmaImg src="/wallet-figma/send/shield-sm.svg" width={16} height={16} />
          <span style={{ fontWeight: 500, color: '#accafe' }}>Private</span>
        </div>
        <Row label="Network fee" value={`${FEE} ${pay.symbol}`} />
        <div style={{ height: 1, background: '#2a3447' }} />
        <Row label="Total" value={`${total.toLocaleString('en-US', { minimumFractionDigits: 4, maximumFractionDigits: 4 })} ${pay.symbol}`} />
      </div>
      <p style={{ position: 'absolute', left: 30, top: 527, width: 330, margin: 0, fontSize: 12, color: '#5c5f64', lineHeight: 1.4 }}>Swap amounts stay hidden on-chain. The final amount can vary by up to the slippage.</p>
      {err ? <p style={{ position: 'absolute', left: 24, top: 600, width: 342, margin: 0, color: '#f25252', fontSize: 12 }}>{err}</p> : null}
      <button type="button" onClick={() => {
        if (live?.app) {
          setErr('Coming soon');
          return;
        }
        go('swap-success');
      }} style={{ ...action, top: 649, background: '#accafe', color: '#0c1018' }}>Confirm swap</button>
      <button type="button" onClick={leave} style={{ ...ghost, top: 714 }}>Cancel</button>
      <HomeBar />
    </>
  );
}

function Success({ amount, symbol, go }: { amount: number; symbol: string; go: Go }) {
  return (
    <>
      <PhoneStatus />
      <img src="/wallet-figma/send/glow.svg" alt="" width={168} height={168} style={{ position: 'absolute', left: 111, top: 130 }} />
      <img src="/wallet-figma/send/ring.svg" alt="" width={132} height={132} style={{ position: 'absolute', left: 129, top: 148 }} />
      <div style={{ position: 'absolute', left: 147, top: 166, width: 96, height: 96, borderRadius: 48, background: '#accafe', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <FigmaImg src="/wallet-figma/send/check-lg.svg" width={44} height={44} />
      </div>
      <p style={{ position: 'absolute', left: 35, top: 334, width: 320, margin: 0, textAlign: 'center', fontSize: 26, fontWeight: 700 }}>Swapped privately</p>
      <p style={{ position: 'absolute', left: 35, top: 376, width: 320, margin: 0, textAlign: 'center', fontSize: 32, fontWeight: 700, color: '#accafe' }}>{showQuote(amount)} {symbol}</p>
      <button type="button" onClick={() => go('home-funded')} style={{ ...action, top: 649, background: '#accafe', color: '#0c1018' }}>Done</button>
      <button type="button" onClick={() => go('tx')} style={{ ...ghost, top: 714 }}>View on explorer</button>
      <HomeBar />
    </>
  );
}

function TokenChip({ token, onClick }: { token: Tok; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} style={{ border: 'none', background: '#0c0f13', borderRadius: 24, display: 'flex', alignItems: 'center', gap: 8, padding: '6px 12px 6px 8px', color: '#fff', fontFamily: font.sans, fontSize: 16, fontWeight: 600, cursor: 'pointer' }}>
      <Mark token={token} />
      {token.symbol}
      <FigmaImg src="/wallet-figma/receive/chev-down.svg" width={16} height={16} />
    </button>
  );
}

function Mark({ token, large = false }: { token: Tok; large?: boolean }) {
  const size = large ? 40 : 32;
  if (token.id === 'arx') {
    const mask = large
      ? { left: 10, top: 11.5, w: 20.923, h: 16, src: art('arx-mask-lg.png') }
      : { left: 8, top: 9.2, w: 16.738, h: 12.8, src: art('arx-mask.png') };
    return (
      <span style={{ width: size, height: size, borderRadius: size / 2, background: '#90b9ff', position: 'relative', overflow: 'hidden', flexShrink: 0 }}>
        <span style={{ position: 'absolute', left: mask.left, top: mask.top, width: mask.w, height: mask.h, background: '#050505', WebkitMaskImage: `url(${mask.src})`, maskImage: `url(${mask.src})`, WebkitMaskSize: `${mask.w}px ${mask.h}px`, maskSize: `${mask.w}px ${mask.h}px`, WebkitMaskRepeat: 'no-repeat', maskRepeat: 'no-repeat' }} />
      </span>
    );
  }
  if (token.id === 'btc') return <img src={art(large ? 'btc-lg.svg' : 'btc.svg')} alt="" width={size} height={size} />;
  if (token.id === 'eth') {
    return (
      <span style={{ width: size, height: size, borderRadius: size / 2, background: '#627eeb', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <FigmaImg src={large ? art('eth.svg') : '/wallet-figma/send/eth.svg'} width={large ? 15.6465 : 17.211} height={large ? 25 : 27.4999} />
      </span>
    );
  }
  if (token.id === 'usdt') return <img src="/wallet-figma/send/usdt.png" alt="" width={size} height={size} style={{ borderRadius: size / 2, objectFit: 'cover' }} />;
  return (
    <span style={{ width: size, height: size, borderRadius: size / 2, background: '#2775ca', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
      <FigmaImg src="/wallet-figma/send/usdc.svg" width={large ? 11.7857 : 11.7857} height={22} />
    </span>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ height: 36, display: 'flex', alignItems: 'center', gap: 6, fontSize: 14 }}>
      <span style={{ flex: 1, color: '#8b9097' }}>{label}</span>
      <span style={{ fontWeight: 500 }}>{value}</span>
    </div>
  );
}

function Back({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" aria-label="Back" onClick={onClick} style={{ position: 'absolute', left: 18, top: 56, width: 40, height: 40, borderRadius: 20, border: 'none', background: '#1c2025', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', padding: 0, zIndex: 2 }}>
      <FigmaImg src="/wallet-figma/find/chev.svg" width={20} height={20} />
    </button>
  );
}

function PhoneStatus() {
  const hide = useAppHidesFigmaChrome();
  if (hide) return null;
  return (
    <>
      <span style={{ position: 'absolute', left: 21, top: 14, width: 54, textAlign: 'center', fontSize: 14, fontWeight: 600, letterSpacing: -0.28, zIndex: 2 }}>9:41</span>
      <img src="/wallet-figma/welcome/status.svg" alt="" width={66.6} height={11.33} style={{ position: 'absolute', left: 288.67, top: 17.33, zIndex: 2 }} />
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

function cardBalance(token: Tok, vaultMode: boolean) {
  if (!vaultMode) return 0;
  if (token.id === 'arx') return 1400;
  if (token.id === 'btc') return 0;
  return Math.max(0, token.home - token.vault);
}

function usd(token: Tok) {
  return token.home ? token.fiat / token.home : 0;
}

function pairRate(from: string, to: string) {
  if (from === to) return 1;
  if (from === 'arx' && to === 'btc') return 0.000004;
  if (from === 'btc' && to === 'arx') return 250000;
  const fromTok = TOKENS.find((token) => token.id === from);
  const toTok = TOKENS.find((token) => token.id === to);
  if (!fromTok || !toTok) return 0;
  return usd(fromTok) / usd(toTok);
}

function clean(value: string) {
  const next = value.replace(/[^\d.]/g, '');
  const [whole, ...rest] = next.split('.');
  const merged = rest.length ? `${whole}.${rest.join('').slice(0, 8)}` : whole;
  return merged.replace(/^0+(?=\d)/, '') || '0';
}

function showAmount(amount: string) {
  return amount === '' ? '0' : amount;
}

function showBal(value: number) {
  if (value === 0) return '0.00';
  const digits = value > 0 && value < 1 ? 4 : 2;
  return value.toLocaleString('en-US', { minimumFractionDigits: digits === 4 ? 4 : 2, maximumFractionDigits: digits });
}

function showQuote(value: number) {
  if (!value) return '0';
  return value.toLocaleString('en-US', { maximumFractionDigits: 8 });
}

function showRate(value: number) {
  if (value >= 1000) return value.toLocaleString('en-US', { maximumFractionDigits: 0 });
  if (value >= 1) return value.toLocaleString('en-US', { maximumFractionDigits: 4 });
  return value.toLocaleString('en-US', { maximumFractionDigits: 8 });
}

const title: CSSProperties = { position: 'absolute', left: 70, top: 65.5, width: 250, margin: 0, textAlign: 'center', fontSize: 17, fontWeight: 700 };
const flipBtn: CSSProperties = { position: 'absolute', left: 173, top: 241, width: 44, height: 44, borderRadius: 22, border: '3px solid #2a3447', background: '#050505', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', padding: 0, zIndex: 2 };
const action: CSSProperties = { position: 'absolute', left: 19, width: 353, height: 55, borderRadius: 8, border: 'none', fontFamily: font.sans, fontSize: 16, fontWeight: 600, cursor: 'pointer' };
const ghost: CSSProperties = { position: 'absolute', left: 19, width: 353, height: 55, borderRadius: 8, border: '1.5px solid #2a3447', background: 'transparent', color: '#accafe', fontFamily: font.sans, fontSize: 16, fontWeight: 600, cursor: 'pointer' };
const amtInput: CSSProperties = { marginLeft: 'auto', width: 140, border: 'none', outline: 'none', background: 'transparent', textAlign: 'right', fontFamily: font.sans, fontSize: 34, fontWeight: 700 };
