import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { FigmaImg } from '@/walletFigma/icons';
import { rememberTabs, vaultEntry } from './VaultScreens';
import { pickWalletTab, WalletTabs, type WalletTabName } from './WalletTabs';
import { useLiveFrame } from './liveFrame';
import { font } from '@/walletFigma/tokens';

const art = (name: string) => `/wallet-figma/home/${name}`;

type Go = (id: string, remember?: boolean) => void;

type Tok = {
  name: string;
  amount: string;
  value: string;
  change: string;
  tone: 'up' | 'down' | 'flat';
  icon: 'arx' | 'btc' | 'eth' | 'usdt' | 'usdc' | 'sol';
  to: string;
  symbol?: string;
};

const ZERO: Tok[] = [
  { name: 'Arxon', amount: '0.00 ARX', value: '$0.00', change: '+0.00%', tone: 'flat', icon: 'arx', to: 'token-arx' },
  { name: 'Bitcoin', amount: '0.00 BTC', value: '$0.00', change: '-0.37%', tone: 'down', icon: 'btc', to: 'token-btc' },
  { name: 'Ethereum', amount: '0.00 ETH', value: '$0.00', change: '+0.66%', tone: 'up', icon: 'eth', to: 'token-eth' },
];

const FUNDED: Tok[] = [
  { name: 'Arxon', amount: '2,400.00 ARX', value: '$1,008.00', change: '+2.10%', tone: 'up', icon: 'arx', to: 'token-arx-funded' },
  { name: 'Bitcoin', amount: '0.0021 BTC', value: '$187.60', change: '-0.37%', tone: 'down', icon: 'btc', to: 'token-btc-funded' },
  { name: 'Ethereum', amount: '0.0185 ETH', value: '$53.00', change: '+0.66%', tone: 'up', icon: 'eth', to: 'token-eth-funded' },
  { name: 'Tether', amount: '120.00 USDT', value: '$120.00', change: '0.00%', tone: 'flat', icon: 'usdt', to: 'token-usdt' },
  { name: 'USD Coin', amount: '30.00 USDC', value: '$30.00', change: '0.00%', tone: 'flat', icon: 'usdc', to: 'token-usdc' },
];

const AFTER_VAULT: Tok[] = [
  { name: 'Arxon', amount: '1,900.00 ARX', value: '$798.00', change: '+2.10%', tone: 'up', icon: 'arx', to: 'token-arx-split' },
  { name: 'Bitcoin', amount: '0.0021 BTC', value: '$187.60', change: '-0.37%', tone: 'down', icon: 'btc', to: 'token-btc-funded' },
  { name: 'Ethereum', amount: '0.0185 ETH', value: '$53.00', change: '+0.66%', tone: 'up', icon: 'eth', to: 'token-eth-funded' },
  { name: 'Tether', amount: '120.00 USDT', value: '$120.00', change: '0.00%', tone: 'flat', icon: 'usdt', to: 'token-usdt' },
  { name: 'USD Coin', amount: '30.00 USDC', value: '$30.00', change: '0.00%', tone: 'flat', icon: 'usdc', to: 'token-usdc' },
];

const CARDS: { title: string; body: string; icon: 'mine' | 'fund' | 'privacy' | 'face' | 'claim'; to: string }[] = [
  { title: 'Mine ARX', body: 'Earn ARX from your wallet', icon: 'mine', to: 'mine-entry' },
  { title: 'Fund your wallet', body: 'Add ARX to get started', icon: 'fund', to: 'receive' },
  { title: 'Privacy controls', body: 'Choose what each payment hides', icon: 'privacy', to: 'defaults' },
  { title: 'Turn on Face ID', body: 'Unlock faster, stay secure', icon: 'face', to: 'face' },
  { title: 'Claim your ARX', body: 'Convert your mining points', icon: 'claim', to: 'claim' },
];

export function HomeScreens({ id, go, back, behind, network = 'mainnet' }: { id: string; go: Go; back?: () => void; behind?: string; network?: 'mainnet' | 'testnet' }) {
  const live = useLiveFrame();
  const [localHide, setLocalHide] = useState(false);
  const cards = useRef<HTMLDivElement>(null);
  const sheet = id === 'more';
  const view = sheet && behind && behind !== 'more' ? behind : id === 'more' ? 'home-funded' : id;
  const liveRows = live?.app ? (network === 'testnet' ? live.testnetTokens : live.tokens) : null;
  const liveFunded = !!liveRows?.some((token) => {
    const n = Number(token.amount.replace(/[^0-9.]/g, ''));
    return Number.isFinite(n) && n > 0;
  });
  const empty = liveRows ? !liveFunded : view === 'home' || view === 'home-hidden';
  const hidden = live?.app
    ? live.hidden || view === 'home-hidden'
    : view === 'home-hidden' || (!empty && !sheet && localHide);
  const vaulted = view === 'home-vaulted' || view === 'home-unvaulted';
  if (network !== 'testnet') rememberTabs(empty ? 'empty' : vaulted ? 'vaulted' : 'funded');

  useEffect(() => {
    setLocalHide(false);
  }, [id]);

  useEffect(() => {
    if (view === 'home-hidden' && cards.current) cards.current.scrollLeft = 184;
  }, [view]);

  const total = liveRows
    ? (network === 'testnet' ? live!.testnetTotal : live!.total)
    : empty ? '$0.00' : view === 'home-vaulted' ? '$978.60' : view === 'home-unvaulted' ? '$1,188.60' : '$1,398.60';
  const day = liveRows
    ? { text: live!.day, color: live!.dayTone === 'up' ? '#3ddc84' : live!.dayTone === 'down' ? '#ff5c5c' : '#5c5f64' }
    : empty
    ? { text: '+$0.00 (0.00%) Today', color: '#5c5f64' }
    : view === 'home-vaulted'
      ? { text: '+$13.89 (1.44%) Today', color: '#3ddc84' }
      : view === 'home-unvaulted'
        ? { text: '+$16.99 (1.45%) Today', color: '#3ddc84' }
        : { text: '+$20.67 (1.50%) Today', color: '#3ddc84' };
  const tokens = liveRows ?? (empty ? ZERO : vaulted ? AFTER_VAULT : FUNDED);

  function eye() {
    if (live?.app) {
      live.toggleHide();
      return;
    }
    if (view === 'home') go('home-hidden', false);
    else if (view === 'home-hidden') go('home', false);
    else setLocalHide((v) => !v);
  }

  function sendTo() {
    if (live?.app) return 'send-token';
    return vaulted ? 'send-amount-vault' : 'send-token';
  }

  function vaultTo() {
    if (empty) return vaultEntry('vault-nofunds');
    if (vaulted) return vaultEntry('vault');
    return vaultEntry('vault-empty');
  }

  return (
    <div style={{ position: 'relative', width: 390, height: liveRows && empty ? 1040 : 844, background: '#050505', overflow: 'hidden', fontFamily: font.sans, color: '#fff' }}>
      <style>{`.home-cards::-webkit-scrollbar{display:none}.home-cards{scrollbar-width:none}`}</style>
      <div style={{ position: 'absolute', left: 0, top: 0, width: 390, height: 44 }}>
        <span style={{ position: 'absolute', left: 21, top: 14, width: 54, textAlign: 'center', fontSize: 14, fontWeight: 600, letterSpacing: -0.28 }}>9:41</span>
        <img src="/wallet-figma/welcome/status.svg" alt="" width={66.6} height={11.33} style={{ position: 'absolute', left: 288.67, top: 17.33 }} />
      </div>

      <header style={{ position: 'absolute', left: 18, top: 58, width: 354, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <button type="button" onClick={() => go('accounts')} style={plain}>
          <img src={art('avatar.png')} alt="" width={36} height={36} style={{ borderRadius: 18 }} />
          <span style={{ fontSize: 16, fontWeight: 500 }}>{live?.app ? live.accountLabel : 'Account 01'}</span>
          <FigmaImg src={art('chev.svg')} width={16} height={16} />
        </button>
        <div style={{ display: 'flex', gap: 10 }}>
          <CircleBtn label="Search" onClick={() => go('search')}><FigmaImg src={art('search.svg')} width={20} height={20} /></CircleBtn>
          <CircleBtn label="Notifications" onClick={() => go('notifications')}><FigmaImg src={art('bell.svg')} width={20} height={20} /></CircleBtn>
        </div>
      </header>

      <div style={{ position: 'absolute', left: 22, top: 126, display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {hidden ? (
            <span style={{ fontSize: 44, fontWeight: 500, letterSpacing: 1, lineHeight: 1 }}>••••••</span>
          ) : (
            <span style={{ fontSize: 48, fontWeight: 700, lineHeight: 1 }}>{total}</span>
          )}
          <button type="button" aria-label={hidden ? 'Show balance' : 'Hide balance'} onClick={eye} style={iconBtn}>
            <FigmaImg src={art(hidden ? 'eye-off.svg' : 'eye.svg')} width={22} height={22} />
          </button>
        </div>
        <span style={{ fontSize: 14, fontWeight: 400, color: network === 'testnet' ? '#accafe' : hidden ? '#5c5f64' : day.color }}>{network === 'testnet' ? 'Arxon Testnet' : hidden ? '•••• Today' : day.text}</span>
      </div>

      <button type="button" onClick={() => go('defaults')} style={pill}>
        <FigmaImg src={art('shield.svg')} width={16} height={16} />
        {live?.app ? live.privacyPill : 'Custom · 2 of 4 hidden'}
      </button>

      <div style={{ position: 'absolute', left: 18, top: 292, width: 354, display: 'flex', gap: 14 }}>
        <Action label="Send" onClick={() => go(sendTo())}><FigmaImg src={art('send.svg')} width={24} height={24} /></Action>
        <Action label="Receive" onClick={() => { live?.setReceiveAsset(network === 'testnet' ? 'ARXt' : 'ETH'); go('receive'); }}><FigmaImg src={art('receive.svg')} width={24} height={24} /></Action>
        <Action label="Swap" onClick={() => go(vaulted ? 'swap-vault' : 'swap')}><FigmaImg src={art('swap.svg')} width={24} height={24} /></Action>
        <button type="button" onClick={() => go('more')} style={actionBtn}>
          <FigmaImg src={art('more.svg')} width={58} height={58} />
          <span style={actionLabel}>More</span>
        </button>
      </div>

      {empty && (
        <div ref={cards} className="home-cards" style={{ position: 'absolute', left: 0, top: 396, width: 390, display: 'flex', gap: 12, overflowX: 'auto', padding: '0 18px', boxSizing: 'border-box' }}>
          {CARDS.map((card) => (
            <button key={card.title} type="button" onClick={() => go(card.to)} style={cardBtn}>
              <CardIcon kind={card.icon} />
              <span style={{ fontSize: 14, fontWeight: 600, textAlign: 'left' }}>{card.title}</span>
              <span style={{ fontSize: 12, fontWeight: 400, color: '#8c8f99', textAlign: 'left', lineHeight: 1.35 }}>{card.body}</span>
            </button>
          ))}
        </div>
      )}

      <div style={{ position: 'absolute', left: 18, top: empty ? 548 : 400, width: 354, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 18, fontWeight: 700 }}>Tokens</span>
        <button type="button" onClick={() => go('manage')} style={{ ...plain, color: '#accafe', fontSize: 14, fontWeight: 500 }}>Manage</button>
      </div>

      <div style={{ position: 'absolute', left: 18, top: empty ? 587 : 439, width: 354 }}>
        {tokens.map((token) => (
          <button key={token.name} type="button" onClick={() => { if (live?.app && token.symbol) live.setReceiveAsset(token.symbol); go(token.to); }} style={tokenRow}>
            <TokenIcon kind={token.icon} />
            <span style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 4, textAlign: 'left' }}>
              <span style={{ fontSize: 16, fontWeight: 600 }}>{token.name}</span>
              <span style={{ fontSize: 12, color: '#8c8f99' }}>{hidden ? '••••' : token.amount}</span>
            </span>
            <span style={{ display: 'flex', flexDirection: 'column', gap: 4, textAlign: 'right' }}>
              <span style={{ fontSize: 16, fontWeight: 600 }}>{hidden ? '••••' : token.value}</span>
              <span style={{ fontSize: 12, color: toneColor(token.tone) }}>{hidden ? '••••' : token.change}</span>
            </span>
          </button>
        ))}
      </div>

      <WalletTabs
        active={network === 'testnet' ? 'Testnet' : 'Home'}
        onSelect={(tab: WalletTabName) => {
          if (tab === 'Home' && sheet) {
            if (back) back();
            else go('home-funded', false);
            return;
          }
          pickWalletTab(network, tab, go, {
            home: empty ? 'home' : 'home-funded',
            vault: network === 'testnet' ? vaultEntry('vault-empty') : vaultTo(),
            history: network === 'testnet' ? 'activity' : empty ? 'activity-empty' : 'activity',
          });
        }}
      />

      {sheet && (
        <div style={{ position: 'absolute', inset: 0, zIndex: 6 }}>
          <button type="button" aria-label="Close" onClick={() => (back ? back() : go('home-funded', false))} style={scrim} />
          <div style={sheetBox}>
            <div style={{ position: 'absolute', left: 174, top: 9, width: 40, height: 4, borderRadius: 4, background: '#293347' }} />
            <p style={{ position: 'absolute', left: 23, top: 31, margin: 0, fontSize: 18, fontWeight: 700 }}>More</p>
            <button type="button" onClick={() => go('buy')} style={{ ...actionBtn, position: 'absolute', left: 17, top: 79 }}>
              <span style={circle}><FigmaImg src={art('buy.svg')} width={24} height={24} /></span>
              <span style={actionLabel}>Buy</span>
            </button>
            <button type="button" onClick={() => go('mine-entry')} style={{ ...actionBtn, position: 'absolute', left: 109, top: 79 }}>
              <span style={circle}><span style={{ color: '#abc9ff', fontSize: 20, fontWeight: 700 }}>M</span></span>
              <span style={actionLabel}>Mine</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function toneColor(tone: Tok['tone']) {
  if (tone === 'up') return '#3ddb85';
  if (tone === 'down') return '#f25252';
  return '#8c8f99';
}

function CircleBtn({ label, onClick, children }: { label: string; onClick: () => void; children: ReactNode }) {
  return (
    <button type="button" aria-label={label} onClick={onClick} style={{ width: 40, height: 40, borderRadius: 20, border: 'none', background: '#1c2025', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', padding: 0 }}>
      {children}
    </button>
  );
}

function Action({ label, onClick, children }: { label: string; onClick: () => void; children: ReactNode }) {
  return (
    <button type="button" onClick={onClick} style={actionBtn}>
      <span style={circle}>{children}</span>
      <span style={actionLabel}>{label}</span>
    </button>
  );
}

function Tab({ label, active, onClick, children }: { label: string; active?: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button type="button" onClick={onClick} style={{ flex: 1, height: 78, border: 'none', background: 'none', color: active ? '#accafe' : '#8c8f99', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 5, cursor: 'pointer', fontFamily: font.tab, fontSize: 12, lineHeight: '14px', padding: 0 }}>
      <span style={{ width: 30, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{children}</span>
      {label}
    </button>
  );
}

function CardIcon({ kind }: { kind: 'mine' | 'fund' | 'privacy' | 'face' | 'claim' }) {
  if (kind === 'mine') return <span style={{ color: '#abc9ff', fontSize: 20, fontWeight: 700, lineHeight: 1 }}>M</span>;
  if (kind === 'fund') return <FigmaImg src={art('plus.svg')} width={18} height={18} />;
  if (kind === 'privacy') return <FigmaImg src={art('shield-card.svg')} width={18} height={18} />;
  if (kind === 'face') return <FigmaImg src={art('face.svg')} width={18} height={18} />;
  return <FigmaImg src={art('claim.svg')} width={18.9} height={18.9} />;
}

function TokenIcon({ kind }: { kind: Tok['icon'] }) {
  if (kind === 'arx') {
    return (
      <span style={{ width: 40, height: 40, borderRadius: 20, background: '#90b9ff', position: 'relative', flexShrink: 0, overflow: 'hidden' }}>
        <span style={{ position: 'absolute', left: 10, top: 11.5, width: 20.923, height: 16, background: '#050505', WebkitMaskImage: `url(${art('arx-mask.png')})`, maskImage: `url(${art('arx-mask.png')})`, WebkitMaskSize: '20.923px 16px', maskSize: '20.923px 16px', WebkitMaskRepeat: 'no-repeat', maskRepeat: 'no-repeat' }} />
      </span>
    );
  }
  if (kind === 'btc') return <FigmaImg src={art('btc.svg')} width={40} height={40} />;
  if (kind === 'eth') {
    return (
      <span style={{ width: 40, height: 40, borderRadius: 20, background: '#627eeb', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <FigmaImg src={art('eth.svg')} width={15.6465} height={25} />
      </span>
    );
  }
  if (kind === 'sol') {
    return (
      <span style={{ width: 40, height: 40, borderRadius: 20, background: '#9945ff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: '#fff', fontSize: 13, fontWeight: 700 }}>
        S
      </span>
    );
  }
  if (kind === 'usdt') return <img src={art('usdt.png')} alt="" width={40} height={40} style={{ borderRadius: 20, objectFit: 'cover' }} />;
  return (
    <span style={{ width: 40, height: 40, borderRadius: 20, background: '#2775ca', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
      <FigmaImg src={art('usdc.svg')} width={11.7857} height={22} />
    </span>
  );
}

const plain: CSSProperties = { display: 'flex', alignItems: 'center', gap: 10, border: 'none', background: 'none', color: '#fff', padding: 0, cursor: 'pointer', fontFamily: font.sans };
const iconBtn: CSSProperties = { width: 22, height: 22, padding: 0, border: 'none', background: 'none', cursor: 'pointer' };
const pill: CSSProperties = { position: 'absolute', left: 22, top: 232, display: 'flex', alignItems: 'center', gap: 6, background: '#11161f', border: '1px solid #2a3447', borderRadius: 20, padding: '7px 14px 7px 12px', color: '#accafe', fontFamily: font.sans, fontSize: 13, fontWeight: 500, cursor: 'pointer' };
const actionBtn: CSSProperties = { width: 78, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, border: 'none', background: 'none', color: '#fff', padding: 0, cursor: 'pointer', fontFamily: font.sans };
const actionLabel: CSSProperties = { fontSize: 14, fontWeight: 400, lineHeight: 1 };
const circle: CSSProperties = { width: 58, height: 58, borderRadius: 29, background: '#1c2025', display: 'flex', alignItems: 'center', justifyContent: 'center' };
const cardBtn: CSSProperties = { width: 172, height: 132, flexShrink: 0, borderRadius: 16, background: '#1c2025', border: 'none', color: '#fff', padding: 16, display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 8, cursor: 'pointer', fontFamily: font.sans, boxSizing: 'border-box' };
const tokenRow: CSSProperties = { width: '100%', height: 64, display: 'flex', alignItems: 'center', gap: 12, border: 'none', background: 'none', color: '#fff', padding: 0, cursor: 'pointer', fontFamily: font.sans };
const scrim: CSSProperties = { position: 'absolute', inset: 0, border: 'none', padding: 0, background: 'rgba(0,0,0,0.6)', cursor: 'pointer' };
const sheetBox: CSSProperties = { position: 'absolute', left: 0, top: 608, width: 390, height: 236, background: '#12171f', border: '1px solid #293347', borderBottom: 'none', borderRadius: '24px 24px 0 0', boxSizing: 'border-box', textAlign: 'left', zIndex: 1 };
