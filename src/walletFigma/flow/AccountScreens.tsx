import { useState, type CSSProperties, type ReactNode } from 'react';
import { FigmaImg } from '@/walletFigma/icons';
import { font } from '@/walletFigma/tokens';
import { tabTarget, vaultEntry } from './VaultScreens';
import { pickWalletTab, useWalletNetwork, WalletTabs } from './WalletTabs';
import { useLiveFrame } from './liveFrame';

const art = (name: string) => `/wallet-figma/account/${name}`;
const ADDRESS = 'arx1q8x4m2k7f9v3d6h0w5z...t7c2n4p';
const SHORT = 'arx1q8x4…t7c2n4p';
type Go = (id: string, remember?: boolean) => void;

const CURRENCIES: [string, string][] = [
  ['USD', 'US Dollar'],
  ['EUR', 'Euro'],
  ['GBP', 'British Pound'],
  ['NGN', 'Nigerian Naira'],
  ['ZAR', 'South African Rand'],
];
const KINDS = ['Bug', 'Transaction', 'Suggestion', 'Other'];
const SCREENS = new Set(['account', 'currency', 'help', 'report']);

export function isAccountScreen(id: string) {
  return SCREENS.has(id);
}

export function AccountScreens({ id, go, back }: { id: string; go: Go; back?: () => void }) {
  const [code, setCode] = useState('USD');
  const [copied, setCopied] = useState(false);
  const [kind, setKind] = useState('Bug');
  const [note, setNote] = useState('');
  const [diagnostics, setDiagnostics] = useState(true);
  const [sent, setSent] = useState(false);
  const live = useLiveFrame();
  const full = live?.address ?? ADDRESS;
  const shortAddr = live?.address ? `${live.address.slice(0, 6)}…${live.address.slice(-4)}` : SHORT;
  const leave = (fallback: string) => (back ? back() : go(fallback, false));

  return (
    <div style={{ position: 'relative', width: 390, height: 844, background: '#050505', overflow: 'hidden', fontFamily: font.sans, color: '#fff' }}>
      {id === 'account' && (
        <Account code={code} copied={copied} label={live?.accountLabel ?? 'Account 01'} shortAddr={shortAddr} onCopy={() => {
          navigator.clipboard?.writeText(full).catch(() => undefined);
          setCopied(true);
          window.setTimeout(() => setCopied(false), 1200);
        }} go={go} />
      )}
      {id === 'currency' && (
        <Currency code={code} onPick={(next) => { setCode(next); go('account', false); }} onBack={() => leave('account')} />
      )}
      {id === 'help' && <Help sent={sent} go={go} onBack={() => leave('account')} />}
      {id === 'report' && (
        <Report
          kind={kind}
          setKind={setKind}
          note={note}
          setNote={setNote}
          diagnostics={diagnostics}
          setDiagnostics={setDiagnostics}
          onBack={() => leave('help')}
          onSend={() => {
            live?.report(kind, note);
            setSent(true);
            setNote('');
            go('help', false);
          }}
        />
      )}
    </div>
  );
}

function Account({ code, copied, onCopy, go, label, shortAddr }: { code: string; copied: boolean; onCopy: () => void; go: Go; label: string; shortAddr: string }) {
  return (
    <>
      <PhoneStatus />
      <div style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 103, overflowY: 'auto', overflowX: 'hidden' }}>
        <div style={{ padding: '64px 18px 24px' }}>
          <p style={{ margin: 0, fontSize: 26, fontWeight: 700, lineHeight: 1.2 }}>Account</p>
          <div style={{ marginTop: 18, minHeight: 84, boxSizing: 'border-box', background: '#1c2025', borderRadius: 16, display: 'flex', alignItems: 'center', gap: 14, padding: 16 }}>
            <FigmaImg src={art('avatar.svg')} width={52} height={52} />
            <span style={{ flex: 1, minWidth: 0 }}>
              <span style={{ display: 'block', fontSize: 17, fontWeight: 700, lineHeight: 1.3 }}>{label}</span>
              <span style={{ display: 'block', marginTop: 4, fontSize: 13, color: '#8b9097', lineHeight: 1.35 }}>{copied ? 'Copied' : shortAddr}</span>
            </span>
            <button type="button" aria-label="Copy address" onClick={onCopy} style={iconBtn}>
              <FigmaImg src={art('copy.svg')} width={20} height={20} />
            </button>
          </div>
          <p style={accountKicker}>SECURITY & PRIVACY</p>
          <div style={accountCard}>
            <Row icon={art('key.svg')} label="Recovery phrase" onClick={() => go('view-verify')} />
            <Row icon={art('face.svg')} label="Face ID & password" onClick={() => go('face-settings')} />
            <Row icon={art('shield.svg')} label="Private mode" value="On" onClick={() => go('privacy')} />
          </div>
          <p style={accountKicker}>EXTENSIONS</p>
          <div style={accountCard}>
            <Row letter label="Arxon Mining" value="Not set up" onClick={() => go('mine-entry')} />
          </div>
          <p style={accountKicker}>PREFERENCES</p>
          <div style={accountCard}>
            <Row icon={art('dollar.svg')} label="Currency" value={code} onClick={() => go('currency')} />
            <Row icon={art('globe.svg')} label="Network" value="Arxon" onClick={() => go('network')} />
            <Row icon={art('help.svg')} label="Help & support" onClick={() => go('help')} />
          </div>
        </div>
      </div>
      <Tabs go={go} />
    </>
  );
}

function Section({ label, top, cardTop, children }: { label: string; top: number; cardTop: number; children: ReactNode }) {
  return (
    <>
      <p style={{ position: 'absolute', left: 22, top, margin: 0, fontSize: 12, fontWeight: 600, color: '#5c5f64' }}>{label}</p>
      <div style={{ position: 'absolute', left: 18, top: cardTop, width: 354, background: '#1c2025', borderRadius: 16, overflow: 'hidden' }}>{children}</div>
    </>
  );
}

function Row({ icon, letter, label, value, onClick }: { icon?: string; letter?: boolean; label: string; value?: string; onClick?: () => void }) {
  return (
    <button type="button" onClick={onClick} style={rowBtn}>
      <span style={iconBg}>
        {letter ? <span style={{ color: '#abc9ff', fontSize: 16, fontWeight: 700 }}>M</span> : icon ? <FigmaImg src={icon} width={18} height={18} /> : null}
      </span>
      <span style={{ flex: 1, minWidth: 0, textAlign: 'left', fontSize: 15, fontWeight: 500, lineHeight: 1.3 }}>{label}</span>
      {value && <span style={{ fontSize: 14, color: '#8b9097', flexShrink: 0 }}>{value}</span>}
      <FigmaImg src={art('chev.svg')} width={18} height={18} />
    </button>
  );
}

function Currency({ code, onPick, onBack }: { code: string; onPick: (code: string) => void; onBack: () => void }) {
  return (
    <>
      <NoteStatus />
      <Back onClick={onBack} />
      <p style={{ position: 'absolute', left: 24, top: 106, margin: 0, fontSize: 30, fontWeight: 700 }}>Currency</p>
      <p style={{ position: 'absolute', left: 24, top: 152, width: 336, margin: 0, fontSize: 15, color: '#8b9097' }}>Choose how values are shown in Arxon.</p>
      <div style={listCard}>
        {CURRENCIES.map(([id, name], index) => (
          <button key={id} type="button" onClick={() => onPick(id)} style={{ ...listRow, borderTop: index ? '1px solid #2a3447' : 'none' }}>
            <span>
              <span style={{ display: 'block', fontSize: 15, fontWeight: 600 }}>{id}</span>
              <span style={{ display: 'block', marginTop: 2, fontSize: 13, color: '#8b9097' }}>{name}</span>
            </span>
            {code === id && <FigmaImg src={art('check.svg')} width={20} height={20} />}
          </button>
        ))}
      </div>
      <HomeBar />
    </>
  );
}

function Help({ sent, go, onBack }: { sent: boolean; go: Go; onBack: () => void }) {
  const support: [string, string, string?][] = [
    ['Help center', 'Guides and FAQs'],
    ['Contact support', 'We usually reply within a day'],
    ['Report a problem', 'Tell us what went wrong', 'report'],
  ];
  return (
    <>
      <NoteStatus />
      <Back onClick={onBack} />
      <p style={{ position: 'absolute', left: 24, top: 106, margin: 0, fontSize: 30, fontWeight: 700 }}>Help & support</p>
      <p style={{ position: 'absolute', left: 24, top: 152, width: 336, margin: 0, fontSize: 15, color: '#8b9097' }}>{sent ? 'Report sent.' : 'Get answers or reach the Arxon team.'}</p>
      <p style={kicker(196)}>SUPPORT</p>
      <div style={{ ...listCard, top: 222 }}>
        {support.map(([title, sub, target], index) => (
          <button key={title} type="button" onClick={() => {
            if (target) go(target);
            else if (title === 'Help center') window.open('https://arxon.io', '_blank', 'noopener,noreferrer');
            else if (title === 'Contact support') window.open('https://arxon.io', '_blank', 'noopener,noreferrer');
          }} style={{ ...listRow, borderTop: index ? '1px solid #2a3447' : 'none', cursor: 'pointer' }}>
            <span>
              <span style={{ display: 'block', fontSize: 15, fontWeight: 600 }}>{title}</span>
              <span style={{ display: 'block', marginTop: 2, fontSize: 13, color: '#8b9097' }}>{sub}</span>
            </span>
            <FigmaImg src={art('chev-sm.svg')} width={16} height={16} />
          </button>
        ))}
      </div>
      <p style={kicker(436)}>ABOUT</p>
      <div style={{ ...listCard, top: 462 }}>
        {['Terms of Service', 'Privacy Policy'].map((title, index) => (
          <div key={title} style={{ ...listRow, borderTop: index ? '1px solid #2a3447' : 'none' }}>
            <span style={{ fontSize: 15, fontWeight: 600 }}>{title}</span>
            <FigmaImg src={art('chev-sm.svg')} width={16} height={16} />
          </div>
        ))}
        <div style={{ ...listRow, borderTop: '1px solid #2a3447' }}>
          <span style={{ fontSize: 15, fontWeight: 600 }}>Version</span>
          <span style={{ fontSize: 14, fontWeight: 500, color: '#8b9097' }}>1.0.0</span>
        </div>
      </div>
      <HomeBar />
    </>
  );
}

function Report({ kind, setKind, note, setNote, diagnostics, setDiagnostics, onBack, onSend }: {
  kind: string;
  setKind: (v: string) => void;
  note: string;
  setNote: (v: string) => void;
  diagnostics: boolean;
  setDiagnostics: (v: boolean) => void;
  onBack: () => void;
  onSend: () => void;
}) {
  const ready = note.trim().length > 0;
  return (
    <>
      <PhoneStatus />
      <button type="button" aria-label="Back" onClick={onBack} style={{ ...backBtn, top: 56 }}>
        <FigmaImg src={art('back.svg')} width={20} height={20} />
      </button>
      <p style={{ position: 'absolute', left: 70, top: 65.5, width: 250, margin: 0, textAlign: 'center', fontSize: 17, fontWeight: 700 }}>Report a problem</p>
      <div style={{ position: 'absolute', left: 18, top: 124, width: 354 }}>
        <p style={label}>What happened?</p>
        <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
          {KINDS.map((item) => {
            const on = item === kind;
            return (
              <button key={item} type="button" onClick={() => setKind(item)} style={{ height: 32, padding: '0 14px', border: 'none', borderRadius: 16, background: on ? '#2a3447' : '#1c2025', color: on ? '#accafe' : '#8b9097', fontFamily: font.sans, fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>{item}</button>
            );
          })}
        </div>
        <p style={{ ...label, marginTop: 16 }}>Describe the problem</p>
        <textarea value={note} onChange={(event) => setNote(event.target.value)} placeholder="Tell us what went wrong…" style={area} />
        <div style={{ marginTop: 16, height: 72, boxSizing: 'border-box', background: '#1c2025', borderRadius: 16, display: 'flex', alignItems: 'center', gap: 12, padding: '0 12px 0 16px' }}>
          <span style={{ flex: 1 }}>
            <span style={{ display: 'block', fontSize: 15, fontWeight: 600 }}>Include diagnostics</span>
            <span style={{ display: 'block', marginTop: 2, width: 230, fontSize: 12, color: '#8b9097' }}>App version and device. Never keys or balances.</span>
          </span>
          <button type="button" aria-label="Include diagnostics" onClick={() => setDiagnostics(!diagnostics)} style={iconBtn}>
            {diagnostics
              ? <FigmaImg src={art('toggle-on.svg')} width={46} height={28} />
              : <FigmaImg src="/wallet-figma/send/toggle-off.svg" width={48} height={28} />}
          </button>
        </div>
      </div>
      <button type="button" disabled={!ready} onClick={onSend} style={{ ...sendBtn, background: ready ? '#accafe' : '#1c2025', color: ready ? '#0c1018' : '#5c5f64', cursor: ready ? 'pointer' : 'default' }}>Send report</button>
      <HomeBar />
    </>
  );
}

function Tabs({ go }: { go: Go }) {
  const net = useWalletNetwork();
  return (
    <WalletTabs
      active="Account"
      onSelect={(tab) => {
        if (tab === 'Account') return;
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
    <button type="button" aria-label="Back" onClick={onClick} style={backBtn}>
      <FigmaImg src={art('back.svg')} width={20} height={20} />
    </button>
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

function HomeBar() {
  return <div style={{ position: 'absolute', left: 128, top: 831, width: 134, height: 5, borderRadius: 100, background: '#fff', opacity: 0.25 }} />;
}

const iconBtn: CSSProperties = { border: 'none', background: 'none', padding: 0, cursor: 'pointer', display: 'flex' };
const iconBg: CSSProperties = { width: 36, height: 36, borderRadius: 18, background: '#2a3447', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 };
const accountKicker: CSSProperties = { margin: '22px 4px 8px', fontSize: 12, fontWeight: 600, color: '#5c5f64' };
const accountCard: CSSProperties = { background: '#1c2025', borderRadius: 16, overflow: 'hidden' };
const rowBtn: CSSProperties = { width: '100%', minHeight: 64, border: 'none', background: 'none', color: '#fff', fontFamily: font.sans, display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', cursor: 'pointer', boxSizing: 'border-box' };
const backBtn: CSSProperties = { position: 'absolute', left: 18, top: 56, width: 40, height: 40, borderRadius: 20, border: 'none', background: '#1c2025', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', padding: 0 };
const listCard: CSSProperties = { position: 'absolute', left: 18, top: 192, width: 354, boxSizing: 'border-box', background: '#1c2025', border: '1px solid #2a3447', borderRadius: 14, overflow: 'hidden' };
const listRow: CSSProperties = { width: '100%', height: 64, boxSizing: 'border-box', borderLeft: 'none', borderRight: 'none', borderBottom: 'none', background: 'none', color: '#fff', fontFamily: font.sans, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 16px', textAlign: 'left' };
const label: CSSProperties = { margin: 0, fontSize: 13, fontWeight: 500, color: '#8b9097' };
const area: CSSProperties = { marginTop: 8, width: '100%', height: 150, boxSizing: 'border-box', background: '#1c2025', border: '1px solid #accafe', borderRadius: 14, padding: '14px 16px', color: '#fff', fontFamily: font.sans, fontSize: 15, resize: 'none', outline: 'none' };
const sendBtn: CSSProperties = { position: 'absolute', left: 16, top: 744, width: 358, height: 52, border: 'none', borderRadius: 14, fontFamily: font.sans, fontSize: 16, fontWeight: 600 };
const kicker = (top: number): CSSProperties => ({ position: 'absolute', left: 24, top, margin: 0, fontSize: 12, fontWeight: 600, color: '#8b9097', letterSpacing: 0.96 });
