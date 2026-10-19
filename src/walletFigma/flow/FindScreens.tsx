import { useState, type CSSProperties, type ReactNode } from 'react';
import { FigmaImg } from '@/walletFigma/icons';
import { font } from '@/walletFigma/tokens';
import { useLiveFrame } from './liveFrame';

const art = (name: string) => `/wallet-figma/find/${name}`;

type Go = (id: string, remember?: boolean) => void;

const SUGGESTED = [
  { name: 'Arxon', amount: '0.00 ARX', value: '$0.00', change: '+0.00%', tone: '#8b9097', icon: 'arx' as const, to: 'token-arx' },
  { name: 'Bitcoin', amount: '0.00 BTC', value: '$0.00', change: '-0.37%', tone: '#ff5c5c', icon: 'btc' as const, to: 'token-btc' },
  { name: 'Ethereum', amount: '0.00 ETH', value: '$0.00', change: '+0.66%', tone: '#3ddc84', icon: 'eth' as const, to: 'token-eth' },
];

const MANAGED = [
  { id: 'arx', name: 'Arxon', symbol: 'ARX', icon: 'arx' as const, on: true },
  { id: 'btc', name: 'Bitcoin', symbol: 'BTC', icon: 'btc' as const, on: true },
  { id: 'eth', name: 'Ethereum', symbol: 'ETH', icon: 'eth' as const, on: true },
  { id: 'usdc', name: 'USD Coin', symbol: 'USDC', icon: 'usdc' as const, on: false },
  { id: 'usdt', name: 'Tether', symbol: 'USDT', icon: 'usdt' as const, on: false },
];

type NoteIcon = 'down' | 'up' | 'shield' | 'lock' | 'check';
type NoteTab = 'activity' | 'security';

const TODAY: { title: string; body: string; time: string; icon: NoteIcon; tab: NoteTab; unread?: boolean }[] = [
  { title: 'Received 500.00 ARX', body: 'From arx1q7…m2d9', time: '2h', icon: 'down', tab: 'activity', unread: true },
  { title: 'Private transfer confirmed', body: '25.00 ARX · Amount hidden', time: '5h', icon: 'up', tab: 'activity' },
  { title: 'Balance privacy updated', body: 'Hidden from public view', time: '5h', icon: 'shield', tab: 'security' },
];

const EARLIER: { title: string; body: string; time: string; icon: NoteIcon; tab: NoteTab }[] = [
  { title: 'New device unlocked', body: 'Face ID · iPhone', time: 'Oct 5', icon: 'lock', tab: 'security' },
  { title: 'Backup verified', body: 'Recovery phrase confirmed', time: 'Oct 4', icon: 'check', tab: 'security' },
];

export function FindScreens({ id, go, back }: { id: string; go: Go; back?: () => void }) {
  const leave = () => (back ? back() : go(id === 'add-token' ? 'manage' : 'home', false));
  return (
    <div style={{ position: 'relative', width: 390, height: 844, background: '#050505', overflow: 'hidden', fontFamily: font.sans, color: '#fff' }}>
      <style>{`.find-input::placeholder{color:#8b9097}`}</style>
      <Status clock={id === 'notifications' ? 'note' : 'flow'} />
      {id === 'search' && <Search go={go} leave={leave} />}
      {id === 'manage' && <Manage go={go} leave={leave} />}
      {id === 'add-token' && <AddToken go={go} leave={leave} />}
      {id === 'notifications' && <Notes leave={leave} />}
      <div style={{ position: 'absolute', left: 8, top: 810, width: 375, height: 34, opacity: 0.25, pointerEvents: 'none' }}>
        <div style={{ position: 'absolute', left: '50%', bottom: 8, transform: 'translateX(-50%)', width: 134, height: 5, borderRadius: 100, background: '#fff' }} />
      </div>
    </div>
  );
}

function Search({ go, leave }: { go: Go; leave: () => void }) {
  const live = useLiveFrame();
  const [query, setQuery] = useState('');
  const q = query.trim().toLowerCase();
  const rows = live?.app
    ? live.search(query).map((row) => ({
        name: row.name,
        amount: row.amount,
        value: row.value,
        change: row.change,
        tone: row.tone === 'up' ? '#3ddc84' : row.tone === 'down' ? '#ff5c5c' : '#8b9097',
        icon: row.icon,
        to: row.to,
      }))
    : SUGGESTED.filter((row) => !q || row.name.toLowerCase().includes(q) || row.amount.toLowerCase().includes(q));
  return (
    <>
      <button type="button" aria-label="Back" onClick={leave} style={{ ...backBtn, left: 18, top: 56 }}>
        <FigmaImg src={art('chev.svg')} width={20} height={20} />
      </button>
      <label style={{ position: 'absolute', left: 66, top: 56, width: 306, height: 44, boxSizing: 'border-box', background: '#1c2025', border: '1px solid #accafe', borderRadius: 14, display: 'flex', alignItems: 'center', gap: 10, padding: '0 14px' }}>
        <FigmaImg src={art('search.svg')} width={20} height={20} />
        <input className="find-input" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search tokens, addresses, dApps" aria-label="Search tokens, addresses, dApps" style={field} />
      </label>
      <div style={{ position: 'absolute', left: 18, top: 124, width: 354 }}>
        {rows.length > 0 && <p style={heading}>Suggested</p>}
        {rows.length > 0 && <div style={{ height: 8 }} />}
        {rows.map((row) => (
          <button key={row.name} type="button" onClick={() => go(row.to)} style={tokenBtn}>
            <TokenIcon kind={row.icon} />
            <span style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2, textAlign: 'left' }}>
              <span style={{ fontSize: 16, fontWeight: 500 }}>{row.name}</span>
              <span style={{ fontSize: 13, color: '#8b9097' }}>{row.amount}</span>
            </span>
            <span style={{ display: 'flex', flexDirection: 'column', gap: 2, textAlign: 'right' }}>
              <span style={{ fontSize: 16, fontWeight: 500 }}>{row.value}</span>
              <span style={{ fontSize: 13, color: row.tone }}>{row.change}</span>
            </span>
          </button>
        ))}
        <div style={{ height: rows.length ? 16 : 0 }} />
        <p style={heading}>Recent searches</p>
        <p style={{ margin: '10px 0 0', fontSize: 14, color: '#8b9097' }}>Your recent searches will appear here.</p>
        <div style={{ ...tip, marginTop: 22 }}>
          <span style={infoBubble}><FigmaImg src={art('info.svg')} width={16} height={16} /></span>
          <span style={{ width: 260, fontSize: 13, color: '#8b9097', lineHeight: 1.35 }}>Paste a wallet address or Arxon name to look it up.</span>
        </div>
      </div>
    </>
  );
}

function Manage({ go, leave }: { go: Go; leave: () => void }) {
  const [query, setQuery] = useState('');
  const [on, setOn] = useState<Record<string, boolean>>(() => Object.fromEntries(MANAGED.map((token) => [token.id, token.on])));
  const q = query.trim().toLowerCase();
  const tokens = MANAGED.filter((token) => !q || token.name.toLowerCase().includes(q) || token.symbol.toLowerCase().includes(q));
  const shown = tokens.filter((token) => on[token.id]);
  const more = tokens.filter((token) => !on[token.id]);
  return (
    <>
      <Header title="Manage tokens" leave={leave} />
      <label style={{ position: 'absolute', left: 18, top: 118, width: 354, height: 44, boxSizing: 'border-box', background: '#1c2025', borderRadius: 14, display: 'flex', alignItems: 'center', gap: 10, padding: '0 14px' }}>
        <FigmaImg src={art('search.svg')} width={20} height={20} />
        <input className="find-input" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search tokens" aria-label="Search tokens" style={field} />
      </label>
      <div style={{ position: 'absolute', left: 18, top: 178, width: 354 }}>
        {shown.length > 0 && <p style={heading}>Shown on Home</p>}
        {shown.length > 0 && <div style={{ height: 6 }} />}
        {shown.map((token) => <ManageRow key={token.id} token={token} on={!!on[token.id]} toggle={() => setOn((prev) => ({ ...prev, [token.id]: !prev[token.id] }))} />)}
        {more.length > 0 && <div style={{ height: 12 }} />}
        {more.length > 0 && <p style={heading}>More tokens</p>}
        {more.length > 0 && <div style={{ height: 6 }} />}
        {more.map((token) => <ManageRow key={token.id} token={token} on={!!on[token.id]} toggle={() => setOn((prev) => ({ ...prev, [token.id]: !prev[token.id] }))} />)}
      </div>
      <button type="button" onClick={() => go('add-token')} style={secondaryBtn}>
        <FigmaImg src={art('plus.svg')} width={24} height={24} />
        Add custom token
      </button>
    </>
  );
}

function ManageRow({ token, on, toggle }: { token: (typeof MANAGED)[number]; on: boolean; toggle: () => void }) {
  return (
    <div style={{ height: 64, display: 'flex', alignItems: 'center', gap: 12 }}>
      <TokenIcon kind={token.icon} />
      <span style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <span style={{ fontSize: 16, fontWeight: 500 }}>{token.name}</span>
        <span style={{ fontSize: 13, color: '#8b9097' }}>{token.symbol}</span>
      </span>
      <span style={{ flex: 1 }} />
      <button type="button" aria-label={on ? `Hide ${token.name}` : `Show ${token.name}`} onClick={toggle} style={iconBtn}>
        <FigmaImg src={art(on ? 'toggle-on.svg' : 'toggle-off.svg')} width={on ? 46 : 48} height={28} />
      </button>
    </div>
  );
}

function AddToken({ go, leave }: { go: Go; leave: () => void }) {
  const live = useLiveFrame();
  const [address, setAddress] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const ready = address.trim().length > 0;
  return (
    <>
      <Header title="Add custom token" leave={leave} />
      <div style={{ position: 'absolute', left: 18, top: 124, width: 354, display: 'flex', flexDirection: 'column', gap: 16 }}>
        <Field label="Network">
          <div style={{ ...box, height: 56, display: 'flex', alignItems: 'center', gap: 10, padding: '0 16px' }}>
            <FigmaImg src={art('globe.svg')} width={18} height={18} />
            <span style={{ fontSize: 15, fontWeight: 500 }}>Arxon Mainnet</span>
          </div>
        </Field>
        <Field label="Token contract address">
          <div style={{ ...box, height: 56, display: 'flex', alignItems: 'center', gap: 10, padding: '0 16px', border: '1px solid #accafe' }}>
            <input className="find-input" value={address} onChange={(e) => setAddress(e.target.value)} aria-label="Token contract address" style={{ ...field, fontSize: 15 }} />
            <button type="button" aria-label="Paste" onClick={() => navigator.clipboard?.readText().then((text) => { if (text) setAddress(text.trim()); }).catch(() => undefined)} style={iconBtn}>
              <FigmaImg src={art('paste.svg')} width={20} height={20} />
            </button>
            <button type="button" aria-label="Scan" onClick={() => go('send-qr')} style={iconBtn}>
              <FigmaImg src={art('scan.svg')} width={20} height={20} />
            </button>
          </div>
        </Field>
        {ready && !live?.app && (
          <div style={{ display: 'flex', gap: 12 }}>
            <div style={{ ...box, width: 171, padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 4 }}>
              <span style={{ fontSize: 12, color: '#8b9097' }}>Symbol</span>
              <span style={{ fontSize: 16, fontWeight: 600 }}>USDX</span>
            </div>
            <div style={{ ...box, width: 171, padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 4 }}>
              <span style={{ fontSize: 12, color: '#8b9097' }}>Decimals</span>
              <span style={{ fontSize: 16, fontWeight: 600 }}>6</span>
            </div>
          </div>
        )}
        <div style={{ ...tip, background: '#11161f', border: '1px solid #2a3447' }}>
          <span style={infoBubble}><FigmaImg src={art('info.svg')} width={16} height={16} /></span>
          <span style={{ width: 262, fontSize: 13, color: '#8b9097', lineHeight: 1.35 }}>Anyone can create a token with any name. Only add tokens from sources you trust.</span>
        </div>
      </div>
      {err ? <p style={{ position: 'absolute', left: 22, top: 670, width: 346, margin: 0, color: '#f25252', fontSize: 12 }}>{err}</p> : null}
      <button type="button" disabled={!ready} onClick={() => {
        if (!live?.app) { go('manage'); return; }
        void live.addToken(address).then(() => go('manage')).catch((e: unknown) => setErr(e instanceof Error ? e.message : 'Could not add that token'));
      }} style={{ ...primaryBtn, opacity: ready ? 1 : 0.45 }}>Add token</button>
    </>
  );
}

function Notes({ leave }: { leave: () => void }) {
  const live = useLiveFrame();
  const [tab, setTab] = useState<'all' | 'activity' | 'security'>('all');
  const liveToday = live?.app
    ? live.activity.flatMap((group) => group.items).slice(0, 3).map((row) => ({
        title: row.title,
        body: row.sub,
        time: 'Today',
        icon: (row.kind === 'received' ? 'down' : row.kind === 'private' ? 'shield' : 'up') as NoteIcon,
        tab: 'activity' as NoteTab,
      }))
    : TODAY;
  const today = liveToday.filter((item) => tab === 'all' || item.tab === tab);
  const earlier = live?.app ? [] : EARLIER.filter((item) => tab === 'all' || item.tab === tab);
  return (
    <>
      <button type="button" aria-label="Back" onClick={leave} style={{ ...backBtn, left: 16, top: 52 }}>
        <FigmaImg src={art('back.svg')} width={20} height={20} />
      </button>
      <p style={{ position: 'absolute', left: 70, top: 61.5, width: 250, margin: 0, textAlign: 'center', fontSize: 17, fontWeight: 600 }}>Notifications</p>
      <div style={{ position: 'absolute', left: 16, top: 108, display: 'flex', gap: 8 }}>
        <Tab label="All" width={56} active={tab === 'all'} onClick={() => setTab('all')} />
        <Tab label="Activity" width={84} active={tab === 'activity'} onClick={() => setTab('activity')} />
        <Tab label="Security" width={88} active={tab === 'security'} onClick={() => setTab('security')} />
      </div>
      {today.length > 0 && <p style={groupLabel(168)}>TODAY</p>}
      {today.length > 0 && (
        <div style={{ ...noteCard, top: 192 }}>
          {today.map((item, index) => <NoteRow key={item.title} item={item} last={index === today.length - 1} />)}
        </div>
      )}
      {earlier.length > 0 && <p style={groupLabel(today.length ? 440 : 168)}>EARLIER</p>}
      {earlier.length > 0 && (
        <div style={{ ...noteCard, top: today.length ? 464 : 192 }}>
          {earlier.map((item, index) => <NoteRow key={item.title} item={item} last={index === earlier.length - 1} />)}
        </div>
      )}
    </>
  );
}

function NoteRow({ item, last }: { item: { title: string; body: string; time: string; icon: NoteIcon; unread?: boolean }; last: boolean }) {
  return (
    <>
      <div style={{ minHeight: 74, display: 'flex', alignItems: 'flex-start', gap: 12, padding: '15px 15px 12px' }}>
        <span style={{ width: 44, height: 44, borderRadius: 22, background: '#11161f', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <FigmaImg src={art(noteIcon(item.icon))} width={20} height={20} />
        </span>
        <span style={{ flex: 1, minWidth: 0, paddingTop: 0 }}>
          <span style={{ display: 'block', fontSize: 15, fontWeight: 600 }}>{item.title}</span>
          <span style={{ display: 'block', marginTop: 4, fontSize: 13, color: '#8b9097' }}>{item.body}</span>
        </span>
        <span style={{ width: 52, textAlign: 'right', fontSize: 12, color: '#8b9097' }}>
          {item.time}
          {item.unread && <span style={{ display: 'block', width: 8, height: 8, borderRadius: 4, background: '#accafe', marginLeft: 'auto', marginTop: 8 }} />}
        </span>
      </div>
      {!last && <div style={{ height: 1, background: '#2a3447', margin: '0 15px' }} />}
    </>
  );
}

function noteIcon(icon: NoteIcon) {
  if (icon === 'down') return 'note-down.svg';
  if (icon === 'up') return 'note-up.svg';
  if (icon === 'shield') return 'note-shield.svg';
  if (icon === 'lock') return 'note-lock.svg';
  return 'note-check.svg';
}

function Header({ title, leave }: { title: string; leave: () => void }) {
  return (
    <>
      <button type="button" aria-label="Back" onClick={leave} style={{ ...backBtn, left: 18, top: 56 }}>
        <FigmaImg src={art('chev.svg')} width={20} height={20} />
      </button>
      <p style={{ position: 'absolute', left: 0, top: 65.5, width: 390, margin: 0, textAlign: 'center', fontSize: 17, fontWeight: 700 }}>{title}</p>
    </>
  );
}

function Tab({ label, width, active, onClick }: { label: string; width: number; active: boolean; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} style={{ width, height: 34, border: 'none', borderRadius: 17, background: active ? '#accafe' : '#1c2025', color: active ? '#0c1018' : '#8b9097', fontFamily: font.sans, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
      {label}
    </button>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 8, width: 354 }}>
      <span style={{ fontSize: 13, fontWeight: 500, color: '#8b9097' }}>{label}</span>
      {children}
    </label>
  );
}

function Status({ clock }: { clock: 'flow' | 'note' }) {
  return (
    <div style={{ position: 'absolute', left: 0, top: 0, width: 390, height: 44 }}>
      <span style={{ position: 'absolute', left: clock === 'note' ? 28 : 21, top: clock === 'note' ? 13 : 14, width: clock === 'note' ? undefined : 54, textAlign: 'center', fontSize: clock === 'note' ? 15 : 14, fontWeight: 600, letterSpacing: clock === 'note' ? 0 : -0.28 }}>9:41</span>
      <img src="/wallet-figma/welcome/status.svg" alt="" width={66.6} height={11.33} style={{ position: 'absolute', left: clock === 'note' ? 296 : 288.67, top: clock === 'note' ? 17 : 17.33 }} />
    </div>
  );
}

function TokenIcon({ kind }: { kind: 'arx' | 'btc' | 'eth' | 'usdc' | 'usdt' }) {
  if (kind === 'arx') {
    return (
      <span style={{ width: 40, height: 40, borderRadius: 20, background: '#90b9ff', position: 'relative', overflow: 'hidden', flexShrink: 0 }}>
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
  if (kind === 'usdt') return <img src={art('usdt.png')} alt="" width={40} height={40} style={{ borderRadius: 20, objectFit: 'cover' }} />;
  return (
    <span style={{ width: 40, height: 40, borderRadius: 20, background: '#2775ca', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
      <FigmaImg src={art('usdc.svg')} width={11.7857} height={22} />
    </span>
  );
}

const backBtn: CSSProperties = { position: 'absolute', width: 40, height: 40, borderRadius: 20, border: 'none', background: '#1c2025', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', padding: 0 };
const field: CSSProperties = { flex: 1, minWidth: 0, border: 'none', outline: 'none', background: 'transparent', color: '#fff', fontFamily: font.sans, fontSize: 14, fontWeight: 400 };
const heading: CSSProperties = { margin: 0, fontSize: 18, fontWeight: 700 };
const tokenBtn: CSSProperties = { width: 354, height: 64, border: 'none', background: 'none', color: '#fff', display: 'flex', alignItems: 'center', gap: 12, padding: 0, cursor: 'pointer', fontFamily: font.sans };
const tip: CSSProperties = { background: '#1c2025', borderRadius: 16, display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', boxSizing: 'border-box' };
const infoBubble: CSSProperties = { width: 36, height: 36, borderRadius: 18, background: '#2a3447', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 };
const iconBtn: CSSProperties = { border: 'none', background: 'none', padding: 0, cursor: 'pointer', display: 'flex' };
const box: CSSProperties = { background: '#1c2025', borderRadius: 14, boxSizing: 'border-box' };
const secondaryBtn: CSSProperties = { position: 'absolute', left: 16, top: 744, width: 358, height: 52, borderRadius: 14, border: '1px solid #2a3447', background: '#11161f', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontFamily: font.sans, fontSize: 16, fontWeight: 600, cursor: 'pointer' };
const primaryBtn: CSSProperties = { position: 'absolute', left: 16, top: 744, width: 358, height: 52, borderRadius: 14, border: 'none', background: '#accafe', color: '#0c1018', fontFamily: font.sans, fontSize: 16, fontWeight: 600, cursor: 'pointer' };
const noteCard: CSSProperties = { position: 'absolute', left: 16, width: 358, background: '#1c2025', border: '1px solid #2a3447', borderRadius: 14, boxSizing: 'border-box', overflow: 'hidden' };
const groupLabel = (top: number): CSSProperties => ({ position: 'absolute', left: 24, top, margin: 0, fontSize: 12, fontWeight: 600, color: '#8b9097' });
