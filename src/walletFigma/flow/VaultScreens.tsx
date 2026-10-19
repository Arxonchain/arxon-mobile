import { useEffect, useState, type CSSProperties } from 'react';
import { FigmaImg } from '@/walletFigma/icons';
import { font } from '@/walletFigma/tokens';
import { pickWalletTab, useWalletNetwork, WalletTabs } from './WalletTabs';
import { useLiveFrame } from './liveFrame';

const IDS = new Set([
  'vault-empty', 'vault', 'vault-amount', 'vault-review', 'vault-done', 'move-home', 'move-home-done',
  'vault-nofunds', 'vault-over', 'vault-failed', 'accounts', 'add-account', 'vault-pending', 'vault-lock',
  'vault-lock-wrong', 'vault-pick-in', 'vault-pick-out', 'vault-many', 'vault-locked', 'vault-send-options',
  'priv-amount', 'priv-review', 'priv-done', 'unshield-amount', 'unshield-review', 'unshield-done',
  'vault-send-token', 'priv-pending', 'unshield-pending',
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
  const [moveIn, setMoveIn] = useState('1000');
  const [moveOut, setMoveOut] = useState('500');
  const [sendAmt, setSendAmt] = useState('250');
  const [overAmt, setOverAmt] = useState('3000');
  const [token, setToken] = useState<Sym>('ARX');
  const [sendKind, setSendKind] = useState<'private' | 'public'>('private');
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
      ) : id === 'vault-empty' || id === 'vault-nofunds' ? (
        <Empty id={id} go={go} />
      ) : id === 'vault' || id === 'vault-many' || sheet ? (
        <VaultHome many={id === 'vault-many'} hidden={hidden} onEye={() => setHidden((v) => !v)} go={go} sheet={sheet} onPrivate={() => { setSendKind('private'); setToken('ARX'); go('priv-amount'); }} onPublic={() => { setSendKind('public'); setToken('ARX'); go('unshield-amount'); }} />
      ) : id === 'vault-pick-in' || id === 'vault-pick-out' || id === 'vault-send-token' ? (
        <Picker id={id} query={query} setQuery={setQuery} leave={leave} onPick={(sym) => { setToken(sym); go(id === 'vault-pick-in' ? 'vault-amount' : id === 'vault-pick-out' ? 'move-home' : sendKind === 'public' ? 'unshield-amount' : 'priv-amount'); }} />
      ) : id === 'vault-amount' || id === 'vault-over' || id === 'move-home' || id === 'priv-amount' || id === 'unshield-amount' ? (
        <Amount id={id} token={token} amount={id === 'vault-over' ? overAmt : id === 'move-home' ? moveOut : id === 'vault-amount' ? moveIn : sendAmt} leave={leave} onKey={(key) => {
          const set = id === 'vault-over' ? setOverAmt : id === 'move-home' ? setMoveOut : id === 'vault-amount' ? setMoveIn : setSendAmt;
          set((prev) => press(prev, key));
        }} go={go} />
      ) : id === 'vault-review' || id === 'priv-review' || id === 'unshield-review' ? (
        <Review id={id} token={token} amount={id === 'vault-review' ? moveIn : sendAmt} go={go} leave={leave} />
      ) : id === 'vault-pending' || id === 'priv-pending' || id === 'unshield-pending' ? (
        <Pending id={id} go={go} />
      ) : id === 'vault-done' || id === 'move-home-done' || id === 'priv-done' || id === 'unshield-done' || id === 'vault-failed' ? (
        <Result id={id} go={go} fundedVault={fundedVault} />
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

function Amount({ id, token, amount, leave, onKey, go }: { id: string; token: Sym; amount: string; leave: () => void; onKey: (key: string) => void; go: Go }) {
  const live = useLiveFrame();
  const movingIn = id === 'vault-amount' || id === 'vault-over';
  const sending = id === 'priv-amount' || id === 'unshield-amount';
  const value = num(amount);
  const available = movingIn ? (token === 'ARX' ? 2400 : token === 'USDT' ? 120 : 30) : token === 'ARX' ? 1000 : token === 'USDT' ? 40 : 30;
  const over = value > available;
  const ready = value > 0 && !over;
  const fiat = value * price(token);
  const after = movingIn ? HOME_FUNDED - fiat : HOME_VAULTED + fiat;
  const max = Math.max(0, available - (token === 'ARX' ? FEE : 0));
  const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0', '⌫'];
  const title = movingIn ? 'Move to Vault' : id === 'move-home' ? 'Move to Home' : id === 'priv-amount' ? 'Private transfer' : 'Unshield to address';
  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <PhoneStatus />
      <Head title={title} onBack={leave} />
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 18, marginTop: 8, color: '#8b9097', fontSize: 13 }}>
        <span>{movingIn ? 'From  Home' : id === 'move-home' ? 'From  Vault' : 'To'}</span>
        <span style={{ color: '#accafe' }}>→</span>
        <span style={{ color: '#fff' }}>{movingIn ? 'To  Vault' : id === 'move-home' ? 'To  Home' : id === 'priv-amount' ? 'arx1q8…m2d9' : 'arx1q8x4…t7c2n4p'}</span>
      </div>
      <div style={{ textAlign: 'center', marginTop: 18 }}>
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'flex-end', gap: 8 }}>
          <span style={{ fontSize: 56, fontWeight: 700, lineHeight: 1, color: over ? '#f25252' : '#fff' }}>{amount ? qty(value, amount.includes('.') ? 2 : 0) : '0'}</span>
          <span style={{ fontSize: 18, fontWeight: 600, color: '#accafe', marginBottom: 6 }}>{token}</span>
        </div>
        <p style={{ margin: '8px 0 0', color: '#8b9097', fontSize: 15 }}>≈ {money(fiat)}</p>
      </div>
      <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 14 }}>
        <span style={{ ...pill, color: over ? '#f25252' : '#8b9097' }}>Available {qty(available)} {token}</span>
        <Max onClick={() => fill(onKey, amount, max)} />
      </div>
      {over && <p style={{ margin: '10px 0 0', textAlign: 'center', color: '#f25252', fontSize: 13 }}>Not enough on {movingIn ? 'Home' : 'Vault'}</p>}
      {!sending && !over && (
        <div style={{ margin: '14px 18px 0', height: 48, borderRadius: 14, background: '#1c2025', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 16px', fontSize: 14 }}>
          <span style={{ color: '#8b9097' }}>Home balance after</span>
          <span style={{ fontWeight: 600 }}>{money(after)}</span>
        </div>
      )}
      {id === 'priv-amount' && <Note title="Shielded transfer" body="Sender, recipient and amount stay hidden." />}
      {id === 'unshield-amount' && <Note title="Public transfer" body="The recipient and the amount will be visible." />}
      <div style={{ marginTop: 'auto', padding: '8px 18px 18px' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap' }}>
          {keys.map((key) => (
            <button key={key} type="button" onClick={() => onKey(key)} style={keyBtn}>
              {key === '⌫' ? <FigmaImg src="/wallet-figma/send/backspace.svg" width={24} height={24} /> : key}
            </button>
          ))}
        </div>
        <button type="button" disabled={!ready} onClick={() => {
          if (id === 'move-home' && live?.app) {
            void live.vaultMoveOut(amount).then(() => go('move-home-done')).catch(() => go('vault-failed'));
            return;
          }
          go(id === 'move-home' ? 'move-home-done' : id === 'priv-amount' ? 'priv-review' : id === 'unshield-amount' ? 'unshield-review' : 'vault-review');
        }} style={{ ...btn, marginTop: 8, background: ready ? '#accafe' : '#1c2025', color: ready ? '#0c1018' : '#5c5f64' }}>
          {id === 'move-home' ? 'Move to Home' : 'Review'}
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

function Review({ id, token, amount, go, leave }: { id: string; token: Sym; amount: string; go: Go; leave: () => void }) {
  const live = useLiveFrame();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const value = num(amount || '0');
  const fiat = value * price(token);
  const total = token === 'ARX' ? `${qty(value + FEE, 4)} ARX` : `${qty(value)} ${token}`;
  const rows: [string, string, string?][] = id === 'vault-review'
    ? [['From', 'Home · Account 01'], ['To', 'Vault'], ['Home balance after', money(HOME_FUNDED - fiat)], ['Privacy', 'Hidden from Home', '#accafe'], ['Network fee', '0.0004 ARX'], ['Total', total]]
    : [['To', id === 'priv-review' ? 'arx1q8…m2d9' : 'arx1q8x4…t7c2n4p'], ['From', 'Your Vault'], ['Network', 'Arxon'], ['Privacy', id === 'priv-review' ? 'Private' : 'Public', id === 'priv-review' ? '#accafe' : '#fff'], ['Network fee', '0.0004 ARX'], ['Total', total]];
  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <PhoneStatus />
      <Head title="Review" onBack={leave} />
      <div style={{ textAlign: 'center', marginTop: 12 }}>
        <p style={{ margin: 0, color: '#8b9097', fontSize: 14 }}>{id === 'vault-review' ? 'You are moving' : 'You are sending'}</p>
        <p style={{ margin: '8px 0 0', fontSize: 32, fontWeight: 700 }}>{qty(value)} {token}</p>
        <p style={{ margin: '6px 0 0', color: '#8b9097' }}>≈ {money(fiat)}</p>
      </div>
      <div style={{ margin: '18px 18px 0', background: '#1c2025', border: '1px solid #2a3447', borderRadius: 16, padding: '6px 16px' }}>
        {rows.map(([label, valueText, color]) => (
          <div key={label} style={{ minHeight: 40, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, fontSize: 14 }}>
            <span style={{ color: '#8b9097' }}>{label}</span>
            <span style={{ fontWeight: 500, color: color || '#fff', textAlign: 'right' }}>{valueText}</span>
          </div>
        ))}
      </div>
      <p style={{ margin: '14px 18px 0', color: '#8b9097', fontSize: 12, lineHeight: 1.4 }}>
        {id === 'vault-review' ? 'Funds stay in your wallet. Home no longer counts them until you move them back.' : id === 'priv-review' ? 'Sender, recipient and amount stay hidden.' : 'The recipient and the amount will be visible on-chain.'}
      </p>
      <div style={{ marginTop: 'auto', padding: '0 18px 28px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {err ? <p style={{ margin: 0, color: '#f25252', fontSize: 12 }}>{err}</p> : null}
        <button type="button" disabled={busy} onClick={() => {
          if (!live?.app) {
            go(id === 'vault-review' ? 'vault-pending' : id === 'priv-review' ? 'priv-pending' : 'unshield-pending');
            return;
          }
          setBusy(true);
          setErr(null);
          const run = id === 'vault-review'
            ? live.vaultMoveIn(amount)
            : id === 'priv-review'
              ? live.send('ARX', '', amount, true, 'private')
              : live.send('ARX', '', amount, true, 'unshield');
          void run.then(() => go(id === 'vault-review' ? 'vault-done' : id === 'priv-review' ? 'priv-done' : 'unshield-done', false)).catch((e: unknown) => setErr(e instanceof Error ? e.message : 'Vault send failed')).finally(() => setBusy(false));
        }} style={{ ...btn, background: '#accafe', color: '#0c1018', border: 'none', opacity: busy ? 0.6 : 1 }}>{busy ? 'Working' : id === 'vault-review' ? 'Confirm and move' : id === 'priv-review' ? 'Confirm transfer' : 'Confirm and unshield'}</button>
        <button type="button" onClick={leave} style={{ ...btn, background: 'transparent', color: '#fff', border: '1px solid #2a3447' }}>Cancel</button>
      </div>
    </div>
  );
}

function Empty({ id, go }: { id: string; go: Go }) {
  const broke = id === 'vault-nofunds';
  const points = [
    ['Hidden from Home', 'Not counted in your Home balance'],
    ['Same recovery phrase', 'One phrase protects your Vault'],
    ['Move back any time', 'Move funds to Home to send or swap'],
  ];
  return (
    <>
      <PhoneStatus />
      <p style={{ position: 'absolute', left: 18, top: 64, margin: 0, fontSize: 26, fontWeight: 700 }}>Vault</p>
      <div style={{ position: 'absolute', left: 18, top: 120, width: 354, boxSizing: 'border-box', background: '#1c2025', borderRadius: 20, padding: 22, textAlign: 'center' }}>
        <span style={{ width: 56, height: 56, borderRadius: 28, background: '#11161f', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
          <FigmaImg src="/wallet-figma/activity/vault.svg" width={24} height={24} />
        </span>
        <p style={{ margin: '14px 0 0', fontSize: 20, fontWeight: 700 }}>Keep funds private</p>
        <p style={{ margin: '8px 0 0', color: '#8b9097', fontSize: 14, lineHeight: 1.4 }}>Move funds into your Vault to hide them from your Home balance. Move them back any time.</p>
      </div>
      <p style={{ position: 'absolute', left: 18, top: 360, margin: 0, color: '#8b9097', fontSize: 12, fontWeight: 600, letterSpacing: 0.4 }}>HOW IT WORKS</p>
      <div style={{ position: 'absolute', left: 18, top: 386, width: 354 }}>
        {points.map(([title, body]) => (
          <div key={title} style={{ display: 'flex', gap: 12, alignItems: 'center', height: 64 }}>
            <span style={{ width: 36, height: 36, borderRadius: 18, background: '#1c2025', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <FigmaImg src="/wallet-figma/send/shield-sm.svg" width={16} height={16} />
            </span>
            <span>
              <span style={{ display: 'block', fontSize: 15, fontWeight: 600 }}>{title}</span>
              <span style={{ display: 'block', marginTop: 2, fontSize: 13, color: '#8b9097' }}>{body}</span>
            </span>
          </div>
        ))}
      </div>
      <button type="button" onClick={() => go(broke ? 'buy' : 'vault-pick-in')} style={{ ...btn, position: 'absolute', left: 18, top: 660, width: 354, background: '#accafe', color: '#0c1018', border: 'none' }}>{broke ? 'Add funds' : 'Move funds to Vault'}</button>
    </>
  );
}

function VaultHome({ many, hidden, onEye, go, sheet, onPrivate, onPublic }: { many: boolean; hidden: boolean; onEye: () => void; go: Go; sheet: boolean; onPrivate: () => void; onPublic: () => void }) {
  const rows = many
    ? [['Arxon', '1,000.00 ARX', '$420.00', 'ARX'], ['USD Coin', '30.00 USDC', '$30.00', 'USDC'], ['Tether', '40.00 USDT', '$40.00', 'USDT']]
    : [['Arxon', '1,000.00 ARX', '$420.00', 'ARX']];
  return (
    <>
      <PhoneStatus />
      <div style={{ position: 'absolute', left: 18, top: 58, width: 354, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <p style={{ margin: 0, fontSize: 26, fontWeight: 700 }}>Vault</p>
        <button type="button" aria-label={hidden ? 'Show balance' : 'Hide balance'} onClick={onEye} style={iconBtn}><FigmaImg src={hidden ? '/wallet-figma/home/eye-off.svg' : '/wallet-figma/home/eye.svg'} width={22} height={22} /></button>
      </div>
      <div style={{ position: 'absolute', left: 18, top: 112 }}>
        <p style={{ margin: 0, fontSize: 40, fontWeight: 700 }}>{hidden ? '••••••' : many ? '$490.00' : '$420.00'}</p>
        <p style={{ margin: '6px 0 0', color: '#8b9097', fontSize: 14 }}>{hidden ? '••••' : many ? '3 tokens' : '1,000.00 ARX'}</p>
      </div>
      <div style={{ position: 'absolute', left: 18, top: 196, width: 354, display: 'flex', gap: 10 }}>
        <Mini label="To Vault" onClick={() => go('vault-pick-in')} />
        <Mini label="Send" onClick={() => go(many ? 'vault-send-token' : 'vault-send-options')} />
        <Mini label="To Home" onClick={() => go('vault-pick-out')} />
      </div>
      <p style={{ position: 'absolute', left: 18, top: 268, margin: 0, color: '#8b9097', fontSize: 12, fontWeight: 600 }}>IN YOUR VAULT</p>
      <div style={{ position: 'absolute', left: 18, top: 292, width: 354 }}>
        {rows.map(([name, amount, fiat, sym]) => (
          <div key={name} style={{ height: 64, display: 'flex', alignItems: 'center', gap: 12 }}>
            <Tok sym={sym as Sym} />
            <span style={{ flex: 1 }}>
              <span style={{ display: 'block', fontSize: 16, fontWeight: 600 }}>{name}</span>
              <span style={{ display: 'block', fontSize: 13, color: '#8b9097' }}>{hidden ? '••••' : amount}</span>
            </span>
            <span style={{ fontSize: 16, fontWeight: 600 }}>{hidden ? '••••' : fiat}</span>
          </div>
        ))}
      </div>
      <p style={{ position: 'absolute', left: 18, top: many ? 500 : 430, margin: 0, color: '#8b9097', fontSize: 12, fontWeight: 600 }}>RECENT</p>
      <div style={{ position: 'absolute', left: 18, top: many ? 524 : 454, width: 354, height: 64, display: 'flex', alignItems: 'center', gap: 12 }}>
        <span style={{ width: 40, height: 40, borderRadius: 20, background: '#1c2025', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><FigmaImg src="/wallet-figma/activity/vault.svg" width={24} height={24} /></span>
        <span style={{ flex: 1 }}>
          <span style={{ display: 'block', fontSize: 16, fontWeight: 500 }}>Moved to Vault</span>
          <span style={{ display: 'block', fontSize: 13, color: '#8b9097' }}>Today · 11:02 AM</span>
        </span>
        <span style={{ textAlign: 'right' }}>
          <span style={{ display: 'block', fontSize: 16, fontWeight: 500 }}>{hidden ? '••••' : '+1,000.00 ARX'}</span>
          <span style={{ display: 'block', fontSize: 13, color: '#8b9097' }}>{hidden ? '••••' : '$420.00'}</span>
        </span>
      </div>
      {sheet && (
        <>
          <button type="button" aria-label="Close" onClick={() => go('vault', false)} style={{ position: 'absolute', inset: 0, border: 'none', background: 'rgba(0,0,0,0.6)', zIndex: 3 }} />
          <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, zIndex: 4, background: '#11161f', border: '1px solid #2a3447', borderBottom: 'none', borderRadius: '24px 24px 0 0', padding: '12px 18px 28px' }}>
            <div style={{ width: 36, height: 4, borderRadius: 2, background: '#5c5f64', margin: '0 auto 14px' }} />
            <p style={{ margin: '0 0 12px', fontSize: 18, fontWeight: 700 }}>Send from Vault</p>
            <SheetRow title="Private transfer" body="Sender, recipient and amount stay hidden." onClick={onPrivate} />
            <SheetRow title="Unshield to public address" body="The recipient and the amount will be visible." onClick={onPublic} />
            <button type="button" onClick={() => go('vault', false)} style={{ ...btn, marginTop: 8, background: 'transparent', color: '#fff', border: '1px solid #2a3447' }}>Cancel</button>
          </div>
        </>
      )}
    </>
  );
}

function Picker({ id, query, setQuery, leave, onPick }: { id: string; query: string; setQuery: (v: string) => void; leave: () => void; onPick: (sym: Sym) => void }) {
  const incoming = id === 'vault-pick-in';
  const sending = id === 'vault-send-token';
  const rows = (incoming
    ? [['Arxon', 'ARX', '1,400.00 ARX', '$588.00'], ['Tether', 'USDT', '120.00 USDT', '$120.00'], ['USD Coin', 'USDC', '30.00 USDC', '$30.00']]
    : [['Arxon', 'ARX', '1,000.00 ARX', '$420.00'], ['USD Coin', 'USDC', '30.00 USDC', '$30.00'], ['Tether', 'USDT', '40.00 USDT', '$40.00']]
  ).filter(([name, sym]) => `${name} ${sym}`.toLowerCase().includes(query.trim().toLowerCase()));
  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <PhoneStatus />
      <Head title={incoming ? 'Move to Vault' : id === 'vault-pick-out' ? 'Move to Home' : 'Send from Vault'} onBack={leave} />
      <label style={{ margin: '8px 18px 0', height: 48, borderRadius: 14, background: '#1c2025', display: 'flex', alignItems: 'center', gap: 8, padding: '0 14px' }}>
        <FigmaImg src="/wallet-figma/find/search.svg" width={20} height={20} />
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search tokens" style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', color: '#fff', fontFamily: font.sans, fontSize: 15 }} />
      </label>
      <p style={{ margin: '16px 18px 8px', color: '#8b9097', fontSize: 12, fontWeight: 600 }}>{incoming ? 'CHOOSE ONE' : 'IN YOUR VAULT'}</p>
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
        {incoming ? 'Only ARX, USDT and USDC on Arxon can go in the Vault.' : sending ? 'Choose the token to send. It leaves your Vault.' : 'Moving out returns the token to Home. BTC and ETH are not in the Vault.'}
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
        <button type="button" disabled={locked} onClick={onFace} style={{ ...btn, background: 'transparent', color: locked ? '#5c5f64' : '#fff', border: '1px solid #2a3447' }}>Use Face ID</button>
      </div>
    </div>
  );
}

function Pending({ id, go }: { id: string; go: Go }) {
  const title = id === 'vault-pending' ? 'Moving to Vault' : id === 'priv-pending' ? 'Sending privately' : 'Unshielding';
  const to = id === 'vault-pending' ? 'Vault' : id === 'priv-pending' ? 'arx1q8…m2d9' : 'arx1q8x4…t7c2n4p';
  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <PhoneStatus />
      <div style={{ marginTop: 120, width: 96, height: 96, borderRadius: 48, border: '6px solid #1c2a44', borderTopColor: '#accafe', animation: 'vaultspin 1s linear infinite' }} />
      <p style={{ margin: '28px 0 0', fontSize: 22, fontWeight: 700 }}>{title}</p>
      <p style={{ margin: '8px 0 0', fontSize: 28, fontWeight: 700 }}>{id === 'vault-pending' ? '1,000.00 ARX' : '250.00 ARX'}</p>
      <div style={{ marginTop: 24, width: 354, background: '#1c2025', borderRadius: 16, padding: '8px 16px' }}>
        <Line label="To" value={to} />
        <Line label="Network fee" value="0.0004 ARX" />
        <Line label="Status" value="Pending" color="#accafe" />
      </div>
      <p style={{ margin: '16px 28px 0', textAlign: 'center', color: '#8b9097', fontSize: 13, lineHeight: 1.4 }}>You can leave this screen. Your balances update once the move is confirmed.</p>
      <button type="button" onClick={() => go(id === 'vault-pending' ? 'home-funded' : 'vault', false)} style={{ ...btn, marginTop: 'auto', marginBottom: 28, width: 354, background: '#accafe', color: '#0c1018', border: 'none' }}>{id === 'vault-pending' ? 'Back to Home' : 'Back to Vault'}</button>
    </div>
  );
}

function Result({ id, go, fundedVault }: { id: string; go: Go; fundedVault: () => void }) {
  const failed = id === 'vault-failed';
  const home = id === 'vault-done' || id === 'move-home-done';
  const title = id === 'vault-done' ? 'Moved to Vault' : id === 'move-home-done' ? 'Moved to Home' : id === 'priv-done' ? 'Sent privately' : id === 'unshield-done' ? 'Unshielded' : 'Move failed';
  const amount = id === 'move-home-done' ? '500.00 ARX' : id === 'priv-done' || id === 'unshield-done' ? '250.00 ARX' : '1,000.00 ARX';
  const rows: [string, string, string?][] = failed
    ? [['Network fee', 'No fee charged'], ['Vault', 'Not moved', '#f25252'], ['Status', 'Not moved', '#f25252']]
    : id === 'vault-done'
      ? [['Home balance now', '$978.60'], ['Vault balance', '$420.00'], ['Status', 'Confirmed', '#3ddb85']]
      : id === 'move-home-done'
        ? [['Home balance now', '$1,188.60'], ['Vault balance', '$210.00'], ['Status', 'Confirmed', '#3ddb85']]
        : id === 'priv-done'
          ? [['To', 'arx1q8…m2d9'], ['Network fee', '0.0004 ARX'], ['Status', 'Confirmed', '#3ddb85'], ['Vault balance now', '$315.00']]
          : [['To', 'arx1q8x4…t7c2n4p'], ['Network fee', '0.0004 ARX'], ['Status', 'Confirmed', '#3ddb85'], ['Vault balance now', '$210.00']];
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
      <p style={{ margin: '8px 0 0', fontSize: 28, fontWeight: 700 }}>{amount}</p>
      <div style={{ marginTop: 22, width: 354, background: '#1c2025', borderRadius: 16, padding: '8px 16px' }}>
        {rows.map(([label, value, color]) => <Line key={label} label={label} value={value} color={color} />)}
      </div>
      <div style={{ marginTop: 'auto', width: 354, paddingBottom: 28, display: 'flex', flexDirection: 'column', gap: 10 }}>
        <button type="button" onClick={() => failed ? go('vault-review') : home ? go('home-funded') : fundedVault()} style={{ ...btn, background: '#accafe', color: '#0c1018', border: 'none' }}>{failed ? 'Try again' : home || id === 'priv-done' || id === 'unshield-done' ? 'Done' : 'Done'}</button>
        <button type="button" onClick={() => failed ? fundedVault() : home ? go('home-funded') : id === 'priv-done' ? go('receipt') : go('tx')} style={{ ...btn, background: 'transparent', color: '#fff', border: '1px solid #2a3447' }}>
          {failed ? 'Back to Vault' : home ? 'Back to Home' : id === 'priv-done' ? 'View private receipt' : 'View on explorer'}
        </button>
      </div>
    </div>
  );
}

function Accounts({ id, go, made, name, setName, onCreate }: { id: string; go: Go; made: boolean; name: string; setName: (v: string) => void; onCreate: () => void }) {
  return (
    <>
      <PhoneStatus />
      <div style={{ position: 'absolute', left: 18, top: 58, display: 'flex', alignItems: 'center', gap: 10 }}>
        <img src="/wallet-figma/home/avatar.png" alt="" width={36} height={36} style={{ borderRadius: 18 }} />
        <span style={{ fontSize: 16, fontWeight: 600 }}>{made ? 'Account 02' : 'Account 01'}</span>
      </div>
      <p style={{ position: 'absolute', left: 22, top: 126, margin: 0, fontSize: 48, fontWeight: 700 }}>$0.00</p>
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
              <span style={{ display: 'block', fontWeight: 600 }}>{made ? name || 'Account 02' : 'Account 01'}</span>
              <span style={{ display: 'block', color: '#8b9097', fontSize: 12 }}>arx1q8…m2d9 · $0.00</span>
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
      active="Vault"
      onSelect={(tab) => {
        if (tab === 'Vault') return;
        pickWalletTab(net, tab, go, {
          home: tabTarget('home'),
          vault: net === 'testnet' ? vaultEntry('vault-empty') : here,
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
    <div style={{ margin: '14px 18px 0', background: '#1c2025', borderRadius: 14, padding: 14, display: 'flex', gap: 10 }}>
      <FigmaImg src="/wallet-figma/send/shield-sm.svg" width={16} height={16} />
      <span>
        <span style={{ display: 'block', fontSize: 14, fontWeight: 600 }}>{title}</span>
        <span style={{ display: 'block', marginTop: 2, fontSize: 12, color: '#8b9097' }}>{body}</span>
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
    <button type="button" onClick={onClick} style={{ flex: 1, height: 44, border: 'none', borderRadius: 12, background: '#1c2025', color: '#fff', fontFamily: font.sans, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>{label}</button>
  );
}

function Max({ onClick }: { onClick: () => void }) {
  return <button type="button" onClick={onClick} style={{ ...pill, border: 'none', background: '#2a3447', color: '#accafe', fontWeight: 600, cursor: 'pointer', fontFamily: font.sans }}>Max</button>;
}

function PhoneStatus() {
  return (
    <>
      <span style={{ position: 'absolute', left: 21, top: 14, width: 54, textAlign: 'center', fontSize: 14, fontWeight: 600, letterSpacing: -0.28 }}>9:41</span>
      <img src="/wallet-figma/welcome/status.svg" alt="" width={66.6} height={11.33} style={{ position: 'absolute', left: 288.67, top: 17.33 }} />
    </>
  );
}

const btn: CSSProperties = { height: 52, borderRadius: 14, fontFamily: font.sans, fontSize: 16, fontWeight: 600, cursor: 'pointer' };
const keyBtn: CSSProperties = { width: '33.33%', height: 58, border: 'none', background: 'none', color: '#fff', fontFamily: font.sans, fontSize: 24, fontWeight: 500, cursor: 'pointer' };
const pill: CSSProperties = { height: 32, borderRadius: 16, background: '#1c2025', color: '#8b9097', display: 'inline-flex', alignItems: 'center', padding: '0 12px', fontSize: 13 };
const iconBtn: CSSProperties = { border: 'none', background: 'none', padding: 0, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' };
const rowBtn: CSSProperties = { width: '100%', height: 68, border: 'none', background: 'none', color: '#fff', fontFamily: font.sans, display: 'flex', alignItems: 'center', gap: 12, padding: '0 18px', cursor: 'pointer', boxSizing: 'border-box' };
const card: CSSProperties = { width: 170, height: 92, border: 'none', borderRadius: 16, background: '#1c2025', color: '#fff', fontFamily: font.sans, textAlign: 'left', padding: 14, display: 'flex', flexDirection: 'column', gap: 6, cursor: 'pointer' };
const sheet: CSSProperties = { position: 'absolute', left: 0, right: 0, bottom: 0, zIndex: 3, background: '#11161f', border: '1px solid #2a3447', borderBottom: 'none', borderRadius: '24px 24px 0 0', padding: '10px 18px 28px' };
const handle: CSSProperties = { width: 36, height: 4, borderRadius: 2, background: '#5c5f64', margin: '0 auto' };
