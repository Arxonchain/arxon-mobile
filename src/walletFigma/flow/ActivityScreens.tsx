import { useState, type CSSProperties } from 'react';
import { FigmaImg } from '@/walletFigma/icons';
import { font } from '@/walletFigma/tokens';
import { rememberFromActivity, tabTarget, vaultEntry } from './VaultScreens';
import { pickWalletTab, useWalletNetwork, WalletTabs } from './WalletTabs';
import { useLiveFrame } from './liveFrame';

const art = (name: string) => `/wallet-figma/activity/${name}`;
type Go = (id: string, remember?: boolean) => void;
type Kind = 'received' | 'sent' | 'swap' | 'private' | 'vault';

type Row = {
  title: string;
  sub: string;
  amount: string;
  fiat: string;
  kind: Kind;
  token: string;
  tint?: string;
  to?: string;
};

const ROWS: { day: string; age: number; items: Row[] }[] = [
  {
    day: 'Today',
    age: 0,
    items: [
      { title: 'Received ARX', sub: 'From arx9f2…k4m1 · 10:42 AM', amount: '+250.00 ARX', fiat: '$25.00', kind: 'received', token: 'ARX', tint: '#3ddc84', to: 'tx' },
      { title: 'Sent USDT', sub: 'To arx1c4…m9d2 · 09:15 AM', amount: '-40.00 USDT', fiat: '$40.00', kind: 'sent', token: 'USDT', to: 'tx' },
    ],
  },
  {
    day: 'Yesterday',
    age: 1,
    items: [
      { title: 'Swapped ETH to ARX', sub: '6:30 PM', amount: '+120.00 ARX', fiat: '$12.00', kind: 'swap', token: 'ARX', tint: '#3ddc84', to: 'tx' },
      { title: 'Sent ARX', sub: 'Private transfer · 11:05 AM', amount: '500.00 ARX', fiat: 'Private', kind: 'private', token: 'ARX', to: 'receipt' },
    ],
  },
  {
    day: 'Oct 5',
    age: 14,
    items: [
      { title: 'Sent ARX', sub: 'To arx1m3…p8w6 · 4:20 PM', amount: '-75.00 ARX', fiat: '$7.50', kind: 'sent', token: 'ARX', to: 'tx' },
      { title: 'Received BTC', sub: 'From arx5t7…c2n9 · 9:02 AM', amount: '+0.0021 BTC', fiat: '$187.60', kind: 'received', token: 'BTC', tint: '#3ddc84', to: 'tx' },
    ],
  },
];

const VAULT_ROWS: Row[] = [
  { title: 'Moved to Home', sub: 'Vault → Home · 11:35 AM', amount: '500.00 ARX', fiat: '$210.00', kind: 'vault', token: 'ARX', to: 'tx-vault' },
  { title: 'Moved to Vault', sub: 'Home → Vault · 11:02 AM', amount: '1,000.00 ARX', fiat: '$420.00', kind: 'vault', token: 'ARX', to: 'tx-vault' },
];

const TYPES = ['All', 'Sent', 'Received', 'Swaps', 'Private', 'Vault moves'];
const TOKENS = ['All tokens', 'ARX', 'BTC', 'ETH', 'USDT', 'USDC'];
const DATES = ['Any time', 'Last 7 days', 'Last 30 days'];
const QUICK = ['All', 'Sent', 'Received', 'Swaps'];
const SCREENS = new Set(['activity-empty', 'activity', 'tx', 'activity-filter', 'activity-vault', 'tx-vault', 'activity-filtered', 'activity-none']);

export function isActivityScreen(id: string) {
  return SCREENS.has(id);
}

export function ActivityScreens({ id, go, back }: { id: string; go: Go; back?: () => void }) {
  const [type, setType] = useState('All');
  const [token, setToken] = useState('All tokens');
  const [date, setDate] = useState('Any time');
  const [draft, setDraft] = useState({ type: 'All', token: 'All tokens', date: 'Any time' });
  const live = useLiveFrame();
  const empty = live?.app
    ? live.activity.length === 0 && id !== 'activity-vault' && id !== 'activity-filtered' && id !== 'tx' && id !== 'tx-vault'
    : id === 'activity-empty';
  const net = useWalletNetwork();
  if (net === 'mainnet') rememberFromActivity(empty);
  const leave = () => (back ? back() : go(empty ? 'home' : 'activity', false));

  function openFilter() {
    setDraft({ type, token, date });
    go('activity-filter');
  }

  function apply() {
    setType(draft.type);
    setToken(draft.token);
    setDate(draft.date);
    if (draft.type === 'Vault moves') {
      const noMatch = draft.token !== 'All tokens' && draft.token !== 'ARX';
      go(noMatch ? 'activity-none' : 'activity-filtered', false);
      return;
    }
    go('activity', false);
  }

  function clear() {
    setType('All');
    setToken('All tokens');
    setDate('Any time');
    go('activity', false);
  }

  const showSheet = id === 'activity-filter';
  const vaultList = id === 'activity-filtered' || id === 'activity-vault';
  const none = id === 'activity-none';
  const groups = vaultList
    ? [{ day: 'Today', age: 0, items: VAULT_ROWS }]
    : live?.app
      ? live.activity
      : filterRows(type, token, date);
  const filteredBlank = !empty && !none && !vaultList && groups.length === 0;

  return (
    <div style={{ position: 'relative', width: 390, height: 844, background: '#050505', overflow: 'hidden', fontFamily: font.sans, color: '#fff' }}>
      {id === 'tx' || id === 'tx-vault' ? (
        <Detail id={id} go={go} leave={leave} />
      ) : (
        <>
          <PhoneStatus />
          <Header onFilter={openFilter} />
          {vaultList || none ? (
            <button type="button" onClick={clear} style={{ ...chip, position: 'absolute', left: 18, top: 122, background: '#accafe', color: '#0c1018', fontWeight: 600 }}>Vault moves  ✕</button>
          ) : (
            <div style={{ position: 'absolute', left: 18, top: 122, display: 'flex', gap: 10 }}>
              {QUICK.map((label) => (
                <button key={label} type="button" onClick={() => setType(label)} style={{ ...chip, background: type === label ? '#accafe' : '#181818', color: type === label ? '#0c1018' : '#fff', fontWeight: type === label ? 600 : 500 }}>{label}</button>
              ))}
            </div>
          )}
          {empty && <Empty title="No activity yet" body="Your sent, received and swapped transactions will show up here." action="Fund your wallet" onAction={() => go('receive')} />}
          {none && <Empty title="No Vault moves" body="Moves between Home and your Vault will show up here." action="Clear filter" onAction={clear} />}
          {filteredBlank && <Empty title="No activity yet" body="Nothing in this range. Try another date or token." action="Clear filter" onAction={clear} />}
          {!empty && !none && !filteredBlank && <List groups={groups} go={go} />}
          <Tabs go={go} here={empty ? 'activity-empty' : vaultList ? 'activity-filtered' : none ? 'activity-none' : 'activity'} />
          {showSheet && (
            <Filter draft={draft} setDraft={setDraft} onClose={leave} onReset={() => { setDraft({ type: 'All', token: 'All tokens', date: 'Any time' }); clear(); }} onApply={apply} />
          )}
        </>
      )}
    </div>
  );
}

function filterRows(type: string, token: string, date = 'Any time') {
  const kind = type === 'Sent' ? 'sent' : type === 'Received' ? 'received' : type === 'Swaps' ? 'swap' : type === 'Private' ? 'private' : '';
  const maxAge = date === 'Last 7 days' ? 7 : date === 'Last 30 days' ? 30 : 10000;
  return ROWS.filter((group) => group.age < maxAge).map((group) => ({
    ...group,
    items: group.items.filter((row) => {
      const typeOk = !kind || row.kind === kind || (kind === 'sent' && row.kind === 'private');
      const tokenOk = token === 'All tokens' || row.token === token;
      return typeOk && tokenOk;
    }),
  })).filter((group) => group.items.length);
}

function Header({ onFilter }: { onFilter: () => void }) {
  return (
    <div style={{ position: 'absolute', left: 18, top: 58, width: 354, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <p style={{ margin: 0, fontSize: 26, fontWeight: 700 }}>Activity</p>
      <button type="button" aria-label="Filter" onClick={onFilter} style={round}><FigmaImg src={art('filter.svg')} width={20} height={20} /></button>
    </div>
  );
}

function List({ groups, go }: { groups: { day: string; items: Row[] }[]; go: Go }) {
  return (
    <div style={{ position: 'absolute', left: 18, top: 176, width: 354, bottom: 110, overflow: 'auto' }}>
      {groups.map((group) => (
        <div key={group.day}>
          <p style={{ margin: '6px 0 4px', fontSize: 13, fontWeight: 500, color: '#8b9097' }}>{group.day}</p>
          {group.items.map((row) => (
            <button key={row.title + row.sub} type="button" onClick={() => go(row.to || 'tx')} style={rowBtn}>
              <span style={iconWrap}><Icon kind={row.kind} /></span>
              <span style={{ flex: 1, textAlign: 'left', minWidth: 0 }}>
                <span style={{ display: 'block', fontSize: 16, fontWeight: 500 }}>{row.title}</span>
                <span style={{ display: 'block', marginTop: 2, fontSize: 13, color: '#8b9097' }}>{row.sub}</span>
              </span>
              <span style={{ textAlign: 'right' }}>
                <span style={{ display: 'block', fontSize: 16, fontWeight: 500, color: row.tint || '#fff' }}>{row.amount}</span>
                <span style={{ display: 'block', marginTop: 2, fontSize: 13, color: '#8b9097' }}>{row.fiat}</span>
              </span>
            </button>
          ))}
        </div>
      ))}
    </div>
  );
}

function Icon({ kind }: { kind: Kind }) {
  if (kind === 'received') return <FigmaImg src={art('down.svg')} width={24} height={24} />;
  if (kind === 'swap') return <FigmaImg src={art('swap.svg')} width={24} height={24} />;
  if (kind === 'private') return <FigmaImg src="/wallet-figma/send/shield-sm.svg" width={16} height={16} />;
  if (kind === 'vault') return <FigmaImg src={art('vault.svg')} width={24} height={24} />;
  return <FigmaImg src={art('up.svg')} width={24} height={24} />;
}

function Empty({ title, body, action, onAction }: { title: string; body: string; action: string; onAction: () => void }) {
  return (
    <div style={{ position: 'absolute', left: 60, top: 270, width: 270, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
      <span style={{ width: 88, height: 88, borderRadius: 44, background: '#1c2025', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <FigmaImg src={art('clock.svg')} width={38} height={38} />
      </span>
      <p style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>{title}</p>
      <p style={{ margin: 0, fontSize: 14, color: '#8b9097', textAlign: 'center', lineHeight: 1.35 }}>{body}</p>
      <button type="button" onClick={onAction} style={{ border: 'none', background: '#accafe', color: '#0c1018', borderRadius: 8, padding: '13px 24px', fontFamily: font.sans, fontSize: 15, fontWeight: 600, cursor: 'pointer' }}>{action}</button>
    </div>
  );
}

function Detail({ id, go, leave }: { id: string; go: Go; leave: () => void }) {
  const vault = id === 'tx-vault';
  const rows = vault
    ? [['Date', 'Oct 7, 2026 · 11:02 AM'], ['From', 'Home'], ['To', 'Vault'], ['Amount', '1,000.00 ARX'], ['Network fee', '0.0004 ARX'], ['Privacy', 'Private']]
    : [['Date', 'Oct 7, 2026 · 4:12 PM'], ['To', 'arx1q8x4…t7c2'], ['From', 'Account 01'], ['Network', 'Arxon Mainnet'], ['Network fee', '0.0004 ARX'], ['Privacy', 'Private']];
  return (
    <>
      <NoteStatus />
      <button type="button" aria-label="Back" onClick={leave} style={{ ...round, left: 16, top: 52 }}>
        <FigmaImg src="/wallet-figma/find/back.svg" width={20} height={20} />
      </button>
      <p style={{ position: 'absolute', left: 70, top: 61.5, width: 250, margin: 0, textAlign: 'center', fontSize: 17, fontWeight: 600 }}>Transaction</p>
      <div style={{ position: 'absolute', left: 145, top: 112, width: 100, height: 100, borderRadius: 50, boxSizing: 'border-box', background: '#11161f', border: '1px solid #2a3447', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ width: 60, height: 60, borderRadius: 30, background: '#1c2025', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <FigmaImg src={art('out.svg')} width={20} height={20} />
        </span>
      </div>
      <p style={{ position: 'absolute', left: 16, top: 228, width: 358, margin: 0, textAlign: 'center', fontSize: 20, fontWeight: 700 }}>{vault ? 'Moved to Vault' : 'Sent privately'}</p>
      <p style={{ position: 'absolute', left: 16, top: 258, width: 358, margin: 0, textAlign: 'center', fontSize: 32, fontWeight: 700 }}>{vault ? '1,000.00 ARX' : '25.00 ARX'}</p>
      <p style={{ position: 'absolute', left: 16, top: 300, width: 358, margin: 0, textAlign: 'center', fontSize: 14, color: '#8b9097' }}>{vault ? '$420.00' : '≈ $10.50'}</p>
      <span style={{ position: 'absolute', left: 150, top: 332, width: 90, height: 28, borderRadius: 14, background: '#12301f', color: '#3ddc97', fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Confirmed</span>
      <div style={{ position: 'absolute', left: 16, top: 380, width: 358, boxSizing: 'border-box', background: '#1c2025', border: '1px solid #2a3447', borderRadius: 14, padding: '8px 15px' }}>
        {rows.map(([label, value], index) => (
          <div key={label}>
            {index > 0 && <div style={{ height: 1, background: '#2a3447' }} />}
            <div style={{ height: 36, display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 14 }}>
              <span style={{ color: '#8b9097' }}>{label}</span>
              <span style={{ fontWeight: 500, color: label === 'Privacy' ? '#accafe' : '#fff' }}>{value}</span>
            </div>
          </div>
        ))}
      </div>
      <button type="button" onClick={() => navigator.clipboard?.writeText('0x7f3a…c91e').catch(() => undefined)} style={{ position: 'absolute', left: 16, top: 636, width: 358, height: 56, boxSizing: 'border-box', background: '#11161f', border: '1px solid #2a3447', borderRadius: 14, color: '#fff', fontFamily: font.sans, textAlign: 'left', padding: '9px 15px', cursor: 'pointer' }}>
        <span style={{ display: 'block', fontSize: 12, color: '#8b9097' }}>Transaction hash</span>
        <span style={{ display: 'block', marginTop: 2, fontSize: 14, fontWeight: 500 }}>0x7f3a…c91e</span>
        <span style={{ position: 'absolute', right: 15, top: 17 }}><FigmaImg src={art('copy.svg')} width={20} height={20} /></span>
      </button>
      <button type="button" onClick={() => go(vault ? 'activity-vault' : 'receipt')} style={{ ...barBtn, top: 708, background: '#accafe', color: '#0c1018', border: 'none' }}>{vault ? 'Back to Activity' : 'View private receipt'}</button>
      {!vault && <button type="button" onClick={() => go('activity')} style={{ ...barBtn, top: 770, background: 'transparent', color: '#fff', border: '1px solid #2a3447' }}>View on explorer</button>}
    </>
  );
}

function Filter({ draft, setDraft, onClose, onReset, onApply }: {
  draft: { type: string; token: string; date: string };
  setDraft: (v: { type: string; token: string; date: string }) => void;
  onClose: () => void;
  onReset: () => void;
  onApply: () => void;
}) {
  const groups: [string, string, string[]][] = [['Type', 'type', TYPES], ['Token', 'token', TOKENS], ['Date', 'date', DATES]];
  return (
    <>
      <button type="button" aria-label="Close" onClick={onClose} style={{ position: 'absolute', inset: 0, border: 'none', background: 'rgba(0,0,0,0.6)', padding: 0, cursor: 'pointer', zIndex: 3 }} />
      <div style={{ position: 'absolute', left: 0, top: 383, width: 390, boxSizing: 'border-box', background: '#11161f', border: '1px solid #2a3447', borderBottom: 'none', borderRadius: '24px 24px 0 0', padding: '10px 16px 28px', zIndex: 4 }}>
        <div style={{ width: 36, height: 4, borderRadius: 2, background: '#5c5f64', margin: '0 auto' }} />
        <p style={{ margin: '14px 0 0', fontSize: 20, fontWeight: 700 }}>Filter activity</p>
        {groups.map(([label, key, options]) => (
          <div key={label} style={{ marginTop: 14 }}>
            <p style={{ margin: '0 0 10px', fontSize: 13, fontWeight: 500, color: '#8b9097' }}>{label}</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {options.map((option) => {
                const on = draft[key as 'type'] === option;
                return (
                  <button key={option} type="button" onClick={() => setDraft({ ...draft, [key]: option })} style={{ height: 34, padding: '0 14px', borderRadius: 16, border: on ? '1px solid #accafe' : '1px solid transparent', background: on ? '#2a3447' : '#1c2025', color: on ? '#accafe' : '#8b9097', fontFamily: font.sans, fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>{option}</button>
                );
              })}
            </div>
          </div>
        ))}
        <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
          <button type="button" onClick={onReset} style={{ ...barBtn, position: 'relative', left: 0, top: 0, width: 173, background: '#11161f', color: '#fff', border: '1px solid #2a3447' }}>Reset</button>
          <button type="button" onClick={onApply} style={{ ...barBtn, position: 'relative', left: 0, top: 0, width: 173, background: '#accafe', color: '#0c1018', border: 'none' }}>Apply</button>
        </div>
      </div>
    </>
  );
}

function Tabs({ go, here }: { go: Go; here: string }) {
  const net = useWalletNetwork();
  return (
    <WalletTabs
      active="History"
      onSelect={(tab) => {
        if (tab === 'History') return;
        pickWalletTab(net, tab, go, {
          home: tabTarget('home'),
          vault: net === 'testnet' ? vaultEntry('vault-empty') : tabTarget('vault'),
          history: here,
        });
      }}
    />
  );
}

function PhoneStatus() {
  return (
    <>
      <span style={{ position: 'absolute', left: 21, top: 14, width: 54, textAlign: 'center', fontSize: 14, fontWeight: 600, letterSpacing: -0.28 }}>9:41</span>
      <img src="/wallet-figma/welcome/status.svg" alt="" width={66.6} height={11.33} style={{ position: 'absolute', left: 288.67, top: 17.33 }} />
    </>
  );
}

function NoteStatus() {
  return (
    <>
      <span style={{ position: 'absolute', left: 28, top: 13, fontSize: 15, fontWeight: 600 }}>9:41</span>
      <img src="/wallet-figma/welcome/status.svg" alt="" width={66.6} height={11.33} style={{ position: 'absolute', left: 296, top: 17 }} />
    </>
  );
}

const round: CSSProperties = { width: 40, height: 40, borderRadius: 20, border: 'none', background: '#1c2025', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', padding: 0 };
const chip: CSSProperties = { border: 'none', borderRadius: 30, padding: '9px 18px', fontFamily: font.sans, fontSize: 14, cursor: 'pointer' };
const rowBtn: CSSProperties = { width: '100%', height: 64, border: 'none', background: 'none', color: '#fff', fontFamily: font.sans, display: 'flex', alignItems: 'center', gap: 12, padding: 0, cursor: 'pointer' };
const iconWrap: CSSProperties = { width: 40, height: 40, borderRadius: 20, background: '#1c2025', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 };
const barBtn: CSSProperties = { position: 'absolute', left: 16, width: 358, height: 52, borderRadius: 14, fontFamily: font.sans, fontSize: 16, fontWeight: 600, cursor: 'pointer' };
