import { useState, type CSSProperties, type ReactNode } from 'react';
import { FigmaImg } from '@/walletFigma/icons';
import { font } from '@/walletFigma/tokens';
import { useLiveFrame } from './liveFrame';
import { useAppHidesFigmaChrome } from './appChrome';
import { copyAddress, shareImage, shareText } from './copyFlash';
import { frostField, frostPanel, FrostLine, liveGhost, livePrimary } from './LiveScroll';
import { drawReceiptPng, receiptRows, receiptStatus } from './receiptRows';

const art = (name: string) => `/wallet-figma/receipt/${name}`;
const CODE = 'ARX-7K2M-93QD-LX4P';
const WHO = ['Lawyer', 'Judge', 'Regulator', 'Other'];
const SCREENS = new Set(['receipt', 'code-create', 'code-ready', 'code-log']);
type Go = (id: string, remember?: boolean) => void;

export function isReceiptScreen(id: string) {
  return SCREENS.has(id);
}

export function ReceiptScreens({ id, go, back }: { id: string; go: Go; back?: () => void }) {
  const live = useLiveFrame();
  const [who, setWho] = useState('Lawyer');
  const [note, setNote] = useState('');
  const [made, setMade] = useState(false);
  const [copied, setCopied] = useState(false);
  const [sharing, setSharing] = useState(false);
  const leave = () => (back ? back() : go(id === 'receipt' ? 'activity' : 'receipt', false));
  const label = made ? `FOR ${who.toUpperCase()}${note.trim() ? ` · ${note.trim().toUpperCase()}` : ''}` : 'FOR LAWYER · CASE 2291';

  const liveCode = live?.app && live.codes[0]?.code ? live.codes[0].code : CODE;
  const liveInspect = live?.app ? live.inspect : null;

  async function copyCode() {
    await copyAddress(liveCode, 'Copied');
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }

  async function shareCode() {
    await shareText('Arxon disclosure code', liveCode);
  }

  async function shareReceipt() {
    if (sharing) return;
    setSharing(true);
    try {
      const rows = receiptRows(liveInspect, 'full');
      const blob = await drawReceiptPng({
        title: 'Private receipt',
        amount: liveInspect?.amount || 'Arxon payment',
        rows,
      });
      await shareImage('Arxon receipt', blob, 'arxon-receipt.png');
    } catch {
      const lines = receiptRows(liveInspect, 'full').map(([label, value]) => `${label}: ${value}`).join('\n');
      await shareText('Arxon receipt', `Private receipt\n${liveInspect?.amount || ''}\n${lines}`);
    } finally {
      setSharing(false);
    }
  }

  return (
    <div style={{ position: 'relative', width: 390, height: 844, background: '#050505', overflow: 'hidden', fontFamily: font.sans, color: '#fff' }}>
      <style>{`.receipt-note::placeholder{color:#5c6578}`}</style>
      <Status />
      <button type="button" aria-label="Back" onClick={leave} style={backBtn}>
        <FigmaImg src={art('back.svg')} width={20} height={20} />
      </button>
      <HomeBar />
      {id === 'receipt' && live?.app ? (
        <LiveReceipt go={go} onShare={() => void shareReceipt()} sharing={sharing} />
      ) : id === 'receipt' ? (
        <Receipt go={go} onShare={() => void shareReceipt()} />
      ) : null}
      {id === 'code-create' && (
        <Create who={who} setWho={setWho} note={note} setNote={setNote} onGenerate={() => {
          if (live?.app) live.makeCode(who, note);
          setMade(true);
          go('code-ready');
        }} />
      )}
      {id === 'code-ready' && <Ready label={label} copied={copied} onCopy={copyCode} onShare={() => void shareCode()} code={liveCode} created={live?.codes[0]?.at} />}
      {id === 'code-log' && <Log go={go} codes={live?.app ? live.codes : null} />}
    </div>
  );
}

function Page({ children }: { children: ReactNode }) {
  return (
    <div
      className="arxon-token-scroll"
      style={{ position: 'absolute', left: 0, top: 108, bottom: 0, width: 390, overflowY: 'auto', WebkitOverflowScrolling: 'touch', touchAction: 'pan-y', boxSizing: 'border-box', padding: '8px 18px 28px' }}
    >
      {children}
    </div>
  );
}

function LiveReceipt({ go, onShare, sharing }: { go: Go; onShare: () => void; sharing: boolean }) {
  const live = useLiveFrame();
  const inspect = live?.app ? live.inspect : null;
  const mode = inspect?.detail === 'full' ? 'full' : 'short';
  const rows = receiptRows(inspect, mode);
  const loading = !!live?.app && !inspect;
  return (
    <Page>
      <h1 style={{ margin: 0, fontSize: 30, fontWeight: 700 }}>Private receipt</h1>
      <p style={{ margin: '10px 0 0', color: '#8b9097', fontSize: 15, lineHeight: 1.35 }}>Proof of this payment, stored permanently on the Arxon chain.</p>
      <div style={{ marginTop: 16, padding: '8px 14px', ...frostPanel }}>
        {(loading ? [['Status', 'Loading…'] as [string, string]] : rows).map(([label, value]) => (
          <FrostLine key={label} label={label} value={value} tone={label === 'Status' && receiptStatus(value) === 'Failed' ? 'bad' : undefined} />
        ))}
      </div>
      <p style={{ margin: '12px 0 0', fontSize: 12, color: '#8b9097', lineHeight: 1.4 }}>Only you can see your balance. The other person sees theirs on their own receipt.</p>
      <button type="button" onClick={() => go('code-create')} style={{ ...livePrimary, marginTop: 16 }}>Generate disclosure code</button>
      <button type="button" onClick={onShare} style={{ ...liveGhost, marginTop: 10 }}>{sharing ? 'Preparing image…' : 'Share receipt'}</button>
      <button type="button" onClick={() => go('code-log')} style={{ ...linkBtn, position: 'relative', left: 0, top: 0, margin: '12px auto 0' }}>
        View disclosure codes
        <FigmaImg src={art('chev.svg')} width={5.8} height={9.8} />
      </button>
    </Page>
  );
}

function Receipt({ go, onShare }: { go: Go; onShare: () => void }) {
  const payment: [string, string][] = [
    ['Sender', 'arx1q8x4…t7c2n4p'],
    ['Receiver', 'arx1q7p2…m2d9'],
    ['Amount', '25.00 ARX'],
    ['Time', 'Oct 7, 2026 · 4:12:36 PM'],
    ['Block', '#1,204,918'],
    ['Hash', '0x7f3a…c91e'],
    ['Status', 'Successful'],
  ];
  return (
    <Page>
      <h1 style={{ margin: 0, fontSize: 30, fontWeight: 700 }}>Private receipt</h1>
      <p style={{ margin: '10px 0 0', color: '#8b9097', fontSize: 15, lineHeight: 1.35 }}>Proof of this payment, stored permanently on the Arxon chain.</p>
      <div style={{ marginTop: 16, padding: '8px 14px', ...frostPanel }}>
        {payment.map(([label, value]) => <FrostLine key={label} label={label} value={value} />)}
      </div>
      <p style={{ margin: '12px 0 0', fontSize: 12, fontWeight: 600, color: '#8b9097', letterSpacing: 0.2 }}>YOUR BALANCE AT THAT MOMENT</p>
      <div style={{ marginTop: 8, padding: '8px 14px', ...frostPanel }}>
        <FrostLine label="Before" value="2,425.0000 ARX" />
        <FrostLine label="After" value="2,399.9996 ARX" />
      </div>
      <p style={{ margin: '12px 0 0', fontSize: 12, color: '#8b9097', lineHeight: 1.4 }}>Only you can see your balance. The other person sees theirs on their own receipt.</p>
      <button type="button" onClick={() => go('code-create')} style={{ ...livePrimary, marginTop: 16 }}>Generate disclosure code</button>
      <button type="button" onClick={onShare} style={{ ...liveGhost, marginTop: 10 }}>Share receipt</button>
      <button type="button" onClick={() => go('code-log')} style={{ ...linkBtn, position: 'relative', left: 0, top: 0, margin: '12px auto 0' }}>
        View disclosure codes
        <FigmaImg src={art('chev.svg')} width={5.8} height={9.8} />
      </button>
    </Page>
  );
}

function Create({ who, setWho, note, setNote, onGenerate }: { who: string; setWho: (v: string) => void; note: string; setNote: (v: string) => void; onGenerate: () => void }) {
  return (
    <Page>
      <h1 style={{ margin: 0, fontSize: 30, fontWeight: 700 }}>Disclosure code</h1>
      <p style={{ margin: '10px 0 0', color: '#8b9097', fontSize: 15, lineHeight: 1.35 }}>Give one person one-time access to the full details of this payment.</p>
      <p style={sectionEyebrow}>WHO IS THIS FOR?</p>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {WHO.map((name) => {
          const on = who === name;
          return (
            <button key={name} type="button" onClick={() => setWho(name)} style={{ ...chip, background: on ? '#accafe' : 'rgba(10,12,16,0.88)', color: on ? '#0c1018' : '#fff', border: on ? '1px solid transparent' : '1px solid rgba(255,255,255,0.10)' }}>{name}</button>
          );
        })}
      </div>
      <p style={sectionEyebrow}>NOTE (OPTIONAL)</p>
      <input className="receipt-note" value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Case 2291" style={field} />
      <p style={sectionEyebrow}>WHAT THEY WILL SEE</p>
      <div style={{ padding: '8px 14px', ...frostPanel }}>
        <FrostLine label="Sender and receiver" value="Yes" />
        <FrostLine label="Amount" value="Yes" />
        <FrostLine label="Time and block" value="Yes" />
        <FrostLine label="Both balance snapshots" value="Yes" />
      </div>
      <p style={noteCopy}>This code works once, then burns for good. Every code you generate and use is logged on-chain.</p>
      <button type="button" onClick={onGenerate} style={{ ...livePrimary, marginTop: 16 }}>Generate code</button>
    </Page>
  );
}

function Ready({ label, copied, onCopy, onShare, code, created }: { label: string; copied: boolean; onCopy: () => void; onShare: () => void; code: string; created?: number }) {
  return (
    <Page>
      <h1 style={{ margin: 0, fontSize: 30, fontWeight: 700 }}>Code ready</h1>
      <p style={{ margin: '10px 0 0', color: '#8b9097', fontSize: 15, lineHeight: 1.35 }}>Share it only with the person you chose. It works one time.</p>
      <div style={{ marginTop: 16, padding: '24px 16px', ...frostPanel, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
        <p style={{ margin: 0, fontSize: 12, fontWeight: 600, color: '#5c6578' }}>{label}</p>
        <p style={{ margin: 0, fontSize: 22, fontWeight: 700, letterSpacing: 1.2, color: '#0c1018' }}>{code}</p>
        <span style={{ background: 'rgba(61,109,255,0.16)', borderRadius: 12, padding: '5px 10px', fontSize: 12, fontWeight: 600, color: '#3d6dff' }}>Single use · Not used yet</span>
      </div>
      <div style={{ marginTop: 12, padding: '8px 14px', ...frostPanel }}>
        <FrostLine label="Created" value={created ? new Date(created).toLocaleString() : 'Oct 9, 2026 · 2:05 PM'} />
        <FrostLine label="Works for" value="One use" />
        <FrostLine label="Logged on-chain" value={created ? 'Saved on this device' : 'Yes'} />
      </div>
      <p style={noteCopy}>Need to share with someone else? Generate a separate code for each person.</p>
      <button type="button" onClick={onCopy} style={{ ...livePrimary, marginTop: 16 }}>{copied ? 'Copied' : 'Copy code'}</button>
      <button type="button" onClick={onShare} style={{ ...liveGhost, marginTop: 10 }}>Share</button>
    </Page>
  );
}

function Log({ go, codes }: { go: Go; codes: { code: string; who: string; note: string; at: number; used: boolean }[] | null }) {
  const rows: [string, string, string, string][] = codes
    ? (codes.length
      ? codes.slice(0, 3).map((row) => [
          `${row.who}${row.note ? ` · ${row.note}` : ''}`,
          row.used ? 'Used and burned' : 'Not used',
          row.used ? '#5c6578' : '#3d6dff',
          `${row.code.slice(0, 8)}…${row.code.slice(-4)} · ${new Date(row.at).toLocaleDateString()}`,
        ])
      : [['No codes yet', 'Generate one', '#5c6578', 'Codes for this payment are saved on this device']])
    : [
    ['Lawyer · Case 2291', 'Not used', '#3d6dff', 'ARX-7K2M…LX4P · Created Oct 9, 2026'],
    ['Judge · Court order', 'Used and burned', '#5c6578', 'ARX-4D8N…Q2WZ · Used Oct 8, 10:41 AM'],
    ['Regulator', 'Used and burned', '#5c6578', 'ARX-9H3F…T6BC · Used Oct 3, 9:15 AM'],
  ];
  return (
    <Page>
      <h1 style={{ margin: 0, fontSize: 30, fontWeight: 700 }}>Disclosure codes</h1>
      <p style={{ margin: '10px 0 0', color: '#8b9097', fontSize: 15, lineHeight: 1.35 }}>For this payment. Every code you generate and use is logged on-chain.</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 16 }}>
        {rows.map(([name, status, color, detail]) => (
          <div key={name} style={{ padding: '14px 16px', ...frostPanel }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ flex: 1, fontSize: 15, fontWeight: 700, color: '#0c1018' }}>{name}</span>
              <span style={{ background: 'rgba(61,109,255,0.12)', borderRadius: 12, padding: '5px 10px', fontSize: 12, fontWeight: 600, color }}>{status}</span>
            </div>
            <span style={{ display: 'block', marginTop: 6, fontSize: 13, color: '#5c6578' }}>{detail}</span>
          </div>
        ))}
      </div>
      <button type="button" onClick={() => go('code-create')} style={{ ...livePrimary, marginTop: 16 }}>Generate new code</button>
    </Page>
  );
}

function Status() {
  const hide = useAppHidesFigmaChrome();
  if (hide) return null;
  return (
    <>
      <span style={{ position: 'absolute', left: 28, top: 13, fontSize: 15, fontWeight: 600 }}>9:41</span>
      <img src="/wallet-figma/welcome/status.svg" alt="" width={66.6} height={11.33} style={{ position: 'absolute', left: 296, top: 17 }} />
    </>
  );
}

function HomeBar() {
  const hide = useAppHidesFigmaChrome();
  if (hide) return null;
  return <div style={{ position: 'absolute', left: 128, top: 831, width: 134, height: 5, borderRadius: 100, background: '#fff', opacity: 0.25 }} />;
}

const sectionEyebrow: CSSProperties = { margin: '18px 0 8px', fontSize: 12, fontWeight: 600, color: '#8b9097', letterSpacing: 0.2 };
const noteCopy: CSSProperties = { margin: '12px 0 0', fontSize: 13, color: '#8b9097', lineHeight: 1.35 };
const backBtn: CSSProperties = { position: 'absolute', left: 18, top: 56, width: 40, height: 40, borderRadius: 20, border: 'none', background: '#1c2025', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', padding: 0 };
const linkBtn: CSSProperties = { position: 'absolute', left: 107, top: 777, border: 'none', background: 'none', color: '#accafe', fontFamily: font.sans, fontSize: 14, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, padding: '4px 8px' };
const chip: CSSProperties = { height: 38, boxSizing: 'border-box', borderRadius: 20, padding: '0 16px', fontFamily: font.sans, fontSize: 14, fontWeight: 600, cursor: 'pointer' };
const field: CSSProperties = { width: '100%', height: 53, boxSizing: 'border-box', ...frostField, padding: '0 16px', color: '#0c1018', fontFamily: font.sans, fontSize: 15, outline: 'none' };
