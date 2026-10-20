import { useState, type CSSProperties } from 'react';
import { FigmaImg } from '@/walletFigma/icons';
import { font } from '@/walletFigma/tokens';
import { useLiveFrame } from './liveFrame';
import { useAppHidesFigmaChrome } from './appChrome';

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
  const leave = () => (back ? back() : go(id === 'receipt' ? 'activity' : 'receipt', false));
  const label = made ? `FOR ${who.toUpperCase()}${note.trim() ? ` · ${note.trim().toUpperCase()}` : ''}` : 'FOR LAWYER · CASE 2291';

  const liveCode = live?.app && live.codes[0]?.code ? live.codes[0].code : CODE;
  const liveInspect = live?.app ? live.inspect : null;
  const shareText = liveInspect
    ? `Private receipt · ${liveInspect.amount} · ${liveInspect.hash}`
    : 'Private receipt · 25.00 ARX · Oct 7, 2026 · 4:12:36 PM';

  async function copyCode() {
    try {
      await navigator.clipboard.writeText(liveCode);
    } catch {
      /* preview can still show the confirmation */
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }

  async function share(text: string) {
    if (navigator.share) {
      try {
        await navigator.share({ text });
        return;
      } catch {
        /* fall through to the clipboard */
      }
    }
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      /* nothing else to do in the preview */
    }
  }

  return (
    <div style={{ position: 'relative', width: 390, height: 844, background: '#050505', overflow: 'hidden', fontFamily: font.sans, color: '#fff' }}>
      <style>{`.receipt-note::placeholder{color:#5c5f64}`}</style>
      <Status />
      <button type="button" aria-label="Back" onClick={leave} style={backBtn}>
        <FigmaImg src={art('back.svg')} width={20} height={20} />
      </button>
      <HomeBar />
      {id === 'receipt' && <Receipt go={go} onShare={() => share(shareText)} inspect={liveInspect} />}
      {id === 'code-create' && (
        <Create who={who} setWho={setWho} note={note} setNote={setNote} onGenerate={() => {
          if (live?.app) live.makeCode(who, note);
          setMade(true);
          go('code-ready');
        }} />
      )}
      {id === 'code-ready' && <Ready label={label} copied={copied} onCopy={copyCode} onShare={() => share(liveCode)} code={liveCode} created={live?.codes[0]?.at} />}
      {id === 'code-log' && <Log go={go} codes={live?.app ? live.codes : null} />}
    </div>
  );
}

function Receipt({ go, onShare, inspect }: { go: Go; onShare: () => void; inspect: { hash: string; amount: string; rows: [string, string][]; status: string } | null }) {
  const payment = inspect
    ? inspect.rows.slice(0, 6).map(([label, value], index) => [label, value, index === inspect.rows.length - 1 ? '#accafe' : '#fff'])
    : [
    ['Sender', 'arx1q8x4…t7c2n4p', '#fff'],
    ['Receiver', 'arx1q7p2…m2d9', '#fff'],
    ['Amount', '25.00 ARX', '#fff'],
    ['Time', 'Oct 7, 2026 · 4:12:36 PM', '#fff'],
    ['Block', '#1,204,918', '#fff'],
    ['Transaction hash', '0x7f3a…c91e', '#fff'],
    ['Hidden from public', 'Amount, balance', '#accafe'],
  ];
  const beforeAfter = inspect
    ? [['Hash', `${inspect.hash.slice(0, 10)}…${inspect.hash.slice(-4)}`, '#fff'], ['Status', inspect.status, '#fff']]
    : [['Before', '2,425.0000 ARX', '#fff'], ['After', '2,399.9996 ARX', '#fff']];
  return (
    <>
      <h1 style={title}>Private receipt</h1>
      <p style={sub}>Proof of this payment, stored permanently on the Arxon chain.</p>
      <Card top={210} rows={payment} />
      <p style={{ ...eyebrow, top: 470 }}>{inspect ? 'ON THIS DEVICE' : 'YOUR BALANCE AT THAT MOMENT'}</p>
      <Card top={492} rows={beforeAfter} />
      <p style={{ position: 'absolute', left: 30, top: 586, width: 330, margin: 0, fontSize: 12, color: '#8b9097', lineHeight: 1.25 }}>Only you can see your balance. The other person sees theirs on their own receipt.</p>
      <button type="button" onClick={() => go('code-create')} style={{ ...fillBtn, top: 649 }}>Generate disclosure code</button>
      <button type="button" onClick={onShare} style={{ ...lineBtn, top: 714 }}>Share receipt</button>
      <button type="button" onClick={() => go('code-log')} style={linkBtn}>
        View disclosure codes
        <FigmaImg src={art('chev.svg')} width={5.8} height={9.8} />
      </button>
    </>
  );
}

function Create({ who, setWho, note, setNote, onGenerate }: { who: string; setWho: (v: string) => void; note: string; setNote: (v: string) => void; onGenerate: () => void }) {
  return (
    <>
      <h1 style={title}>Disclosure code</h1>
      <p style={sub}>Give one person one-time access to the full details of this payment.</p>
      <p style={{ ...eyebrow, top: 210 }}>WHO IS THIS FOR?</p>
      <div style={{ position: 'absolute', left: 18, top: 234, width: 354, display: 'flex', gap: 8 }}>
        {WHO.map((name) => {
          const on = who === name;
          return (
            <button key={name} type="button" onClick={() => setWho(name)} style={{ ...chip, background: on ? '#accafe' : '#1c2025', color: on ? '#0c1018' : '#fff', border: on ? '1px solid transparent' : '1px solid #2a3447' }}>{name}</button>
          );
        })}
      </div>
      <p style={{ ...eyebrow, top: 292 }}>NOTE (OPTIONAL)</p>
      <input className="receipt-note" value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Case 2291" style={field} />
      <p style={{ ...eyebrow, top: 389 }}>WHAT THEY WILL SEE</p>
      <Card top={413} rows={[['Sender and receiver', 'Included', '#fff'], ['Amount', 'Included', '#fff'], ['Time and block', 'Included', '#fff'], ['Both balance snapshots', 'Included', '#fff']]} />
      <div style={noteBox(575)}>This code works once, then burns for good. Every code you generate and use is logged on-chain.</div>
      <button type="button" onClick={onGenerate} style={{ ...fillBtn, top: 714 }}>Generate code</button>
    </>
  );
}

function Ready({ label, copied, onCopy, onShare, code, created }: { label: string; copied: boolean; onCopy: () => void; onShare: () => void; code: string; created?: number }) {
  return (
    <>
      <h1 style={title}>Code ready</h1>
      <p style={sub}>Share it only with the person you chose. It works one time.</p>
      <div style={{ position: 'absolute', left: 18, top: 210, width: 354, boxSizing: 'border-box', background: '#11161f', border: '1px solid #2a3447', borderRadius: 16, padding: '24px 16px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
        <p style={{ margin: 0, fontSize: 12, fontWeight: 600, color: '#8b9097' }}>{label}</p>
        <p style={{ margin: 0, fontSize: 22, fontWeight: 700, letterSpacing: 1.2 }}>{code}</p>
        <span style={{ background: '#1c2025', borderRadius: 12, padding: '5px 10px', fontSize: 12, fontWeight: 600, color: '#accafe' }}>Single use · Not used yet</span>
      </div>
      <Card top={368} rows={[['Created', created ? new Date(created).toLocaleString() : 'Oct 9, 2026 · 2:05 PM', '#fff'], ['Works for', 'One use', '#fff'], ['Logged on-chain', created ? 'Saved on this device' : 'Yes', '#fff']]} />
      <div style={noteBox(498)}>Need to share with someone else? Generate a separate code for each person.</div>
      <button type="button" onClick={onCopy} style={{ ...fillBtn, top: 649 }}>{copied ? 'Copied' : 'Copy code'}</button>
      <button type="button" onClick={onShare} style={{ ...lineBtn, top: 714 }}>Share</button>
    </>
  );
}

function Log({ go, codes }: { go: Go; codes: { code: string; who: string; note: string; at: number; used: boolean }[] | null }) {
  const rows: [string, string, string, string][] = codes
    ? (codes.length
      ? codes.slice(0, 3).map((row) => [
          `${row.who}${row.note ? ` · ${row.note}` : ''}`,
          row.used ? 'Used and burned' : 'Not used',
          row.used ? '#8b9097' : '#accafe',
          `${row.code.slice(0, 8)}…${row.code.slice(-4)} · ${new Date(row.at).toLocaleDateString()}`,
        ])
      : [['No codes yet', 'Generate one', '#8b9097', 'Codes for this payment are saved on this device']])
    : [
    ['Lawyer · Case 2291', 'Not used', '#accafe', 'ARX-7K2M…LX4P · Created Oct 9, 2026'],
    ['Judge · Court order', 'Used and burned', '#8b9097', 'ARX-4D8N…Q2WZ · Used Oct 8, 10:41 AM'],
    ['Regulator', 'Used and burned', '#8b9097', 'ARX-9H3F…T6BC · Used Oct 3, 9:15 AM'],
  ];
  return (
    <>
      <h1 style={title}>Disclosure codes</h1>
      <p style={sub}>For this payment. Every code you generate and use is logged on-chain.</p>
      {rows.map(([name, status, color, detail], index) => (
        <div key={name} style={{ position: 'absolute', left: 18, top: 210 + index * 93, width: 354, boxSizing: 'border-box', background: '#1c2025', border: '1px solid #2a3447', borderRadius: 14, padding: 16, display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ flex: 1, fontSize: 15, fontWeight: 600 }}>{name}</span>
            <span style={{ background: '#1c2025', borderRadius: 12, padding: '5px 10px', fontSize: 12, fontWeight: 600, color }}>{status}</span>
          </div>
          <span style={{ fontSize: 13, color: '#8b9097' }}>{detail}</span>
        </div>
      ))}
      <button type="button" onClick={() => go('code-create')} style={{ ...fillBtn, top: 714 }}>Generate new code</button>
    </>
  );
}

function Card({ top, rows }: { top: number; rows: string[][] }) {
  return (
    <div style={{ position: 'absolute', left: 18, top, width: 354, boxSizing: 'border-box', background: '#1c2025', border: '1px solid #2a3447', borderRadius: 14, padding: '8px 0' }}>
      {rows.map(([label, value, color]) => (
        <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 16px', fontSize: 14 }}>
          <span style={{ flex: 1, color: '#8b9097' }}>{label}</span>
          <span style={{ fontWeight: 500, color }}>{value}</span>
        </div>
      ))}
    </div>
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

function noteBox(top: number): CSSProperties {
  return { position: 'absolute', left: 18, top, width: 354, boxSizing: 'border-box', background: '#11161f', border: '1px solid #2a3447', borderRadius: 14, padding: '14px 16px', fontSize: 13, color: '#8b9097', lineHeight: 1.25 };
}

const title: CSSProperties = { position: 'absolute', left: 24, top: 106, margin: 0, fontSize: 30, fontWeight: 700 };
const sub: CSSProperties = { position: 'absolute', left: 24, top: 152, width: 336, margin: 0, fontSize: 15, color: '#8b9097', lineHeight: 1.25 };
const eyebrow: CSSProperties = { position: 'absolute', left: 24, margin: 0, fontSize: 12, fontWeight: 600, color: '#8b9097', letterSpacing: 0.2 };
const backBtn: CSSProperties = { position: 'absolute', left: 18, top: 56, width: 40, height: 40, borderRadius: 20, border: 'none', background: '#1c2025', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', padding: 0 };
const fillBtn: CSSProperties = { position: 'absolute', left: 19, width: 353, height: 55, border: 'none', borderRadius: 8, background: '#accafe', color: '#0c1018', fontFamily: font.sans, fontSize: 16, fontWeight: 600, cursor: 'pointer' };
const lineBtn: CSSProperties = { position: 'absolute', left: 19, width: 353, height: 55, borderRadius: 8, border: '1px solid #2a3447', background: 'transparent', color: '#accafe', fontFamily: font.sans, fontSize: 16, fontWeight: 600, cursor: 'pointer' };
const linkBtn: CSSProperties = { position: 'absolute', left: 107, top: 777, border: 'none', background: 'none', color: '#accafe', fontFamily: font.sans, fontSize: 14, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, padding: '4px 8px' };
const chip: CSSProperties = { height: 38, boxSizing: 'border-box', borderRadius: 20, padding: '0 16px', fontFamily: font.sans, fontSize: 14, fontWeight: 600, cursor: 'pointer' };
const field: CSSProperties = { position: 'absolute', left: 18, top: 316, width: 354, height: 53, boxSizing: 'border-box', background: '#1c2025', border: '1px solid #2a3447', borderRadius: 14, padding: '0 16px', color: '#fff', fontFamily: font.sans, fontSize: 15, outline: 'none' };
