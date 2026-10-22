import { useEffect, useState, type CSSProperties, type ReactNode } from 'react';
import { bioEnableLabel, biometricsCaps, enableBiometrics, type BioKind } from '@/chainWallet/biometrics';
import { currentPassword } from '@/chainWallet/session';
import { useAppHidesFigmaChrome } from './appChrome';
import { font } from '@/walletFigma/tokens';
import { useLiveFrame } from './liveFrame';
import { FingerprintMark } from './BioMark';

const art = (name: string) => `/wallet-figma/finish/${name}`;
type Go = (id: string, remember?: boolean) => void;

function EnableBiometrics({ go }: { go: Go }) {
  const live = useLiveFrame();
  const [kind, setKind] = useState<BioKind>('face');
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (!live?.app) return;
    void biometricsCaps().then((caps) => setKind(caps.kind === 'none' ? 'fingerprint' : caps.kind));
  }, [live?.app]);
  const livePhone = !!live?.app;
  const title = livePhone ? bioEnableLabel(kind) : 'Enable Face ID';
  async function onEnable() {
    if (!livePhone) {
      go('ready-skip');
      return;
    }
    setBusy(true);
    setErr(null);
    try {
      await enableBiometrics(currentPassword() || live?.sessionPassword || undefined);
      go('ready-skip');
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Could not enable fingerprint or Face ID.');
    } finally {
      setBusy(false);
    }
  }
  return (
    <Screen>
      <img src={art('face-glow.svg')} alt="" width={168} height={168} style={{ position: 'absolute', left: 111, top: 170 }} />
      <img src={art('face-ring.svg')} alt="" width={132} height={132} style={{ position: 'absolute', left: 129, top: 188 }} />
      <div style={{ position: 'absolute', left: 147, top: 206, width: 96, height: 96, borderRadius: 48, background: '#1c2025', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#accafe' }}>
        {livePhone && kind === 'fingerprint' ? <FingerprintMark size={44} /> : <img src={art('face.svg')} alt="" width={44} height={44} />}
      </div>
      <h1 style={{ ...centerTitle, top: 374, width: 320, left: 35, fontSize: 26 }}>{title}</h1>
      <p style={{ ...centerCopy, top: 418, width: 300, left: 45, fontSize: 15 }}>
        Unlock Arxon and approve transactions faster. Your recovery phrase stays protected on this device.
      </p>
      {err ? <p style={{ ...centerCopy, top: 500, width: 320, left: 35, fontSize: 13, color: '#f25252' }}>{err}</p> : null}
      <button type="button" disabled={busy} onClick={() => void onEnable()} style={{ ...primary, top: 649, width: 352 }}>{busy ? 'Waiting…' : title}</button>
      <button type="button" onClick={() => go('ready-skip')} style={later}>Maybe later</button>
    </Screen>
  );
}

export function FinishScreens({ id, go }: { id: string; go: Go }) {
  if (id === 'face') {
    return <EnableBiometrics go={go} />;
  }
  return (
    <Screen>
      <img src={art('ready-glow.svg')} alt="" width={433.333} height={433.333} style={{ position: 'absolute', left: -21.67, top: 13.33 }} />
      <img src={art('ready-orbit.svg')} alt="" width={220} height={220} style={{ position: 'absolute', left: 85, top: 120 }} />
      <img src={art('ready-orbit-inner.svg')} alt="" width={150} height={150} style={{ position: 'absolute', left: 120, top: 155 }} />
      <div style={{ position: 'absolute', left: 147, top: 182, width: 96, height: 96, borderRadius: 48, background: '#accafe', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <img src={art('ready-check.svg')} alt="" width={44} height={44} />
      </div>
      <h1 style={{ ...centerTitle, top: 372, width: 340, left: 25, fontSize: 30 }}>You’re all set!</h1>
      <p style={{ ...centerCopy, top: 420, width: 300, left: 45, fontSize: 16 }}>
        Your Arxon wallet is ready. Fund it to start using Arxon privately.
      </p>
      <div style={{ position: 'absolute', left: 18, top: 508, width: 354, boxSizing: 'border-box', background: '#1c2025', borderRadius: 16, padding: 16 }}>
        <ReadyRow>Wallet ready on this device</ReadyRow>
        <ReadyRow>Password set</ReadyRow>
        <ReadyRow>Back up anytime from Account</ReadyRow>
      </div>
      <button type="button" onClick={() => go('home')} style={{ ...primary, top: 712, width: 353 }}>Go to wallet</button>
    </Screen>
  );
}

function ReadyRow({ children }: { children: ReactNode }) {
  return (
    <div style={{ height: 40, display: 'flex', alignItems: 'center', gap: 12 }}>
      <span style={{ width: 22, height: 22, borderRadius: 11, background: '#143524', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: '0 0 22px' }}>
        <img src={art('ready-check-sm.svg')} alt="" width={13} height={13} />
      </span>
      <span style={{ fontWeight: 500, fontSize: 15 }}>{children}</span>
    </div>
  );
}

function Screen({ children }: { children: ReactNode }) {
  const hide = useAppHidesFigmaChrome();
  return (
    <div style={{ position: 'relative', width: 390, height: 844, background: '#050505', overflow: 'hidden', fontFamily: font.sans, color: '#fff' }}>
      {hide ? null : (
      <div style={{ position: 'absolute', left: 0, top: 0, width: 390, height: 44 }}>
        <span style={{ position: 'absolute', left: 21, top: 14, width: 54, textAlign: 'center', fontSize: 14, fontWeight: 600, letterSpacing: -0.28 }}>9:41</span>
        <img src="/wallet-figma/welcome/status.svg" alt="" width={66.6} height={11.33} style={{ position: 'absolute', left: 288.67, top: 17.33 }} />
      </div>
      )}
      {children}
      {hide ? null : (
      <div style={{ position: 'absolute', left: 0, right: 0, bottom: 8, display: 'flex', justifyContent: 'center', opacity: 0.25 }}>
        <div style={{ width: 134, height: 5, borderRadius: 100, background: '#fff' }} />
      </div>
      )}
    </div>
  );
}

const centerTitle: CSSProperties = { position: 'absolute', margin: 0, textAlign: 'center', fontWeight: 700, lineHeight: 'normal' };
const centerCopy: CSSProperties = { position: 'absolute', margin: 0, textAlign: 'center', color: '#8b9097', fontWeight: 400, lineHeight: 'normal' };
const primary: CSSProperties = { position: 'absolute', left: 19, height: 55, border: 'none', borderRadius: 8, background: '#accafe', color: '#0c1018', fontFamily: font.sans, fontWeight: 600, fontSize: 16, cursor: 'pointer' };
const later: CSSProperties = { position: 'absolute', left: 19, top: 722, width: 353, border: 'none', background: 'transparent', color: '#accafe', fontFamily: font.sans, fontWeight: 600, fontSize: 15, cursor: 'pointer' };
