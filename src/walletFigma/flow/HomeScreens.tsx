import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { FigmaImg } from '@/walletFigma/icons';
import { START_URL } from '@/chainWallet/chain';
import { sessionStore } from '@/chainWallet/session';
import { rememberTabs, vaultEntry } from './VaultScreens';
import { pickWalletTab, WalletTabs, type WalletNet, type WalletTabName } from './WalletTabs';
import { useLiveFrame } from './liveFrame';
import { useAppHidesFigmaChrome } from './appChrome';
import { NetworkSheet } from './ReceiveScreens';
import { applyNetwork, listNetworks, selectedNetwork } from './homeNetworks';
import { font } from '@/walletFigma/tokens';
import { ProfileAvatar } from './ProfileAvatar';
import { useProfilePhoto } from './profilePhoto';
import { usePullRefresh } from './pullRefresh';
import { openExternal } from './openExternal';
import { HomeMarket } from './HomeMarket';
import { SwipeVault } from './SwipeConfirm';
import { TestnetHistory } from './TestnetHistory';

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

  const compact = !!live?.app;
  const y = compact
    ? { header: 86, bal: 148, act: 228, cards: 324, cardH: 136, tok: 476, list: 504 }
    : { header: 58, bal: 126, act: 236, cards: 340, cardH: 172, tok: 528, list: 567 };
  const pull = usePullRefresh(() => live?.refresh?.());

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
          <button type="button" aria-label="Select network" onClick={network.show} style={{ ...plain, minHeight: 40 }}>
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
        <span style={{ fontSize: compact ? 13 : 14, fontWeight: 400, color: hidden ? '#5c5f64' : day.color }}>{hidden ? '•••• Today' : day.text}</span>
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
        <HomeMarket go={go} />
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
    </div>
  );
}

function TestnetHome({ go }: { id: string; go: Go; back?: () => void; behind?: string }) {
  const live = useLiveFrame();
  const pull = usePullRefresh(() => live?.refresh?.());
  const hideChrome = useAppHidesFigmaChrome();
  const photo = useProfilePhoto(live?.accountIndex ?? 0);
  const network = useNetworkSheet('testnet', go);
  const [added, setAdded] = useState(() => sessionStore.testnetAdded());
  const [intro, setIntro] = useState(() => typeof localStorage === 'undefined' || localStorage.getItem(TESTNET_INTRO_KEY) !== '1');
  const on = live?.app ? live.testnetAdded : added;
  const hidden = live?.app ? live.hidden : false;
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
            <button type="button" aria-label="Select network" onClick={network.show} style={{ ...plain, minHeight: 40 }}>
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
          <span style={{ fontSize: 14, fontWeight: 500, color: '#accafe' }}>{on ? network.picked.name : 'Arxon Testnet'}</span>
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
            live?.setReceiveAsset('ARXt');
            go('receive');
          }}><FigmaImg src={art('receive.svg')} width={24} height={24} /></Action>
          <Action label="Swap" onClick={() => go(on ? 'swap' : 'add-network')}><FigmaImg src={art('swap.svg')} width={24} height={24} /></Action>
          <Action label="Shield in" onClick={() => openVaultFlow('shield-explain')}><FigmaImg src={art('shield.svg')} width={24} height={24} /></Action>
        </div>
        <div style={{ display: 'flex', gap: 8, marginBottom: on ? 16 : 24 }}>
          <SwipeVault label="Private pay" onOpen={() => openVaultFlow('vault')} />
          <SwipeVault label="Unshield" onOpen={() => openVaultFlow('vault')} />
        </div>

        {!on ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <button type="button" onClick={() => void addNetwork()} style={ctaCard}>
              <FigmaImg src={art('plus.svg')} width={18} height={18} />
              <span style={{ fontSize: 16, fontWeight: 700, textAlign: 'left' }}>Add Arxon Testnet</span>
              <span style={{ fontSize: 13, fontWeight: 400, color: '#8c8f99', textAlign: 'left', lineHeight: 1.4 }}>Chain 7171 · rpc-test.arxon.io. Tokens stay hidden until you add this network.</span>
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
            </div>
            <TestnetHistory go={go} />
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
      {intro ? <TestnetIntro onDone={dismissIntro} /> : null}
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

const DEMO_TESTNET: Tok[] = [
  { name: 'Arxon', amount: '0.00 ARXt', value: '$0.00', change: 'Arxon Testnet', tone: 'flat', icon: 'arx', to: 'token-arx', symbol: 'ARXt' },
  { name: 'Tether', amount: '0.00 USDTarx', value: '$0.00', change: 'Arxon Testnet', tone: 'flat', icon: 'usdt', to: 'token-usdt', symbol: 'USDTarx' },
  { name: 'USD Coin', amount: '0.00 USDCarx', value: '$0.00', change: 'Arxon Testnet', tone: 'flat', icon: 'usdc', to: 'token-usdc', symbol: 'USDCarx' },
];

function toneColor(tone: Tok['tone']) {
  if (tone === 'up') return '#3ddb85';
  if (tone === 'down') return '#f25252';
  return '#8c8f99';
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
const actionBtn: CSSProperties = { flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, border: 'none', background: 'none', color: '#fff', padding: 0, cursor: 'pointer', fontFamily: font.sans };
const actionLabel: CSSProperties = { fontSize: 12, fontWeight: 400, lineHeight: 1.15, textAlign: 'center', width: '100%' };
const circle: CSSProperties = { width: 58, height: 58, borderRadius: 29, background: '#1c2025', display: 'flex', alignItems: 'center', justifyContent: 'center' };
const mineCardBtn: CSSProperties = { width: 172, height: 172, flexShrink: 0, borderRadius: 16, background: '#0b1118', border: 'none', color: '#fff', padding: 0, display: 'flex', flexDirection: 'column', alignItems: 'flex-start', justifyContent: 'flex-end', cursor: 'pointer', fontFamily: font.sans, boxSizing: 'border-box', position: 'relative', overflow: 'hidden' };
const tokenRow: CSSProperties = { width: '100%', height: 64, display: 'flex', alignItems: 'center', gap: 12, border: 'none', background: 'none', color: '#fff', padding: 0, cursor: 'pointer', fontFamily: font.sans };
const compactTokenRow: CSSProperties = { ...tokenRow, height: 52, minHeight: 52 };
