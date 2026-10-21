import { useAppHidesFigmaChrome } from './appChrome';
import { useState, type CSSProperties } from 'react';
import { FigmaImg } from '@/walletFigma/icons';
import { font } from '@/walletFigma/tokens';
import { hasClaimed } from './ClaimScreens';
import { tabTarget, vaultEntry } from './VaultScreens';
import { pickWalletTab, useWalletNetwork, WalletTabs } from './WalletTabs';

const art = (name: string) => `/wallet-figma/explore/${name}`;
const SCREENS = new Set(['explore', 'dapps', 'arxswap']);
type Go = (id: string, remember?: boolean) => void;
type App = { name: string; letter: string; category: string; line: string; blurb: string; detail?: boolean };

const APPS: App[] = [
  { name: 'Arxswap', letter: 'S', category: 'Trade', line: 'Trade · app.arxswap.io', blurb: 'Swap and trade', detail: true },
  { name: 'Arxlend', letter: 'L', category: 'Lend', line: 'Lend · app.arxlend.io', blurb: 'Lend and borrow' },
  { name: 'Arxmarket', letter: 'M', category: 'Market', line: 'Market · app.arxmarket.io', blurb: 'Buy and sell' },
  { name: 'Arxbridge', letter: 'B', category: 'Trade', line: 'Trade · app.arxbridge.io', blurb: 'Bridge tokens' },
];
const CHIPS = ['All', 'Trade', 'Lend', 'Market'];

export function isExploreScreen(id: string) {
  return SCREENS.has(id);
}

export function ExploreScreens({ id, go, back }: { id: string; go: Go; back?: () => void }) {
  const [chip, setChip] = useState('All');
  const leave = (fallback: string) => (back ? back() : go(fallback, false));
  const open = (app: App) => go(app.detail ? 'arxswap' : 'dapp');
  return (
    <div style={{ position: 'relative', width: 390, height: 844, background: '#050505', overflow: 'hidden', fontFamily: font.sans, color: '#fff' }}>
      <style>{`.dapp-row{overflow-x:auto;overflow-y:hidden;scrollbar-width:none;-ms-overflow-style:none}.dapp-row::-webkit-scrollbar{display:none;width:0;height:0}`}</style>
      {id === 'explore' && <Explore go={go} />}
      {id === 'dapps' && <Dapps chip={chip} setChip={setChip} onBack={() => leave('explore')} open={open} />}
      {id === 'arxswap' && <Detail onBack={() => leave('dapps')} onConnect={() => go('dapp')} />}
    </div>
  );
}

function Explore({ go }: { go: Go }) {
  const tools: [string, string, string, string][] = [
    ['claim.svg', 'Claim ARX', 'Claim your ARX-P allocation', 'claim'],
    ['buy.svg', 'Buy', 'Buy crypto with a card', 'buy'],
    ['codes.svg', 'Disclosure codes', 'Prove a private payment on request', 'code-log'],
    ['apps.svg', 'Connected apps', 'Apps that can access your wallet', 'connected'],
  ];
  const net = useWalletNetwork();
  const rows = tools.filter((row) => (row[3] !== 'claim' || !hasClaimed()) && (row[3] !== 'code-log' || net === 'testnet'));
  return (
    <>
      <PhoneStatus />
      <p style={{ position: 'absolute', left: 18, top: 64, margin: 0, fontSize: 26, fontWeight: 700 }}>Explore</p>
      <p style={{ position: 'absolute', left: 18, top: 106, margin: 0, fontSize: 13, color: '#8c8f99' }}>Tools and apps for your wallet</p>
      <button type="button" onClick={() => go('mine-entry')} style={{ position: 'absolute', left: 18, top: 140, width: 354, height: 84, border: 'none', borderRadius: 16, background: '#1c2126', color: '#fff', fontFamily: font.sans, textAlign: 'left', cursor: 'pointer', padding: 0 }}>
        <span style={{ position: 'absolute', left: 18, top: 22, width: 40, height: 40, borderRadius: 20, background: 'rgba(172,202,254,0.16)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <FigmaImg src={art('bolt.svg')} width={20} height={20} />
        </span>
        <span style={{ position: 'absolute', left: 70, top: 21, fontSize: 15, fontWeight: 600 }}>Arxon Mining</span>
        <span style={{ position: 'absolute', left: 70, top: 43, fontSize: 12.5, color: '#8c8f99' }}>Mine ARX in your wallet</span>
        <span style={{ position: 'absolute', left: 255, top: 29, width: 81, height: 26, borderRadius: 13, background: 'rgba(172,202,254,0.16)', color: '#accafe', fontSize: 12, fontWeight: 500, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Extension</span>
      </button>
      <p style={section}>DAPPS</p>
      <button type="button" onClick={() => go('dapps')} style={{ position: 'absolute', left: 330, top: 244, border: 'none', background: 'none', color: '#accafe', fontFamily: font.sans, fontSize: 12, fontWeight: 500, cursor: 'pointer', padding: 0 }}>See all</button>
      <div className="dapp-row" style={{ position: 'absolute', left: 0, top: 268, width: 390, height: 120 }}>
        <div style={{ display: 'flex', gap: 12, padding: '0 18px', width: 'max-content' }}>
          {APPS.slice(0, 3).map((app) => (
            <button key={app.name} type="button" onClick={() => go(app.detail ? 'arxswap' : 'dapp')} style={dappCard}>
              <span style={avatar}><span style={{ color: '#accafe', fontSize: 18, fontWeight: 700 }}>{app.letter}</span></span>
              <span style={{ display: 'block', marginTop: 12, fontSize: 15, fontWeight: 600 }}>{app.name}</span>
              <span style={{ display: 'block', marginTop: 2, fontSize: 12.5, color: '#8c8f99' }}>{app.blurb}</span>
            </button>
          ))}
        </div>
      </div>
      <p style={{ ...section, top: 412 }}>WALLET TOOLS</p>
      <div style={{ position: 'absolute', left: 18, top: 434, width: 354, background: '#1c2126', borderRadius: 16, overflow: 'hidden' }}>
        {rows.map(([icon, title, sub, target], index) => (
          <button key={title} type="button" onClick={() => go(target)} style={{ position: 'relative', width: '100%', height: 64, border: 'none', background: 'none', color: '#fff', fontFamily: font.sans, textAlign: 'left', cursor: 'pointer', padding: 0 }}>
            {index > 0 && <span style={{ position: 'absolute', left: 66, top: 0, width: 288, height: 1, background: '#29333d' }} />}
            <span style={{ position: 'absolute', left: 14, top: 12, width: 40, height: 40, borderRadius: 20, background: '#293342', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <FigmaImg src={art(icon)} width={20} height={20} />
            </span>
            <span style={{ position: 'absolute', left: 66, top: 13, fontSize: 15, fontWeight: 600 }}>{title}</span>
            <span style={{ position: 'absolute', left: 66, top: 34, fontSize: 12.5, color: '#8c8f99' }}>{sub}</span>
            <span style={{ position: 'absolute', left: 320, top: 22 }}><FigmaImg src={art('chev.svg')} width={20} height={20} /></span>
          </button>
        ))}
      </div>
      <Tabs go={go} />
    </>
  );
}

function Dapps({ chip, setChip, onBack, open }: { chip: string; setChip: (v: string) => void; onBack: () => void; open: (app: App) => void }) {
  const rows = APPS.filter((app) => chip === 'All' || app.category === chip);
  return (
    <>
      <NoteStatus />
      <Back onClick={onBack} />
      <p style={headline}>dApps</p>
      <p style={lead}>Apps you can connect to your wallet.</p>
      <div className="dapp-row" style={{ position: 'absolute', left: 18, top: 190, display: 'flex', gap: 10, maxWidth: 354, overflowX: 'auto' }}>
        {CHIPS.map((label) => (
          <button key={label} type="button" onClick={() => setChip(label)} style={{ height: 36, padding: '0 18px', borderRadius: 18, border: 'none', background: chip === label ? '#accafe' : '#1c2025', color: chip === label ? '#0c1018' : '#8b9097', fontFamily: font.sans, fontSize: 14, fontWeight: 500, cursor: 'pointer' }}>{label}</button>
        ))}
      </div>
      <div style={{ position: 'absolute', left: 18, top: 246, width: 354, background: '#1c2025', border: '1px solid #2a3447', borderRadius: 14, overflow: 'hidden' }}>
        {rows.map((app, index) => (
          <button key={app.name} type="button" onClick={() => open(app)} style={{ position: 'relative', width: '100%', height: 72, border: 'none', background: 'none', color: '#fff', fontFamily: font.sans, textAlign: 'left', cursor: 'pointer', padding: 0 }}>
            {index > 0 && <span style={{ position: 'absolute', left: 16, top: 0, width: 320, height: 1, background: '#2a3447' }} />}
            <span style={{ position: 'absolute', left: 16, top: 16, width: 40, height: 40, borderRadius: 20, background: 'rgba(172,202,254,0.16)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#accafe', fontSize: 16, fontWeight: 700 }}>{app.letter}</span>
            <span style={{ position: 'absolute', left: 68, top: 16, fontSize: 15, fontWeight: 600 }}>{app.name}</span>
            <span style={{ position: 'absolute', left: 68, top: 38, fontSize: 13, color: '#8b9097' }}>{app.line}</span>
            <span style={{ position: 'absolute', right: 16, top: 26, color: '#accafe', fontSize: 14, fontWeight: 600 }}>Connect</span>
          </button>
        ))}
      </div>
      <p style={{ position: 'absolute', left: 18, top: 556, width: 354, boxSizing: 'border-box', margin: 0, background: '#11161f', border: '1px solid #2a3447', borderRadius: 14, padding: '15px 17px', color: '#8b9097', fontSize: 13, lineHeight: 1.35 }}>You decide what each app can see. Every request asks for your approval.</p>
    </>
  );
}

function Detail({ onBack, onConnect }: { onBack: () => void; onConnect: () => void }) {
  const rows = [
    ['See your public address', '/wallet-figma/home/eye.svg', 22],
    ['Ask you to approve transactions', '/wallet-figma/buy/check.svg', 20],
    ['Balances stay hidden in Private mode', '/wallet-figma/privacy/shield.svg', 22],
  ] as const;
  return (
    <>
      <NoteStatus />
      <Back onClick={onBack} />
      <span style={{ position: 'absolute', left: 24, top: 112, width: 64, height: 64, borderRadius: 32, background: 'rgba(172,202,254,0.16)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#accafe', fontSize: 26, fontWeight: 700 }}>S</span>
      <p style={{ position: 'absolute', left: 24, top: 192, margin: 0, fontSize: 26, fontWeight: 700 }}>Arxswap</p>
      <p style={{ position: 'absolute', left: 24, top: 232, margin: 0, fontSize: 14, color: '#8b9097' }}>app.arxswap.io</p>
      <span style={{ position: 'absolute', left: 24, top: 262, height: 26, padding: '0 12px', borderRadius: 13, background: 'rgba(172,202,254,0.16)', color: '#accafe', fontSize: 12, fontWeight: 500, display: 'flex', alignItems: 'center' }}>Trade</span>
      <p style={{ position: 'absolute', left: 24, top: 308, width: 342, margin: 0, fontSize: 15, lineHeight: 1.4 }}>Swap tokens from inside the app. When you connect, it can see your public address and ask you to approve transactions.</p>
      <p style={{ position: 'absolute', left: 22, top: 392, margin: 0, fontSize: 12, fontWeight: 600, color: '#5c5f64' }}>WHEN YOU CONNECT</p>
      <div style={{ position: 'absolute', left: 18, top: 416, width: 354, background: '#1c2025', borderRadius: 16 }}>
        {rows.map(([label, icon, size], index) => (
          <div key={label} style={{ position: 'relative', height: 56, display: 'flex', alignItems: 'center', gap: 16, padding: '0 18px' }}>
            {index > 0 && <span style={{ position: 'absolute', left: 18, top: 0, width: 318, height: 1, background: '#29333d' }} />}
            <FigmaImg src={icon} width={size} height={size} />
            <span style={{ fontSize: 14 }}>{label}</span>
          </div>
        ))}
      </div>
      <p style={{ position: 'absolute', left: 18, top: 604, width: 354, boxSizing: 'border-box', margin: 0, background: '#11161f', border: '1px solid #2a3447', borderRadius: 14, padding: '15px 17px', color: '#8b9097', fontSize: 13, lineHeight: 1.35 }}>Only connect to apps you trust. You can disconnect any time in Connected apps.</p>
      <button type="button" onClick={onConnect} style={{ position: 'absolute', left: 18, top: 727, width: 354, height: 55, border: 'none', borderRadius: 8, background: '#accafe', color: '#0c1018', fontFamily: font.sans, fontSize: 16, fontWeight: 600, cursor: 'pointer' }}>Connect</button>
    </>
  );
}

function Tabs({ go }: { go: Go }) {
  const net = useWalletNetwork();
  return (
    <WalletTabs
      active="Explore"
      onSelect={(tab) => {
        if (tab === 'Explore') return;
        pickWalletTab(net, tab, go, {
          home: tabTarget('home'),
          vault: net === 'testnet' ? vaultEntry('vault-empty') : tabTarget('vault'),
          history: tabTarget('history'),
        });
      }}
    />
  );
}

function Back({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" aria-label="Back" onClick={onClick} style={{ position: 'absolute', left: 18, top: 56, width: 40, height: 40, border: 'none', borderRadius: 20, background: '#1c2025', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', padding: 0 }}>
      <FigmaImg src="/wallet-figma/privacy/back.svg" width={20} height={20} />
    </button>
  );
}

function NoteStatus() {
  const hide = useAppHidesFigmaChrome();
  if (hide) return null;
  return (
    <>
      <span style={{ position: 'absolute', left: 28, top: 13, fontSize: 15, fontWeight: 600 }}>9:41</span>
      <img src="/wallet-figma/welcome/status.svg" alt="" width={66.6} height={11.33} style={{ position: 'absolute', left: 296, top: 17 }} />
    </>
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

const section: CSSProperties = { position: 'absolute', left: 22, top: 244, margin: 0, fontSize: 12, fontWeight: 600, color: '#5c5f64' };
const dappCard: CSSProperties = { width: 160, height: 120, flexShrink: 0, border: 'none', borderRadius: 16, background: '#1c2126', color: '#fff', fontFamily: font.sans, textAlign: 'left', cursor: 'pointer', padding: 14 };
const avatar: CSSProperties = { width: 44, height: 44, borderRadius: 22, background: 'rgba(172,202,254,0.16)', display: 'flex', alignItems: 'center', justifyContent: 'center' };
const headline: CSSProperties = { position: 'absolute', left: 24, top: 106, margin: 0, fontSize: 30, fontWeight: 700 };
const lead: CSSProperties = { position: 'absolute', left: 24, top: 152, margin: 0, width: 336, color: '#8b9097', fontSize: 15 };
