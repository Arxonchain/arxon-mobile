import { useEffect, useRef, useState, type CSSProperties, type FormEvent, type ReactNode } from 'react';
import { FigmaImg } from '@/walletFigma/icons';
import { font } from '@/walletFigma/tokens';
import { SCAN_URL } from '@/chainWallet/chain';
import { tabTarget, vaultEntry } from './VaultScreens';
import { pickWalletTab, useWalletNetwork, WALLET_TAB_CLEAR, WalletTabs } from './WalletTabs';
import { useLiveFrame } from './liveFrame';
import { useAppHidesFigmaChrome } from './appChrome';
import { openExternal } from './openExternal';
import { hostOf, readBrowseHistory, recordBrowseVisit, toBrowseUrl } from './browseHistory';
import { usePullRefresh } from './pullRefresh';
import { subscribeInAppBrowse } from './inAppBrowse';

const art = (name: string) => `/wallet-figma/explore/${name}`;
const SCREENS = new Set(['explore', 'dapps', 'arxswap']);
type Go = (id: string, remember?: boolean) => void;
type Section = 'all' | 'browser' | 'dapps' | 'tools';

type Dapp = { name: string; url: string; category: string; chain: string; blurb: string; letter: string; color: string };

const DAPPS: Dapp[] = [
  { name: 'Uniswap', url: 'https://app.uniswap.org', category: 'Trade', chain: 'Ethereum', blurb: 'Swap on Ethereum', letter: 'U', color: '#ff007a' },
  { name: 'Jupiter', url: 'https://jup.ag', category: 'Trade', chain: 'Solana', blurb: 'Swap on Solana', letter: 'J', color: '#00d18c' },
  { name: '1inch', url: 'https://app.1inch.io', category: 'Trade', chain: 'Ethereum', blurb: 'Aggregator', letter: '1', color: '#94a6c4' },
  { name: 'Raydium', url: 'https://raydium.io/swap/', category: 'Trade', chain: 'Solana', blurb: 'Swap on Solana', letter: 'R', color: '#22d1ee' },
  { name: 'Aave', url: 'https://app.aave.com', category: 'Lend', chain: 'Ethereum', blurb: 'Lend and borrow', letter: 'A', color: '#b6509e' },
  { name: 'Lido', url: 'https://stake.lido.fi', category: 'Stake', chain: 'Ethereum', blurb: 'Stake ETH', letter: 'L', color: '#00a3ff' },
  { name: 'OpenSea', url: 'https://opensea.io', category: 'Market', chain: 'Ethereum', blurb: 'NFTs and markets', letter: 'O', color: '#2081e2' },
  { name: 'Magic Eden', url: 'https://magiceden.io', category: 'Market', chain: 'Solana', blurb: 'NFTs on Solana', letter: 'M', color: '#e42575' },
];

const EXPLORERS = [
  { name: 'Etherscan', url: 'https://etherscan.io', chain: 'Ethereum' },
  { name: 'Solscan', url: 'https://solscan.io', chain: 'Solana' },
  { name: 'Mempool', url: 'https://mempool.space', chain: 'Bitcoin' },
  { name: 'Arxon Scan', url: SCAN_URL, chain: 'Arxon Testnet' },
];

const TABS: { id: Section; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'browser', label: 'Browser' },
  { id: 'dapps', label: 'dApps' },
  { id: 'tools', label: 'Tools' },
];

export function isExploreScreen(id: string) {
  return SCREENS.has(id);
}

async function openSite(title: string, url: string) {
  recordBrowseVisit(title, url);
  await openExternal(url);
}

export function ExploreScreens({ id, go, back }: { id: string; go: Go; back?: () => void }) {
  const leave = (fallback: string) => (back ? back() : go(fallback, false));
  return (
    <div style={{ position: 'relative', width: 390, height: 844, background: '#050505', overflow: 'hidden', fontFamily: font.sans, color: '#fff' }}>
      {id === 'dapps' ? <DappList onBack={() => leave('explore')} /> : <Explore go={go} />}
    </div>
  );
}

function Explore({ go }: { go: Go }) {
  const live = useLiveFrame();
  const [query, setQuery] = useState('');
  const [section, setSection] = useState<Section>('all');
  const [visits, setVisits] = useState(readBrowseHistory);
  const [notice, setNotice] = useState<string | null>(null);
  const scroller = useRef<HTMLDivElement>(null);
  const refresh = async () => {
    await live?.refresh?.();
    setVisits(readBrowseHistory());
  };
  const pull = usePullRefresh(refresh);
  useEffect(() => {
    scroller.current && (scroller.current.scrollTop = 0);
  }, [section]);
  useEffect(() => subscribeInAppBrowse((open) => {
    if (!open) setVisits(readBrowseHistory());
  }), []);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const url = toBrowseUrl(query);
    if (!url) {
      setNotice('Enter a site or search.');
      return;
    }
    setNotice(null);
    void openSite(query.trim(), url);
    setVisits(readBrowseHistory());
  };

  const connected = live?.app ? live.wcSessions.length : 0;
  const show = (which: Section) => section === 'all' || section === which;
  const headTop = live?.app ? 72 : 44;

  return (
    <>
      <PhoneStatus />
      <div style={{ position: 'absolute', left: 0, right: 0, top: headTop, padding: '8px 18px 0', boxSizing: 'border-box', background: '#050505', zIndex: 2 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <p style={{ margin: 0, fontSize: 26, fontWeight: 700 }}>Explore</p>
          <button type="button" aria-label="Refresh" onClick={() => void refresh()} style={iconRound}>
            <RefreshMark spinning={pull.busy} />
          </button>
        </div>
        <form onSubmit={submit} style={searchBox}>
          <FigmaImg src={art('apps.svg')} width={18} height={18} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search or enter a site"
            aria-label="Search or enter a site"
            style={searchInput}
          />
          <button type="submit" style={goBtn}>Open</button>
        </form>
        {notice ? <p style={{ margin: '8px 0 0', fontSize: 12, color: '#fabf33' }}>{notice}</p> : null}
        <div role="tablist" aria-label="Explore sections" style={{ display: 'flex', gap: 8, overflowX: 'auto', margin: '12px 0 8px', paddingBottom: 2, width: '100%', maxWidth: '100%', minWidth: 0 }}>
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={section === tab.id}
              onClick={() => setSection(tab.id)}
              style={{
                ...chip,
                background: section === tab.id ? '#accafe' : '#1c2025',
                color: section === tab.id ? '#0c1018' : '#fff',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>
      <div
        ref={scroller}
        style={{ position: 'absolute', left: 0, right: 0, top: headTop + (notice ? 196 : 176), bottom: WALLET_TAB_CLEAR, overflowX: 'hidden', overflowY: 'auto', padding: '4px 18px 24px', boxSizing: 'border-box' }}
        onTouchStart={pull.onTouchStart}
        onTouchMove={pull.onTouchMove}
        onTouchEnd={pull.onTouchEnd}
      >
        {pull.pull > 8 || pull.busy ? (
          <p style={{ margin: '0 0 8px', textAlign: 'center', fontSize: 12, color: '#accafe' }}>
            {pull.busy ? 'Refreshing…' : 'Release to refresh'}
          </p>
        ) : null}

        {show('browser') ? (
          <Section first label="RECENT">
            {visits.length > 0 ? (
              <div style={card}>
                {visits.slice(0, 8).map((visit, index) => (
                  <button key={visit.url + visit.at} type="button" onClick={() => void openSite(visit.title, visit.url)} style={{ ...(live?.app ? liveRow : row), borderTop: index ? '1px solid #29333d' : 'none' }}>
                    <SiteLogo name={visit.title} url={visit.url} letter={(hostOf(visit.url)[0] || 'A').toUpperCase()} />
                    <span style={copy}>
                      <span style={title}>{visit.title}</span>
                      <span style={sub}>{hostOf(visit.url)}</span>
                    </span>
                    <span style={openMark}>Open</span>
                  </button>
                ))}
              </div>
            ) : (
              <p style={{ margin: 0, padding: '16px 14px', fontSize: 13, color: '#8b9097', lineHeight: 1.35, background: '#1c2126', borderRadius: 16, minHeight: 0 }}>
                Sites you open in Arxon show up here.
              </p>
            )}
            <p style={kicker}>EXPLORERS</p>
            <div style={card}>
              {EXPLORERS.map((rowItem, index) => (
                <button key={rowItem.url} type="button" onClick={() => void openSite(rowItem.name, rowItem.url)} style={{ ...(live?.app ? liveRow : row), borderTop: index ? '1px solid #29333d' : 'none' }}>
                  <SiteLogo name={rowItem.name} url={rowItem.url} letter={rowItem.name.slice(0, 1)} />
                  <span style={copy}>
                    <span style={title}>{rowItem.name}</span>
                    <span style={sub}>{rowItem.chain} · {hostOf(rowItem.url)}</span>
                  </span>
                  <span style={openMark}>Open</span>
                </button>
              ))}
            </div>
          </Section>
        ) : null}

        {show('dapps') ? (
          <Section
            first={!show('browser')}
            label="DAPPS"
            extra={section === 'dapps' ? null : <button type="button" onClick={() => go('dapps')} style={seeAll}>See all</button>}
          >
            <div style={card}>
              {(section === 'dapps' ? DAPPS : DAPPS.slice(0, 6)).map((app, index) => (
                <button key={app.url} type="button" onClick={() => void openSite(app.name, app.url)} style={{ ...(live?.app ? liveRow : row), borderTop: index ? '1px solid #29333d' : 'none' }}>
                  <SiteLogo name={app.name} url={app.url} letter={app.letter} color={app.color} />
                  <span style={copy}>
                    <span style={title}>{app.name}</span>
                    <span style={sub}>{app.chain} · {app.blurb}</span>
                  </span>
                  <span style={openMark}>Open</span>
                </button>
              ))}
            </div>
          </Section>
        ) : null}

        {show('tools') ? (
          <Section first={!show('browser') && !show('dapps')} label="WALLET TOOLS">
            <div style={card}>
              <button type="button" onClick={() => go('buy')} style={row}>
                <span style={{ ...mark, background: '#293342' }}><FigmaImg src={art('buy.svg')} width={18} height={18} /></span>
                <span style={copy}>
                  <span style={title}>Buy crypto</span>
                  <span style={sub}>Buy with a card in your local currency</span>
                </span>
                <FigmaImg src={art('chev.svg')} width={18} height={18} />
              </button>
              <button type="button" onClick={() => go('connected')} style={{ ...row, borderTop: '1px solid #29333d' }}>
                <span style={{ ...mark, background: '#293342' }}><FigmaImg src={art('apps.svg')} width={18} height={18} /></span>
                <span style={copy}>
                  <span style={title}>Connected apps</span>
                  <span style={sub}>{live?.app ? (connected ? `${connected} connected` : 'None connected') : 'Manage WalletConnect sessions'}</span>
                </span>
                <FigmaImg src={art('chev.svg')} width={18} height={18} />
              </button>
              <div style={{ ...row, borderTop: '1px solid #29333d', cursor: 'default' }}>
                <span style={{ ...mark, background: '#293342' }}>P</span>
                <span style={copy}>
                  <span style={title}>Partners</span>
                  <span style={sub}>On-ramps and tools we add with partners</span>
                </span>
                <span style={{ color: '#5c5f64', fontSize: 12, fontWeight: 600, flexShrink: 0 }}>Soon</span>
              </div>
            </div>
          </Section>
        ) : null}
      </div>
      <Tabs go={go} />
    </>
  );
}

function Section({ first, label, extra, children }: { first?: boolean; label: string; extra?: ReactNode; children: ReactNode }) {
  return (
    <div style={{ marginTop: first ? 0 : 10, width: '100%', maxWidth: '100%' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 28, minHeight: 28, maxHeight: 28, margin: '0 4px 6px' }}>
        <p style={{ margin: 0, fontSize: 12, fontWeight: 600, color: '#5c5f64', letterSpacing: 0.6 }}>{label}</p>
        {extra}
      </div>
      {children}
    </div>
  );
}

function DappList({ onBack }: { onBack: () => void }) {
  return (
    <>
      <NoteStatus />
      <Back onClick={onBack} />
      <p style={{ position: 'absolute', left: 24, top: 106, margin: 0, fontSize: 30, fontWeight: 700 }}>dApps</p>
      <p style={{ position: 'absolute', left: 24, top: 152, margin: 0, width: 336, color: '#8b9097', fontSize: 15 }}>Working sites for the chains in this wallet.</p>
      <div style={{ position: 'absolute', left: 18, top: 200, width: 354, bottom: 24, overflowX: 'hidden', overflowY: 'auto' }}>
        <div style={card}>
          {DAPPS.map((app, index) => (
            <button key={app.url} type="button" onClick={() => void openSite(app.name, app.url)} style={{ ...row, borderTop: index ? '1px solid #29333d' : 'none' }}>
              <SiteLogo name={app.name} url={app.url} letter={app.letter} color={app.color} />
              <span style={copy}>
                <span style={title}>{app.name}</span>
                <span style={sub}>{hostOf(app.url)} · {app.chain}</span>
              </span>
              <span style={openMark}>Open</span>
            </button>
          ))}
        </div>
      </div>
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
          vault: net === 'testnet' ? vaultEntry('vault') : tabTarget('vault'),
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

function SiteLogo({ name, url, letter, color = '#2a3447' }: { name: string; url: string; letter: string; color?: string }) {
  const [failed, setFailed] = useState(false);
  const host = hostOf(url);
  const initial = (letter || name[0] || 'A').slice(0, 1).toUpperCase();
  if (failed) return <span style={{ ...mark, background: '#2a3447', color: '#fff' }}>{initial}</span>;
  return (
    <span style={{ ...mark, background: color, overflow: 'hidden' }}>
      <img
        src={`https://www.google.com/s2/favicons?domain=${encodeURIComponent(host)}&sz=64`}
        alt=""
        width={28}
        height={28}
        onError={() => setFailed(true)}
        style={{ width: 28, height: 28, objectFit: 'contain', display: 'block', background: '#fff', borderRadius: 8 }}
      />
    </span>
  );
}

function RefreshMark({ spinning }: { spinning: boolean }) {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true" style={{ transform: spinning ? 'rotate(180deg)' : undefined, transition: 'transform 0.3s linear' }}>
      <path d="M14.5 9A5.5 5.5 0 1 1 9 3.5" fill="none" stroke="#accafe" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M9 1.5v4h3.4" fill="none" stroke="#accafe" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
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

const kicker: CSSProperties = { margin: '12px 4px 8px', fontSize: 12, fontWeight: 600, color: '#5c5f64', letterSpacing: 0.6 };
const card: CSSProperties = { width: '100%', maxWidth: '100%', background: '#1c2126', borderRadius: 16, overflow: 'hidden', height: 'auto' };
const row: CSSProperties = { width: '100%', height: 64, minHeight: 64, maxHeight: 64, border: 'none', background: 'none', color: '#fff', fontFamily: font.sans, display: 'flex', alignItems: 'center', gap: 12, padding: '0 14px', cursor: 'pointer', boxSizing: 'border-box', overflow: 'hidden' };
const liveRow: CSSProperties = { ...row, height: 56, minHeight: 56, maxHeight: 56, gap: 10, padding: '0 12px' };
const mark: CSSProperties = { width: 40, height: 40, borderRadius: 20, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 15, flexShrink: 0 };
const copy: CSSProperties = { flex: 1, minWidth: 0, textAlign: 'left', overflow: 'hidden' };
const title: CSSProperties = { display: 'block', fontSize: 15, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' };
const sub: CSSProperties = { display: 'block', marginTop: 2, fontSize: 12, color: '#8c8f99', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' };
const openMark: CSSProperties = { color: '#accafe', fontSize: 13, fontWeight: 600, flexShrink: 0 };
const searchBox: CSSProperties = { height: 48, boxSizing: 'border-box', background: '#1c2025', border: '1px solid #2a3447', borderRadius: 14, display: 'flex', alignItems: 'center', gap: 10, padding: '0 8px 0 14px', width: '100%', maxWidth: '100%' };
const searchInput: CSSProperties = { flex: 1, minWidth: 0, border: 'none', outline: 'none', background: 'transparent', color: '#fff', fontFamily: font.sans, fontSize: 15 };
const goBtn: CSSProperties = { minHeight: 36, minWidth: 56, border: 'none', borderRadius: 10, background: '#2a3447', color: '#accafe', fontFamily: font.sans, fontSize: 13, fontWeight: 600, cursor: 'pointer', flexShrink: 0 };
const iconRound: CSSProperties = { width: 40, height: 40, border: 'none', borderRadius: 20, background: '#1c2025', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', padding: 0, flexShrink: 0 };
const seeAll: CSSProperties = { border: 'none', background: 'none', color: '#accafe', fontFamily: font.sans, fontSize: 12, fontWeight: 500, cursor: 'pointer', minHeight: 28, padding: '0 4px' };
const chip: CSSProperties = { flexShrink: 0, height: 36, minHeight: 36, padding: '0 14px', border: 'none', borderRadius: 18, fontFamily: font.sans, fontSize: 13, fontWeight: 600, cursor: 'pointer' };
