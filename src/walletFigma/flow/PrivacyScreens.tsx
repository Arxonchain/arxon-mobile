import { useEffect, useState, type CSSProperties } from 'react';
import { FigmaImg } from '@/walletFigma/icons';
import { font } from '@/walletFigma/tokens';
import { setVaultLockRequired } from './VaultScreens';
import { useLiveFrame } from './liveFrame';
import { useAppHidesFigmaChrome } from './appChrome';
import { sessionStore, type AutoLock } from '@/chainWallet/session';
import { writeDefaultPrivacy } from '@/walletFigma/privacyPrefs';
import { resolvePhraseWords } from './phraseWords';

const art = (name: string) => `/wallet-figma/privacy/${name}`;
const onToggle = '/wallet-figma/send/toggle-on.svg';
const offToggle = '/wallet-figma/send/toggle-off.svg';
const LOCKS = ['Immediately', '1 minute', '5 minutes', '15 minutes', '1 hour'];
const SCREENS = new Set(['privacy', 'defaults', 'balance-privacy', 'autolock', 'face-settings', 'change-pass', 'view-verify', 'view-hidden', 'view-shown']);
type Go = (id: string, remember?: boolean) => void;

export function isPrivacyScreen(id: string) {
  return SCREENS.has(id);
}

export function PrivacyScreens({ id, go, back, password, setPassword }: { id: string; go: Go; back?: () => void; password: string; setPassword: (value: string) => void }) {
  const live = useLiveFrame();
  const [privateMode, setPrivateMode] = useState(true);
  const [hideLaunch, setHideLaunch] = useState(true);
  const [hideActivity, setHideActivity] = useState(true);
  const [shots, setShots] = useState(false);
  const [hideSender, setHideSender] = useState(() => live?.defaults.hideSender ?? false);
  const [hideReceiver, setHideReceiver] = useState(() => live?.defaults.hideReceiver ?? false);
  const [hideAmount, setHideAmount] = useState(() => live?.defaults.hideAmount ?? true);
  const [hideBalance, setHideBalance] = useState(() => live?.defaults.hideBalance ?? true);
  const [lock, setLock] = useState(sessionStore.autoLock());
  const [face, setFace] = useState(true);
  const [faceSend, setFaceSend] = useState(true);
  const [facePhrase, setFacePhrase] = useState(true);
  const [faceVault, setFaceVault] = useState(true);
  const expected = password.length >= 8 ? password : 'Arxon123!';
  const leave = (fallback: string) => (back ? back() : go(fallback, false));

  return (
    <div style={{ position: 'relative', width: 390, height: 844, background: '#050505', overflow: 'hidden', fontFamily: font.sans, color: '#fff' }}>
      {(id === 'privacy' || id === 'autolock') && (
        <Settings
          privateMode={privateMode}
          setPrivateMode={setPrivateMode}
          hideLaunch={hideLaunch}
          setHideLaunch={setHideLaunch}
          hideActivity={hideActivity}
          setHideActivity={setHideActivity}
          shots={shots}
          setShots={setShots}
          lock={lock}
          onBack={() => leave('account')}
          go={go}
        />
      )}
      {id === 'defaults' && (
        <Defaults
          hideSender={hideSender}
          setHideSender={setHideSender}
          hideReceiver={hideReceiver}
          setHideReceiver={setHideReceiver}
          hideAmount={hideAmount}
          setHideAmount={setHideAmount}
          hideBalance={hideBalance}
          setHideBalance={setHideBalance}
          onBack={() => leave('privacy')}
          onSave={() => {
            const flags = { hideSender, hideReceiver, hideAmount, hideBalance };
            writeDefaultPrivacy(flags);
            live?.saveDefaults(flags);
            go('privacy', false);
          }}
          onBalance={() => go('balance-privacy')}
        />
      )}
      {id === 'balance-privacy' && (
        <Balance hide={hideBalance} setHide={setHideBalance} onBack={() => leave('defaults')} onDone={() => leave('defaults')} />
      )}
      {id === 'face-settings' && (
        <Face
          face={face}
          setFace={setFace}
          send={faceSend}
          setSend={setFaceSend}
          phrase={facePhrase}
          setPhrase={setFacePhrase}
          vault={faceVault}
          setVault={(on) => { setFaceVault(on); setVaultLockRequired(on); sessionStore.setVaultLock(on); }}
          onBack={() => leave('account')}
          go={go}
        />
      )}
      {id === 'change-pass' && <Change expected={expected} onSave={setPassword} persist={live?.persistPassword} unlock={live?.unlock} onBack={() => leave('face-settings')} onDone={() => go('face-settings', false)} />}
      {id === 'view-verify' && <Verify expected={expected} unlock={live?.unlock} unlockBiometric={live?.unlockBiometric} onBack={() => leave('privacy')} onNext={() => { void live?.ensureWords(); go('view-hidden', false); }} />}
      {id === 'view-hidden' && <Hidden onBack={() => leave('view-verify')} onReveal={() => go('view-shown')} />}
      {id === 'view-shown' && <Shown onBack={() => leave('view-hidden')} onHide={() => go('view-hidden', false)} onDone={() => go('privacy', false)} />}
      {id === 'autolock' && <LockSheet value={lock} onClose={() => go('privacy', false)} onPick={(next) => { setLock(next); sessionStore.setAutoLock(next as AutoLock); go('privacy', false); }} />}
    </div>
  );
}

function Settings(props: {
  privateMode: boolean; setPrivateMode: (v: boolean) => void;
  hideLaunch: boolean; setHideLaunch: (v: boolean) => void;
  hideActivity: boolean; setHideActivity: (v: boolean) => void;
  shots: boolean; setShots: (v: boolean) => void;
  lock: string; onBack: () => void; go: Go;
}) {
  return (
    <div style={scroll}>
      <NoteStatus />
      <div style={page}>
        <Back onClick={props.onBack} />
        <p style={headline}>Privacy</p>
        <p style={lead}>Control what Arxon shows and shares.</p>
        <div style={heroCard}>
          <span style={iconWrap}><FigmaImg src={art('shield.svg')} width={22} height={22} /></span>
          <span style={copy}>
            <span style={rowTitle}>Private mode</span>
            <span style={rowSub}>Applies your default privacy</span>
          </span>
          <Toggle on={props.privateMode} onClick={() => props.setPrivateMode(!props.privateMode)} />
        </div>
        <p style={kicker}>DISPLAY</p>
        <div style={group}>
          <ToggleRow title="Hide balance on launch" sub="Show only after unlock" on={props.hideLaunch} onClick={() => props.setHideLaunch(!props.hideLaunch)} />
          <div style={divider} />
          <ToggleRow title="Hide amounts in activity" sub="Mask values in history" on={props.hideActivity} onClick={() => props.setHideActivity(!props.hideActivity)} />
        </div>
        <p style={kicker}>TRANSACTIONS</p>
        <div style={group}>
          <button type="button" onClick={() => props.go('defaults')} style={linkRow}>
            <span style={copy}><span style={rowTitle}>Default privacy</span><span style={rowSub}>Choose what each payment hides</span></span>
            <FigmaImg src={art('chev.svg')} width={16} height={16} />
          </button>
          <div style={divider} />
          <ToggleRow title="Screenshot protection" sub="Block captures in sensitive screens" on={props.shots} onClick={() => props.setShots(!props.shots)} />
        </div>
        <p style={kicker}>SECURITY</p>
        <div style={group}>
          <button type="button" onClick={() => props.go('view-verify')} style={linkRow}>
            <span style={copy}><span style={rowTitle}>View recovery phrase</span></span>
            <FigmaImg src={art('chev.svg')} width={16} height={16} />
          </button>
          <div style={divider} />
          <button type="button" onClick={() => props.go('autolock')} style={linkRow}>
            <span style={copy}><span style={rowTitle}>Auto-lock</span></span>
            <span style={valueText}>{props.lock}</span>
            <FigmaImg src={art('chev.svg')} width={16} height={16} />
          </button>
          <div style={divider} />
          <button type="button" onClick={() => props.go('connected')} style={linkRow}>
            <span style={copy}><span style={rowTitle}>Connected apps</span></span>
            <span style={valueText}>2</span>
            <FigmaImg src={art('chev.svg')} width={16} height={16} />
          </button>
        </div>
      </div>
    </div>
  );
}

function Defaults(props: {
  hideSender: boolean; setHideSender: (v: boolean) => void;
  hideReceiver: boolean; setHideReceiver: (v: boolean) => void;
  hideAmount: boolean; setHideAmount: (v: boolean) => void;
  hideBalance: boolean; setHideBalance: (v: boolean) => void;
  onBack: () => void; onSave: () => void; onBalance: () => void;
}) {
  const hidden = [props.hideSender, props.hideReceiver, props.hideAmount, props.hideBalance].filter(Boolean).length;
  return (
    <>
      <div style={scrollAboveButton}>
        <NoteStatus />
        <div style={page}>
          <Back onClick={props.onBack} />
          <p style={headline}>Default privacy</p>
          <p style={lead}>Used for every new payment unless you change it for that payment.</p>
          <div style={group}>
            <ToggleRow title="Hide sender address" sub="Don’t show who the payment is from" on={props.hideSender} onClick={() => props.setHideSender(!props.hideSender)} />
            <div style={divider} />
            <ToggleRow title="Hide receiver address" sub="Don’t show who receives it" on={props.hideReceiver} onClick={() => props.setHideReceiver(!props.hideReceiver)} />
            <div style={divider} />
            <ToggleRow title="Hide amount" sub="Don’t show how much is sent" on={props.hideAmount} onClick={() => props.setHideAmount(!props.hideAmount)} />
            <div style={divider} />
            <div style={linkRow}>
              <button type="button" onClick={props.onBalance} style={textHit}>
                <span style={rowTitle}>Hide my balance</span>
                <span style={rowSub}>Keep my wallet balance off public view</span>
              </button>
              <Toggle on={props.hideBalance} onClick={() => props.setHideBalance(!props.hideBalance)} />
            </div>
          </div>
          <p style={kicker}>YOUR CURRENT MODE</p>
          <div style={heroCard}>
            <span style={iconWrap}><FigmaImg src={art('shield.svg')} width={22} height={22} /></span>
            <span style={copy}>
              <span style={rowTitle}>Custom</span>
              <span style={rowSub}>{hidden} of 4 details hidden</span>
            </span>
          </div>
          <p style={note}>Your preferences are stored on the Arxon chain. You can still change them for any single payment.</p>
        </div>
      </div>
      <button type="button" onClick={props.onSave} style={{ ...primary, height: 55, borderRadius: 8 }}>Save defaults</button>
    </>
  );
}

function Balance({ hide, setHide, onBack, onDone }: { hide: boolean; setHide: (v: boolean) => void; onBack: () => void; onDone: () => void }) {
  return (
    <>
      <div style={scrollAboveButton}>
        <NoteStatus />
        <Back onClick={onBack} floating />
        <div style={{ ...page, paddingTop: 112 }}>
          <p style={centerTitle}>Balance privacy</p>
          <p style={lead}>Choose whether your wallet balance is visible to the public.</p>
          <div style={group}>
            <ToggleRow title="Hide my balance" sub="The public sees your balance as hidden" on={hide} onClick={() => setHide(!hide)} />
          </div>
          <p style={kicker}>WHO CAN SEE YOUR BALANCE</p>
          <div style={{ ...group, padding: '8px 0' }}>
            <Who label="You" value="Always" />
            <Who label="The public" value={hide ? 'Hidden' : 'Shown'} accent={hide} />
            <Who label="The other person" value="Not shown" />
          </div>
          <p style={note}>This only changes what the public sees. Your private receipts still record your own balance at the time of each payment.</p>
        </div>
      </div>
      <button type="button" onClick={onDone} style={primary}>Done</button>
    </>
  );
}

function LockSheet({ value, onClose, onPick }: { value: string; onClose: () => void; onPick: (v: string) => void }) {
  return (
    <>
      <button type="button" aria-label="Close" onClick={onClose} style={{ position: 'absolute', inset: 0, border: 'none', background: 'rgba(0,0,0,0.6)', zIndex: 3, cursor: 'pointer' }} />
      <div style={{ position: 'absolute', left: 0, top: 395, width: 390, height: 449, boxSizing: 'border-box', background: '#11161f', border: '1px solid #2a3447', borderBottom: 'none', borderRadius: '24px 24px 0 0', zIndex: 4, padding: '11px 16px 0' }}>
        <div style={{ width: 36, height: 4, borderRadius: 2, background: '#5c5f64', margin: '0 auto' }} />
        <p style={{ margin: '14px 0 0', fontSize: 20, fontWeight: 700 }}>Auto-lock</p>
        <p style={{ margin: '8px 0 14px', fontSize: 13, color: '#8b9097', lineHeight: 1.4 }}>Lock Arxon after it’s been in the background for:</p>
        {LOCKS.map((option) => (
          <button key={option} type="button" onClick={() => onPick(option)} style={{ width: '100%', minHeight: 52, border: 'none', background: 'none', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, fontFamily: font.sans, fontSize: 15, fontWeight: 600, cursor: 'pointer', padding: '12px 4px' }}>
            {option}
            {value === option && <FigmaImg src="/wallet-figma/buy/check.svg" width={20} height={20} />}
          </button>
        ))}
      </div>
    </>
  );
}

function Face(props: {
  face: boolean; setFace: (v: boolean) => void;
  send: boolean; setSend: (v: boolean) => void;
  phrase: boolean; setPhrase: (v: boolean) => void;
  vault: boolean; setVault: (v: boolean) => void;
  onBack: () => void; go: Go;
}) {
  return (
    <div style={scroll}>
      <NoteStatus />
      <div style={page}>
        <Back onClick={props.onBack} />
        <p style={headline}>Face ID & password</p>
        <p style={lead}>Control how you unlock Arxon.</p>
        <div style={heroCard}>
          <span style={iconWrap}><FigmaImg src="/wallet-figma/unlock/face.svg" width={20} height={20} /></span>
          <span style={copy}>
            <span style={rowTitle}>Face ID</span>
            <span style={rowSub}>Unlock Arxon with Face ID</span>
          </span>
          <Toggle on={props.face} onClick={() => {
            const next = !props.face;
            props.setFace(next);
            sessionStore.setBiometrics(next);
          }} />
        </div>
        <p style={kicker}>REQUIRE FACE ID FOR</p>
        <div style={group}>
          <ToggleRow title="Sending funds" sub="Confirm every transfer" on={props.send} onClick={() => props.setSend(!props.send)} />
          <div style={divider} />
          <ToggleRow title="Viewing recovery phrase" sub="Extra check before it’s revealed" on={props.phrase} onClick={() => props.setPhrase(!props.phrase)} />
          <div style={divider} />
          <ToggleRow title="Opening the Vault" sub="Extra check before it opens" on={props.vault} onClick={() => props.setVault(!props.vault)} />
        </div>
        <p style={kicker}>PASSWORD</p>
        <div style={group}>
          <button type="button" onClick={() => props.go('change-pass')} style={linkRow}>
            <span style={copy}><span style={rowTitle}>Change password</span></span>
            <FigmaImg src={art('chev.svg')} width={16} height={16} />
          </button>
        </div>
        <p style={{ ...note, marginTop: 16 }}>Your password can’t be recovered. If you forget it, you’ll need your recovery phrase to restore your wallet.</p>
      </div>
    </div>
  );
}

function Change({ expected, onSave, persist, unlock, onBack, onDone }: { expected: string; onSave: (value: string) => void; persist?: (password: string) => Promise<void>; unlock?: (password: string) => Promise<boolean>; onBack: () => void; onDone: () => void }) {
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [show, setShow] = useState([false, false, false]);
  const [error, setError] = useState(false);
  const strength = next.length === 0 ? '' : next.length < 6 ? 'Weak' : next.length < 10 ? 'Okay' : 'Strong';
  const bars = strength === 'Strong' ? 4 : strength === 'Okay' ? 2 : strength === 'Weak' ? 1 : 0;
  const ready = current.length > 0 && next.length > 0 && next === confirm;
  return (
    <>
      <div style={scrollAboveButton}>
        <PhoneStatus />
        <div style={{ ...page, paddingTop: 112 }}>
          <Back onClick={onBack} floating />
          <p style={centerTitle}>Change password</p>
          <Field label="Current password" value={current} setValue={setCurrent} show={show[0]} toggle={() => setShow([!show[0], show[1], show[2]])} error={error} />
          <Field label="New password" value={next} setValue={setNext} show={show[1]} toggle={() => setShow([show[0], !show[1], show[2]])} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 10 }}>
            {[0, 1, 2, 3].map((i) => <span key={i} style={{ width: 60, height: 4, borderRadius: 2, background: i < bars ? (strength === 'Strong' ? '#3ddb85' : strength === 'Okay' ? '#accafe' : '#f25252') : '#2a3447' }} />)}
            <span style={{ marginLeft: 'auto', fontSize: 12, color: strength === 'Strong' ? '#3ddb85' : '#8b9097' }}>{strength}</span>
          </div>
          <Field label="Confirm new password" value={confirm} setValue={setConfirm} show={show[2]} toggle={() => setShow([show[0], show[1], !show[2]])} />
          <p style={note}>Your password can’t be recovered. Keep your recovery phrase safe.</p>
        </div>
      </div>
      <button
        type="button"
        disabled={!ready}
        onClick={() => {
          if (unlock) {
            void unlock(current).then((ok) => {
              if (!ok) { setError(true); return; }
              void (persist ? persist(next) : Promise.resolve()).then(() => { onSave(next); onDone(); });
            });
            return;
          }
          if (current !== expected) { setError(true); return; }
          onSave(next);
          onDone();
        }}
        style={{ ...primary, background: ready ? '#accafe' : '#1c2025', color: ready ? '#0c1018' : '#5c5f64' }}
      >
        Update password
      </button>
    </>
  );
}

function Verify({ expected, unlock, unlockBiometric, onBack, onNext }: { expected: string; unlock?: (password: string) => Promise<boolean>; unlockBiometric?: () => Promise<boolean>; onBack: () => void; onNext: () => void }) {
  const [value, setValue] = useState('');
  const [show, setShow] = useState(false);
  const [error, setError] = useState(false);
  return (
    <div style={scroll}>
      <PhoneStatus />
      <div style={page}>
        <Back onClick={onBack} />
        <p style={headline}>Confirm it’s you</p>
        <p style={lead}>Enter your password to view your recovery phrase.</p>
        <p style={{ margin: '8px 6px 8px', fontSize: 14, color: '#8b9097' }}>Password</p>
        <div style={{ height: 56, boxSizing: 'border-box', background: '#1c2025', border: `1px solid ${error ? '#f25252' : '#2a3447'}`, borderRadius: 14, display: 'flex', alignItems: 'center', padding: '0 16px', gap: 12 }}>
          <input value={value} onChange={(e) => { setValue(e.target.value); setError(false); }} type={show ? 'text' : 'password'} style={input} />
          <button type="button" aria-label={show ? 'Hide password' : 'Show password'} onClick={() => setShow((v) => !v)} style={eyeBtn}>
            <FigmaImg src={show ? '/wallet-figma/create/eye.svg' : '/wallet-figma/eye-off.svg'} width={show ? 20 : 16} height={show ? 20 : 16} />
          </button>
        </div>
        {error && <p style={{ margin: '8px 6px 0', color: '#f25252', fontSize: 13 }}>Incorrect password.</p>}
        <button type="button" onClick={() => {
          if (unlock) {
            void unlock(value).then((ok) => (ok ? onNext() : setError(true)));
            return;
          }
          if (value === expected) onNext();
          else setError(true);
        }} style={{ ...primary, position: 'relative', left: 0, bottom: 'auto', width: '100%', marginTop: 16, height: 55, borderRadius: 8, background: value ? '#accafe' : '#1c2025', color: value ? '#0c1018' : '#5c5f64' }}>Continue</button>
        <button type="button" onClick={() => {
          if (unlockBiometric) {
            void unlockBiometric().then((ok) => (ok ? onNext() : setError(true)));
            return;
          }
          onNext();
        }} style={{ marginTop: 12, width: '100%', height: 52, borderRadius: 14, border: '1px solid #2a3447', background: 'transparent', color: '#fff', fontFamily: font.sans, fontSize: 15, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
          <FigmaImg src="/wallet-figma/unlock/face.svg" width={20} height={20} />
          Unlock with Face ID
        </button>
      </div>
    </div>
  );
}

function Hidden({ onBack, onReveal }: { onBack: () => void; onReveal: () => void }) {
  const live = useLiveFrame();
  const usable = resolvePhraseWords({ app: !!live?.app, words: live?.words }).usable;
  const [error, setError] = useState<string | null>(null);
  async function load() {
    if (!live?.app) return;
    setError(null);
    try {
      await live.ensureWords();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load recovery phrase.');
    }
  }
  useEffect(() => {
    if (live?.app && !usable) void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [live?.app, usable]);
  const canReveal = usable && !error;
  return (
    <>
      <div style={scrollAboveButton}>
        <PhoneStatus />
        <div style={page}>
          <Back onClick={onBack} />
          <PhraseHead />
          <div style={{ position: 'relative', marginTop: 18 }}>
            <WordGrid blur />
            <button type="button" disabled={!canReveal} onClick={onReveal} style={{ position: 'absolute', inset: 0, border: 'none', background: 'rgba(5,5,5,0.35)', color: '#fff', fontFamily: font.sans, cursor: canReveal ? 'pointer' : 'default', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 12 }}>
              <FigmaImg src="/wallet-figma/phrase/lock.svg" width={26} height={26} />
              {error || (canReveal ? 'Tap to reveal your phrase' : 'Loading recovery phrase…')}
              {live?.app && !usable ? (
                <span role="button" tabIndex={0} onClick={(e) => { e.stopPropagation(); void load(); }} style={{ color: '#accafe', fontWeight: 600, fontSize: 14 }}>Try again</span>
              ) : null}
            </button>
          </div>
        </div>
      </div>
      <button type="button" disabled={!canReveal} onClick={onReveal} style={{ ...primary, height: 55, borderRadius: 8, opacity: canReveal ? 1 : 0.45 }}>{canReveal ? 'Reveal phrase' : 'Phrase not ready'}</button>
    </>
  );
}

function Shown({ onBack, onHide, onDone }: { onBack: () => void; onHide: () => void; onDone: () => void }) {
  const live = useLiveFrame();
  const resolved = resolvePhraseWords({ app: !!live?.app, words: live?.words });
  const words = resolved.words;
  const usable = resolved.usable;
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function load() {
    if (!live?.app) return;
    setError(null);
    try {
      await live.ensureWords();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load recovery phrase.');
    }
  }
  return (
    <>
      <div style={scrollAboveButton}>
        <PhoneStatus />
        <div style={page}>
          <Back onClick={onBack} />
          <PhraseHead />
          <div style={{ marginTop: 18 }}>
            <WordGrid />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 16, marginTop: 12 }}>
              <button type="button" disabled={!usable} onClick={() => { if (!usable) return; navigator.clipboard?.writeText(words.join(' ')).catch(() => undefined); setCopied(true); }} style={{ ...textBtn, opacity: usable ? 1 : 0.45 }}>{copied ? 'Copied' : 'Copy'}</button>
              <button type="button" onClick={onHide} style={textBtn}>Hide</button>
            </div>
            {live?.app && !usable ? (
              <p style={{ margin: '10px 0 0', color: '#8b9097', fontSize: 13 }}>
                {error || 'Recovery phrase is not ready.'}{' '}
                <button type="button" onClick={() => void load()} style={{ ...textBtn, display: 'inline', padding: 0 }}>Try again</button>
              </p>
            ) : null}
          </div>
        </div>
      </div>
      <button type="button" disabled={!usable} onClick={onDone} style={{ ...primary, opacity: usable ? 1 : 0.45 }}>Done</button>
    </>
  );
}

function PhraseHead() {
  return (
    <>
      <p style={headline}>Recovery phrase</p>
      <p style={lead}>Anyone with these 12 words can move your funds. Never share them.</p>
      <p style={{ margin: '12px 0 0', color: '#accafe', fontSize: 13, lineHeight: 1.4 }}>Make sure no one is watching your screen.</p>
    </>
  );
}

function WordGrid({ blur }: { blur?: boolean }) {
  const live = useLiveFrame();
  const resolved = resolvePhraseWords({ app: !!live?.app, words: live?.words });
  const slots = resolved.usable ? resolved.words : Array.from({ length: 12 }, () => '');
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', border: '1px solid #accafe', borderRadius: 12, overflow: 'hidden', filter: blur ? 'blur(6px)' : undefined }}>
      {slots.map((word, index) => (
        <div key={index} style={{ minHeight: 44, display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', boxSizing: 'border-box', borderTop: index > 1 ? '1px solid #2a3447' : undefined, borderLeft: index % 2 ? '1px solid #2a3447' : undefined }}>
          <span style={{ width: 20, color: '#8b9097', fontSize: 12, flexShrink: 0 }}>{index + 1}</span>
          <span style={{ fontSize: 14, fontWeight: 500, lineHeight: 1.3 }}>{resolved.usable ? word : '••••••'}</span>
        </div>
      ))}
    </div>
  );
}

function Field({ label, value, setValue, show, toggle, error }: { label: string; value: string; setValue: (v: string) => void; show: boolean; toggle: () => void; error?: boolean }) {
  return (
    <label style={{ display: 'block', marginTop: 16 }}>
      <span style={{ display: 'block', marginBottom: 8, fontSize: 13, color: '#8b9097' }}>{label}</span>
      <span style={{ height: 52, boxSizing: 'border-box', background: '#1c2025', border: `1px solid ${error ? '#f25252' : '#2a3447'}`, borderRadius: 14, display: 'flex', alignItems: 'center', gap: 12, padding: '0 14px' }}>
        <input value={value} onChange={(e) => setValue(e.target.value)} type={show ? 'text' : 'password'} style={input} />
        <button type="button" aria-label={show ? 'Hide password' : 'Show password'} onClick={toggle} style={eyeBtn}>
          <FigmaImg src={show ? '/wallet-figma/create/eye.svg' : '/wallet-figma/eye-off.svg'} width={show ? 20 : 16} height={show ? 20 : 16} />
        </button>
      </span>
      {error && <span style={{ display: 'block', marginTop: 6, color: '#f25252', fontSize: 12 }}>Incorrect password.</span>}
    </label>
  );
}

function Who({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div style={{ minHeight: 44, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, padding: '10px 16px', fontSize: 14 }}>
      <span style={{ color: '#8b9097', lineHeight: 1.35 }}>{label}</span>
      <span style={{ fontWeight: 500, color: accent ? '#accafe' : '#fff', flexShrink: 0 }}>{value}</span>
    </div>
  );
}

function ToggleRow({ title, sub, on, onClick }: { title: string; sub: string; on: boolean; onClick: () => void }) {
  return (
    <div style={linkRow}>
      <span style={copy}>
        <span style={rowTitle}>{title}</span>
        <span style={rowSub}>{sub}</span>
      </span>
      <Toggle on={on} onClick={onClick} />
    </div>
  );
}

function Toggle({ on, onClick }: { on: boolean; onClick: () => void }) {
  return (
    <button type="button" aria-pressed={on} onClick={onClick} style={{ border: 'none', background: 'none', padding: 0, cursor: 'pointer', flexShrink: 0 }}>
      <FigmaImg src={on ? onToggle : offToggle} width={on ? 46 : 48} height={28} />
    </button>
  );
}

function Back({ onClick, floating }: { onClick: () => void; floating?: boolean }) {
  return (
    <button type="button" aria-label="Back" onClick={onClick} style={{ position: floating ? 'absolute' : 'relative', left: floating ? 18 : 0, top: floating ? 56 : 0, width: 40, height: 40, border: 'none', borderRadius: 20, background: '#1c2025', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', padding: 0, zIndex: 2 }}>
      <FigmaImg src={art('back.svg')} width={20} height={20} />
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

const scroll: CSSProperties = { position: 'absolute', inset: 0, overflowY: 'auto', overflowX: 'hidden' };
const scrollAboveButton: CSSProperties = { position: 'absolute', left: 0, right: 0, top: 0, bottom: 84, overflowY: 'auto', overflowX: 'hidden' };
const page: CSSProperties = { boxSizing: 'border-box', width: 390, padding: '56px 18px 28px', display: 'flex', flexDirection: 'column' };
const headline: CSSProperties = { margin: '16px 0 0', fontSize: 30, fontWeight: 700, lineHeight: 1.15 };
const centerTitle: CSSProperties = { margin: '4px 48px 0', textAlign: 'center', fontSize: 17, fontWeight: 600, lineHeight: 1.3 };
const lead: CSSProperties = { margin: '10px 0 0', color: '#8b9097', fontSize: 15, lineHeight: 1.4 };
const heroCard: CSSProperties = { marginTop: 18, minHeight: 84, boxSizing: 'border-box', background: '#11161f', border: '1px solid #2a3447', borderRadius: 14, display: 'flex', alignItems: 'center', gap: 14, padding: 16 };
const group: CSSProperties = { marginTop: 8, boxSizing: 'border-box', background: '#1c2025', border: '1px solid #2a3447', borderRadius: 14, overflow: 'hidden' };
const iconWrap: CSSProperties = { width: 44, height: 44, borderRadius: 22, background: '#1c2025', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 };
const copy: CSSProperties = { flex: 1, minWidth: 0 };
const rowTitle: CSSProperties = { display: 'block', fontSize: 15, fontWeight: 600, lineHeight: 1.3 };
const rowSub: CSSProperties = { display: 'block', marginTop: 4, fontSize: 13, color: '#8b9097', lineHeight: 1.35 };
const valueText: CSSProperties = { color: '#8b9097', fontSize: 14, fontWeight: 500, flexShrink: 0 };
const linkRow: CSSProperties = { width: '100%', minHeight: 72, border: 'none', background: 'none', color: '#fff', fontFamily: font.sans, display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', cursor: 'pointer', textAlign: 'left', boxSizing: 'border-box' };
const textHit: CSSProperties = { flex: 1, minWidth: 0, border: 'none', background: 'none', color: '#fff', textAlign: 'left', fontFamily: font.sans, padding: 0, cursor: 'pointer' };
const kicker: CSSProperties = { margin: '22px 6px 8px', fontSize: 12, fontWeight: 600, letterSpacing: 0.96, color: '#8b9097' };
const divider: CSSProperties = { height: 1, margin: '0 16px', background: '#2a3447' };
const note: CSSProperties = { marginTop: 16, boxSizing: 'border-box', background: '#11161f', border: '1px solid #2a3447', borderRadius: 14, padding: '14px 16px', color: '#8b9097', fontSize: 13, lineHeight: 1.45 };
const primary: CSSProperties = { position: 'absolute', left: 16, bottom: 16, width: 358, height: 52, border: 'none', borderRadius: 14, background: '#accafe', color: '#0c1018', fontFamily: font.sans, fontSize: 16, fontWeight: 600, cursor: 'pointer' };
const input: CSSProperties = { flex: 1, border: 'none', background: 'transparent', color: '#fff', fontFamily: font.sans, fontSize: 16, outline: 'none' };
const eyeBtn: CSSProperties = { border: 'none', background: 'none', padding: 0, cursor: 'pointer' };
const textBtn: CSSProperties = { border: 'none', background: 'none', color: '#accafe', fontFamily: font.sans, fontSize: 14, fontWeight: 600, cursor: 'pointer' };
