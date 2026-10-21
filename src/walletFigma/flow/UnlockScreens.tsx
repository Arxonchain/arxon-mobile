import { useState, type CSSProperties, type ReactNode } from 'react';
import { font } from '@/walletFigma/tokens';
import { useLiveFrame } from './liveFrame';
import { useAppHidesFigmaChrome } from './appChrome';

const art = (name: string) => `/wallet-figma/unlock/${name}`;
type Go = (id: string, remember?: boolean) => void;

export function UnlockScreens({
  id,
  go,
  back,
  password,
}: {
  id: string;
  go: Go;
  back?: () => void;
  password: string;
}) {
  if (id === 'unlock' || id === 'unlock-wrong') {
    return <Unlock wrong={id === 'unlock-wrong'} password={password} go={go} />;
  }
  if (id === 'dapp' || id === 'dapp-tx') {
    return <Request id={id} go={go} back={back} />;
  }
  return <Connected back={() => (back ? back() : go('privacy', false))} go={go} />;
}

function Unlock({ wrong, password, go }: { wrong: boolean; password: string; go: Go }) {
  const live = useLiveFrame();
  const [value, setValue] = useState(wrong ? 'incorrect' : '');
  const [show, setShow] = useState(false);
  const expected = password || 'Arxon123!';

  function unlock() {
    if (live?.app) {
      void live.unlock(value).then((ok) => go(ok ? 'home' : 'unlock-wrong', false));
      return;
    }
    const typed = value;
    if (typed === expected) go('home-funded');
    else go('unlock-wrong', false);
  }

  return (
    <Screen>
      <Mark />
      <h1 style={{ ...center, top: 262, width: 340, left: 25, fontSize: 30, fontWeight: 700, color: '#fff' }}>Welcome back</h1>
      <p style={{ ...center, top: 308, width: 320, left: 35, fontSize: 15, color: '#8b9097' }}>Enter your password to unlock Arxon.</p>
      {wrong && <p style={{ position: 'absolute', left: 25, top: 366, margin: 0, color: '#f55c5c', fontWeight: 500, fontSize: 13 }}>Incorrect password. Try again.</p>}
      <label style={{ position: 'absolute', left: 18, top: wrong ? 398 : 372, width: 354, height: 56, boxSizing: 'border-box', background: '#1c2025', border: wrong ? '1px solid #f55c5c' : '1px solid #2a3447', borderRadius: 14, display: 'flex', alignItems: 'center', padding: '0 16px', gap: 8 }}>
        <input
          type={show ? 'text' : 'password'}
          value={value}
          placeholder="Enter your password"
          onChange={(e) => setValue(e.target.value)}
          style={{ flex: 1, minWidth: 0, border: 'none', outline: 'none', background: 'transparent', color: '#fff', fontFamily: font.sans, fontSize: 15 }}
        />
        <button type="button" onClick={() => setShow((v) => !v)} aria-label={show ? 'Hide password' : 'Show password'} style={iconBtn}>
          <img src="/wallet-figma/create/eye.svg" alt="" width={20} height={20} />
        </button>
      </label>
      <button type="button" onClick={() => go('import')} style={{ position: 'absolute', left: wrong ? 18 : 18, top: wrong ? 466 : 444, width: wrong ? undefined : 354, border: 'none', background: 'transparent', color: '#accafe', fontFamily: font.sans, fontWeight: 600, fontSize: 14, cursor: 'pointer', textAlign: wrong ? 'left' : 'center' }}>
        Forgot password?
      </button>
      <button type="button" onClick={unlock} style={{ ...unlockBtn, background: '#90b9ff', color: '#0c1018', top: 649 }}>Unlock</button>
      <button type="button" onClick={() => {
        if (live?.app) {
          void live.unlockBiometric().then((ok) => go(ok ? 'home' : 'unlock-wrong', false));
          return;
        }
        go('home-funded');
      }} style={{ ...unlockBtn, top: 714, background: 'transparent', color: '#accafe', border: '1.5px solid #2a3447', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
        <img src={art('face.svg')} alt="" width={20} height={20} />
        Use Face ID
      </button>
    </Screen>
  );
}

function Request({ id, go, back }: { id: string; go: Go; back?: () => void }) {
  const live = useLiveFrame();
  const pay = id === 'dapp-tx';
  const peer = live?.app ? live.wcPeer : null;
  const host = peer?.url ? peer.url.replace(/^https?:\/\//, '').replace(/\/$/, '') : 'app.arxswap.io';
  const title = pay ? 'Approve transaction' : 'Connection request';
  const body = peer
    ? pay
      ? `${peer.name} wants to send from ${live?.accountLabel ?? 'Account 01'}.`
      : `${peer.name} wants to connect to your wallet.`
    : pay
      ? 'Arxswap wants to send from Account 01.'
      : 'Arxswap wants to connect to your wallet.';
  const close = () => {
    if (live?.app) {
      void live.rejectWc().finally(() => go('home', false));
      return;
    }
    back ? back() : go(pay ? 'home-funded' : 'home', false);
  };
  const confirm = () => {
    if (live?.app) {
      void live.approveWc().then(() => go('home', false)).catch(() => go('home', false));
      return;
    }
    go(pay ? 'send-success' : 'home');
  };
  return (
    <Screen clock="ready">
      <div style={{ position: 'absolute', inset: 0, background: '#0b0f16' }}>
        <div style={{ position: 'absolute', left: 18, top: 60, width: 354, height: 36, borderRadius: 10, background: '#1c2025' }} />
        <div style={{ position: 'absolute', left: 18, top: 120, width: 354, height: 150, borderRadius: 16, background: '#1c2025' }} />
        <div style={{ position: 'absolute', left: 18, top: 292, width: 354, height: 56, borderRadius: 12, background: '#1c2025' }} />
        <div style={{ position: 'absolute', left: 18, top: 360, width: 354, height: 56, borderRadius: 12, background: '#1c2025' }} />
      </div>
      <button type="button" aria-label="Close" onClick={close} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.62)', border: 'none' }} />
      <div style={{ position: 'absolute', left: 0, top: 284, width: 390, height: 560, boxSizing: 'border-box', background: '#11161f', border: '1px solid #2a3447', borderRadius: '24px 24px 0 0' }}>
        <div style={{ position: 'absolute', left: 174, top: 9, width: 40, height: 4, borderRadius: 2, background: '#2a3447' }} />
        <div style={{ position: 'absolute', left: 166, top: 31, width: 56, height: 56, borderRadius: 28, background: '#1c2025', border: '1px solid #2a3447', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#accafe', fontWeight: 700, fontSize: 24 }}>S</div>
        <h1 style={{ ...center, top: 101, left: 24, width: 342, fontSize: 22, fontWeight: 700, color: '#fff' }}>{title}</h1>
        <div style={{ position: 'absolute', left: 109, top: 139, width: 170, height: 30, borderRadius: 15, background: '#1c2025', border: '1px solid #2a3447', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
          <img src={art('lock.svg')} alt="" width={14} height={14} />
          <span style={{ fontWeight: 500, fontSize: 13 }}>{host.length > 18 ? `${host.slice(0, 16)}…` : host}</span>
        </div>
        <p style={{ ...center, top: 183, left: 24, width: 342, fontSize: 14, color: '#8b9097' }}>
          {body}
        </p>
        <div style={{ position: 'absolute', left: 17, top: 217, width: 354, height: 150, boxSizing: 'border-box', background: '#1c2025', border: '1px solid #2a3447', borderRadius: 14 }}>
          <Perm icon="check.svg" tone="ok">{pay ? (peer?.detail || 'Send from this wallet') : 'See your public address'}</Perm>
          <div style={{ position: 'absolute', left: 15, top: 49, width: 322, height: 1, background: '#2a3447' }} />
          <Perm icon="check.svg" tone="ok" top={50}>{pay ? 'Network fee 0.0004 ARX' : 'Ask you to approve transactions'}</Perm>
          <div style={{ position: 'absolute', left: 15, top: 99, width: 322, height: 1, background: '#2a3447' }} />
          <Perm icon="shield.svg" tone="idle" top={100}>{pay ? 'Sent privately · amount hidden' : 'Balances stay hidden in Private mode'}</Perm>
        </div>
        <div style={{ position: 'absolute', left: 17, top: 383, width: 354, height: 56, boxSizing: 'border-box', background: '#1c2025', border: '1px solid #2a3447', borderRadius: 12, display: 'flex', alignItems: 'center', gap: 12, padding: '0 14px' }}>
          <img src={art('avatar.svg')} alt="" width={32} height={32} />
          <span>
            <span style={{ display: 'block', fontWeight: 600, fontSize: 15 }}>{live?.accountLabel ?? 'Account 01'}</span>
            <span style={{ display: 'block', color: '#8b9097', fontSize: 12 }}>{live?.address ? `${live.address.slice(0, 6)}…${live.address.slice(-4)}` : 'arx1q8x4…t7c2n4p'}</span>
          </span>
          <span style={{ flex: 1 }} />
          <img src={art('chev-down.svg')} alt="" width={18} height={18} />
        </div>
        <button type="button" onClick={close} style={{ ...pair, left: 17, background: 'transparent', color: '#fff', border: '1px solid #2a3447' }}>{pay ? 'Reject' : 'Cancel'}</button>
        <button type="button" onClick={confirm} style={{ ...pair, left: 200, background: '#accafe', color: '#0c1018', border: 'none' }}>{pay ? 'Approve' : 'Connect'}</button>
      </div>
    </Screen>
  );
}

function Connected({ back, go }: { back: () => void; go: Go }) {
  const live = useLiveFrame();
  const [arxswap, setArxswap] = useState(true);
  const sessions = live?.app ? live.wcSessions : arxswap ? [{ name: 'Arxswap', url: 'app.arxswap.io', topic: 'demo' }] : [];
  return (
    <Screen clock="ready">
      <button type="button" onClick={back} aria-label="Back" style={{ position: 'absolute', left: 18, top: 56, width: 40, height: 40, borderRadius: 20, border: 'none', background: '#1c2025', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
        <img src={art('chev.svg')} alt="" width={20} height={20} />
      </button>
      <h1 style={{ position: 'absolute', left: 24, top: 106, margin: 0, fontSize: 30, fontWeight: 700 }}>Connected apps</h1>
      <p style={{ position: 'absolute', left: 24, top: 152, width: 336, margin: 0, color: '#8c8f96', fontSize: 15, lineHeight: '22px' }}>
        Apps that can see your address and ask you to approve transactions.
      </p>
      <div style={{ position: 'absolute', left: 18, top: 222, width: 354, background: '#1c2126', border: '1px solid #293347', borderRadius: 16, overflow: 'hidden' }}>
        {sessions.map((row, index) => (
          <div key={row.topic}>
            {index > 0 && <div style={{ height: 1, margin: '0 16px', background: '#293347' }} />}
            <AppRow
              mark={(row.name[0] || 'A').toUpperCase()}
              title={row.name}
              detail={`${row.url.replace(/^https?:\/\//, '') || 'WalletConnect'} · Connected`}
              action="Disconnect"
              danger
              onAction={() => {
                if (live?.app) void live.disconnectWc(row.topic);
                else setArxswap(false);
              }}
            />
          </div>
        ))}
        {sessions.length > 0 && <div style={{ height: 1, margin: '0 16px', background: '#293347' }} />}
        <AppRow mark="M" title="Arxon Mining" detail="Extension · Wallet access" action="Manage" onAction={() => go('mine-entry')} />
      </div>
      <div style={{ position: 'absolute', left: 18, top: sessions.length ? 388 : 316, width: 354, boxSizing: 'border-box', background: '#11161f', border: '1px solid #2a3447', borderRadius: 14, padding: '14px 16px', color: '#8b9097', fontSize: 13 }}>
        Disconnecting stops an app from seeing your address. You can connect it again later.
      </div>
    </Screen>
  );
}

function AppRow({ mark, title, detail, action, danger, onAction }: { mark: string; title: string; detail: string; action: string; danger?: boolean; onAction?: () => void }) {
  return (
    <div style={{ height: 72, display: 'flex', alignItems: 'center', padding: '0 16px', gap: 12 }}>
      <span style={{ width: 40, height: 40, borderRadius: 20, background: '#293347', color: '#abc9ff', fontWeight: 700, fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', flex: '0 0 40px' }}>{mark}</span>
      <span style={{ flex: 1, minWidth: 0 }}>
        <span style={{ display: 'block', fontWeight: 600, fontSize: 15 }}>{title}</span>
        <span style={{ display: 'block', marginTop: 2, color: '#8c8f96', fontSize: 12 }}>{detail}</span>
      </span>
      <button type="button" onClick={onAction} style={{ border: 'none', background: 'transparent', color: danger ? '#f55c5c' : '#abc9ff', fontFamily: font.sans, fontWeight: 600, fontSize: 13, cursor: onAction ? 'pointer' : 'default' }}>{action}</button>
    </div>
  );
}

function Perm({ icon, tone, top = 0, children }: { icon: string; tone: 'ok' | 'idle'; top?: number; children: ReactNode }) {
  return (
    <div style={{ position: 'absolute', left: 0, top, height: 50, width: 354, display: 'flex', alignItems: 'center', gap: 12, padding: '0 16px', boxSizing: 'border-box' }}>
      <span style={{ width: 24, height: 24, borderRadius: 12, background: tone === 'ok' ? '#12261d' : '#2a3447', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: '0 0 24px' }}>
        <img src={art(icon)} alt="" width={14} height={14} />
      </span>
      <span style={{ fontWeight: 500, fontSize: 14 }}>{children}</span>
    </div>
  );
}

function Mark() {
  return (
    <div style={{ position: 'absolute', left: 151, top: 151, width: 89, height: 89, borderRadius: 44.5, background: '#5c94f4', padding: 2, boxSizing: 'border-box' }}>
      <div style={{ position: 'relative', width: 85, height: 85, borderRadius: 42.5, background: '#90B9FF', overflow: 'hidden' }}>
        <img src={art('mark.svg')} alt="" width={85} height={85} style={{ position: 'absolute', inset: 0 }} />
        <div style={{ position: 'absolute', left: 16, top: 22.71, width: 57, height: 43.588, background: '#050505', WebkitMaskImage: 'url(/wallet-figma/unlock/mark-mask.png)', maskImage: 'url(/wallet-figma/unlock/mark-mask.png)', WebkitMaskSize: '57px 43.588px', maskSize: '57px 43.588px', WebkitMaskRepeat: 'no-repeat', maskRepeat: 'no-repeat', maskMode: 'luminance' }} />
      </div>
    </div>
  );
}

function Screen({ children, clock = 'flow' }: { children: ReactNode; clock?: 'flow' | 'ready' }) {
  const hide = useAppHidesFigmaChrome();
  return (
    <div style={{ position: 'relative', width: 390, height: 844, background: '#050505', overflow: 'hidden', fontFamily: font.sans, color: '#fff' }}>
      <style>{`input::placeholder { color: #5c5f64; }`}</style>
      {hide ? null : (
      <div style={{ position: 'absolute', left: 0, top: 0, width: 390, height: 44, zIndex: 3 }}>
        <span style={{ position: 'absolute', left: clock === 'ready' ? 28 : 21, top: clock === 'ready' ? 13 : 14, width: clock === 'ready' ? undefined : 54, textAlign: 'center', fontSize: clock === 'ready' ? 15 : 14, fontWeight: 600, letterSpacing: clock === 'ready' ? 0 : -0.28 }}>9:41</span>
        <img src="/wallet-figma/welcome/status.svg" alt="" width={66.6} height={11.33} style={{ position: 'absolute', left: clock === 'ready' ? 296 : 288.67, top: clock === 'ready' ? 17 : 17.33 }} />
      </div>
      )}
      {children}
      {hide ? null : (
      <div style={{ position: 'absolute', left: 0, right: 0, bottom: 8, display: 'flex', justifyContent: 'center', opacity: 0.25, zIndex: 4, pointerEvents: 'none' }}>
        <div style={{ width: 134, height: 5, borderRadius: 100, background: '#fff' }} />
      </div>
      )}
    </div>
  );
}

const center: CSSProperties = { position: 'absolute', margin: 0, textAlign: 'center', fontWeight: 400, lineHeight: 'normal' };
const iconBtn: CSSProperties = { width: 20, height: 20, padding: 0, border: 'none', background: 'none', cursor: 'pointer' };
const unlockBtn: CSSProperties = { position: 'absolute', left: 19, width: 353, height: 55, borderRadius: 8, fontFamily: font.sans, fontWeight: 600, fontSize: 16, cursor: 'pointer' };
const pair: CSSProperties = { position: 'absolute', top: 463, width: 171, height: 55, borderRadius: 8, fontFamily: font.sans, fontWeight: 600, fontSize: 16, cursor: 'pointer' };
