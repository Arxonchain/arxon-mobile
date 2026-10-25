import { useState, type CSSProperties } from 'react';
import { FigmaImg } from '@/walletFigma/icons';
import { font } from '@/walletFigma/tokens';
import { useLiveFrame } from './liveFrame';
import { useAppHidesFigmaChrome } from './appChrome';
import { Unavailable } from './LiveScroll';

const art = (name: string) => `/wallet-figma/claim/${name}`;
const SCREENS = new Set(['claim', 'claim-done']);
type Go = (id: string, remember?: boolean) => void;

let claimed = false;

export function isClaimScreen(id: string) {
  return SCREENS.has(id);
}

export function hasClaimed() {
  return claimed;
}

export function ClaimScreens({ id, go, back }: { id: string; go: Go; back?: () => void }) {
  const live = useLiveFrame();
  const hideChrome = useAppHidesFigmaChrome();
  const leave = () => (back ? back() : go('home-funded', false));
  if (live?.app) {
    return (
      <div style={{ position: 'relative', width: 390, height: 844, background: '#050505', overflow: 'hidden', fontFamily: font.sans, color: '#fff' }}>
        <Unavailable title="Claim" body="Claiming ARX is not available on this wallet yet." onBack={leave} />
      </div>
    );
  }
  return (
    <div style={{ position: 'relative', width: 390, height: 844, background: '#050505', overflow: 'hidden', fontFamily: font.sans, color: '#fff' }}>
      {id === 'claim-done' ? <Success go={go} /> : <Claim leave={leave} go={go} />}
      {hideChrome ? null : (
      <div style={{ position: 'absolute', left: 128, top: 831, width: 134, height: 5, borderRadius: 100, background: '#fff', opacity: 0.25 }} />
      )}
    </div>
  );
}

function Claim({ leave, go }: { leave: () => void; go: Go }) {
  const live = useLiveFrame();
  const [err, setErr] = useState<string | null>(null);
  const rows = [
    ['Claim to', live?.accountLabel ?? 'Account 01'],
    ['You will receive', 'ARX, from your snapshot'],
    ['Claims left', '1 of 1'],
  ];
  const points = live?.app ? '0 ARX-P' : '12,480 ARX-P';
  return (
    <>
      <NoteStatus />
      <button type="button" aria-label="Back" onClick={leave} style={backBtn}>
        <FigmaImg src={art('back.svg')} width={20} height={20} />
      </button>
      <h1 style={title}>Claim your ARX</h1>
      <p style={sub}>Your mining points convert to ARX at mainnet. Each miner can claim once.</p>
      <div style={{ position: 'absolute', left: 18, top: 210, width: 354, boxSizing: 'border-box', background: '#11161f', border: '1px solid #2a3447', borderRadius: 16, padding: '24px 16px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
        <p style={{ margin: 0, fontSize: 12, fontWeight: 600, color: '#8b9097' }}>ARX-P BALANCE</p>
        <p style={{ margin: 0, fontSize: 36, fontWeight: 700 }}>{points}</p>
        <span style={{ background: '#1c2025', borderRadius: 12, padding: '5px 10px', fontSize: 12, fontWeight: 600, color: '#accafe' }}>Snapshot locked</span>
      </div>
      <div style={{ position: 'absolute', left: 18, top: 377, width: 354, boxSizing: 'border-box', background: '#1c2025', border: '1px solid #2a3447', borderRadius: 14, padding: '8px 0' }}>
        {rows.map(([label, value]) => (
          <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 16px', fontSize: 14 }}>
            <span style={{ flex: 1, color: '#8b9097' }}>{label}</span>
            <span style={{ fontWeight: 500 }}>{value}</span>
          </div>
        ))}
      </div>
      <p style={note}>Claiming is one-time and can’t be undone. Your snapshot can’t be changed once it’s locked.</p>
      {err ? <p style={{ position: 'absolute', left: 24, top: 680, width: 342, margin: 0, color: '#f25252', fontSize: 12 }}>{err}</p> : null}
      <button type="button" onClick={() => {
        if (live?.app) {
          setErr('Coming soon');
          return;
        }
        claimed = true;
        go('claim-done');
      }} style={{ ...fillBtn, top: 714 }}>Claim ARX</button>
    </>
  );
}

function Success({ go }: { go: Go }) {
  const rows: [string, string, string][] = [
    ['Claimed to', 'Account 01', '#fff'],
    ['Claims left', '0 of 1', '#fff'],
    ['Status', 'Confirmed', '#3ddc84'],
  ];
  return (
    <>
      <NoteStatus />
      <img src={art('glow.svg')} alt="" width={168} height={168} style={{ position: 'absolute', left: 111, top: 130 }} />
      <img src={art('ring.svg')} alt="" width={132} height={132} style={{ position: 'absolute', left: 129, top: 148 }} />
      <div style={{ position: 'absolute', left: 147, top: 166, width: 96, height: 96, borderRadius: 48, background: '#accafe', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <FigmaImg src={art('check.svg')} width={44} height={44} />
      </div>
      <p style={{ position: 'absolute', left: 35, top: 334, width: 320, margin: 0, textAlign: 'center', fontSize: 26, fontWeight: 700 }}>ARX claimed</p>
      <p style={{ position: 'absolute', left: 35, top: 376, width: 320, margin: 0, textAlign: 'center', fontSize: 32, fontWeight: 700, color: '#accafe' }}>From 12,480 ARX-P</p>
      <div style={{ position: 'absolute', left: 18, top: 440, width: 354, boxSizing: 'border-box', background: '#1c2025', borderRadius: 16, padding: 16 }}>
        {rows.map(([label, value, color]) => (
          <div key={label} style={{ height: 36, display: 'flex', alignItems: 'center', fontSize: 14 }}>
            <span style={{ flex: 1, color: '#8b9097' }}>{label}</span>
            <span style={{ fontWeight: 500, color }}>{value}</span>
          </div>
        ))}
      </div>
      <button type="button" onClick={() => go('home-funded')} style={{ ...fillBtn, top: 649 }}>Done</button>
    </>
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

const title: CSSProperties = { position: 'absolute', left: 24, top: 106, margin: 0, fontSize: 30, fontWeight: 700 };
const sub: CSSProperties = { position: 'absolute', left: 24, top: 152, width: 336, margin: 0, fontSize: 15, fontWeight: 400, color: '#8b9097', lineHeight: 1.25 };
const note: CSSProperties = { position: 'absolute', left: 18, top: 507, width: 354, boxSizing: 'border-box', margin: 0, background: '#11161f', border: '1px solid #2a3447', borderRadius: 14, padding: '14px 16px', fontSize: 13, color: '#8b9097', lineHeight: 1.25 };
const backBtn: CSSProperties = { position: 'absolute', left: 18, top: 56, width: 40, height: 40, borderRadius: 20, border: 'none', background: '#1c2025', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', padding: 0 };
const fillBtn: CSSProperties = { position: 'absolute', left: 19, width: 353, height: 55, border: 'none', borderRadius: 8, background: '#accafe', color: '#0c1018', fontFamily: font.sans, fontSize: 16, fontWeight: 600, cursor: 'pointer' };
