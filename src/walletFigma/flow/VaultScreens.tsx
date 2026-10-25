import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { FigmaImg } from '@/walletFigma/icons';
import { font } from '@/walletFigma/tokens';
import type { VaultHolding } from '@/chainWallet/tokenNotes';
import { pickWalletTab, useWalletNetwork, WalletTabs } from './WalletTabs';
import { useLiveFrame } from './liveFrame';
import { useAppHidesFigmaChrome } from './appChrome';
import { clearVaultFails, registerVaultFail, sessionStore } from '@/chainWallet/session';
import type { PrivacyFlags } from '@/chainWallet/privacy';
import { isShieldedPk } from '@/chainWallet/routeSend';
import { CenterLine, SwipeConfirm, SwipeVault } from './SwipeConfirm';
import { ProfileAvatar } from './ProfileAvatar';
import { useProfilePhoto } from './profilePhoto';
import { usePullRefresh } from './pullRefresh';
import { NetworkSheet } from './ReceiveScreens';
import { applyNetwork, listNetworks, selectedNetwork } from './homeNetworks';
import { briefAddr } from './briefAddr';
import { TestnetHistory } from './TestnetHistory';
import { availableBox } from './LiveScroll';

const IDS = new Set([
  'vault-empty', 'vault', 'vault-amount', 'vault-review', 'vault-done', 'move-home', 'move-home-done',
  'vault-nofunds', 'vault-over', 'vault-failed', 'accounts', 'add-account', 'vault-pending', 'vault-lock',
  'vault-lock-wrong', 'vault-pick-in', 'vault-pick-out', 'vault-many', 'vault-locked', 'vault-send-options',
  'priv-amount', 'priv-review', 'priv-done', 'unshield-amount', 'unshield-review', 'unshield-done',
  'vault-send-token', 'priv-pending', 'unshield-pending',
  'shield-explain', 'priv-addr', 'unshield-who', 'unshield-addr',
]);

type Go = (id: string, remember?: boolean) => void;
type Sym = 'ARX' | 'USDT' | 'USDC';

const FEE = 0.0004;
const HOME_FUNDED = 1398.6;
const HOME_VAULTED = 978.6;
const LOCK_MINUTES = [5, 10, 20, 30];

let sessionOpen = false;
let entryBody = 'vault';
let lockRequired = true;
let homeTab = 'home-funded';
let historyTab = 'activity';
let vaultBody = 'vault-empty';

export function isVaultScreen(id: string) {
  return IDS.has(id);
}

/** Face ID & password → Opening the Vault. Off skips the password screen. */
export function setVaultLockRequired(on: boolean) {
  lockRequired = on;
  sessionOpen = !on;
}

/** Vault tab opens Unlock while the vault session is closed, then the body Home already chose. */
export function vaultEntry(body: string) {
  entryBody = body;
  if (sessionStore.vaultLockedUntil() > Date.now()) return 'vault-locked';
  if (!lockRequired || sessionOpen) return body;
  return 'vault-lock';
}

/** Home, History, and Vault tabs follow the last Home the user opened. */
export function rememberTabs(kind: 'empty' | 'funded' | 'vaulted') {
  if (kind === 'empty') {
    homeTab = 'home';
    historyTab = 'activity-empty';
    vaultBody = 'vault-nofunds';
    return;
  }
  homeTab = 'home-funded';
  historyTab = 'activity';
  vaultBody = kind === 'vaulted' ? 'vault' : 'vault-empty';
}

/** Activity knows whether the wallet is empty, and must not wipe a funded Vault. */
export function rememberFromActivity(empty: boolean) {
  if (empty) {
    rememberTabs('empty');
    return;
  }
  historyTab = 'activity';
  if (homeTab === 'home') homeTab = 'home-funded';
  if (vaultBody === 'vault-nofunds') vaultBody = 'vault-empty';
}

export function tabTarget(which: 'home' | 'vault' | 'explore' | 'history' | 'account') {
  if (which === 'home') return homeTab;
  if (which === 'vault') return vaultEntry(vaultBody);
  if (which === 'history') return historyTab;
  if (which === 'explore') return 'explore';
  return 'account';
}

export function VaultScreens({ id, go, back, behind, password }: { id: string; go: Go; back?: () => void; behind?: string; password: string }) {
  const live = useLiveFrame();
  const [hidden, setHidden] = useState(false);
  const [moveIn, setMoveIn] = useState('');
  const [moveOut, setMoveOut] = useState('');
  const [sendAmt, setSendAmt] = useState('');
  const [overAmt, setOverAmt] = useState('3000');
  const [token, setToken] = useState<Sym>('ARX');
  const [sendKind, setSendKind] = useState<'private' | 'public'>('private');
  const [payTo, setPayTo] = useState('');
  const [mask, setMask] = useState<PrivacyFlags>({ hideSender: true, hideReceiver: true, hideAmount: true, hideBalance: false });
  const [query, setQuery] = useState('');
  const [fails, setFails] = useState(0);
  const [lockLevel, setLockLevel] = useState(0);
  const [lockUntil, setLockUntil] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [typed, setTyped] = useState('');
  const [madeSecond, setMadeSecond] = useState(false);
  const [name, setName] = useState('Account 02');

  const expected = password.length >= 8 ? password : 'Arxon123!';
  const leave = () => (back ? back() : go(behind && behind !== id ? behind : 'home-funded', false));
  const fundedVault = () => go(token === 'ARX' && !madeSecond ? 'vault' : 'vault-many', false);

  useEffect(() => {
    const next = id === 'vault-pending' ? 'vault-done' : id === 'priv-pending' ? 'priv-done' : id === 'unshield-pending' ? 'unshield-done' : '';
    if (!next) return;
    const t = window.setTimeout(() => go(next, false), 2000);
    return () => window.clearTimeout(t);
  }, [id]);

  useEffect(() => {
    if (id !== 'vault-locked') return;
    setLockUntil((prev) => (prev && prev > Date.now() ? prev : Date.now() + LOCK_MINUTES[Math.min(lockLevel, 3)] * 60_000));
    const t = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(t);
  }, [id]);

  function land() {
    sessionOpen = true;
    setFails(0);
    setTyped('');
    const fromHome = behind === 'home' || behind === 'home-hidden' ? 'vault-nofunds'
      : behind === 'home-funded' || behind === 'more' ? 'vault-empty'
        : behind === 'home-vaulted' || behind === 'home-unvaulted' ? 'vault'
          : entryBody;
    go(fromHome, false);
  }

  function submitPassword() {
    if (live?.app) {
      void live.unlock(typed).then((ok) => {
        if (ok) {
          clearVaultFails();
          land();
          return;
        }
        setTyped('');
        const result = registerVaultFail();
        if (result.locked) {
          sessionOpen = false;
          setLockUntil(result.until);
          go('vault-locked', false);
          return;
        }
        go('vault-lock-wrong', false);
      });
      return;
    }
    if (typed === expected) {
      land();
      return;
    }
    const next = fails + 1;
    setFails(next);
    setTyped('');
    if (next >= 5) {
      sessionOpen = false;
      const level = Math.min(lockLevel, 3);
      setLockUntil(Date.now() + LOCK_MINUTES[level] * 60_000);
      setLockLevel((n) => Math.min(n + 1, 3));
      go('vault-locked', false);
      return;
    }
    go('vault-lock-wrong', false);
  }

  const remain = Math.max(0, Math.ceil(((lockUntil ?? now) - now) / 1000));
  const clock = `${String(Math.floor(remain / 60)).padStart(1, '0')}:${String(remain % 60).padStart(2, '0')}`;

  const sheet = id === 'vault-send-options';
  const account = id === 'accounts' || id === 'add-account';
  const net = useWalletNetwork();
  if (net === 'mainnet') {
    if (id === 'vault-nofunds') rememberTabs('empty');
    else if (id === 'vault' || id === 'vault-many') rememberTabs('vaulted');
    else if (id === 'vault-empty') rememberTabs('funded');
  }

  return (
    <div style={{ position: 'relative', width: 390, height: 844, background: '#050505', overflow: 'hidden', fontFamily: font.sans, color: '#fff' }}>
      <style>{`@keyframes vaultspin{to{transform:rotate(360deg)}}`}</style>
      {account ? (
        <Accounts id={id} go={go} made={madeSecond} name={name} setName={setName} onCreate={() => { setMadeSecond(true); go('accounts', false); }} />
      ) : id === 'vault-empty' || id === 'vault-nofunds' || id === 'vault' || id === 'vault-many' || sheet ? (
        <VaultHome many={id === 'vault-many'} hidden={hidden} broke={id === 'vault-nofunds' || id === 'vault-empty'} onEye={() => setHidden((v) => !v)} go={go} sheet={sheet} onPrivate={() => { setSendKind('private'); setMask({ hideSender: true, hideReceiver: true, hideAmount: true, hideBalance: false }); go('vault-send-token'); }} onUnshield={() => { setSendKind('public'); setMask({ hideSender: true, hideReceiver: false, hideAmount: false, hideBalance: false }); go('unshield-who'); }} />
      ) : id === 'shield-explain' ? (
        <ShieldExplain leave={leave} onContinue={() => go('vault-pick-in')} />
      ) : id === 'unshield-who' ? (
        <UnshieldWho leave={leave} onSelf={() => { setPayTo(live?.address || ''); go('vault-send-token'); }} onOther={() => { setPayTo(''); go('unshield-addr'); }} />
      ) : id === 'priv-addr' || id === 'unshield-addr' ? (
        <PayAddress id={id} value={payTo} setValue={setPayTo} leave={leave} onNext={() => go(id === 'priv-addr' ? 'priv-amount' : 'vault-send-token')} self={live?.address} />
      ) : id === 'vault-pick-in' || id === 'vault-pick-out' || id === 'vault-send-token' ? (
        <Picker id={id} kind={sendKind} query={query} setQuery={setQuery} leave={leave} onPick={(sym) => { setToken(sym); go(id === 'vault-pick-in' ? 'vault-amount' : id === 'vault-pick-out' ? 'move-home' : sendKind === 'public' ? 'unshield-amount' : 'priv-addr'); }} />
      ) : id === 'vault-amount' || id === 'vault-over' || id === 'move-home' || id === 'priv-amount' || id === 'unshield-amount' ? (
        <Amount id={id} token={token} to={payTo} amount={id === 'vault-over' ? overAmt : id === 'move-home' ? moveOut : id === 'vault-amount' ? moveIn : sendAmt} leave={leave} onKey={(key) => {
          const set = id === 'vault-over' ? setOverAmt : id === 'move-home' ? setMoveOut : id === 'vault-amount' ? setMoveIn : setSendAmt;
          set((prev) => press(prev, key));
        }} go={go} />
      ) : id === 'vault-review' || id === 'priv-review' || id === 'unshield-review' ? (
        <Review id={id} token={token} amount={id === 'vault-review' ? moveIn : sendAmt} to={payTo} mask={mask} setMask={setMask} go={go} leave={leave} />
      ) : id === 'vault-pending' || id === 'priv-pending' || id === 'unshield-pending' ? (
        <Pending id={id} go={go} amount={id === 'vault-pending' ? moveIn : sendAmt} />
      ) : id === 'vault-done' || id === 'move-home-done' || id === 'priv-done' || id === 'unshield-done' || id === 'vault-failed' ? (
        <Result id={id} go={go} fundedVault={fundedVault} amount={id === 'move-home-done' ? moveOut : id === 'vault-done' ? moveIn : sendAmt} />
      ) : (
        <Unlock wrong={id === 'vault-lock-wrong'} locked={id === 'vault-locked' && (lockUntil == null || remain > 0)} clock={clock} typed={typed} setTyped={setTyped} onUnlock={submitPassword} onFace={() => {
          if (live?.app) {
            void live.unlockBiometric().then((ok) => { if (ok) land(); });
            return;
          }
          land();
        }} leave={leave} go={go} />
      )}
      {(id === 'vault-empty' || id === 'vault' || id === 'vault-many' || id === 'vault-nofunds' || sheet) && <Tabs go={go} here={sheet ? 'vault' : id} />}
    </div>
  );
}

function press(prev: string, key: string) {
  if (key === '⌫') return prev.slice(0, -1);
  if (key === '.' && prev.includes('.')) return prev;
  const next = prev + key;
  const [, dec] = next.split('.');
  if (dec && dec.length > 4) return prev;
  if (next.replace('.', '').length > 8) return prev;
  return next.replace(/^0+(?=\d)/, '');
}

function num(value: string) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function money(n: number) {
  return n.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
}

function qty(n: number, digits = 2) {
  return n.toLocaleString('en-US', { minimumFractionDigits: digits, maximumFractionDigits: digits });
}

function price(sym: Sym) {
  return sym === 'ARX' ? 0.42 : 1;
}

function Amount({ id, token, to, amount, leave, onKey, go }: { id: string; token: Sym; to: string; amount: string; leave: () => void; onKey: (key: string) => void; go: Go }) {
  const live = useLiveFrame();
  const movingIn = id === 'vault-amount' || id === 'vault-over';
  const sending = id === 'priv-amount' || id === 'unshield-amount';
  const value = num(amount);
  const available = live?.app
    ? (token !== 'ARX' ? 0 : movingIn || id === 'vault-over' ? Number(live.publicArx.replace(/,/g, '')) || 0 : Number(live.shielded) || 0)
    : movingIn ? (token === 'ARX' ? 2400 : token === 'USDT' ? 120 : 30) : token === 'ARX' ? 1000 : token === 'USDT' ? 40 : 30;
  const over = value > available;
  const ready = value > 0 && !over;
  const fiat = value * price(token);
  const after = movingIn ? HOME_FUNDED - fiat : HOME_VAULTED + fiat;
  const max = Math.max(0, available - (token === 'ARX' ? FEE : 0));
  const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0', '⌫'];
  const title = movingIn ? 'Shield in' : id === 'move-home' ? 'Move to Home' : id === 'priv-amount' ? 'Private pay' : 'Unshield';
  const alive = useRef(true);
  const moved = useRef(false);
  useEffect(() => () => { alive.current = false; }, []);
  const flightHere = live?.flight?.screen === id ? live.flight : null;
  useEffect(() => {
    if (id !== 'move-home' || moved.current) return;
    if (flightHere?.phase === 'done' && !flightHere.detail) {
      moved.current = true;
      go('move-home-done');
    }
  }, [id, flightHere?.phase, flightHere?.detail, go]);
  return (
    <div data-amount-entry={live?.app ? '1' : undefined} style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: live?.app ? 'hidden' : undefined }}>
      <div style={{ flex: 1, minHeight: 0, overflowY: live?.app ? 'auto' : undefined }}>
      <PhoneStatus />
      <Head title={title} onBack={leave} />
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 18, marginTop: 8, color: '#8b9097', fontSize: 13 }}>
        <span>{movingIn ? 'From  Home' : id === 'move-home' ? 'From  Vault' : 'To'}</span>
        <span style={{ color: '#accafe' }}>→</span>
        <span style={{ color: '#fff' }}>{movingIn ? 'To  Vault' : id === 'move-home' ? 'To  Home' : shortAddr(to) || 'Address'}</span>
      </div>
      <div style={{ textAlign: 'center', marginTop: 18 }}>
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'flex-end', gap: 8 }}>
          <span style={{ fontSize: live?.app ? 44 : 56, fontWeight: 700, lineHeight: 1, color: over ? '#f25252' : '#fff' }}>{amount ? qty(value, amount.includes('.') ? 2 : 0) : '0'}</span>
          <span style={{ fontSize: 18, fontWeight: 600, color: '#accafe', marginBottom: 6 }}>{token}</span>
        </div>
        <p style={{ margin: '8px 0 0', color: '#8b9097', fontSize: 15 }}>{live?.app && token === 'ARX' ? '$0.00' : `≈ ${money(fiat)}`}</p>
      </div>
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8, marginTop: 14 }}>
        <span style={live?.app ? { ...availableBox, color: over ? '#f25252' : '#c9cdd4' } : { ...pill, color: over ? '#f25252' : '#8b9097' }}>Available {qty(available)} {token}</span>
        <Max onClick={() => fill(onKey, amount, max)} />
      </div>
      {over && <p style={{ margin: '10px 0 0', textAlign: 'center', color: '#f25252', fontSize: 13 }}>Not enough on {movingIn ? 'Home' : 'Vault'}</p>}
      {flightHere?.detail ? <p style={{ margin: '8px 18px 0', textAlign: 'center', color: flightHere.phase === 'error' ? '#f25252' : '#accafe', fontSize: 12 }}>{flightHere.detail}</p> : null}
      {!sending && !over && !live?.app && (
        <div style={{ margin: '14px 18px 0', height: 48, borderRadius: 14, background: '#1c2025', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 16px', fontSize: 14 }}>
          <span style={{ color: '#8b9097' }}>Home balance after</span>
          <span style={{ fontWeight: 600 }}>{money(after)}</span>
        </div>
      )}
      {movingIn && <Note title="Shielded balance" body="This amount leaves your public balance. The Vault total stays hidden." />}
      {id === 'priv-amount' && <Note title="Private pay" body="Paid from your Vault. You choose what the public can see on the next screen." />}
      {id === 'unshield-amount' && <Note title="Unshield" body="This returns a public balance. You choose what stays hidden on the next screen." />}
      </div>
      <div style={{ flex: '0 0 auto', marginTop: 8, padding: '0 18px 18px' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap' }}>
          {keys.map((key) => (
            <button key={key} type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => onKey(key)} style={live?.app ? { ...keyBtn, height: 44 } : keyBtn}>
              {key === '⌫' ? <FigmaImg src="/wallet-figma/send/backspace.svg" width={24} height={24} /> : key}
            </button>
          ))}
        </div>
        <button type="button" disabled={!ready || flightHere?.phase === 'processing'} onClick={() => {
          if (id === 'move-home' && live?.app) {
            void live.vaultMoveOut(amount).then(() => {
              if (!alive.current || moved.current) return;
              moved.current = true;
              go('move-home-done');
            }).catch(() => {
              if (alive.current) go('vault-failed');
            });
            return;
          }
          go(id === 'move-home' ? 'move-home-done' : id === 'priv-amount' ? 'priv-review' : id === 'unshield-amount' ? 'unshield-review' : 'vault-review');
        }} style={reviewBtn(ready && flightHere?.phase !== 'processing')}>
          {flightHere?.phase === 'processing' ? 'Processing' : id === 'move-home' ? 'Move to Home' : 'Review'}
        </button>
      </div>
    </div>
  );
}

function fill(onKey: (key: string) => void, current: string, max: number) {
  const text = String(Math.floor(max * 10000) / 10000);
  current.split('').forEach(() => onKey('⌫'));
  text.split('').forEach((ch) => onKey(ch));
}

function Review({ id, token, amount, to, mask, setMask, go, leave }: { id: string; token: Sym; amount: string; to: string; mask: PrivacyFlags; setMask: (v: PrivacyFlags) => void; go: Go; leave: () => void }) {
  const live = useLiveFrame();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const alive = useRef(true);
  useEffect(() => () => { alive.current = false; }, []);
  const screenId = id === 'vault-review' ? 'vault-review' : id === 'priv-review' ? 'priv-review' : 'unshield-review';
  const doneId = id === 'vault-review' ? 'vault-done' : id === 'priv-review' ? 'priv-done' : 'unshield-done';
  const flightHere = live?.flight?.screen === screenId ? live.flight : null;
  const advanced = useRef(false);
  useEffect(() => {
    if (advanced.current) return;
    if (flightHere?.phase === 'done' && !flightHere.detail) {
      advanced.current = true;
      go(doneId);
    }
  }, [flightHere?.phase, flightHere?.detail, doneId, go]);
  const value = num(amount || '0');
  const fiat = value * price(token);
  const total = live?.app ? `${qty(value)} ${token} + fee` : token === 'ARX' ? `${qty(value + FEE, 4)} ARX` : `${qty(value)} ${token}`;
  const fee = feeText(!!live?.app);
  const shielding = id === 'vault-review';
  const paying = id === 'priv-review';
  const dest = shielding ? 'Your Vault' : shortAddr(to || (live?.address ?? ''));
  const rows: [string, string, string?][] = shielding
    ? [['From', live?.accountLabel ? `Home · ${live.accountLabel}` : 'Home · Account 01'], ['To', 'Vault'], ['Public balance', 'This amount leaves it'], ['Network fee', fee], ['Total', total]]
    : [['From', 'Your Vault'], ['To', dest || 'Add an address'], ['Network', 'Arxon Testnet'], ['Network fee', fee], ['Total', total]];
  const verb = shielding ? 'You are shielding' : paying ? 'You are paying privately' : 'You are unshielding';
  const confirm = shielding ? 'Shield in' : paying ? 'Private pay' : 'Unshield';
  return (
    <div className="arxon-token-scroll" style={{ height: '100%', overflowY: 'auto', WebkitOverflowScrolling: 'touch', touchAction: 'pan-y', boxSizing: 'border-box', paddingBottom: 28 }}>
      <PhoneStatus />
      <Head title="Review" onBack={leave} />
      <div style={{ textAlign: 'left', marginTop: 8, padding: '0 18px' }}>
        <p style={{ margin: 0, color: '#8b9097', fontSize: 14 }}>{verb}</p>
        <p style={{ margin: '8px 0 0', fontSize: 32, fontWeight: 700 }}>{qty(value)} {token}</p>
        <p style={{ margin: '6px 0 0', color: '#8b9097' }}>{live?.app && token === 'ARX' ? '$0.00' : `≈ ${money(fiat)}`}</p>
      </div>
      <div style={{ margin: '14px 18px 0', background: '#1c2025', border: busy ? '1px solid #accafe' : '1px solid #2a3447', borderRadius: 16, padding: '8px 16px', flex: '0 0 auto', animation: busy ? 'arxon-card 1.1s ease-in-out infinite' : undefined }}>
        <style>{`@keyframes arxon-card{0%,100%{box-shadow:0 0 0 rgba(172,202,254,0)}50%{box-shadow:0 0 18px rgba(172,202,254,0.35)}}`}</style>
        {rows.map(([label, valueText, color]) => (
          <CenterLine key={label} label={label} value={valueText} color={color} />
        ))}
      </div>
      <PrivacyCard mask={mask} setMask={setMask} />
      <p style={{ margin: '10px 18px 0', color: '#8b9097', fontSize: 12, lineHeight: 1.4, textAlign: 'left' }}>
        {shielding ? 'The amount you shield is no longer a public balance. Nobody can see the total held in your Vault.' : paying ? 'This pays from the Vault. Hidden fields stay off the public record.' : 'Unshielding creates a public balance at the address you chose.'}
      </p>
      <div style={{ marginTop: 16, padding: '0 18px 28px', display: 'flex', flexDirection: 'column', gap: 10, flex: '0 0 auto' }}>
        {err || (flightHere && flightHere.phase !== 'processing' ? flightHere.detail : null) ? <p style={{ margin: 0, color: flightHere?.phase === 'done' ? '#accafe' : '#f25252', fontSize: 12 }}>{err || flightHere?.detail}</p> : null}
        <SwipeConfirm label={confirm} processing={busy || flightHere?.phase === 'processing'} disabled={busy || flightHere?.phase === 'processing'} onConfirm={() => {
          if (!live?.app) {
            go(shielding ? 'vault-pending' : paying ? 'priv-pending' : 'unshield-pending');
            return;
          }
          if (paying && !isShieldedPk(to)) {
            setErr('Private pay needs the other wallet’s shielded key.');
            return;
          }
          if (!shielding && !paying && !/^0x[0-9a-fA-F]{40}$/.test(to.trim())) {
            setErr('Unshield needs a 0x address.');
            return;
          }
          if (token !== 'ARX') {
            setErr('Only ARX can use the Vault on Arxon Testnet right now.');
            return;
          }
          setBusy(true);
          setErr(null);
          const mode = shielding ? 'vault' : paying ? 'private' : 'unshield';
          void live.send(token, to, amount, true, mode, mask)
            .then(() => { if (alive.current && !advanced.current) { advanced.current = true; go(shielding ? 'vault-done' : paying ? 'priv-done' : 'unshield-done', false); } })
            .catch((e: unknown) => { if (alive.current) setErr(e instanceof Error ? e.message : 'Vault send failed'); })
            .finally(() => { if (alive.current) setBusy(false); });
        }} />
        <button type="button" onClick={leave} style={{ ...btn, background: 'transparent', color: '#fff', border: '1px solid #2a3447' }}>Cancel</button>
      </div>
    </div>
  );
}

function PrivacyCard({ mask, setMask }: { mask: PrivacyFlags; setMask: (v: PrivacyFlags) => void }) {
  const rows: { key: keyof PrivacyFlags; title: string; body: string }[] = [
    { key: 'hideSender', title: 'Sender address', body: 'Hide who the payment is from' },
    { key: 'hideReceiver', title: 'Receiver address', body: 'Hide who receives it' },
    { key: 'hideAmount', title: 'Amount', body: 'Hide how much moves' },
  ];
  return (
    <div className="arxon-token-scroll" style={{ margin: '12px 18px 0', background: '#1c2025', border: '1px solid #2a3447', borderRadius: 16, maxHeight: 196, overflowY: 'auto', WebkitOverflowScrolling: 'touch', touchAction: 'pan-y' }}>
      <p style={{ margin: 0, padding: '12px 16px 0', fontSize: 13, fontWeight: 600, color: '#8b9097', textAlign: 'left' }}>SHOW OR HIDE</p>
      {rows.map((row, index) => (
        <div key={row.key} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderTop: index ? '1px solid #2a3447' : 'none' }}>
          <span style={{ flex: 1, textAlign: 'left' }}>
            <span style={{ display: 'block', fontSize: 15, fontWeight: 600 }}>{row.title}</span>
            <span style={{ display: 'block', marginTop: 2, fontSize: 12, color: '#8b9097' }}>{row.body}</span>
          </span>
          <button type="button" aria-label={row.title} onClick={() => setMask({ ...mask, [row.key]: !mask[row.key] })} style={{ ...iconBtn, width: 52 }}>
            <FigmaImg src={mask[row.key] ? '/wallet-figma/send/toggle-on-lg.svg' : '/wallet-figma/send/toggle-off.svg'} width={48} height={28} />
          </button>
        </div>
      ))}
    </div>
  );
}

function useVaultNetwork(go: Go) {
  const live = useLiveFrame();
  const [open, setOpen] = useState(false);
  const [picked, setPicked] = useState(() => selectedNetwork('testnet'));
  const nets = open ? listNetworks('testnet') : [];
  const sheet = open ? (
    <NetworkSheet
      nets={nets}
      selected={picked.id}
      fixed={!!live?.app}
      onClose={() => setOpen(false)}
      onPick={(netId) => {
        const row = nets.find((item) => item.id === netId);
        if (row) {
          setPicked(row);
          void applyNetwork(live, row);
        }
        setOpen(false);
      }}
      onAdd={() => {
        setOpen(false);
        go('add-network');
      }}
    />
  ) : null;
  return { show: () => setOpen(true), picked, sheet };
}

function VaultHome({ many, hidden, broke, onEye, go, sheet, onPrivate, onUnshield }: { many: boolean; hidden: boolean; broke?: boolean; onEye: () => void; go: Go; sheet: boolean; onPrivate: () => void; onUnshield: () => void }) {
  const live = useLiveFrame();
  const hideChrome = useAppHidesFigmaChrome();
  const photo = useProfilePhoto(live?.accountIndex ?? 0);
  const network = useVaultNetwork(go);
  const pull = usePullRefresh(() => live?.refreshVault?.());
  const [keyOpen, setKeyOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const balanceHidden = live?.app ? live.hidden : hidden;
  const cachedShielded = Number(String(live?.shielded || '0').replace(/,/g, '')) || 0;
  const rows: VaultHolding[] = live?.app
    ? (live.vaultTokens.length
      ? live.vaultTokens
      : cachedShielded > 0
        ? [{ name: 'Arxon', symbol: 'ARX', amount: live?.shielded || '0', icon: 'arx' }]
        : [])
    : demoHoldings(many, !!broke);
  const total = vaultHeadline(rows);
  const key = live?.app ? live.shieldedPk || '' : `0x${'11'.repeat(32)}`;

  const refreshVault = live?.refreshVault;
  const liveApp = !!live?.app;
  useEffect(() => {
    if (!liveApp || !refreshVault) return;
    let cancel = false;
    void refreshVault().finally(() => {
      cancel = true;
    });
    return () => {
      cancel = true;
    };
  }, [liveApp, refreshVault]);

  function eye() {
    if (live?.app) live.toggleHide();
    else onEye();
  }

  async function copyKey() {
    if (!key) return;
    try {
      await navigator.clipboard.writeText(key);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  return (
    <>
      <PhoneStatus />
      <div className="arxon-token-scroll" style={{ position: 'absolute', left: 0, top: live?.app ? 72 : hideChrome ? 12 : 44, width: 390, bottom: 0, overflowY: 'auto', overflowX: 'hidden', WebkitOverflowScrolling: 'touch', touchAction: 'pan-y', boxSizing: 'border-box', padding: live?.app ? '8px 16px 0' : '16px 16px 0', paddingBottom: 'calc(72px + env(safe-area-inset-bottom, 0px))' }} onTouchStart={pull.onTouchStart} onTouchMove={pull.onTouchMove} onTouchEnd={pull.onTouchEnd}>
        <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 40, marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
            {live?.app ? (
              <ProfileAvatar size={36} photo={photo} accountIndex={live.accountIndex} onOpen={() => go('account')} />
            ) : (
              <span style={{ width: 36, height: 36, borderRadius: 18, background: '#1c2025' }} />
            )}
            <button type="button" aria-label="Select network" onClick={network.show} style={{ ...plain, minHeight: 40 }}>
              <span style={{ fontSize: 16, fontWeight: 500 }}>{live?.app ? live.accountLabel : 'Account 01'}</span>
              <FigmaImg src="/wallet-figma/home/chev.svg" width={16} height={16} />
            </button>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <CircleBtn label="Search" onClick={() => go('search')}><FigmaImg src="/wallet-figma/home/search.svg" width={20} height={20} /></CircleBtn>
            <CircleBtn label="Notifications" onClick={() => go('notifications')}><FigmaImg src="/wallet-figma/home/bell.svg" width={20} height={20} /></CircleBtn>
          </div>
        </header>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 40, fontWeight: 700, lineHeight: 1 }}>{balanceHidden ? '••••••' : total}</span>
            <button type="button" aria-label={balanceHidden ? 'Show balance' : 'Hide balance'} onClick={eye} style={iconBtn}>
              <FigmaImg src={balanceHidden ? '/wallet-figma/home/eye-off.svg' : '/wallet-figma/home/eye.svg'} width={22} height={22} />
            </button>
          </div>
          <span style={{ fontSize: 14, fontWeight: 500, color: '#accafe' }}>Total vault</span>
          <span style={{ fontSize: 13, color: '#8b9097' }}>{balanceHidden ? '••••' : 'Only you can see this'}</span>
        </div>

        <div role="tablist" aria-label="Testnet" style={{ display: 'flex', background: '#1c2025', borderRadius: 16, padding: 4, width: 'fit-content', marginBottom: 16 }}>
          <button type="button" role="tab" aria-selected="false" onClick={() => go('testnet')} style={vaultTab(false)}>Home</button>
          <button type="button" role="tab" aria-selected="true" style={vaultTab(true)}>Vault</button>
        </div>

        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          <SwipeVault label="Private pay" onOpen={onPrivate} />
          <SwipeVault label="Unshield" onOpen={onUnshield} />
        </div>

        <button type="button" onClick={() => { setCopied(false); setKeyOpen(true); }} style={live?.app ? liveReceive : receiveCard}>
          <FigmaImg src="/wallet-figma/home/receive.svg" width={18} height={18} />
          <span style={{ fontSize: 16, fontWeight: 700 }}>Receive</span>
          <span style={{ fontSize: 13, fontWeight: 500, color: live?.app ? '#fff' : '#8c8f99', lineHeight: 1.4 }}>Shielded key for tokens in this vault.</span>
        </button>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 16 }}>
          <span style={{ fontSize: 18, fontWeight: 700 }}>Tokens</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 8 }}>
          {rows.length === 0 ? (
            <p style={{ margin: '4px 0 0', color: '#8b9097', fontSize: 14, lineHeight: 1.4 }}>
              Nothing shielded yet. Shield in from the Testnet home and it shows here.
            </p>
          ) : rows.map((row) => (
            <div key={`${row.symbol}-${row.name}`} style={{ height: 64, display: 'flex', alignItems: 'center', gap: 12 }}>
              <Tok sym={row.icon === 'usdt' ? 'USDT' : row.icon === 'usdc' ? 'USDC' : 'ARX'} />
              <span style={{ flex: 1, minWidth: 0 }}>
                <span style={{ display: 'block', fontSize: 16, fontWeight: 600 }}>{row.name}</span>
                <span style={{ display: 'block', fontSize: 12, color: '#8c8f99' }}>{balanceHidden ? '••••' : `${row.amount} ${row.symbol}`}</span>
              </span>
              <span style={{ fontSize: 14, fontWeight: 600, color: '#accafe' }}>{balanceHidden ? '••••' : 'Private'}</span>
            </div>
          ))}
        </div>
        {live?.app ? (
          <>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 16 }}>
              <span style={{ fontSize: 18, fontWeight: 700 }}>History</span>
              <button type="button" onClick={() => go('activity')} style={{ ...plain, color: '#accafe', fontSize: 14, fontWeight: 500, minHeight: 40, padding: '8px 4px' }}>See all</button>
            </div>
            <div style={{ marginTop: 8 }}>
              <TestnetHistory go={go} limit={3} place="vault" />
            </div>
          </>
        ) : null}
      </div>
      {network.sheet}
      {sheet && (
        <>
          <button type="button" aria-label="Close" onClick={() => go('vault', false)} style={{ position: 'absolute', inset: 0, border: 'none', background: 'rgba(0,0,0,0.6)', zIndex: 12 }} />
          <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, zIndex: 13, background: '#11161f', border: '1px solid #2a3447', borderBottom: 'none', borderRadius: '24px 24px 0 0', padding: '12px 18px 28px' }}>
            <div style={{ width: 36, height: 4, borderRadius: 2, background: '#5c5f64', margin: '0 auto 14px' }} />
            <p style={{ margin: '0 0 12px', fontSize: 18, fontWeight: 700 }}>Send from Vault</p>
            <SheetRow title="Private pay" body="Pay a wallet from a shielded balance." onClick={onPrivate} />
            <SheetRow title="Unshield" body="Move a shielded balance back to a public address." onClick={onUnshield} />
            <button type="button" onClick={() => go('vault', false)} style={{ ...btn, marginTop: 8, background: 'transparent', color: '#fff', border: '1px solid #2a3447' }}>Cancel</button>
          </div>
        </>
      )}
      {keyOpen && (
        <>
          <button type="button" aria-label="Close shielded key" onClick={() => setKeyOpen(false)} style={{ position: 'absolute', inset: 0, border: 'none', background: 'rgba(0,0,0,0.6)', zIndex: 20 }} />
          <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, zIndex: 21, background: '#11161f', border: '1px solid #2a3447', borderBottom: 'none', borderRadius: '24px 24px 0 0', padding: '12px 18px 28px' }}>
            <div style={{ width: 36, height: 4, borderRadius: 2, background: '#5c5f64', margin: '0 auto 14px' }} />
            <p style={{ margin: '0 0 8px', fontSize: 18, fontWeight: 700 }}>Shielded key</p>
            <p style={{ margin: '0 0 12px', color: '#8b9097', fontSize: 13, lineHeight: 1.4 }}>Private pay to this vault uses this key. It is not your public address, and it covers the shielded tokens in this account.</p>
            <p style={{ margin: 0, padding: 14, borderRadius: 14, background: '#1c2025', color: '#fff', fontSize: 13, lineHeight: 1.45, wordBreak: 'break-all' }}>{key || 'Your shielded key is not ready on this account yet.'}</p>
            <button type="button" disabled={!key} onClick={() => void copyKey()} style={{ ...btn, width: '100%', marginTop: 12, border: 'none', background: key ? '#accafe' : '#1c2025', color: key ? '#0c1018' : '#5c5f64' }}>{copied ? 'Copied' : 'Copy key'}</button>
            <button type="button" onClick={() => setKeyOpen(false)} style={{ ...btn, width: '100%', marginTop: 8, background: 'transparent', color: '#fff', border: '1px solid #2a3447' }}>Close</button>
          </div>
        </>
      )}
    </>
  );
}

function demoHoldings(many: boolean, broke: boolean): VaultHolding[] {
  if (broke) return [];
  const arx: VaultHolding = { name: 'Arxon', symbol: 'ARX', amount: '1,000.00', icon: 'arx' };
  if (!many) return [arx];
  return [arx, { name: 'USD Coin', symbol: 'USDC', amount: '30.00', icon: 'usdc' }, { name: 'Tether', symbol: 'USDT', amount: '40.00', icon: 'usdt' }];
}

function vaultHeadline(rows: VaultHolding[]) {
  if (!rows.length) return '0.00';
  const arx = rows.find((row) => row.symbol === 'ARX');
  if (rows.length === 1) return rows[0].amount;
  return arx ? arx.amount : rows[0].amount;
}

function vaultTab(on: boolean): CSSProperties {
  return {
    height: 32,
    minWidth: 64,
    padding: '0 12px',
    border: 'none',
    borderRadius: 15,
    background: on ? '#accafe' : 'transparent',
    color: on ? '#0c1018' : '#8c8f99',
    fontFamily: font.sans,
    fontSize: 12,
    fontWeight: 600,
    cursor: on ? 'default' : 'pointer',
  };
}

function CircleBtn({ label, onClick, children }: { label: string; onClick: () => void; children: ReactNode }) {
  return (
    <button type="button" aria-label={label} onClick={onClick} style={{ width: 40, height: 40, borderRadius: 20, border: 'none', background: '#1c2025', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', padding: 0 }}>
      {children}
    </button>
  );
}

function Picker({ id, kind, query, setQuery, leave, onPick }: { id: string; kind: 'private' | 'public'; query: string; setQuery: (v: string) => void; leave: () => void; onPick: (sym: Sym) => void }) {
  const live = useLiveFrame();
  const incoming = id === 'vault-pick-in';
  const sending = id === 'vault-send-token';
  const liveArx = incoming ? `${live?.publicArx ?? '0'} ARX` : `${Number(live?.shielded || 0).toLocaleString(undefined, { maximumFractionDigits: 4 })} ARX`;
  const rows = (live?.app
    ? [['Arxon', 'ARX', liveArx, '$0.00']]
    : incoming
    ? [['Arxon', 'ARX', '1,400.00 ARX', '$588.00'], ['Tether', 'USDT', '120.00 USDT', '$120.00'], ['USD Coin', 'USDC', '30.00 USDC', '$30.00']]
    : [['Arxon', 'ARX', '1,000.00 ARX', '$420.00'], ['USD Coin', 'USDC', '30.00 USDC', '$30.00'], ['Tether', 'USDT', '40.00 USDT', '$40.00']]
  ).filter(([name, sym]) => `${name} ${sym}`.toLowerCase().includes(query.trim().toLowerCase()));
  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <PhoneStatus />
      <Head title={incoming ? 'Shield in' : id === 'vault-pick-out' ? 'Move to Home' : kind === 'public' ? 'Unshield' : 'Private pay'} onBack={leave} />
      <label style={{ margin: '8px 18px 0', height: 48, borderRadius: 14, background: '#1c2025', display: 'flex', alignItems: 'center', gap: 8, padding: '0 14px' }}>
        <FigmaImg src="/wallet-figma/find/search.svg" width={20} height={20} />
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search tokens" style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', color: '#fff', fontFamily: font.sans, fontSize: 15 }} />
      </label>
      <p style={{ margin: '16px 18px 8px', color: '#8b9097', fontSize: 12, fontWeight: 600 }}>{incoming ? 'CHOOSE A TOKEN' : 'SHIELDED BALANCE'}</p>
      {rows.map(([name, sym, amount, fiat]) => (
        <button key={sym} type="button" onClick={() => onPick(sym as Sym)} style={rowBtn}>
          <Tok sym={sym as Sym} />
          <span style={{ flex: 1, textAlign: 'left' }}>
            <span style={{ display: 'block', fontSize: 16, fontWeight: 600 }}>{name}</span>
            <span style={{ display: 'block', fontSize: 13, color: '#8b9097' }}>{amount}</span>
          </span>
          <span style={{ fontWeight: 600 }}>{fiat}</span>
        </button>
      ))}
      <p style={{ margin: '12px 18px 0', color: '#8b9097', fontSize: 12, lineHeight: 1.4 }}>
        {incoming ? 'Pick what to shield. On Arxon Testnet, only ARX can move into the Vault.' : sending ? (kind === 'public' ? 'Pick the shielded balance to unshield.' : 'Pick the shielded balance to pay from.') : 'Moving out returns the token to Home.'}
      </p>
    </div>
  );
}

function Unlock({ wrong, locked, clock, typed, setTyped, onUnlock, onFace, leave, go }: { wrong: boolean; locked: boolean; clock: string; typed: string; setTyped: (v: string) => void; onUnlock: () => void; onFace: () => void; leave: () => void; go: Go }) {
  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <PhoneStatus />
      <button type="button" aria-label="Back" onClick={leave} style={{ ...iconBtn, position: 'absolute', left: 16, top: 56, width: 40, height: 40, borderRadius: 20, background: '#1c2025' }}>
        <FigmaImg src="/wallet-figma/find/back.svg" width={20} height={20} />
      </button>
      <div style={{ marginTop: 88, width: 72, height: 72, borderRadius: 20, background: '#243044', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32, fontWeight: 700, color: '#accafe' }}>A</div>
      <p style={{ margin: '22px 0 0', fontSize: 28, fontWeight: 700 }}>Unlock Vault</p>
      <p style={{ margin: '8px 0 0', color: '#8b9097', fontSize: 14 }}>Confirm it’s you to open your Vault</p>
      {locked && <p style={{ margin: '16px 18px 0', color: '#f25252', fontSize: 14, textAlign: 'center' }}>Your vault is locked. Try again in {clock}.</p>}
      <label style={{ marginTop: 22, width: 354, height: 56, boxSizing: 'border-box', borderRadius: 14, background: '#1c2025', border: wrong || locked ? '1px solid #f25252' : '1px solid #2a3447', display: 'flex', alignItems: 'center', padding: '0 16px' }}>
        <input disabled={locked} type="password" value={typed} onChange={(e) => setTyped(e.target.value)} placeholder="Enter your password" style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', color: '#fff', fontFamily: font.sans, fontSize: 16 }} />
      </label>
      {wrong && !locked && <p style={{ margin: '8px 0 0', color: '#f25252', fontSize: 13 }}>Incorrect password. Try again.</p>}
      <button type="button" onClick={() => { if (!locked) go('home-funded', false); }} style={{ marginTop: 12, border: 'none', background: 'none', color: '#accafe', fontFamily: font.sans, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>Forgot password?</button>
      <div style={{ marginTop: 'auto', width: 354, paddingBottom: 28, display: 'flex', flexDirection: 'column', gap: 10 }}>
        <button type="button" disabled={locked || !typed} onClick={onUnlock} style={{ ...btn, background: locked || !typed ? '#1c2025' : '#accafe', color: locked || !typed ? '#5c5f64' : '#0c1018', border: 'none' }}>Unlock</button>
        <button type="button" disabled={locked} onClick={onFace} style={{ ...btn, background: 'transparent', color: locked ? '#5c5f64' : '#fff', border: '1px solid #2a3447' }}>Use fingerprint or Face ID</button>
      </div>
    </div>
  );
}

function vaultDest(priv: boolean, address: string | null | undefined) {
  if (address === undefined) return priv ? 'arx1q8…m2d9' : 'arx1q8x4…t7c2n4p';
  if (priv) return 'Shielded note';
  return address ? briefAddr(address) : 'Your address';
}

function shortAddr(value: string) {
  return briefAddr(value);
}

function ShieldExplain({ leave, onContinue }: { leave: () => void; onContinue: () => void }) {
  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: '#050505' }}>
      <PhoneStatus />
      <Head title="Shield in" onBack={leave} />
      <div style={{ margin: '28px 18px 0', borderRadius: 20, padding: '28px 22px', background: 'radial-gradient(ellipse 120% 80% at 50% 0%, #1d3f86 0%, #11161f 55%, #11161f 100%)', border: '1px solid #2a3447', textAlign: 'center' }}>
        <span style={{ width: 64, height: 64, borderRadius: 32, background: 'rgba(12,16,24,0.55)', border: '1px solid rgba(172,202,254,0.35)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
          <FigmaImg src="/wallet-figma/home/shield.svg" width={28} height={28} />
        </span>
        <p style={{ margin: '16px 0 0', fontSize: 20, fontWeight: 700 }}>This balance stays hidden</p>
        <p style={{ margin: '10px 0 0', color: '#c5cad3', fontSize: 14, lineHeight: 1.45 }}>
          Every token you shield, and the total shielded balance, can never be public. Nobody else can see it. Shielding automatically hides that part of your wallet.
        </p>
      </div>
      <div style={{ marginTop: 'auto', padding: '0 18px 28px' }}>
        <button type="button" onClick={onContinue} style={{ ...btn, width: '100%', background: '#accafe', color: '#0c1018', border: 'none' }}>Choose a token</button>
      </div>
    </div>
  );
}

function UnshieldWho({ leave, onSelf, onOther }: { leave: () => void; onSelf: () => void; onOther: () => void }) {
  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <PhoneStatus />
      <Head title="Unshield" onBack={leave} />
      <p style={{ margin: '8px 18px 0', color: '#8b9097', fontSize: 14, lineHeight: 1.4 }}>Where should this public balance go?</p>
      <div style={{ margin: '18px 18px 0', display: 'flex', flexDirection: 'column', gap: 10 }}>
        <SheetRow title="To myself" body="Uses your own address. Then you pick the token and amount." onClick={onSelf} />
        <SheetRow title="To someone else" body="Enter their 0x address, then the token and amount." onClick={onOther} />
      </div>
    </div>
  );
}

function PayAddress({ id, value, setValue, leave, onNext, self }: { id: string; value: string; setValue: (v: string) => void; leave: () => void; onNext: () => void; self?: string | null }) {
  const paying = id === 'priv-addr';
  const ready = paying ? isShieldedPk(value) : /^0x[0-9a-fA-F]{40}$/.test(value.trim());
  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <PhoneStatus />
      <Head title={paying ? 'Private pay' : 'Unshield'} onBack={leave} />
      <p style={{ margin: '8px 18px 0', color: '#8b9097', fontSize: 14, lineHeight: 1.4 }}>
        {paying ? 'Paste the shielded key of the wallet you are paying. A public address cannot receive this.' : 'Enter the 0x address that should receive the public balance.'}
      </p>
      <label style={{ margin: '16px 18px 0', minHeight: 56, borderRadius: 14, background: '#1c2025', border: '1px solid #2a3447', display: 'flex', alignItems: 'center', padding: '0 14px', gap: 8 }}>
        <input value={value} onChange={(e) => setValue(e.target.value.trim())} placeholder={paying ? 'Shielded key' : '0x address'} style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', color: '#fff', fontFamily: font.sans, fontSize: 15 }} />
      </label>
      <button type="button" onClick={() => navigator.clipboard?.readText().then((text) => { if (text.trim()) setValue(text.trim()); }).catch(() => undefined)} style={{ margin: '12px 18px 0', height: 44, borderRadius: 14, border: '1px solid #2a3447', background: 'transparent', color: '#accafe', fontFamily: font.sans, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>Paste</button>
      {!paying && self ? <p style={{ margin: '12px 18px 0', color: '#5c5f64', fontSize: 12 }}>Your address is {shortAddr(self)}</p> : null}
      <div style={{ marginTop: 'auto', padding: '0 18px 28px' }}>
        <button type="button" disabled={!ready} onClick={onNext} style={{ ...btn, width: '100%', background: ready ? '#accafe' : '#1c2025', color: ready ? '#0c1018' : '#5c5f64', border: 'none' }}>Continue</button>
      </div>
    </div>
  );
}

function feeText(live: boolean) {
  return live ? 'Set by the network' : '0.0004 ARX';
}

function Pending({ id, go, amount }: { id: string; go: Go; amount: string }) {
  const live = useLiveFrame();
  const title = id === 'vault-pending' ? 'Shielding' : id === 'priv-pending' ? 'Private pay' : 'Unshielding';
  const to = id === 'vault-pending' ? 'Vault' : vaultDest(id === 'priv-pending', live?.app ? live.address : undefined);
  const shown = `${qty(num(amount || '0'))} ARX`;
  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <PhoneStatus />
      <div style={{ marginTop: 120, width: 96, height: 96, borderRadius: 48, border: '6px solid #1c2a44', borderTopColor: '#accafe', animation: 'vaultspin 1s linear infinite' }} />
      <p style={{ margin: '28px 0 0', fontSize: 22, fontWeight: 700 }}>{title}</p>
      <p style={{ margin: '8px 0 0', fontSize: 28, fontWeight: 700 }}>{shown}</p>
      <div style={{ marginTop: 24, width: 354, background: '#1c2025', borderRadius: 16, padding: '8px 16px' }}>
        <Line label="To" value={to} />
        <Line label="Network fee" value={feeText(!!live?.app)} />
        <Line label="Status" value="Pending" color="#accafe" />
      </div>
      <p style={{ margin: '16px 28px 0', textAlign: 'center', color: '#8b9097', fontSize: 13, lineHeight: 1.4 }}>You can leave this screen. Your balances update once the move is confirmed.</p>
      <button type="button" onClick={() => go(id === 'vault-pending' ? 'home-funded' : 'vault', false)} style={{ ...btn, marginTop: 'auto', marginBottom: 28, width: 354, background: '#accafe', color: '#0c1018', border: 'none' }}>{id === 'vault-pending' ? 'Back to Home' : 'Back to Vault'}</button>
    </div>
  );
}

function Result({ id, go, fundedVault, amount }: { id: string; go: Go; fundedVault: () => void; amount: string }) {
  const live = useLiveFrame();
  const failed = id === 'vault-failed';
  const backHome = id === 'move-home-done';
  const title = id === 'vault-done' ? 'Shielded' : id === 'move-home-done' ? 'Moved to Home' : id === 'priv-done' ? 'Private pay sent' : id === 'unshield-done' ? 'Unshielded' : 'Move failed';
  const shown = `${qty(num(amount || '0'))} ARX`;
  const vaultNow = live?.app ? `${Number(live.shielded || 0).toLocaleString(undefined, { maximumFractionDigits: 4 })} ARX` : undefined;
  const rows: [string, string, string?][] = failed
    ? [['Network fee', 'No fee charged'], ['Vault', 'Not moved', '#f25252'], ['Status', 'Not moved', '#f25252']]
    : id === 'vault-done'
      ? [['Where it is', 'Your Vault'], ['Vault balance', live?.app ? 'Only you can see it' : vaultNow ?? 'Hidden'], ['Status', 'Confirmed', '#3ddb85']]
      : id === 'move-home-done'
        ? [['Home balance now', live?.app ? live.publicArx : '$1,188.60'], ['Vault balance', vaultNow ?? '$210.00'], ['Status', 'Confirmed', '#3ddb85']]
        : id === 'priv-done'
          ? [['To', 'Shielded note'], ['Network fee', feeText(!!live?.app)], ['Status', 'Confirmed', '#3ddb85'], ['Vault balance now', vaultNow ?? '$315.00']]
          : [['To', vaultDest(false, live?.app ? live.address : undefined)], ['Network fee', feeText(!!live?.app)], ['Status', 'Confirmed', '#3ddb85'], ['Vault balance now', vaultNow ?? '$210.00']];
  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <PhoneStatus />
      {failed ? (
        <div style={{ marginTop: 96, width: 168, height: 168, position: 'relative' }}>
          <img src="/wallet-figma/send/fail-glow.svg" alt="" width={168} height={168} style={{ position: 'absolute', left: 0, top: 0 }} />
          <img src="/wallet-figma/send/fail-ring.svg" alt="" width={132} height={132} style={{ position: 'absolute', left: 18, top: 18 }} />
          <img src="/wallet-figma/send/fail-core.svg" alt="" width={96} height={96} style={{ position: 'absolute', left: 36, top: 36 }} />
        </div>
      ) : (
        <div style={{ marginTop: 110, width: 96, height: 96, borderRadius: 48, background: '#accafe', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <FigmaImg src="/wallet-figma/claim/check.svg" width={44} height={44} />
        </div>
      )}
      <p style={{ margin: '22px 0 0', fontSize: 22, fontWeight: 700 }}>{title}</p>
      <p style={{ margin: '8px 0 0', fontSize: 28, fontWeight: 700 }}>{shown}</p>
      <div style={{ marginTop: 22, width: 354, background: '#1c2025', borderRadius: 16, padding: '8px 16px' }}>
        {rows.map(([label, value, color]) => <Line key={label} label={label} value={value} color={color} />)}
      </div>
      <div style={{ marginTop: 'auto', width: 354, paddingBottom: 28, display: 'flex', flexDirection: 'column', gap: 10 }}>
        <button type="button" onClick={() => failed ? go('vault-review') : backHome ? go('home-funded') : fundedVault()} style={{ ...btn, background: '#accafe', color: '#0c1018', border: 'none' }}>{failed ? 'Try again' : 'Done'}</button>
        <button type="button" onClick={() => failed || !backHome ? fundedVault() : go('home-funded')} style={{ ...btn, background: 'transparent', color: '#fff', border: '1px solid #2a3447' }}>
          {backHome ? 'Back to Home' : 'Back to Vault'}
        </button>
      </div>
    </div>
  );
}

function Accounts({ id, go, made, name, setName, onCreate }: { id: string; go: Go; made: boolean; name: string; setName: (v: string) => void; onCreate: () => void }) {
  const live = useLiveFrame();
  const label = live?.app ? live.accountLabel : made ? name || 'Account 02' : 'Account 01';
  const addr = live?.address ? briefAddr(live.address) : 'arx1q8…m2d9';
  const total = live?.app ? live.total : '$0.00';
  return (
    <>
      <PhoneStatus />
      <div style={{ position: 'absolute', left: 18, top: 58, display: 'flex', alignItems: 'center', gap: 10 }}>
        <img src="/wallet-figma/home/avatar.png" alt="" width={36} height={36} style={{ borderRadius: 18 }} />
        <span style={{ fontSize: 16, fontWeight: 600 }}>{label}</span>
      </div>
      <p style={{ position: 'absolute', left: 22, top: 126, margin: 0, fontSize: 48, fontWeight: 700 }}>{total}</p>
      <p style={{ position: 'absolute', left: 22, top: 184, margin: 0, color: '#5c5f64', fontSize: 14 }}>+$0.00 Today</p>
      <button type="button" onClick={() => go('defaults')} style={{ position: 'absolute', left: 22, top: 220, border: '1px solid #2a3447', background: '#11161f', color: '#accafe', borderRadius: 20, padding: '7px 12px', fontFamily: font.sans, fontSize: 13 }}>Custom · 2 of 4 hidden</button>
      <div style={{ position: 'absolute', left: 18, top: 280, width: 354, display: 'flex', justifyContent: 'space-between' }}>
        <Mini label="Send" onClick={() => go('send-token')} />
        <Mini label="Receive" onClick={() => go('receive')} />
        <Mini label="Swap" onClick={() => go('swap')} />
        <Mini label="Buy" onClick={() => go('buy')} />
      </div>
      <div style={{ position: 'absolute', left: 18, top: 380, display: 'flex', gap: 12 }}>
        <button type="button" onClick={() => go('receive')} style={card}><span style={{ fontWeight: 600 }}>Fund your wallet</span><span style={{ color: '#8b9097', fontSize: 12 }}>Add ARX to get started</span></button>
        <button type="button" onClick={() => go('defaults')} style={card}><span style={{ fontWeight: 600 }}>Privacy controls</span><span style={{ color: '#8b9097', fontSize: 12 }}>Choose what a payment hides</span></button>
      </div>
      <button type="button" aria-label="Close" onClick={() => go('home', false)} style={{ position: 'absolute', inset: 0, border: 'none', background: 'rgba(0,0,0,0.55)', zIndex: 2 }} />
      {id === 'add-account' ? (
        <div style={sheet}>
          <div style={handle} />
          <p style={{ margin: '14px 0 6px', fontSize: 20, fontWeight: 700 }}>Add account</p>
          <p style={{ margin: 0, color: '#8b9097', fontSize: 13, lineHeight: 1.4 }}>A new account is created from your existing recovery phrase.</p>
          <p style={{ margin: '16px 0 8px', color: '#8b9097', fontSize: 13 }}>Account name</p>
          <input value={name} onChange={(e) => setName(e.target.value)} style={{ width: '100%', boxSizing: 'border-box', height: 52, borderRadius: 14, border: '1px solid #accafe', background: '#1c2025', color: '#fff', padding: '0 14px', fontFamily: font.sans, fontSize: 16 }} />
          <button type="button" onClick={onCreate} style={{ ...btn, marginTop: 16, background: '#accafe', color: '#0c1018', border: 'none' }}>Create account</button>
          <button type="button" onClick={() => go('import')} style={{ marginTop: 12, width: '100%', border: 'none', background: 'none', color: '#accafe', fontFamily: font.sans, fontSize: 15, fontWeight: 600, cursor: 'pointer' }}>Import a wallet instead</button>
        </div>
      ) : (
        <div style={sheet}>
          <div style={handle} />
          <p style={{ margin: '14px 0 12px', fontSize: 20, fontWeight: 700 }}>Accounts</p>
          <button type="button" onClick={() => go('accounts', false)} style={{ ...rowBtn, background: '#1c2025', borderRadius: 14, padding: '0 12px' }}>
            <img src="/wallet-figma/home/arx-mask.png" alt="" width={28} height={28} />
            <span style={{ flex: 1, textAlign: 'left' }}>
              <span style={{ display: 'block', fontWeight: 600 }}>{label}</span>
              <span style={{ display: 'block', color: '#8b9097', fontSize: 12 }}>{addr} · {total}</span>
            </span>
            <FigmaImg src="/wallet-figma/buy/check.svg" width={20} height={20} />
          </button>
          <button type="button" onClick={() => go('add-account')} style={{ ...btn, marginTop: 12, background: 'transparent', color: '#fff', border: '1px solid #2a3447' }}>Add account</button>
        </div>
      )}
    </>
  );
}

function Tabs({ go, here }: { go: Go; here: string }) {
  const net = useWalletNetwork();
  return (
    <WalletTabs
      active="Testnet"
      onSelect={(tab) => {
        pickWalletTab(net, tab, go, {
          home: tabTarget('home'),
          vault: here,
          history: tabTarget('history'),
        });
      }}
    />
  );
}

function Head({ title, onBack }: { title: string; onBack: () => void }) {
  return (
    <div style={{ height: 56, marginTop: 48, display: 'flex', alignItems: 'center', padding: '0 16px' }}>
      <button type="button" aria-label="Back" onClick={onBack} style={{ ...iconBtn, width: 40, height: 40, borderRadius: 20, background: '#1c2025' }}>
        <FigmaImg src="/wallet-figma/find/back.svg" width={20} height={20} />
      </button>
      <p style={{ flex: 1, margin: 0, textAlign: 'center', fontSize: 17, fontWeight: 700, paddingRight: 40 }}>{title}</p>
    </div>
  );
}

function Tok({ sym }: { sym: Sym }) {
  if (sym === 'USDT') return <img src="/wallet-figma/home/usdt.png" alt="" width={40} height={40} style={{ borderRadius: 20 }} />;
  if (sym === 'USDC') {
    return (
      <span style={{ width: 40, height: 40, borderRadius: 20, background: '#2775ca', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <FigmaImg src="/wallet-figma/home/usdc.svg" width={11.7857} height={22} />
      </span>
    );
  }
  return (
    <span style={{ width: 40, height: 40, borderRadius: 20, background: '#90b9ff', position: 'relative', overflow: 'hidden', flexShrink: 0 }}>
      <span style={{ position: 'absolute', left: 10, top: 11.5, width: 20.923, height: 16, background: '#050505', WebkitMaskImage: 'url(/wallet-figma/home/arx-mask.png)', maskImage: 'url(/wallet-figma/home/arx-mask.png)', WebkitMaskSize: '20.923px 16px', maskSize: '20.923px 16px', WebkitMaskRepeat: 'no-repeat', maskRepeat: 'no-repeat' }} />
    </span>
  );
}

function Line({ label, value, color = '#fff' }: { label: string; value: string; color?: string }) {
  return (
    <div style={{ minHeight: 36, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, fontSize: 14 }}>
      <span style={{ color: '#8b9097' }}>{label}</span>
      <span style={{ fontWeight: 500, color }}>{value}</span>
    </div>
  );
}

function Note({ title, body }: { title: string; body: string }) {
  return (
    <div style={{ margin: '12px 18px 0', background: '#1c2025', borderRadius: 14, padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 10, flex: '0 0 auto' }}>
      <span style={{ width: 28, height: 28, borderRadius: 8, background: '#243044', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <FigmaImg src="/wallet-figma/send/shield-sm.svg" width={16} height={16} />
      </span>
      <span style={{ flex: 1, minWidth: 0, textAlign: 'center' }}>
        <span style={{ display: 'block', fontSize: 14, fontWeight: 600, lineHeight: 1.2 }}>{title}</span>
        <span style={{ display: 'block', marginTop: 4, fontSize: 12, color: '#8b9097', lineHeight: 1.35 }}>{body}</span>
      </span>
    </div>
  );
}

function SheetRow({ title, body, onClick }: { title: string; body: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} style={{ width: '100%', border: 'none', background: '#1c2025', color: '#fff', borderRadius: 14, padding: 14, marginBottom: 8, textAlign: 'left', fontFamily: font.sans, cursor: 'pointer' }}>
      <span style={{ display: 'block', fontSize: 16, fontWeight: 600 }}>{title}</span>
      <span style={{ display: 'block', marginTop: 4, fontSize: 13, color: '#8b9097' }}>{body}</span>
    </button>
  );
}

function Mini({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} style={{ flex: 1, minWidth: 0, height: 44, border: 'none', borderRadius: 12, background: '#1c2025', color: '#fff', fontFamily: font.sans, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>{label}</button>
  );
}

function Max({ onClick }: { onClick: () => void }) {
  return <button type="button" onClick={onClick} style={{ ...pill, border: 'none', background: '#2a3447', color: '#accafe', fontWeight: 600, cursor: 'pointer', fontFamily: font.sans }}>Max</button>;
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

const btn: CSSProperties = { height: 48, borderRadius: 12, fontFamily: font.sans, fontSize: 16, fontWeight: 600, cursor: 'pointer', flex: '0 0 auto' };
const keyBtn: CSSProperties = { width: '33.33%', height: 52, flex: '0 0 33.33%', border: 'none', background: 'none', color: '#fff', fontFamily: font.sans, fontSize: 24, fontWeight: 500, cursor: 'pointer' };
function reviewBtn(ready: boolean): CSSProperties {
  return { ...btn, width: '100%', marginTop: 4, border: 'none', background: ready ? '#accafe' : '#1c2025', color: ready ? '#0c1018' : '#5c5f64', padding: 0 };
}
const pill: CSSProperties = { height: 32, borderRadius: 16, background: '#1c2025', color: '#8b9097', display: 'inline-flex', alignItems: 'center', padding: '0 12px', fontSize: 13 };
const iconBtn: CSSProperties = { border: 'none', background: 'none', padding: 0, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' };
const plain: CSSProperties = { display: 'flex', alignItems: 'center', gap: 10, border: 'none', background: 'none', color: '#fff', padding: 0, cursor: 'pointer', fontFamily: font.sans };
const receiveCard: CSSProperties = { width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 8, padding: 16, border: 'none', borderRadius: 16, background: '#1c2025', color: '#fff', fontFamily: font.sans, cursor: 'pointer', textAlign: 'left' };
const liveReceive: CSSProperties = { ...receiveCard, background: '#243044', border: '1px solid #accafe', borderRadius: 12, minHeight: 76 };
const rowBtn: CSSProperties = { width: '100%', height: 68, border: 'none', background: 'none', color: '#fff', fontFamily: font.sans, display: 'flex', alignItems: 'center', gap: 12, padding: '0 18px', cursor: 'pointer', boxSizing: 'border-box' };
const card: CSSProperties = { width: 170, height: 92, border: 'none', borderRadius: 16, background: '#1c2025', color: '#fff', fontFamily: font.sans, textAlign: 'left', padding: 14, display: 'flex', flexDirection: 'column', gap: 6, cursor: 'pointer' };
const sheet: CSSProperties = { position: 'absolute', left: 0, right: 0, bottom: 0, zIndex: 3, background: '#11161f', border: '1px solid #2a3447', borderBottom: 'none', borderRadius: '24px 24px 0 0', padding: '10px 18px 28px' };
const handle: CSSProperties = { width: 36, height: 4, borderRadius: 2, background: '#5c5f64', margin: '0 auto' };
