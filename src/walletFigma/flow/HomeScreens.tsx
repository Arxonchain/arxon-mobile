import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { FigmaImg } from '@/walletFigma/icons';
import { START_URL } from '@/chainWallet/chain';
import { sessionStore } from '@/chainWallet/session';
import { rememberTabs, vaultEntry } from './VaultScreens';
import { briefAddr } from './briefAddr';
import { pickWalletTab, WALLET_TAB_CLEAR, WalletTabs, type WalletNet, type WalletTabName } from './WalletTabs';
import { useLiveFrame } from './liveFrame';
import { useAppHidesFigmaChrome } from './appChrome';
import { NetworkSheet } from './ReceiveScreens';
import { applyNetwork, listNetworks, selectedNetwork } from './homeNetworks';
import { font } from '@/walletFigma/tokens';
import { ProfileAvatar } from './ProfileAvatar';
import { useProfilePhoto } from './profilePhoto';
import { usePullRefresh } from './pullRefresh';
import { openExternal } from './openExternal';
import { AccountSheet, type AccountSheetMode } from './AccountSheet';
import { TapAction } from './SwipeConfirm';
import { isMainnetActivity, TestnetHistory } from './TestnetHistory';
import { LiveHead, PullHint, sheetGlass } from './LiveScroll';
import { copyAddress } from './copyFlash';
import { CardLoad } from './useCardLoad';
import { HeroSpark } from './LivePriceChart';
import { useMarketChart } from '@/hooks/useMarketChart';

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

const CARDS: { title: string; body: string; kind: 'fund' | 'mine'; to: string }[] = [
  { title: 'Fund your wallet', body: 'Receive crypto to get started', kind: 'fund', to: 'receive' },
  { title: 'Mine ARX-P', body: 'Earn ARX-P in the mining app', kind: 'mine', to: 'mine-entry' },
];

export function HomeScreens({ id, go, back, behind, network = 'mainnet' }: { id: string; go: Go; back?: () => void; behind?: string; network?: 'mainnet' | 'testnet' }) {
  if (network === 'testnet') {
    return <TestnetHome id={id} go={go} back={back} behind={behind} />;
  }
  return <MainnetHome id={id} go={go} back={back} behind={behind} />;
}

function useNetworkSheet(scope: WalletNet, go: Go) {
  const live = useLiveFrame();
  const [open, setOpen] = useState(false);
  const [picked, setPicked] = useState(() => selectedNetwork(scope));
  const nets = open ? listNetworks(scope) : [];
  const sheet = open ? (
    <NetworkSheet
      nets={nets}
      selected={picked.id}
      fixed={!!live?.app}
      onClose={() => setOpen(false)}
      onPick={(netId) => {
        const row = nets.find((item) => item.id === netId);
        if (row) {
          setPicked(row);
          void applyNetwork(live, row);
        }
        setOpen(false);
      }}
      onAdd={() => {
        setOpen(false);
        go('add-network');
      }}
    />
  ) : null;
  return { show: () => setOpen(true), picked, sheet };
}

function MainnetHome({ id, go, back, behind }: { id: string; go: Go; back?: () => void; behind?: string }) {
  const live = useLiveFrame();
  const hideChrome = useAppHidesFigmaChrome();
  const photo = useProfilePhoto(live?.accountIndex ?? 0);
  const network = useNetworkSheet('mainnet', go);
  const [localHide, setLocalHide] = useState(false);
  const cards = useRef<HTMLDivElement>(null);
  const view = id === 'more' ? 'home-funded' : id;
  const liveRows = live?.app ? live.tokens : null;
  const liveFunded = !!liveRows?.some((token) => {
    const n = Number(token.amount.replace(/[^0-9.]/g, ''));
    return Number.isFinite(n) && n > 0;
  });
  const empty = liveRows ? !liveFunded : view === 'home' || view === 'home-hidden';
  const hidden = live?.app
    ? live.hidden || view === 'home-hidden'
    : view === 'home-hidden' || (!empty && localHide);
  const vaulted = view === 'home-vaulted' || view === 'home-unvaulted';
  rememberTabs(empty ? 'empty' : vaulted ? 'vaulted' : 'funded');

  useEffect(() => {
    setLocalHide(false);
  }, [id]);


  const total = liveRows
    ? live!.total
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

  const [accountsMode, setAccountsMode] = useState<AccountSheetMode>(null);
  const compact = !!live?.app;
  const y = compact
    ? { header: 86, bal: 148, act: 228, cards: 324, cardH: 136, tok: 476, list: 504 }
    : { header: 58, bal: 126, act: 236, cards: 340, cardH: 172, tok: 528, list: 567 };
  const pull = usePullRefresh(() => live?.refreshHome?.() ?? live?.refresh?.(), { threshold: 28 });

  if (live?.app) {
    return (
      <LiveMainnetHome
        go={go}
        empty={empty}
        hidden={hidden}
        total={total}
        tokens={tokens}
        photo={photo}
        hideChrome={hideChrome}
        network={network}
        sendTo={sendTo()}
        vaultTo={vaultTo()}
        eye={eye}
        pull={pull}
        accountsMode={accountsMode}
        setAccountsMode={setAccountsMode}
      />
    );
  }

  return (
    <div style={{ position: 'relative', width: 390, height: live?.app || !(liveRows && empty) ? 844 : 1040, background: '#050505', overflow: 'hidden', fontFamily: font.sans, color: '#fff' }}>
      <style>{`.home-cards,.arxon-token-scroll{scrollbar-width:none;-ms-overflow-style:none}.home-cards::-webkit-scrollbar,.arxon-token-scroll::-webkit-scrollbar{display:none;width:0;height:0}`}</style>
      {hideChrome ? null : (
      <div style={{ position: 'absolute', left: 0, top: 0, width: 390, height: 44 }}>
        <span style={{ position: 'absolute', left: 21, top: 14, width: 54, textAlign: 'center', fontSize: 14, fontWeight: 600, letterSpacing: -0.28 }}>9:41</span>
        <img src="/wallet-figma/welcome/status.svg" alt="" width={66.6} height={11.33} style={{ position: 'absolute', left: 288.67, top: 17.33 }} />
      </div>
      )}

      <header style={{ position: 'absolute', left: 18, top: y.header, width: 354, height: compact ? 40 : 44, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
          {live?.app ? (
            <ProfileAvatar size={36} photo={photo} accountIndex={live.accountIndex} onOpen={() => go('account')} />
          ) : (
            <span style={{ width: 36, height: 36, borderRadius: 18, background: '#1c2025' }} />
          )}
          <button type="button" aria-label="Accounts" onClick={() => (live?.app ? setAccountsMode('list') : go('accounts'))} style={{ ...plain, minHeight: 40 }}>
            <span style={{ fontSize: compact ? 15 : 16, fontWeight: 500 }}>{live?.app ? live.accountLabel : 'Account 01'}</span>
            <FigmaImg src={art('chev.svg')} width={16} height={16} />
          </button>
        </div>
        <div style={{ display: 'flex', gap: compact ? 8 : 10 }}>
          <CircleBtn label="Search" onClick={() => go('search')}><FigmaImg src={art('search.svg')} width={20} height={20} /></CircleBtn>
          <CircleBtn label="Notifications" onClick={() => go('notifications')}><FigmaImg src={art('bell.svg')} width={20} height={20} /></CircleBtn>
        </div>
      </header>

      <div style={{ position: 'absolute', left: 22, top: y.bal, display: 'flex', flexDirection: 'column', gap: compact ? 8 : 6 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {hidden ? (
            <span style={{ fontSize: compact ? 34 : 44, fontWeight: 500, letterSpacing: 1, lineHeight: 1 }}>••••••</span>
          ) : (
            <span style={{ fontSize: compact ? 36 : 48, fontWeight: 700, lineHeight: 1 }}>{total}</span>
          )}
          <button type="button" aria-label={hidden ? 'Show balance' : 'Hide balance'} onClick={eye} style={iconBtn}>
            <FigmaImg src={art(hidden ? 'eye-off.svg' : 'eye.svg')} width={22} height={22} />
          </button>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: 346, gap: 8 }}>
          <span style={{ fontSize: compact ? 13 : 14, fontWeight: 400, color: hidden ? '#5c5f64' : day.color }}>{hidden ? '•••• Today' : day.text}</span>
          {live?.app ? null : <button type="button" aria-label="Select network" onClick={network.show} style={{ border: 'none', background: 'none', color: '#accafe', fontFamily: font.sans, fontSize: compact ? 13 : 14, fontWeight: 600, padding: '4px 0', cursor: 'pointer', flexShrink: 0 }}>{network.picked.name}</button>}
        </div>
      </div>

      <div style={{ position: 'absolute', left: 18, top: y.act, width: 354, display: 'flex', justifyContent: 'space-between' }}>
        <Action label="Send" onClick={() => go(sendTo())}><FigmaImg src={art('send.svg')} width={compact ? 22 : 24} height={compact ? 22 : 24} /></Action>
        <Action label="Receive" onClick={() => { live?.setReceiveAsset(network.picked.asset); go('receive'); }}><FigmaImg src={art('receive.svg')} width={compact ? 22 : 24} height={compact ? 22 : 24} /></Action>
        <Action label="Swap" onClick={() => go(vaulted ? 'swap-vault' : 'swap')}><FigmaImg src={art('swap.svg')} width={compact ? 22 : 24} height={compact ? 22 : 24} /></Action>
        <Action label="Buy crypto" onClick={() => go('buy')}><FigmaImg src={art('buy.svg')} width={compact ? 22 : 24} height={compact ? 22 : 24} /></Action>
      </div>

      <div ref={cards} className="home-cards" style={{ position: 'absolute', left: 0, top: y.cards, width: 390, height: y.cardH, display: 'flex', gap: 10, alignItems: 'stretch', overflowX: 'auto', overflowY: 'hidden', WebkitOverflowScrolling: 'touch', touchAction: 'pan-x', padding: '0 18px', boxSizing: 'border-box' }}>
        {CARDS.map((card) => (
          <StartCard key={card.title} kind={card.kind} title={card.title} body={card.body} onClick={() => go(card.to)} />
        ))}
      </div>

      <div style={{ position: 'absolute', left: 18, top: y.tok, width: 354, height: 22, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: compact ? 16 : 18, fontWeight: 700 }}>Tokens</span>
        <button type="button" onClick={() => go('manage')} style={{ ...plain, color: '#accafe', fontSize: compact ? 13 : 14, fontWeight: 500, minHeight: 40, padding: '8px 4px' }}>Manage</button>
      </div>

      <div className="arxon-token-scroll" style={{ position: 'absolute', left: 18, top: y.list, width: 354, bottom: 0, overflowY: 'auto', WebkitOverflowScrolling: 'touch', touchAction: 'pan-y', boxSizing: 'border-box', paddingBottom: compact ? 'calc(72px + env(safe-area-inset-bottom, 0px))' : 80 }} onTouchStart={pull.onTouchStart} onTouchMove={pull.onTouchMove} onTouchEnd={pull.onTouchEnd}>
        {tokens.map((token) => (
          <button key={token.name} type="button" onClick={() => { if (live?.app && token.symbol) live.setReceiveAsset(token.symbol); go(token.to); }} style={compact ? compactTokenRow : tokenRow}>
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
        <HomePayments go={go} />
      </div>

      <WalletTabs
        active="Home"
        onSelect={(tab: WalletTabName) => {
          pickWalletTab('mainnet', tab, go, {
            home: empty ? 'home' : 'home-funded',
            vault: vaultTo(),
            history: empty ? 'activity-empty' : 'activity',
          });
        }}
      />
      {network.sheet}
      <AccountSheet mode={accountsMode} setMode={setAccountsMode} go={go} />
    </div>
  );
}

function LiveMainnetHome({
  go,
  empty,
  hidden,
  total,
  tokens,
  photo,
  hideChrome,
  network,
  sendTo,
  vaultTo,
  eye,
  pull,
  accountsMode,
  setAccountsMode,
}: {
  go: Go;
  empty: boolean;
  hidden: boolean;
  total: string;
  tokens: Tok[];
  photo: string | null;
  hideChrome: boolean;
  network: { picked: { asset: string }; sheet: ReactNode };
  sendTo: string;
  vaultTo: string;
  eye: () => void;
  pull: ReturnType<typeof usePullRefresh>;
  accountsMode: AccountSheetMode;
  setAccountsMode: (mode: AccountSheetMode) => void;
}) {
  const live = useLiveFrame();
  const today = todayStats(live?.day ?? '', live?.dayTone ?? 'flat', total, hidden);
  const shown = splitTotal(total);
  const spark = useMarketChart('ETH', '1D');
  const [copied, setCopied] = useState(false);
  const addr = live?.address || '';
  const packTop = hideChrome ? 'max(92px, calc(env(safe-area-inset-top, 0px) + 54px))' : 52;

  async function copyAddr() {
    if (!addr) return;
    try {
      await copyAddress(addr);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div style={{ position: 'relative', width: 390, height: 844, overflow: 'hidden', fontFamily: font.sans, color: '#fff', background: '#050505', display: 'flex', flexDirection: 'column' }}>
      <style>{`.home-cards,.arxon-token-scroll{scrollbar-width:none;-ms-overflow-style:none}.home-cards::-webkit-scrollbar,.arxon-token-scroll::-webkit-scrollbar{display:none;width:0;height:0}`}</style>
      {hideChrome ? null : (
        <div style={{ position: 'absolute', left: 0, top: 0, width: 390, height: 44, zIndex: 5 }}>
          <span style={{ position: 'absolute', left: 21, top: 14, width: 54, textAlign: 'center', fontSize: 14, fontWeight: 600, letterSpacing: -0.28 }}>9:41</span>
          <img src="/wallet-figma/welcome/status.svg" alt="" width={66.6} height={11.33} style={{ position: 'absolute', left: 288.67, top: 17.33 }} />
        </div>
      )}

      <div
        style={{ flex: '0 0 auto', zIndex: 5, display: 'flex', flexDirection: 'column', paddingTop: packTop, paddingLeft: 20, paddingRight: 20, paddingBottom: 0, boxSizing: 'border-box', touchAction: 'pan-y' }}
        onTouchStart={pull.onTouchStart}
        onTouchMove={pull.onTouchMove}
        onTouchEnd={pull.onTouchEnd}
      >
        <PullHint pull={pull.pull} busy={pull.busy} />
        <header style={{ height: 42, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <LiveAvatar photo={photo} accountIndex={live?.accountIndex ?? 0} onOpen={() => setAccountsMode('list')} />
          <div style={{ display: 'flex', alignItems: 'center', height: 36, borderRadius: 18, overflow: 'hidden', flexShrink: 0, boxSizing: 'border-box', ...headerGlass }}>
            <button type="button" aria-label="Search" onClick={() => go('search')} style={{ width: 40, height: 36, border: 'none', background: 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', padding: 0 }}>
              <FigmaImg src={art('search.svg')} width={16} height={16} />
            </button>
            <button type="button" aria-label="Notifications" onClick={() => go('notifications')} style={{ width: 36, height: 36, border: 'none', background: 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', padding: 0 }}>
              <FigmaImg src={art('bell.svg')} width={16} height={16} />
            </button>
          </div>
        </header>

        <div style={{ marginTop: 12 }}>
        <CardLoad extra={pull.busy} kind="hero">
        <div style={{ ...walletHero, minHeight: 176, padding: '18px 18px 14px', display: 'flex', flexDirection: 'column' }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: '#3a4254' }}>Total balance</span>
          <div style={{ marginTop: 14, display: 'flex', alignItems: 'baseline', gap: 2 }}>
            <span style={{ fontSize: 22, fontWeight: 600, letterSpacing: -0.4, color: '#0c1018', lineHeight: 1 }}>{shown.sign}</span>
            <span style={{ fontSize: hidden ? 32 : 36, fontWeight: 700, letterSpacing: hidden ? 2 : -1.2, color: '#0c1018', lineHeight: 1 }}>
              {hidden ? '••••' : shown.amount}
            </span>
          </div>
          <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 8, minHeight: 28 }}>
            <p style={{ margin: 0, flexShrink: 0, fontSize: 12, fontWeight: 500, lineHeight: 1.25, color: today.color, whiteSpace: 'nowrap' }}>
              {today.pct}
            </p>
            <HeroSpark points={spark.points} color={today.color} />
            <button type="button" aria-label={hidden ? 'Show balance' : 'Hide balance'} onClick={eye} style={{ ...iconBtn, width: 26, height: 26, margin: 0, filter: 'brightness(0)', flexShrink: 0 }}>
              <FigmaImg src={art(hidden ? 'eye-off.svg' : 'eye.svg')} width={15} height={15} />
            </button>
          </div>
          {addr ? (
            <div style={{ marginTop: 'auto', paddingTop: 14, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, borderTop: '1px solid rgba(12,16,24,0.08)' }}>
              <p style={{ margin: 0, minWidth: 0, fontSize: 12, fontWeight: 500, color: '#5c6578', letterSpacing: 0.2 }}>{heroAddr(addr)}</p>
              <button type="button" aria-label="Copy" onClick={() => void copyAddr()} style={{ ...walletHeroCopy, position: 'relative', width: 28, minWidth: 28, padding: 0, flexShrink: 0 }}>
                <span style={{ display: 'flex', opacity: copied ? 0 : 1 }}><CopyMark /></span>
                {copied ? (
                  <span aria-hidden style={{ position: 'absolute', right: 0, top: '50%', transform: 'translateY(-50%)', fontSize: 11, fontWeight: 700, color: '#3a4254', whiteSpace: 'nowrap', pointerEvents: 'none' }}>Address copied</span>
                ) : null}
              </button>
            </div>
          ) : null}
        </div>
        </CardLoad>
        </div>

        <div style={{ ...actionRow, marginTop: 10, marginBottom: 4 }}>
          <NotchedPill label="Send" onClick={() => go(sendTo)}>
            <FigmaImg src={art('send.svg')} width={14} height={14} />
          </NotchedPill>
          <NotchedPill label="Deposit" onClick={() => { live?.setReceiveAsset(network.picked.asset); go('receive'); }}>
            <FigmaImg src={art('receive.svg')} width={14} height={14} />
          </NotchedPill>
          <NotchedPill label="Swap" onClick={() => go('swap')}>
            <FigmaImg src={art('swap.svg')} width={14} height={14} />
          </NotchedPill>
          <NotchedPill label="Buy" onClick={() => go('buy')}>
            <FigmaImg src={art('buy.svg')} width={14} height={14} />
          </NotchedPill>
        </div>
      </div>

      <div
        className="arxon-token-scroll"
        style={{ flex: 1, minHeight: 0, zIndex: 1, overflowY: 'auto', overflowX: 'hidden', WebkitOverflowScrolling: 'touch', touchAction: 'pan-y', boxSizing: 'border-box', padding: '8px 20px 0', paddingBottom: WALLET_TAB_CLEAR }}
      >
        <div style={{ borderRadius: 22, padding: '2px 12px 8px', ...sheetGlass }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', minHeight: 44 }}>
            <span style={{ fontSize: 16, fontWeight: 700 }}>Tokens</span>
            <button type="button" onClick={() => go('manage')} style={{ ...plain, color: '#accafe', fontSize: 13, fontWeight: 500, minHeight: 40, padding: '8px 4px' }}>Manage</button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <CardLoad extra={pull.busy} kind="rows" n={5}>
            {tokens.map((token) => (
              <button key={token.name} type="button" onClick={() => { if (live?.app && token.symbol) live.setReceiveAsset(token.symbol); go(token.to); }} style={compactTokenRow}>
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
            </CardLoad>
          </div>
        </div>
        <div style={{ marginTop: 8, borderRadius: 22, padding: '2px 12px 10px', ...sheetGlass }}>
          <HomePayments go={go} tone="sheet" />
        </div>
        <div aria-hidden style={{ height: 28 }} />
      </div>

      <WalletTabs
        active="Home"
        onSelect={(tab: WalletTabName) => {
          pickWalletTab('mainnet', tab, go, {
            home: empty ? 'home' : 'home-funded',
            vault: vaultTo,
            history: empty ? 'activity-empty' : 'activity',
          });
        }}
      />
      {network.sheet}
      <AccountSheet mode={accountsMode} setMode={setAccountsMode} go={go} />
    </div>
  );
}

function TestnetHome({ id, go, back }: { id: string; go: Go; back?: () => void; behind?: string }) {
  const live = useLiveFrame();
  const pull = usePullRefresh(() => live?.refreshHome?.() ?? live?.refresh?.(), { threshold: 28 });
  const hideChrome = useAppHidesFigmaChrome();
  const photo = useProfilePhoto(live?.accountIndex ?? 0);
  const network = useNetworkSheet('testnet', go);
  const [added, setAdded] = useState(() => sessionStore.testnetAdded());
  const [intro, setIntro] = useState(() => typeof localStorage === 'undefined' || localStorage.getItem(TESTNET_INTRO_KEY) !== '1');
  const on = live?.app ? live.testnetAdded : added;
  const hidden = live?.app ? live.hidden : false;
  const [accountsMode, setAccountsMode] = useState<AccountSheetMode>(null);
  const tokens = on ? (live?.app ? live.testnetTokens : DEMO_TESTNET) : [];
  const total = on ? (live?.app ? live.testnetTotal : '0.00') : '0.00';

  function vaultTo() {
    if (!on) return 'add-network';
    const holding = tokens.some((row) => Number(row.amount.replace(/[^0-9.]/g, '')) > 0);
    const shielded = live?.app ? Number(live.shielded) > 0 : false;
    if (!holding && !shielded) return vaultEntry('vault-nofunds');
    return vaultEntry('vault');
  }

  async function addNetwork() {
    if (live?.app) {
      await live.enableTestnet();
      return;
    }
    sessionStore.setTestnetAdded(true);
    setAdded(true);
  }

  function openFaucet() {
    if (live?.app) {
      live.openFaucet();
      return;
    }
    void openExternal(START_URL);
  }

  function dismissIntro() {
    localStorage.setItem(TESTNET_INTRO_KEY, '1');
    setIntro(false);
  }

  function openVaultFlow(body: string) {
    if (!on) {
      go('add-network');
      return;
    }
    go(vaultEntry(body));
  }

  if (live?.app) {
    if (id === 'public-wallet' || id === 'shielded-wallet') {
      return (
        <LiveWalletBook
          kind={id === 'public-wallet' ? 'public' : 'shielded'}
          go={go}
          back={back}
          hidden={hidden}
          tokens={tokens}
        />
      );
    }
    return (
      <LiveTestnetHome
        go={go}
        on={on}
        hidden={hidden}
        photo={photo}
        hideChrome={hideChrome}
        pull={pull}
        accountsMode={accountsMode}
        setAccountsMode={setAccountsMode}
        addNetwork={addNetwork}
        openFaucet={openFaucet}
        intro={intro}
        dismissIntro={dismissIntro}
        openVaultFlow={openVaultFlow}
      />
    );
  }

  return (
    <div style={{ position: 'relative', width: 390, height: 844, background: '#050505', overflow: 'hidden', fontFamily: font.sans, color: '#fff' }}>
      {hideChrome ? null : (
        <div style={{ position: 'absolute', left: 0, top: 0, width: 390, height: 44 }}>
          <span style={{ position: 'absolute', left: 21, top: 14, width: 54, textAlign: 'center', fontSize: 14, fontWeight: 600, letterSpacing: -0.28 }}>9:41</span>
          <img src="/wallet-figma/welcome/status.svg" alt="" width={66.6} height={11.33} style={{ position: 'absolute', left: 288.67, top: 17.33 }} />
        </div>
      )}

      <div className="arxon-token-scroll" style={{ position: 'absolute', left: 0, top: live?.app ? 72 : hideChrome ? 12 : 44, width: 390, bottom: 0, overflowY: 'auto', overflowX: 'hidden', WebkitOverflowScrolling: 'touch', touchAction: 'pan-y', boxSizing: 'border-box', padding: live?.app ? '8px 16px 0' : '16px 16px 0', paddingBottom: 'calc(72px + env(safe-area-inset-bottom, 0px))' }} onTouchStart={pull.onTouchStart} onTouchMove={pull.onTouchMove} onTouchEnd={pull.onTouchEnd}>
        <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 40, marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
            {live?.app ? (
              <ProfileAvatar size={36} photo={photo} accountIndex={live.accountIndex} onOpen={() => go('account')} />
            ) : (
              <span style={{ width: 36, height: 36, borderRadius: 18, background: '#1c2025' }} />
            )}
            <button type="button" aria-label="Accounts" onClick={() => (live?.app ? setAccountsMode('list') : go('accounts'))} style={{ ...plain, minHeight: 40 }}>
              <span style={{ fontSize: 16, fontWeight: 500 }}>{live?.app ? live.accountLabel : 'Account 01'}</span>
              <FigmaImg src={art('chev.svg')} width={16} height={16} />
            </button>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <CircleBtn label="Search" onClick={() => go('search')}><FigmaImg src={art('search.svg')} width={20} height={20} /></CircleBtn>
            <CircleBtn label="Notifications" onClick={() => go('notifications')}><FigmaImg src={art('bell.svg')} width={20} height={20} /></CircleBtn>
          </div>
        </header>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 40, fontWeight: 700, lineHeight: 1 }}>{hidden ? '••••••' : total}</span>
            {live?.app && (
              <button type="button" aria-label={hidden ? 'Show balance' : 'Hide balance'} onClick={() => live.toggleHide()} style={iconBtn}>
                <FigmaImg src={art(hidden ? 'eye-off.svg' : 'eye.svg')} width={22} height={22} />
              </button>
            )}
          </div>
          <button type="button" aria-label="Select network" onClick={network.show} style={{ border: 'none', background: 'none', padding: 0, textAlign: 'left', fontSize: 14, fontWeight: 500, color: '#accafe', fontFamily: font.sans, cursor: 'pointer' }}>{on ? network.picked.name : 'Arxon Testnet'}</button>
        </div>

        {on && (
          <div role="tablist" aria-label="Testnet" style={{ display: 'flex', background: '#1c2025', borderRadius: 16, padding: 4, width: 'fit-content', marginBottom: 16 }}>
            <button type="button" role="tab" aria-selected="true" style={subTab(true)}>Home</button>
            <button type="button" role="tab" aria-selected="false" onClick={() => go(vaultTo())} style={subTab(false)}>Vault</button>
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: on ? 16 : 24 }}>
          <Action label="Send" onClick={() => go(on ? 'send-token' : 'add-network')}><FigmaImg src={art('send.svg')} width={24} height={24} /></Action>
          <Action label="Receive" onClick={() => {
            if (!on) { go('add-network'); return; }
            live?.setReceiveAsset('tARX');
            go('receive');
          }}><FigmaImg src={art('receive.svg')} width={24} height={24} /></Action>
          <Action label="Swap" onClick={() => go(on ? 'swap' : 'add-network')}><FigmaImg src={art('swap.svg')} width={24} height={24} /></Action>
          <Action label="Shield in" onClick={() => openVaultFlow('shield-explain')}><FigmaImg src={art('shield.svg')} width={24} height={24} /></Action>
        </div>
        <div style={{ display: 'flex', gap: 8, marginBottom: on ? 16 : 24 }}>
          <TapAction label="Private pay" onOpen={() => openVaultFlow('priv-addr')} />
          <TapAction label="Unshield" onOpen={() => openVaultFlow('unshield-who')} />
        </div>

        {!on ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <button type="button" onClick={() => void addNetwork()} style={ctaCard}>
              <FigmaImg src={art('plus.svg')} width={18} height={18} />
              <span style={{ fontSize: 16, fontWeight: 700, textAlign: 'left' }}>Add Arxon Testnet</span>
              <span style={{ fontSize: 13, fontWeight: 400, color: '#8c8f99', textAlign: 'left', lineHeight: 1.4 }}>Chain 7171 · rpc-test.arxonchain.xyz. Tokens stay hidden until you add this network.</span>
            </button>
            <button type="button" onClick={openFaucet} style={ghostBtn}>Faucet · tARX</button>
            <button type="button" onClick={() => go('add-network')} style={ghostBtn}>Custom RPC</button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <button type="button" onClick={openFaucet} style={ghostBtn}>Faucet · tARX</button>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 18, fontWeight: 700 }}>Tokens</span>
              <button type="button" onClick={() => go('manage')} style={{ ...plain, color: '#accafe', fontSize: 14, fontWeight: 500, minHeight: 40, padding: '8px 4px' }}>Manage</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
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
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 18, fontWeight: 700 }}>History</span>
              <button type="button" onClick={() => go('activity')} style={{ ...plain, color: '#accafe', fontSize: 14, fontWeight: 500, minHeight: 40, padding: '8px 4px' }}>See all</button>
            </div>
            <TestnetHistory go={go} limit={3} />
          </div>
        )}
      </div>

      <WalletTabs
        active="Testnet"
        onSelect={(tab: WalletTabName) => {
          pickWalletTab('testnet', tab, go, {
            home: 'home-funded',
            vault: vaultTo(),
            history: 'activity',
          });
        }}
      />
      {network.sheet}
      <AccountSheet mode={accountsMode} setMode={setAccountsMode} go={go} />
      {intro ? <TestnetIntro onDone={dismissIntro} /> : null}
    </div>
  );
}

function LiveTestnetHome({
  go,
  on,
  hidden,
  photo,
  hideChrome,
  pull,
  accountsMode,
  setAccountsMode,
  addNetwork,
  openFaucet,
  intro,
  dismissIntro,
  openVaultFlow,
}: {
  go: Go;
  on: boolean;
  hidden: boolean;
  photo: string | null;
  hideChrome: boolean;
  pull: ReturnType<typeof usePullRefresh>;
  accountsMode: AccountSheetMode;
  setAccountsMode: (mode: AccountSheetMode) => void;
  addNetwork: () => void | Promise<void>;
  openFaucet: () => void;
  intro: boolean;
  dismissIntro: () => void;
  openVaultFlow: (body: string) => void;
}) {
  const live = useLiveFrame();
  const packTop = hideChrome ? 'max(28px, env(safe-area-inset-top, 0px))' : 44;
  const [keyOpen, setKeyOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const refreshVault = live?.refreshVault;
  const publicN = Number(String(live?.publicArx ?? '0').replace(/,/g, '')) || 0;
  const shieldedN = Number(String(live?.shielded ?? '0').replace(/,/g, '')) || 0;
  const portfolio = on ? tarxQty(publicN + shieldedN) : '0.00';
  const publicAmt = on ? tarxQty(live?.publicArx) : '0.00';
  const shieldedAmt = on ? tarxQty(live?.shielded) : '0.00';
  const key = live?.shieldedPk || '';

  useEffect(() => {
    if (!refreshVault) return;
    void refreshVault();
  }, [refreshVault]);

  function openPublicWallet() {
    if (!on) {
      go('add-network');
      return;
    }
    go('public-wallet');
  }

  async function copyKey() {
    if (!key) return;
    try {
      await copyAddress(key);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div style={{ position: 'relative', width: 390, height: 844, overflow: 'hidden', fontFamily: font.sans, color: '#fff', background: '#050505', display: 'flex', flexDirection: 'column' }}>
      <style>{`.home-cards,.arxon-token-scroll{scrollbar-width:none;-ms-overflow-style:none}.home-cards::-webkit-scrollbar,.arxon-token-scroll::-webkit-scrollbar{display:none;width:0;height:0}`}</style>
      {hideChrome ? null : (
        <div style={{ position: 'absolute', left: 0, top: 0, width: 390, height: 44, zIndex: 5 }}>
          <span style={{ position: 'absolute', left: 21, top: 14, width: 54, textAlign: 'center', fontSize: 14, fontWeight: 600, letterSpacing: -0.28 }}>9:41</span>
          <img src="/wallet-figma/welcome/status.svg" alt="" width={66.6} height={11.33} style={{ position: 'absolute', left: 288.67, top: 17.33 }} />
        </div>
      )}

      <div
        style={{ flex: '0 0 auto', zIndex: 5, display: 'flex', flexDirection: 'column', paddingTop: packTop, paddingLeft: 20, paddingRight: 20, paddingBottom: 0, boxSizing: 'border-box', touchAction: 'pan-y' }}
        onTouchStart={pull.onTouchStart}
        onTouchMove={pull.onTouchMove}
        onTouchEnd={pull.onTouchEnd}
      >
        <PullHint pull={pull.pull} busy={pull.busy} />
        <header style={{ height: 42, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <LiveAvatar photo={photo} accountIndex={live?.accountIndex ?? 0} onOpen={() => setAccountsMode('list')} />
          <div style={{ display: 'flex', alignItems: 'center', height: 36, borderRadius: 18, overflow: 'hidden', flexShrink: 0, boxSizing: 'border-box', ...headerGlass }}>
            <button type="button" aria-label="Search" onClick={() => go('search')} style={{ width: 40, height: 36, border: 'none', background: 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', padding: 0 }}>
              <FigmaImg src={art('search.svg')} width={16} height={16} />
            </button>
            <button type="button" aria-label="Notifications" onClick={() => go('notifications')} style={{ width: 36, height: 36, border: 'none', background: 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', padding: 0 }}>
              <FigmaImg src={art('bell.svg')} width={16} height={16} />
            </button>
          </div>
        </header>

        <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', paddingTop: 18 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
            <span style={{ fontSize: 13, fontWeight: 400, letterSpacing: 0.16, color: 'rgba(255,255,255,0.48)', whiteSpace: 'nowrap' }}>Total ARX portfolio</span>
            <button type="button" aria-label={hidden ? 'Show balance' : 'Hide balance'} onClick={() => live?.toggleHide()} style={{ ...iconBtn, width: 22, height: 22, margin: 0 }}>
              <FigmaImg src={art(hidden ? 'eye-off.svg' : 'eye.svg')} width={14} height={14} />
            </button>
          </div>
          <div style={{ marginTop: 10, display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: 8 }}>
            <span style={{ fontFamily: font.sans, fontSize: hidden ? 64 : 80, fontWeight: 300, letterSpacing: hidden ? 2.2 : -2.2, lineHeight: 1, textAlign: 'center' }}>
              {hidden ? '••••••' : portfolio}
            </span>
            {hidden ? null : (
              <span style={{ fontSize: 16, fontWeight: 400, color: 'rgba(255,255,255,0.52)', letterSpacing: 0.2, lineHeight: 1, transform: 'translateY(2px)' }}>tARX</span>
            )}
          </div>
        </div>
        <div style={{ ...slimRow, marginTop: 6 }}>
          <NotchedPill light label="Shield" onClick={() => openVaultFlow('vault-pick-in')}>
            <FigmaImg src={art('shield.svg')} width={14} height={14} />
          </NotchedPill>
          <NotchedPill light label="Private pay" onClick={() => openVaultFlow('priv-addr')}>
            <FigmaImg src={art('send.svg')} width={14} height={14} />
          </NotchedPill>
          <NotchedPill light label="Unshield" onClick={() => openVaultFlow('unshield-who')}>
            <UnshieldMark />
          </NotchedPill>
        </div>
        <div style={{ width: '100%', marginTop: 28 }}>
          <CardLoad extra={pull.busy} kind="banners">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, width: '100%' }}>
              <LiveWalletBanner
                title="Public ARX wallet"
                amount={hidden ? '••••' : publicAmt}
                showUnit={!hidden}
                tone="public"
                onClick={openPublicWallet}
              />
              <LiveWalletBanner
                title="Shielded wallet"
                amount={hidden ? '••••' : shieldedAmt}
                showUnit={!hidden}
                tone="shielded"
                onClick={() => go('shielded-wallet')}
              />
            </div>
          </CardLoad>
        </div>
        <div style={{ ...actionRow, marginTop: 8, marginBottom: 4 }}>
          <NotchedPill label="Send" onClick={() => go(on ? 'send-token' : 'add-network')}>
            <FigmaImg src={art('send.svg')} width={14} height={14} />
          </NotchedPill>
          <NotchedPill label="Deposit" onClick={() => {
            if (!on) { go('add-network'); return; }
            live?.setReceiveAsset('tARX');
            go('receive');
          }}>
            <FigmaImg src={art('receive.svg')} width={14} height={14} />
          </NotchedPill>
          <NotchedPill label="Swap" onClick={() => go(on ? 'swap' : 'add-network')}>
            <FigmaImg src={art('swap.svg')} width={14} height={14} />
          </NotchedPill>
          <NotchedPill label="Faucet" onClick={openFaucet}>
            <FaucetMark />
          </NotchedPill>
        </div>
      </div>

      <div
        className="arxon-token-scroll"
        style={{ flex: 1, minHeight: 0, zIndex: 1, overflowY: 'auto', overflowX: 'hidden', WebkitOverflowScrolling: 'touch', touchAction: 'pan-y', boxSizing: 'border-box', padding: '8px 20px 0', paddingBottom: WALLET_TAB_CLEAR }}
      >
        {!on ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <button type="button" onClick={() => void addNetwork()} style={ctaCard}>
              <FigmaImg src={art('plus.svg')} width={18} height={18} />
              <span style={{ fontSize: 16, fontWeight: 700, textAlign: 'left' }}>Add Arxon Testnet</span>
              <span style={{ fontSize: 13, fontWeight: 400, color: '#8c8f99', textAlign: 'left', lineHeight: 1.4 }}>Chain 7171 · rpc-test.arxonchain.xyz. Tokens stay hidden until you add this network.</span>
            </button>
            <button type="button" onClick={() => go('add-network')} style={ghostBtn}>Custom RPC</button>
          </div>
        ) : (
          <>
            <div style={{ borderRadius: 22, padding: '2px 12px 10px', ...sheetGlass }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', minHeight: 44 }}>
                <span style={{ fontSize: 16, fontWeight: 700 }}>History</span>
                <button type="button" onClick={() => go('activity')} style={{ ...plain, color: '#accafe', fontSize: 13, fontWeight: 500, minHeight: 40, padding: '8px 4px' }}>See all</button>
              </div>
              <TestnetHistory go={go} limit={3} />
            </div>
          </>
        )}
        <div aria-hidden style={{ height: 28 }} />
      </div>

      <WalletTabs
        active="Testnet"
        onSelect={(tab: WalletTabName) => {
          pickWalletTab('testnet', tab, go, {
            home: 'home-funded',
            vault: 'testnet',
            history: 'activity',
          });
        }}
      />
      <AccountSheet mode={accountsMode} setMode={setAccountsMode} go={go} />
      {intro ? <TestnetIntro onDone={dismissIntro} /> : null}
      {keyOpen && (
        <>
          <button type="button" aria-label="Close shielded key" onClick={() => setKeyOpen(false)} style={{ position: 'absolute', inset: 0, border: 'none', background: 'rgba(0,0,0,0.6)', zIndex: 20 }} />
          <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, zIndex: 21, background: '#11161f', border: '1px solid #2a3447', borderBottom: 'none', borderRadius: '24px 24px 0 0', padding: '12px 18px 28px' }}>
            <div style={{ width: 36, height: 4, borderRadius: 2, background: '#5c5f64', margin: '0 auto 14px' }} />
            <p style={{ margin: '0 0 8px', fontSize: 18, fontWeight: 700 }}>Shielded key</p>
            <p style={{ margin: '0 0 12px', color: '#8b9097', fontSize: 13, lineHeight: 1.4 }}>Private pay to this vault uses this key. It is not your public address, and it covers the shielded tokens in this account.</p>
            <p style={{ margin: 0, padding: 14, borderRadius: 14, background: '#1c2025', color: '#fff', fontSize: 13, lineHeight: 1.45, wordBreak: 'break-all' }}>{key || 'Your shielded key is not ready on this account yet.'}</p>
            <button type="button" disabled={!key} onClick={() => void copyKey()} style={{ ...sheetAction, marginTop: 12, border: 'none', background: key ? '#accafe' : '#1c2025', color: key ? '#0c1018' : '#5c5f64' }}>{copied ? 'Copied' : 'Copy key'}</button>
            <button type="button" onClick={() => setKeyOpen(false)} style={{ ...sheetAction, marginTop: 8, background: 'transparent', color: '#fff', border: '1px solid #2a3447' }}>Close</button>
          </div>
        </>
      )}
    </div>
  );
}

const TESTNET_INTRO_KEY = 'arxon.testnet.introSeen';

function TestnetIntro({ onDone }: { onDone: () => void }) {
  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: 30, background: '#050505', overflow: 'hidden', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <div style={{ marginTop: 120, width: 96, height: 96, borderRadius: 48, background: '#1c2025', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <FigmaImg src={art('shield.svg')} width={40} height={40} />
      </div>
      <h1 style={{ margin: '28px 28px 0', textAlign: 'center', fontSize: 28, fontWeight: 700, lineHeight: 1.15 }}>Private payments on Testnet</h1>
      <p style={{ margin: '14px 32px 0', textAlign: 'center', color: '#8b9097', fontSize: 15, lineHeight: 1.45 }}>
        Shield tokens into your Vault. Pay someone from that Vault without showing the balance. Unshield when you want a public balance again.
      </p>
      <div style={{ marginTop: 'auto', width: 354, paddingBottom: 36, display: 'flex', flexDirection: 'column', gap: 8 }}>
        <button type="button" onClick={onDone} style={{ height: 55, border: 'none', borderRadius: 8, background: '#accafe', color: '#0c1018', fontFamily: font.sans, fontWeight: 600, fontSize: 16, cursor: 'pointer' }}>I understand</button>
        <button type="button" onClick={onDone} style={{ height: 48, border: 'none', background: 'none', color: '#accafe', fontFamily: font.sans, fontWeight: 600, fontSize: 15, cursor: 'pointer' }}>Skip all</button>
      </div>
    </div>
  );
}

const DEMO_PAYMENTS = [
  { title: 'Received ETH', day: 'Today', sub: '10:42 AM', amount: '+0.0185 ETH', to: 'tx' },
  { title: 'Sent ETH', day: 'Today', sub: '09:15 AM', amount: '-0.0040 ETH', to: 'tx' },
  { title: 'Received BTC', day: 'Yesterday', sub: '4:20 PM', amount: '+0.0021 BTC', to: 'tx' },
];

function HomePayments({ go, tone }: { go: Go; tone?: 'sheet' }) {
  const live = useLiveFrame();
  const sheet = tone === 'sheet';
  const rows = live?.app
    ? live.activity
      .flatMap((group) => group.items.map((item) => ({ ...item, day: group.day })))
      .filter((row) => isMainnetActivity(row))
      .slice(0, 3)
    : DEMO_PAYMENTS;
  return (
    <section style={{ marginTop: sheet ? 0 : 8, width: '100%' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', minHeight: sheet ? 44 : undefined }}>
        <span style={{ fontSize: 16, fontWeight: 700 }}>History</span>
        <button type="button" onClick={() => go('activity')} style={{ ...plain, color: '#accafe', fontSize: sheet ? 13 : 14, fontWeight: 500, minHeight: 40, padding: '8px 4px' }}>See all</button>
      </div>
      {rows.length === 0 ? (
        <CardLoad kind="rows" n={3}>
        <p style={{ margin: sheet ? '4px 0 12px' : '4px 0 8px', fontSize: 13, color: '#8b9097', lineHeight: 1.4 }}>No mainnet payments yet.</p>
        </CardLoad>
      ) : (
        <CardLoad kind="rows" n={3}>
        {rows.map((row) => (
        <button
          key={`${row.title}-${row.sub}`}
          type="button"
          onClick={() => {
            const hash = 'hash' in row ? row.hash : undefined;
            if (hash) void live?.openTx(hash, { detail: 'full' });
            go(row.to || 'tx');
          }}
          style={{ width: '100%', border: 'none', borderTop: sheet ? '1px solid rgba(255,255,255,0.05)' : 'none', background: sheet ? 'transparent' : '#1c2025', color: '#fff', borderRadius: sheet ? 0 : 12, padding: sheet ? '12px 2px' : '10px 12px', marginTop: sheet ? 0 : 8, display: 'flex', alignItems: 'center', gap: 10, textAlign: 'left', fontFamily: font.sans, cursor: 'pointer' }}
        >
          <span style={{ flex: 1, minWidth: 0 }}>
            <span style={{ display: 'block', fontSize: 14, fontWeight: 600 }}>{row.title}</span>
            <span style={{ display: 'block', marginTop: 2, fontSize: 12, color: '#8b9097' }}>{row.day} · {row.sub}</span>
          </span>
          <span style={{ fontSize: 13, fontWeight: 600 }}>{row.amount}</span>
        </button>
      ))}
        </CardLoad>
      )}
    </section>
  );
}

const DEMO_TESTNET: Tok[] = [
  { name: 'Arxon', amount: '0.00 tARX', value: '$0.00', change: 'Arxon Testnet', tone: 'flat', icon: 'arx', to: 'token-arx', symbol: 'tARX' },
  { name: 'Tether', amount: '0.00 USDTarx', value: '$0.00', change: 'Arxon Testnet', tone: 'flat', icon: 'usdt', to: 'token-usdt', symbol: 'USDTarx' },
  { name: 'USD Coin', amount: '0.00 USDCarx', value: '$0.00', change: 'Arxon Testnet', tone: 'flat', icon: 'usdc', to: 'token-usdc', symbol: 'USDCarx' },
];

function toneColor(tone: Tok['tone']) {
  if (tone === 'up') return '#3ddb85';
  if (tone === 'down') return '#f25252';
  return '#8c8f99';
}

const NOTCH_R = 11;
const PILL_H = 34;
const notchMask = `radial-gradient(circle ${NOTCH_R}px at 50% 0px, transparent ${NOTCH_R - 0.6}px, #000 ${NOTCH_R}px)`;

function tarxQty(value: string | number | null | undefined) {
  const n = typeof value === 'number' ? value : Number(String(value ?? '0').replace(/,/g, ''));
  if (!Number.isFinite(n)) return '0';
  return n.toLocaleString(undefined, { maximumFractionDigits: 4 });
}

function cleanTokAmount(token: Tok) {
  const raw = token.amount?.trim() || '';
  if (!raw || raw.startsWith('—') || raw.startsWith('-')) {
    return `0.00 ${token.symbol || 'tARX'}`;
  }
  return raw;
}

function LiveWalletBanner({
  title,
  amount,
  showUnit,
  tone,
  onClick,
}: {
  title: string;
  amount: string;
  showUnit: boolean;
  tone: 'public' | 'shielded';
  onClick: () => void;
}) {
  const panel = tone === 'public' ? walletPanelPublic : walletPanelShielded;
  const pill = tone === 'public' ? walletViewPublic : walletViewShielded;
  const stroke = tone === 'public' ? walletBannerStrokePublic : walletBannerStrokeShielded;
  return (
    <button type="button" onClick={onClick} style={{ ...walletBanner, ...stroke }}>
      <span style={walletBannerHead}>
        <span style={walletBannerTitle}>{title}</span>
        <span style={pill}>View wallet</span>
      </span>
      <span style={panel}>
        <span style={walletBannerAmtRow}>
          <span style={walletBannerAmt}>{amount}</span>
          {showUnit ? <span style={walletBannerUnit}>tARX</span> : null}
        </span>
        <span style={walletBannerCaption}>Balance</span>
      </span>
    </button>
  );
}

function briefSecret(value: string) {
  const text = value.trim();
  if (text.length < 16) return text || '—';
  return `${text.slice(0, 6)}.......${text.slice(-5)}`;
}

function heroAddr(value: string) {
  const text = value.trim();
  if (text.length <= 12) return text;
  return `${text.slice(0, 6)}…${text.slice(-4)}`;
}

function LiveWalletBook({
  kind,
  go,
  back,
  hidden,
  tokens,
}: {
  kind: 'public' | 'shielded';
  go: Go;
  back?: () => void;
  hidden: boolean;
  tokens: Tok[];
}) {
  const live = useLiveFrame();
  const hideChrome = useAppHidesFigmaChrome();
  const [copied, setCopied] = useState(false);
  const packTop = hideChrome ? 'max(28px, env(safe-area-inset-top, 0px))' : 44;
  const full = (kind === 'public' ? live?.address : live?.shieldedPk) || '';
  const preview = kind === 'public' ? (full ? briefAddr(full) : 'No address yet') : (full ? briefSecret(full) : 'No shielded key yet');
  const amount = kind === 'public' ? tarxQty(live?.publicArx) : tarxQty(live?.shielded);
  const title = kind === 'public' ? 'Public ARX wallet' : 'Shielded wallet';
  const leave = () => {
    if (back) {
      back();
      return;
    }
    go('testnet', false);
  };

  const pull = usePullRefresh(() => kind === 'shielded' ? live?.refreshVault?.() : live?.refresh?.());
  const refreshVault = live?.refreshVault;
  useEffect(() => {
    if (kind !== 'shielded' || !refreshVault) return;
    void refreshVault();
  }, [kind, refreshVault]);
  const vaultRows = (live?.vaultTokens?.length
    ? live.vaultTokens.map((row) => ({
        name: row.name,
        amount: `${row.amount} ${row.symbol}`,
        value: row.amount,
        change: 'Arxon Testnet',
        tone: 'flat' as const,
        icon: (row.icon === 'usdt' || row.icon === 'usdc' ? row.icon : 'arx') as Tok['icon'],
        to: '',
        symbol: row.symbol,
      }))
    : [{
        name: 'Arxon',
        amount: `${amount} tARX`,
        value: amount,
        change: 'Arxon Testnet',
        tone: 'flat' as const,
        icon: 'arx' as const,
        to: '',
        symbol: 'tARX',
      }]);
  const rows = kind === 'public' ? tokens : vaultRows;

  async function copyFull() {
    if (!full) return;
    try {
      await copyAddress(full);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div style={{ position: 'relative', width: 390, height: 844, overflow: 'hidden', fontFamily: font.sans, color: '#fff', background: '#050505', display: 'flex', flexDirection: 'column' }}>
      <style>{`.arxon-token-scroll{scrollbar-width:none;-ms-overflow-style:none}.arxon-token-scroll::-webkit-scrollbar{display:none;width:0;height:0}`}</style>
      {hideChrome ? null : (
        <div style={{ position: 'absolute', left: 0, top: 0, width: 390, height: 44, zIndex: 5 }}>
          <span style={{ position: 'absolute', left: 21, top: 14, width: 54, textAlign: 'center', fontSize: 14, fontWeight: 600, letterSpacing: -0.28 }}>9:41</span>
          <img src="/wallet-figma/welcome/status.svg" alt="" width={66.6} height={11.33} style={{ position: 'absolute', left: 288.67, top: 17.33 }} />
        </div>
      )}
      <div style={{ flex: '0 0 auto', zIndex: 5, paddingTop: packTop, paddingLeft: 20, paddingRight: 20, boxSizing: 'border-box' }}>
        <LiveHead title={title} onBack={leave} />
        <CardLoad extra={pull.busy} kind="hero" h={148}>
        <div style={walletHero}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: '#3a4254' }}>{kind === 'public' ? 'Public address' : 'Shielded key'}</span>
            <button type="button" aria-label="Copy" onClick={() => void copyFull()} style={walletHeroCopy}>
              {copied ? 'Address copied' : <CopyMark />}
            </button>
          </div>
          <p style={{ margin: '6px 0 0', fontSize: 13, fontWeight: 700, color: '#0c1018', letterSpacing: -0.2, wordBreak: 'break-all' }}>{preview}</p>
          <div style={{ marginTop: 18, display: 'flex', alignItems: 'baseline', gap: 8 }}>
            <span style={{ fontSize: hidden ? 36 : 44, fontWeight: 700, letterSpacing: hidden ? 2 : -1.4, color: '#0c1018', lineHeight: 1 }}>
              {hidden ? '••••' : amount}
            </span>
            {hidden ? null : (
              <span style={{ fontSize: 14, fontWeight: 500, color: '#5c6578', lineHeight: 1, transform: 'translateY(2px)' }}>tARX</span>
            )}
          </div>
        </div>
        </CardLoad>
      </div>
      <div
        className="arxon-token-scroll"
        style={{ flex: 1, minHeight: 0, zIndex: 1, overflowY: 'auto', WebkitOverflowScrolling: 'touch', padding: '14px 20px 0', paddingBottom: WALLET_TAB_CLEAR, boxSizing: 'border-box' }}
        onTouchStart={pull.onTouchStart}
        onTouchMove={pull.onTouchMove}
        onTouchEnd={pull.onTouchEnd}
      >
        <PullHint pull={pull.pull} busy={pull.busy} />
        <div style={{ borderRadius: 22, padding: '2px 12px 8px', ...sheetGlass }}>
          <div style={{ display: 'flex', alignItems: 'center', minHeight: 44 }}>
            <span style={{ fontSize: 16, fontWeight: 700 }}>Tokens</span>
          </div>
          <CardLoad extra={pull.busy} kind="rows" n={4}>
          {rows.length === 0 ? (
            <p style={{ margin: '0 0 12px', fontSize: 13, color: '#8c8f99' }}>No tokens in this wallet yet.</p>
          ) : rows.map((token) => (
            <div key={token.name} style={{ ...compactTokenRow, cursor: 'default' }}>
              <TokenIcon kind={token.icon} />
              <span style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
                <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                  <span style={{ fontSize: 16, fontWeight: 600 }}>{token.name}</span>
                  <span style={{ fontSize: 13, fontWeight: 500, color: '#8c8f99', textAlign: 'right' }}>Arxon Testnet</span>
                </span>
                <span style={{ fontSize: 13, color: '#8c8f99' }}>{hidden ? '••••' : cleanTokAmount(token)}</span>
              </span>
            </div>
          ))}
          </CardLoad>
        </div>
        <div aria-hidden style={{ height: 28 }} />
      </div>
      <WalletTabs
        active="Testnet"
        onSelect={(tab: WalletTabName) => {
          pickWalletTab('testnet', tab, go, {
            home: 'home-funded',
            vault: 'testnet',
            history: 'activity',
          });
        }}
      />
    </div>
  );
}

function CopyMark() {
  return (
    <svg width={16} height={16} viewBox="0 0 16 16" fill="none" aria-hidden>
      <rect x="5.2" y="2.4" width="8" height="8" rx="1.8" stroke="#3a4254" strokeWidth="1.5" />
      <rect x="2.4" y="5.2" width="8" height="8" rx="1.8" stroke="#3a4254" strokeWidth="1.5" fill="#f4f7ff" />
    </svg>
  );
}

function NotchedPill({ label, onClick, light, children }: { label: string; onClick: () => void; light?: boolean; children: ReactNode }) {
  return (
    <button type="button" aria-label={label} onClick={onClick} style={notchedWrap}>
      <span aria-hidden style={light ? notchedFillLight : notchedFill} />
      <span style={{ ...notchedIcon, color: '#fff', filter: 'brightness(0) invert(1)' }}>{children}</span>
      <span style={light ? notchedLabelLight : notchedLabel}>{label}</span>
    </button>
  );
}

function UnshieldMark() {
  return (
    <svg width={14} height={14} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M16.2 11.2V7.2A4 4 0 0 0 8.6 6.2" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" />
      <rect x="5.2" y="11.1" width="13.6" height="9.2" rx="2.2" stroke="#fff" strokeWidth="1.8" />
      <path d="M12 14.2v2.2" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function FaucetMark() {
  return (
    <svg width={14} height={14} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M12 3.2c2.8 4 5.4 7.2 5.4 10.4a5.4 5.4 0 1 1-10.8 0C6.6 10.4 9.2 7.2 12 3.2Z" stroke="#fff" strokeWidth="1.8" strokeLinejoin="round" />
    </svg>
  );
}

function todayStats(day: string, tone: Tok['tone'], total: string, hidden: boolean) {
  const color = tone === 'up' ? '#3ddb85' : tone === 'down' ? '#f25252' : '#8c8f99';
  if (hidden) return { pct: '••••', sub: '••••', color: '#5c5f64' };
  const match = day.match(/([+-]?\d+(?:\.\d+)?)%/);
  if (!match) return { pct: '0.00%', sub: day, color };
  const pctN = Number(match[1]);
  const pct = `${pctN > 0 ? '+' : ''}${pctN.toFixed(2)}%`;
  const totalN = parseMoney(total);
  if (totalN == null || !Number.isFinite(pctN)) return { pct, sub: day.replace(/ Today$/, ''), color };
  if (totalN === 0 || pctN === 0) return { pct, sub: formatDelta(total, 0), color };
  return { pct, sub: formatDelta(total, totalN * pctN / (100 + pctN)), color };
}

function parseMoney(text: string) {
  const compact = text.replace(/[^\d,.-]/g, '');
  if (!compact) return null;
  const lastComma = compact.lastIndexOf(',');
  const lastDot = compact.lastIndexOf('.');
  const normalized = lastComma > lastDot
    ? compact.replace(/\./g, '').replace(',', '.')
    : compact.replace(/,/g, '');
  const n = Number(normalized);
  return Number.isFinite(n) ? n : null;
}

function formatDelta(totalText: string, delta: number) {
  const abs = Math.abs(delta).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const replaced = totalText.replace(/-?[\d,]+(?:\.\d+)?/, abs);
  const body = replaced.replace(/^[-+]/, '');
  if (delta > 0) return `+${body}`;
  if (delta < 0) return `-${body}`;
  return body;
}

function splitTotal(total: string) {
  const sign = /€|EUR/.test(total) ? '€'
    : /£|GBP/.test(total) ? '£'
    : /₦|NGN/.test(total) ? '₦'
    : /ZAR/.test(total) ? 'R'
    : '$';
  const amount = total.replace(/[^\d,.-]/g, '');
  return { amount: amount || total, sign };
}

function LiveAvatar({ photo, accountIndex, onOpen }: { photo: string | null; accountIndex: number; onOpen: () => void }) {
  if (photo) return <ProfileAvatar size={42} photo={photo} accountIndex={accountIndex} onOpen={onOpen} />;
  return (
    <button type="button" aria-label="Accounts" onClick={onOpen} style={{ width: 42, height: 42, borderRadius: 21, padding: 0, margin: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0, color: '#fff', ...headerGlass }}>
      <PersonMark />
    </button>
  );
}

function PersonMark() {
  return (
    <svg width={20} height={20} viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="8.6" r="3.5" stroke="#eef3ff" strokeWidth="1.8" />
      <path d="M5.8 18.6c.9-3.4 3.2-5.1 6.2-5.1s5.3 1.7 6.2 5.1" stroke="#eef3ff" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function HeaderPill({ label, onClick, round, square, children }: { label: string; onClick: () => void; round?: boolean; square?: boolean; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      style={{
        width: 32,
        height: 32,
        borderRadius: round ? 16 : square ? 8 : 10,
        border: 'none',
        background: 'transparent',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        padding: 0,
        flexShrink: 0,
      }}
    >
      {children}
    </button>
  );
}

function ClusterAction({ label, onClick, accent, lit, children }: { label: string; onClick: () => void; accent?: boolean; lit?: boolean; children: ReactNode }) {
  return (
    <button type="button" onClick={onClick} style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, border: 'none', background: 'none', color: '#fff', padding: 0, cursor: 'pointer', fontFamily: font.sans }}>
      <span style={accent ? (lit ? actionAccentLit : actionAccent) : lit ? actionGlassCircleLit : actionGlassCircle}>
        {accent ? <span style={{ display: 'flex', filter: 'brightness(0)' }}>{children}</span> : children}
      </span>
      <span style={{ fontSize: 12, fontWeight: 400, lineHeight: 1.15, textAlign: 'center', width: '100%', color: 'rgba(255,255,255,0.92)' }}>{label}</span>
    </button>
  );
}

function PlusMark() {
  return (
    <svg width={20} height={20} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M12 5v14M5 12h14" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function DownloadMark() {
  return (
    <svg width={20} height={20} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M12 4v11M8 11l4 4 4-4" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M6 18.5h12" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function PromoPager({ go }: { go: Go }) {
  const [page, setPage] = useState(0);
  return (
    <div style={{ marginTop: 10, width: '100%', boxSizing: 'border-box' }}>
      <div
        className="home-cards"
        onScroll={(event) => {
          const el = event.currentTarget;
          const width = el.clientWidth || 1;
          setPage(Math.round(el.scrollLeft / width));
        }}
        style={{
          display: 'flex',
          width: '100%',
          overflowX: 'auto',
          overflowY: 'visible',
          scrollSnapType: 'x mandatory',
          WebkitOverflowScrolling: 'touch',
          touchAction: 'pan-x',
          gap: 0,
        }}
      >
        {CARDS.map((card) => (
          <div
            key={card.title}
            style={{
              flex: '0 0 100%',
              width: '100%',
              minWidth: '100%',
              maxWidth: '100%',
              scrollSnapAlign: 'start',
              scrollSnapStop: 'always',
              boxSizing: 'border-box',
              padding: 2,
            }}
          >
            <button
              type="button"
              onClick={() => go(card.to)}
              style={{
                width: '100%',
                minHeight: 64,
                borderRadius: 20,
                padding: '14px 18px',
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                textAlign: 'left',
                cursor: 'pointer',
                color: '#fff',
                fontFamily: font.sans,
                boxSizing: 'border-box',
                overflow: 'visible',
                ...promoGlass,
              }}
            >
              <span style={{ width: 40, height: 40, borderRadius: 12, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', ...promoChip }}>
                {card.kind === 'fund'
                  ? <FigmaImg src={art('plus.svg')} width={18} height={18} />
                  : <FigmaImg src={art('shield.svg')} width={18} height={18} />}
              </span>
              <span style={{ minWidth: 0, flex: 1 }}>
                <span style={{ display: 'block', fontSize: 15, fontWeight: 700 }}>{card.title}</span>
                <span style={{ display: 'block', marginTop: 3, fontSize: 12, color: 'rgba(208,211,216,0.86)', lineHeight: 1.35 }}>{card.body}</span>
              </span>
            </button>
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginTop: 8 }}>
        {CARDS.map((card, index) => (
          <span key={card.title} style={{ width: index === page ? 14 : 6, height: 6, borderRadius: 3, background: index === page ? '#accafe' : 'rgba(255,255,255,0.22)' }} />
        ))}
      </div>
    </div>
  );
}

function CircleBtn({ label, onClick, children }: { label: string; onClick: () => void; children: ReactNode }) {
  const size = 40;
  return (
    <button type="button" aria-label={label} onClick={onClick} style={{ width: size, height: size, borderRadius: size / 2, border: 'none', background: '#1c2025', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', padding: 0 }}>
      {children}
    </button>
  );
}

function Action({ label, onClick, children }: { label: string; onClick: () => void; children: ReactNode }) {
  const compact = !!useLiveFrame()?.app;
  return (
    <button type="button" onClick={onClick} style={{ ...actionBtn, gap: compact ? 6 : 8 }}>
      <span style={{ ...circle, width: compact ? 50 : 58, height: compact ? 50 : 58, borderRadius: compact ? 25 : 29 }}>{children}</span>
      <span style={{ ...actionLabel, fontSize: compact ? 11 : 12 }}>{label}</span>
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

function StartCard({ kind, title, body, onClick }: { kind: 'fund' | 'mine'; title: string; body: string; onClick: () => void }) {
  const compact = !!useLiveFrame()?.app;
  const size = compact ? 136 : 172;
  const cardStyle: CSSProperties = { ...mineCardBtn, width: size, height: size };
  const artSrc = kind === 'mine' ? art('mine-arxp.jpg') : art('fund-wallet.png');
  const position = kind === 'mine' ? 'center' : 'center 32%';
  return (
    <button type="button" onClick={onClick} style={cardStyle}>
      <img
        src={artSrc}
        alt=""
        style={{ position: 'absolute', left: 0, top: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: position }}
      />
      <span style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(5,5,5,0.08) 35%, rgba(5,5,5,0.82) 100%)' }} />
      <span style={{ position: 'relative', zIndex: 1, padding: compact ? 10 : 12, display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 3, width: '100%', boxSizing: 'border-box' }}>
        <span style={{ fontSize: compact ? 13 : 14, fontWeight: 600, textAlign: 'left' }}>{title}</span>
        <span style={{ fontSize: compact ? 11 : 12, fontWeight: 400, color: '#d0d3d8', textAlign: 'left', lineHeight: 1.3 }}>{body}</span>
      </span>
    </button>
  );
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
    return <img src="/wallet-figma/welcome/sol.png" alt="" width={40} height={40} style={{ borderRadius: 20, objectFit: 'cover', flexShrink: 0 }} />;
  }
  if (kind === 'usdt') return <img src={art('usdt.png')} alt="" width={40} height={40} style={{ borderRadius: 20, objectFit: 'cover' }} />;
  return (
    <span style={{ width: 40, height: 40, borderRadius: 20, background: '#2775ca', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
      <FigmaImg src={art('usdc.svg')} width={11.7857} height={22} />
    </span>
  );
}

const plain: CSSProperties = { display: 'flex', alignItems: 'center', gap: 10, border: 'none', background: 'none', color: '#fff', padding: 0, cursor: 'pointer', fontFamily: font.sans };
const iconBtn: CSSProperties = { width: 40, height: 40, margin: -9, padding: 0, border: 'none', background: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' };
function subTab(on: boolean): CSSProperties {
  return {
    height: 32,
    minWidth: 64,
    padding: '0 12px',
    border: 'none',
    borderRadius: 15,
    background: on ? '#accafe' : 'transparent',
    color: on ? '#0c1018' : '#8c8f99',
    fontFamily: font.sans,
    fontSize: 12,
    fontWeight: 600,
    cursor: on ? 'default' : 'pointer',
  };
}
const ctaCard: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'flex-start',
  gap: 8,
  padding: 16,
  border: 'none',
  borderRadius: 16,
  background: '#1c2025',
  color: '#fff',
  fontFamily: font.sans,
  cursor: 'pointer',
  textAlign: 'left',
};
const ghostBtn: CSSProperties = {
  height: 48,
  border: '1px solid #2a3447',
  borderRadius: 12,
  background: 'transparent',
  color: '#accafe',
  fontFamily: font.sans,
  fontSize: 15,
  fontWeight: 600,
  cursor: 'pointer',
};
const notchedWrap: CSSProperties = {
  flex: 1,
  minWidth: 0,
  position: 'relative',
  border: 'none',
  background: 'none',
  padding: `${NOTCH_R}px 0 0`,
  cursor: 'pointer',
  fontFamily: font.sans,
  color: '#fff',
};
const notchedMask: CSSProperties = {
  WebkitMaskImage: notchMask,
  maskImage: notchMask,
  WebkitMaskRepeat: 'no-repeat',
  maskRepeat: 'no-repeat',
  WebkitMaskSize: '100% 100%',
  maskSize: '100% 100%',
};
const notchedFill: CSSProperties = {
  display: 'block',
  height: PILL_H,
  borderRadius: 16,
  background: 'transparent',
  boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.34)',
  ...notchedMask,
};
const notchedFillLight: CSSProperties = {
  display: 'block',
  height: PILL_H,
  borderRadius: 16,
  background: '#fff',
  ...notchedMask,
};
const notchedIcon: CSSProperties = {
  position: 'absolute',
  left: '50%',
  top: 0,
  width: NOTCH_R * 2,
  height: NOTCH_R * 2,
  transform: 'translateX(-50%)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  pointerEvents: 'none',
  color: '#accafe',
};
const notchedLabel: CSSProperties = {
  position: 'absolute',
  left: 0,
  right: 0,
  top: NOTCH_R,
  height: PILL_H,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: 10,
  fontWeight: 600,
  letterSpacing: 0.04,
  color: '#fff',
  textAlign: 'center',
  lineHeight: 1.1,
  pointerEvents: 'none',
  whiteSpace: 'nowrap',
};
const notchedLabelLight: CSSProperties = {
  ...notchedLabel,
  color: '#0c1018',
};
const slimRow: CSSProperties = {
  display: 'flex',
  gap: 8,
  width: 280,
  maxWidth: '100%',
  marginLeft: 'auto',
  marginRight: 'auto',
};
const actionRow: CSSProperties = {
  display: 'flex',
  gap: 6,
  width: '100%',
};
const walletHero: CSSProperties = {
  width: '100%',
  minHeight: 148,
  borderRadius: 24,
  padding: '16px 16px 18px',
  boxSizing: 'border-box',
  background: 'radial-gradient(120% 90% at 88% 0%, rgba(172,202,254,0.95) 0%, rgba(232,240,255,0.7) 38%, #ffffff 72%), linear-gradient(180deg, #ffffff 0%, #eef3ff 100%)',
  boxShadow: '0 10px 28px rgba(0,0,0,0.18)',
};
const walletHeroCopy: CSSProperties = {
  minWidth: 36,
  height: 28,
  padding: '0 8px',
  border: 'none',
  borderRadius: 8,
  background: 'transparent',
  color: '#3a4254',
  fontFamily: font.sans,
  fontSize: 11,
  fontWeight: 700,
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
};
const walletBanner: CSSProperties = {
  minWidth: 0,
  width: '100%',
  padding: 4,
  borderRadius: 18,
  display: 'flex',
  flexDirection: 'column',
  gap: 4,
  cursor: 'pointer',
  color: '#fff',
  fontFamily: font.sans,
  boxSizing: 'border-box',
  background: '#07080c',
  textAlign: 'left',
};
const walletBannerStrokePublic: CSSProperties = {
  border: '1px solid rgba(172,202,254,0.55)',
};
const walletBannerStrokeShielded: CSSProperties = {
  border: '1px solid rgba(180,160,255,0.55)',
};
const walletBannerHead: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 6,
  height: 22,
  flexShrink: 0,
  padding: '0 4px 0 8px',
};
const walletBannerTitle: CSSProperties = {
  flex: 1,
  minWidth: 0,
  fontSize: 11,
  fontWeight: 600,
  letterSpacing: -0.15,
  color: 'rgba(255,255,255,0.92)',
  lineHeight: '22px',
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
};
const walletViewPublic: CSSProperties = {
  flexShrink: 0,
  height: 22,
  padding: '0 8px',
  borderRadius: 11,
  background: '#3d6dff',
  color: '#fff',
  fontSize: 9,
  fontWeight: 600,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  whiteSpace: 'nowrap',
};
const walletViewShielded: CSSProperties = {
  ...walletViewPublic,
  background: '#6b4dff',
};
const walletPanelBase: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  flex: 1,
  minHeight: 96,
  borderRadius: 14,
  padding: '12px 8px 10px',
  boxSizing: 'border-box',
  position: 'relative',
  overflow: 'hidden',
};
const walletPanelPublic: CSSProperties = {
  ...walletPanelBase,
  background: 'radial-gradient(120% 90% at 8% 108%, #7eb6ff 0%, transparent 46%), radial-gradient(90% 80% at 94% 6%, #2f6dff 0%, transparent 52%), radial-gradient(70% 70% at 72% 84%, #1a3dff 0%, transparent 55%), linear-gradient(160deg, #4d8cff 0%, #1e4bff 38%, #1636c9 68%, #0c1f8a 100%)',
};
const walletPanelShielded: CSSProperties = {
  ...walletPanelBase,
  background: 'radial-gradient(120% 90% at 8% 108%, #c4b4ff 0%, transparent 46%), radial-gradient(90% 80% at 94% 6%, #6a4dff 0%, transparent 52%), radial-gradient(70% 70% at 72% 84%, #3d1aad 0%, transparent 55%), linear-gradient(160deg, #8a6cff 0%, #4a2edc 38%, #2a1688 68%, #14084a 100%)',
};
const walletBannerAmtRow: CSSProperties = {
  display: 'flex',
  alignItems: 'baseline',
  justifyContent: 'center',
  gap: 6,
  minWidth: 0,
};
const walletBannerAmt: CSSProperties = {
  fontSize: 22,
  fontWeight: 500,
  letterSpacing: -0.5,
  lineHeight: 1,
  color: '#fff',
};
const walletBannerUnit: CSSProperties = {
  fontSize: 10,
  fontWeight: 400,
  color: 'rgba(255,255,255,0.72)',
  letterSpacing: 0.2,
  lineHeight: 1,
  transform: 'translateY(1px)',
};
const walletBannerCaption: CSSProperties = {
  marginTop: 6,
  fontSize: 10,
  fontWeight: 400,
  color: 'rgba(255,255,255,0.72)',
  letterSpacing: 0.2,
};
const sheetAction: CSSProperties = {
  width: '100%',
  height: 48,
  borderRadius: 12,
  fontFamily: font.sans,
  fontSize: 16,
  fontWeight: 600,
  cursor: 'pointer',
};
const actionBtn: CSSProperties = { flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, border: 'none', background: 'none', color: '#fff', padding: 0, cursor: 'pointer', fontFamily: font.sans };
const actionLabel: CSSProperties = { fontSize: 12, fontWeight: 400, lineHeight: 1.15, textAlign: 'center', width: '100%' };
const circle: CSSProperties = { width: 58, height: 58, borderRadius: 29, background: '#1c2025', display: 'flex', alignItems: 'center', justifyContent: 'center' };
const mineCardBtn: CSSProperties = { width: 172, height: 172, flexShrink: 0, borderRadius: 16, background: '#0b1118', border: 'none', color: '#fff', padding: 0, display: 'flex', flexDirection: 'column', alignItems: 'flex-start', justifyContent: 'flex-end', cursor: 'pointer', fontFamily: font.sans, boxSizing: 'border-box', position: 'relative', overflow: 'hidden' };
const tokenRow: CSSProperties = { width: '100%', height: 64, display: 'flex', alignItems: 'center', gap: 12, border: 'none', background: 'none', color: '#fff', padding: 0, cursor: 'pointer', fontFamily: font.sans };
const compactTokenRow: CSSProperties = { ...tokenRow, height: 52, minHeight: 52 };
const headerGlass: CSSProperties = {
  border: '1px solid rgba(255,255,255,0.14)',
  background: 'rgba(8,10,16,0.72)',
  backdropFilter: 'blur(20px)',
  WebkitBackdropFilter: 'blur(20px)',
  boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.16)',
};
const todayGlass: CSSProperties = {
  border: '1px solid #1e2232',
  background: '#171b2b',
};
const testnetStrip: CSSProperties = {
  border: '1px solid #252a32',
  background: '#14181d',
};
const actionGlass: CSSProperties = {
  border: '1px solid #2f3343',
  background: '#1a1e30',
};
const actionAccent: CSSProperties = {
  width: 52,
  height: 52,
  borderRadius: 26,
  background: '#9fb8f4',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
};
const actionGlassCircle: CSSProperties = {
  width: 52,
  height: 52,
  borderRadius: 26,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  border: '1px solid rgba(255,255,255,0.10)',
  background: '#2e3141',
};
const actionAccentLit: CSSProperties = {
  width: 52,
  height: 52,
  borderRadius: 26,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: 'radial-gradient(circle at 32% 28%, #e8efff 0%, #accafe 42%, #7a9ef0 100%)',
  boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.55), 0 4px 14px rgba(61,109,255,0.32)',
};
const actionGlassCircleLit: CSSProperties = {
  width: 52,
  height: 52,
  borderRadius: 26,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  border: '1px solid rgba(172,202,254,0.32)',
  background: 'radial-gradient(circle at 34% 28%, rgba(172,202,254,0.34) 0%, rgba(32,42,68,0.92) 58%)',
  boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.22), 0 0 12px rgba(61,109,255,0.2)',
};
const promoGlass: CSSProperties = {
  border: '1px solid rgba(61,109,255,0.28)',
  background: 'linear-gradient(105deg, rgba(61,109,255,0.28) 0%, rgba(12,16,24,0.78) 100%)',
  backdropFilter: 'blur(20px)',
  WebkitBackdropFilter: 'blur(20px)',
  boxShadow: 'inset 0 1px 0 rgba(172,202,254,0.18)',
};
const promoChip: CSSProperties = {
  border: '1px solid rgba(255,255,255,0.12)',
  background: 'rgba(8,12,20,0.45)',
  backdropFilter: 'blur(12px)',
  WebkitBackdropFilter: 'blur(12px)',
};
