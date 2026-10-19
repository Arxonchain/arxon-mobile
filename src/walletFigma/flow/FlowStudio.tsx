import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { FigmaImg } from '@/walletFigma/icons';
import { font, ink } from '@/walletFigma/tokens';
import { SCREENS, SCREEN_MAP, type Scr, type TabId } from './catalog';
import { WelcomeScreens } from './WelcomeScreens';
import { CreateWalletScreens } from './CreateWallet';
import { PhraseBackupScreens } from './PhraseBackup';
import { ImportWalletScreen } from './ImportWallet';
import { FinishScreens } from './FinishSetup';
import { UnlockScreens } from './UnlockScreens';
import { HomeScreens } from './HomeScreens';
import { FindScreens } from './FindScreens';
import { TokenScreens } from './TokenScreens';
import { isSendScreen, SendScreens } from './SendScreens';
import { isReceiveScreen, ReceiveScreens } from './ReceiveScreens';
import { isSwapScreen, SwapScreens } from './SwapScreens';
import { isBuyScreen, BuyScreens } from './BuyScreens';
import { isActivityScreen, ActivityScreens } from './ActivityScreens';
import { isReceiptScreen, ReceiptScreens } from './ReceiptScreens';
import { isClaimScreen, ClaimScreens } from './ClaimScreens';
import { isVaultScreen, tabTarget, VaultScreens } from './VaultScreens';
import { isAccountScreen, AccountScreens } from './AccountScreens';
import { isPrivacyScreen, PrivacyScreens } from './PrivacyScreens';
import { isExploreScreen, ExploreScreens } from './ExploreScreens';
import { WalletNetworkContext, type WalletNet } from './WalletTabs';
import { useLiveFrame } from './liveFrame';

const PHRASE = ['canyon', 'river', 'amber', 'north', 'silver', 'garden', 'orbit', 'maple', 'quiet', 'harbor', 'velvet', 'stone'];
const CHECKS = [3, 7, 12];

export default function FlowStudio({ app = false }: { app?: boolean }) {
  const live = useLiveFrame();
  const [id, setId] = useState('splash');
  const [appScale, setAppScale] = useState(1);
  const [stack, setStack] = useState<string[]>([]);
  const [hidden, setHidden] = useState(false);
  const [backup, setBackup] = useState<'drive' | 'manual'>('drive');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [agree, setAgree] = useState(false);
  const [phrasePick, setPhrasePick] = useState<string[]>(['', '', '']);
  const [flags, setFlags] = useState([true, true, false, false]);
  const [note, setNote] = useState<string | null>(null);
  const [menu, setMenu] = useState(!app);
  const [net, setNet] = useState<WalletNet>('mainnet');
  const stageRef = useRef<HTMLDivElement>(null);
  const [fit, setFit] = useState(1);

  const screen = SCREEN_MAP[id] ?? SCREENS[0];

  useEffect(() => {
    if (id !== 'splash') return;
    const t = window.setTimeout(() => go('gateway', false), 1600);
    return () => window.clearTimeout(t);
  }, [id]);

  useEffect(() => {
    if (app) return;
    const stage = stageRef.current;
    if (!stage) return;
    const measure = () => {
      const h = stage.clientHeight;
      const w = stage.clientWidth;
      if (h < 1 || w < 1) return;
      setFit(Math.min(1, h / 844, w / 390));
    };
    measure();
    const watcher = new ResizeObserver(measure);
    watcher.observe(stage);
    return () => watcher.disconnect();
  }, [menu, app]);

  useEffect(() => {
    if (!app) return;
    const stage = stageRef.current;
    if (!stage) return;
    const measure = () => setAppScale(Math.max(stage.clientWidth, 1) / 390);
    measure();
    const watcher = new ResizeObserver(measure);
    watcher.observe(stage);
    return () => watcher.disconnect();
  }, [app]);

  useEffect(() => {
    if (!app) return;
    const stage = stageRef.current;
    if (!stage) return;
    const hide = () => {
      stage.querySelectorAll('span').forEach((el) => {
        if (el.textContent?.trim() === '9:41') el.style.setProperty('display', 'none');
      });
      stage.querySelectorAll('img').forEach((img) => {
        const src = img.getAttribute('src') || '';
        if (src.includes('status.svg')) img.style.setProperty('display', 'none');
      });
      stage.querySelectorAll('div').forEach((el) => {
        if (el.style.width === '134px' && el.style.height === '5px') el.style.setProperty('display', 'none');
      });
    };
    hide();
    const obs = new MutationObserver(hide);
    obs.observe(stage, { childList: true, subtree: true });
    return () => obs.disconnect();
  }, [app, id]);

  function go(next: string, remember = true) {
    if (live?.app) {
      if (next === 'testnet') void live.setNetwork('arxon');
      else if (next === 'home' || next.startsWith('home-') || next === 'more') void live.setNetwork('ethereum');
    }
    if (next === 'testnet') {
      setNet('testnet');
      if (remember) setStack((prev) => [...prev, id]);
      setId('testnet');
      setNote(null);
      return;
    }
    if (next === 'home' || next === 'home-funded' || next === 'home-hidden' || next === 'home-vaulted' || next === 'home-unvaulted' || next === 'more') {
      setNet('mainnet');
    }
    if (!SCREEN_MAP[next]) return;
    if (remember) setStack((prev) => [...prev, id]);
    setId(next);
    setNote(null);
  }

  function back() {
    const prev = stack[stack.length - 1];
    if (!prev) return;
    setStack((s) => s.slice(0, -1));
    setId(prev);
  }

  const homeDesigned = id === 'home' || id === 'home-hidden' || id === 'home-funded' || id === 'more' || id === 'home-vaulted' || id === 'home-unvaulted' || id === 'testnet';
  const tokenDesigned = id.startsWith('token-');
  const sendDesigned = isSendScreen(id);
  const receiveDesigned = isReceiveScreen(id);
  const swapDesigned = isSwapScreen(id);
  const buyDesigned = isBuyScreen(id);
  const activityDesigned = isActivityScreen(id);
  const receiptDesigned = isReceiptScreen(id);
  const claimDesigned = isClaimScreen(id);
  const vaultDesigned = isVaultScreen(id);
  const accountDesigned = isAccountScreen(id);
  const privacyDesigned = isPrivacyScreen(id);
  const exploreDesigned = isExploreScreen(id);
  const unlockDesigned = id === 'unlock' || id === 'unlock-wrong' || id === 'dapp' || id === 'dapp-tx' || id === 'connected';
  const designed = homeDesigned || tokenDesigned || sendDesigned || receiveDesigned || swapDesigned || buyDesigned || activityDesigned || receiptDesigned || claimDesigned || vaultDesigned || accountDesigned || privacyDesigned || exploreDesigned || unlockDesigned;
  const parent = !designed && screen.parent ? SCREEN_MAP[screen.parent] : null;
  const shown = parent && (screen.kind === 'overlay' || screen.overlay) ? parent : screen;
  const overlay = parent && (screen.kind === 'overlay' || screen.overlay) ? screen : null;

  const sections = useMemo(() => {
    const groups: { name: string; items: Scr[] }[] = [];
    for (const item of SCREENS) {
      const last = groups[groups.length - 1];
      if (!last || last.name !== item.section) groups.push({ name: item.section, items: [item] });
      else last.items.push(item);
    }
    return groups;
  }, []);

  return (
    <div style={{ height: app ? 'auto' : '100vh', minHeight: app ? '100%' : undefined, overflow: app ? 'visible' : 'hidden', display: 'flex', background: app ? '#050505' : '#07080c', color: ink.text, fontFamily: font.sans }}>
      {!app && <aside style={{ width: menu ? 320 : 0, height: '100vh', flexShrink: 0, overflow: 'auto', borderRight: menu ? '1px solid #1c2025' : 'none', background: '#0c0e14' }}>
        <div style={{ padding: 16, position: 'sticky', top: 0, background: '#0c0e14' }}>
          <strong>Every screen</strong>
          <p style={{ margin: '6px 0 0', color: ink.secondary, fontSize: 12 }}>{SCREENS.length} frames from the wallet file. Click one, or use the phone.</p>
        </div>
        {sections.map((group) => (
          <div key={group.name} style={{ padding: '0 12px 14px' }}>
            <p style={{ margin: '8px 8px', color: ink.muted, fontSize: 11, letterSpacing: 0.4 }}>{group.name}</p>
            {group.items.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  setStack([]);
                  if (item.id === 'testnet') setNet('testnet');
                  else if (item.id === 'home' || item.id.startsWith('home-') || item.id === 'more') setNet('mainnet');
                  setId(item.id);
                }}
                style={{
                  display: 'block',
                  width: '100%',
                  textAlign: 'left',
                  border: 'none',
                  borderRadius: 8,
                  padding: '8px 10px',
                  marginBottom: 2,
                  cursor: 'pointer',
                  fontFamily: font.sans,
                  fontSize: 13,
                  background: item.id === id ? '#1c2433' : 'transparent',
                  color: item.id === id ? ink.accent : ink.text,
                }}
              >
                {item.name}
              </button>
            ))}
          </div>
        ))}
      </aside>}
      <main style={{ flex: app ? 'none' : 1, width: app ? '100%' : undefined, minWidth: 0, height: app ? 'auto' : '100vh', overflow: app ? 'visible' : 'hidden', display: 'flex', flexDirection: 'column', padding: app ? 0 : '12px 16px 16px' }}>
        {!app && (
        <div style={{ width: '100%', maxWidth: 390, alignSelf: 'center', display: 'flex', justifyContent: 'space-between', marginBottom: 8, flexShrink: 0 }}>
          <button type="button" onClick={() => setMenu((v) => !v)} style={linkBtn}>{menu ? 'Hide list' : 'All screens'}</button>
          <span style={{ color: ink.secondary, fontSize: 12 }}>{screen.name}</span>
        </div>
        )}
        <div ref={stageRef} style={{ flex: app ? 'none' : 1, width: '100%', minHeight: app ? undefined : 0, display: 'flex', justifyContent: 'center', alignItems: 'flex-start' }}>
        <WalletNetworkContext.Provider value={net}>
        <div style={app
          ? { width: 390, zoom: appScale, background: ink.page, position: 'relative' }
          : { width: 390, height: 844, zoom: fit, background: ink.page, borderRadius: 28, overflow: 'hidden', position: 'relative', boxShadow: '0 20px 80px rgba(0,0,0,0.45)', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
          {homeDesigned ? (
            <HomeScreens id={id === 'testnet' ? 'home-funded' : id} network={id === 'testnet' ? 'testnet' : 'mainnet'} go={go} back={stack.length ? back : undefined} behind={stack[stack.length - 1]} />
          ) : tokenDesigned ? (
            <TokenScreens id={id} go={go} back={stack.length ? back : undefined} />
          ) : sendDesigned ? (
            <SendScreens id={id} go={go} back={stack.length ? back : undefined} />
          ) : receiveDesigned ? (
            <ReceiveScreens id={id} go={go} back={stack.length ? back : undefined} />
          ) : swapDesigned ? (
            <SwapScreens id={id} go={go} back={stack.length ? back : undefined} />
          ) : buyDesigned ? (
            <BuyScreens id={id} go={go} back={stack.length ? back : undefined} />
          ) : activityDesigned ? (
            <ActivityScreens id={id} go={go} back={stack.length ? back : undefined} />
          ) : receiptDesigned ? (
            <ReceiptScreens id={id} go={go} back={stack.length ? back : undefined} />
          ) : claimDesigned ? (
            <ClaimScreens id={id} go={go} back={stack.length ? back : undefined} />
          ) : vaultDesigned ? (
            <VaultScreens id={id} go={go} back={stack.length ? back : undefined} behind={stack[stack.length - 1]} password={password} />
          ) : accountDesigned ? (
            <AccountScreens id={id} go={go} back={stack.length ? back : undefined} />
          ) : privacyDesigned ? (
            <PrivacyScreens id={id} go={go} back={stack.length ? back : undefined} password={password} setPassword={setPassword} />
          ) : exploreDesigned ? (
            <ExploreScreens id={id} go={go} back={stack.length ? back : undefined} />
          ) : unlockDesigned ? (
            <UnlockScreens id={id} go={go} back={stack.length ? back : undefined} password={password} />
          ) : shown.id === 'splash' || shown.id === 'gateway' || shown.id === 'slide15' || shown.id === 'slide16' ? (
            <WelcomeScreens id={shown.id} go={go} />
          ) : shown.id === 'create' || shown.id === 'backup' || shown.id === 'backup-manual' || shown.id === 'drive-connect' || shown.id === 'drive-confirm' || shown.id === 'drive-done' ? (
            <CreateWalletScreens id={shown.id} go={go} back={stack.length ? back : undefined} password={password} setPassword={setPassword} confirm={confirm} setConfirm={setConfirm} agree={agree} setAgree={setAgree} backup={backup} setBackup={setBackup} />
          ) : shown.id === 'caution1' || shown.id === 'caution2' || shown.id === 'caution3' || shown.id === 'phrase-hidden' || shown.id === 'phrase-shown' || shown.id === 'phrase-confirm' || shown.id === 'phrase-done' ? (
            <PhraseBackupScreens id={shown.id} go={go} back={stack.length ? back : undefined} />
          ) : shown.id === 'import' ? (
            <ImportWalletScreen go={go} back={stack.length ? back : undefined} />
          ) : shown.id === 'face' || shown.id === 'ready-skip' ? (
            <FinishScreens id={shown.id} go={go} />
          ) : shown.id === 'search' || shown.id === 'manage' || shown.id === 'add-token' || shown.id === 'notifications' ? (
            <FindScreens id={shown.id} go={go} back={stack.length ? back : undefined} />
          ) : (
            <Body screen={shown} hidden={hidden} onToggleHide={() => { setHidden((v) => !v); go(hidden ? 'home' : 'home-hidden', false); }} go={go} back={stack.length ? back : undefined} backup={backup} setBackup={setBackup} password={password} setPassword={setPassword} confirm={confirm} setConfirm={setConfirm} agree={agree} setAgree={setAgree} phrasePick={phrasePick} setPhrasePick={setPhrasePick} flags={flags} setFlags={setFlags} toast={setNote} />
          )}
          {overlay && (
            <button type="button" onClick={() => go(overlay.parent || 'home', false)} style={{ position: 'absolute', inset: 0, zIndex: 6, background: 'rgba(0,0,0,0.55)', border: 'none', padding: 0 }}>
              <div onClick={(e) => e.stopPropagation()} style={{ position: 'absolute', left: 0, right: 0, bottom: 0, background: ink.card, borderRadius: '16px 16px 0 0', padding: 18, textAlign: 'left' }}>
                <Body screen={overlay} hidden={hidden} go={go} compact toast={setNote} flags={flags} setFlags={setFlags} password="" setPassword={() => {}} confirm="" setConfirm={() => {}} agree={false} setAgree={() => {}} phrasePick={phrasePick} setPhrasePick={setPhrasePick} backup={backup} setBackup={setBackup} />
              </div>
            </button>
          )}
          {shown.tab && !homeDesigned && !tokenDesigned && !sendDesigned && !receiveDesigned && !swapDesigned && !buyDesigned && !activityDesigned && !receiptDesigned && !claimDesigned && !vaultDesigned && !accountDesigned && !privacyDesigned && !exploreDesigned && <PhoneTabs active={shown.tab} go={go} />}
        </div>
        </WalletNetworkContext.Provider>
        </div>
        {note && <p style={{ color: ink.accent, fontSize: 13, margin: '8px 0 0', flexShrink: 0 }}>{note}</p>}
      </main>
    </div>
  );
}

function Body(props: {
  screen: Scr;
  hidden: boolean;
  go: (id: string, remember?: boolean) => void;
  back?: () => void;
  compact?: boolean;
  backup: 'drive' | 'manual';
  setBackup: (v: 'drive' | 'manual') => void;
  password: string;
  setPassword: (v: string) => void;
  confirm: string;
  setConfirm: (v: string) => void;
  agree: boolean;
  setAgree: (v: boolean) => void;
  phrasePick: string[];
  setPhrasePick: (v: string[]) => void;
  flags: boolean[];
  setFlags: (v: boolean[]) => void;
  toast: (v: string | null) => void;
  onToggleHide?: () => void;
}) {
  const { screen, go, hidden } = props;
  if (screen.kind === 'home') return <HomeMock id={screen.id} hidden={hidden || screen.id === 'home-hidden'} go={go} onToggleHide={props.onToggleHide} />;

  const strong = passwordOk(props.password);
  const canCreate = strong && props.password === props.confirm && props.agree;
  const phraseOk = CHECKS.every((n, i) => props.phrasePick[i] === PHRASE[n - 1]);

  return (
    <div style={{ padding: props.compact ? 0 : '22px 18px 28px', display: 'flex', flexDirection: 'column', gap: 12, flex: 1 }}>
      {!props.compact && props.back && <button type="button" onClick={props.back} style={linkBtn}>Back</button>}
      {screen.title && <h1 style={{ margin: 0, fontSize: screen.kind === 'detail' ? 26 : 28, fontWeight: 700 }}>{screen.title}</h1>}
      {screen.body && <p style={{ margin: 0, color: '#8b9097', fontSize: 14, lineHeight: 1.45 }}>{screen.body}</p>}

      {screen.kind === 'form' && screen.id === 'create' && (
        <>
          <Field label="Password" value={props.password} onChange={props.setPassword} secret />
          <Field label="Confirm password" value={props.confirm} onChange={props.setConfirm} secret />
          <p style={{ margin: 0, fontSize: 12, color: ruleColor(props.password.length >= 8) }}>8+ characters</p>
          <p style={{ margin: 0, fontSize: 12, color: ruleColor(/\d/.test(props.password)) }}>A number</p>
          <p style={{ margin: 0, fontSize: 12, color: ruleColor(/[^A-Za-z0-9]/.test(props.password)) }}>A symbol</p>
          <label style={{ fontSize: 13, color: '#c9cdd4' }}>
            <input type="checkbox" checked={props.agree} onChange={(e) => props.setAgree(e.target.checked)} /> I understand Arxon can’t recover this password, and I agree to the Terms of Service.
          </label>
        </>
      )}
      {screen.kind === 'form' && screen.id !== 'create' && screen.id !== 'import' && (
        <Field label="Password" value={props.password} onChange={props.setPassword} secret />
      )}
      {screen.id === 'import' && <Field label="Recovery phrase" value={props.confirm} onChange={props.setConfirm} />}
      {screen.id === 'send-who' && <Field label="Address or Arxon name" value={props.confirm} onChange={props.setConfirm} />}
      {screen.id === 'add-token' && <Field label="Contract address" value={props.confirm} onChange={props.setConfirm} />}
      {screen.id === 'search' && <Field label="Search" value={props.confirm} onChange={props.setConfirm} />}

      {(screen.kind === 'amount' || screen.id === 'vault-over') && (
        <p style={{ margin: 0, fontSize: 42, fontWeight: 700, color: screen.id === 'vault-over' ? ink.danger : ink.text }}>{screen.id === 'vault-over' ? '9,999' : '25'}</p>
      )}

      {screen.kind === 'phrase' && screen.id !== 'phrase-hidden' && screen.id !== 'view-hidden' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          {PHRASE.map((word, i) => (
            <span key={word} style={chip}>{i + 1}. {word}</span>
          ))}
        </div>
      )}
      {(screen.id === 'phrase-hidden' || screen.id === 'view-hidden') && (
        <div style={{ height: 120, borderRadius: 16, background: ink.card, display: 'flex', alignItems: 'center', justifyContent: 'center', color: ink.secondary }}>Hidden</div>
      )}
      {screen.kind === 'confirm' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {CHECKS.map((n, i) => (
            <label key={n} style={{ fontSize: 13, color: ink.secondary }}>
              Word {n}
              <select
                value={props.phrasePick[i]}
                onChange={(e) => {
                  const next = [...props.phrasePick];
                  next[i] = e.target.value;
                  props.setPhrasePick(next);
                }}
                style={{ display: 'block', marginTop: 4, width: '100%', background: ink.card, color: ink.text, border: 'none', borderRadius: 10, padding: 10 }}
              >
                <option value="">Choose</option>
                {PHRASE.map((word) => <option key={word}>{word}</option>)}
              </select>
            </label>
          ))}
        </div>
      )}

      {screen.kind === 'choice' && (
        <>
          <Choice on={props.backup === 'drive'} title="Google Drive" body="Recommended · Encrypted with your password" onClick={() => props.setBackup('drive')} />
          <Choice on={props.backup === 'manual'} title="Manual backup" body="Write down your 12-word phrase" onClick={() => props.setBackup('manual')} />
        </>
      )}

      {screen.id === 'defaults' || screen.id === 'send-privacy' ? (
        ['Hide sender', 'Hide receiver', 'Hide amount', 'Hide balance'].map((label, i) => (
          <button key={label} type="button" onClick={() => props.setFlags(props.flags.map((on, idx) => idx === i ? !on : on))} style={rowBtn}>
            <span>{label}</span>
            <span style={{ color: props.flags[i] ? ink.accent : ink.secondary }}>{props.flags[i] ? 'On' : 'Off'}</span>
          </button>
        ))
      ) : screen.rows?.map((row) => (
        <button key={row} type="button" onClick={() => rowTarget(row, go)} style={rowBtn}>{row}</button>
      ))}

      {screen.primary && (
        <button
          type="button"
          disabled={blocked(screen, canCreate, phraseOk, props.confirm)}
          onClick={() => act(screen, props, go)}
          style={{ ...cta, opacity: blocked(screen, canCreate, phraseOk, props.confirm) ? 0.45 : 1 }}
        >
          {screen.primary[0]}
        </button>
      )}
      {screen.secondary && (
        <button type="button" onClick={() => go(screen.secondary![1])} style={ghost}>
          {screen.secondary[0]}
        </button>
      )}
    </div>
  );
}

function HomeMock({ id, hidden, go, onToggleHide }: { id: string; hidden: boolean; go: (id: string) => void; onToggleHide?: () => void }) {
  const funded = id !== 'home';
  const vaulted = id === 'home-vaulted';
  const money = hidden ? '••••' : funded ? (vaulted ? '$1,188.60' : '$1,398.60') : '$0.00';
  return (
    <div style={{ padding: '18px 18px 110px' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <button type="button" onClick={() => go('accounts')} style={linkBtn}>Account 01</button>
        <span>
          <button type="button" aria-label="Search" onClick={() => go('search')} style={round}>⌕</button>
          <button type="button" aria-label="Notifications" onClick={() => go('notifications')} style={round}>⌂</button>
        </span>
      </header>
      <p style={{ fontSize: 48, fontWeight: 700, margin: '22px 0 0' }}>{money} <button type="button" onClick={onToggleHide} style={linkBtn}>◉</button></p>
      <p style={{ color: ink.muted, marginTop: 6 }}>{hidden ? '••••' : funded ? '+$20.67 (1.50%) Today' : '+$0.00 (0.00%) Today'}</p>
      <button type="button" onClick={() => go('defaults')} style={pill}>Custom · {funded ? '2' : '2'} of 4 hidden</button>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 22 }}>
        <Mini label="Send" onClick={() => go(vaulted ? 'send-amount-vault' : 'send-token')} />
        <Mini label="Receive" onClick={() => go('receive')} />
        <Mini label="Swap" onClick={() => go(vaulted ? 'swap-vault' : 'swap')} />
        <Mini label="More" onClick={() => go('more')} />
      </div>
      {!funded && (
        <div style={{ display: 'flex', gap: 10, overflowX: 'auto', marginTop: 18 }}>
          <Card title="Mine ARX" body="Earn ARX from your wallet" onClick={() => go('mine-entry')} />
          <Card title="Fund your wallet" body="Add ARX to get started" onClick={() => go('receive')} />
          <Card title="Privacy controls" body="Choose what each payment hides" onClick={() => go('defaults')} />
          <Card title="Turn on Face ID" body="Unlock faster, stay secure" onClick={() => go('face')} />
          <Card title="Claim your ARX" body="Convert your mining points" onClick={() => go('claim')} />
        </div>
      )}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 18 }}>
        <strong>Tokens</strong>
        <button type="button" onClick={() => go('manage')} style={linkBtn}>Manage</button>
      </div>
      <Token name="Arxon" sub={hidden ? '••••' : funded ? (vaulted ? '1,400.00 tARX' : '1,900.00 tARX') : '0.00 tARX'} onClick={() => go(vaulted ? 'token-arx-split' : funded ? 'token-arx-funded' : 'token-arx')} />
      {vaulted && <button type="button" onClick={() => go('vault')} style={{ ...linkBtn, marginLeft: 8 }}>In Vault</button>}
      <Token name="Bitcoin" sub={hidden ? '••••' : '0.00 BTC'} onClick={() => go(funded ? 'token-btc-funded' : 'token-btc')} />
      <Token name="Ethereum" sub={hidden ? '••••' : '0.00 ETH'} onClick={() => go(funded ? 'token-eth-funded' : 'token-eth')} />
    </div>
  );
}

function PhoneTabs({ active, go }: { active: TabId; go: (id: string) => void }) {
  const tabs: [TabId, string, string][] = [
    ['home', 'Home', tabTarget('home')],
    ['vault', 'Vault', tabTarget('vault')],
    ['explore', 'Explore', tabTarget('explore')],
    ['history', 'History', tabTarget('history')],
    ['account', 'Account', tabTarget('account')],
    ['home', 'Testnet', 'testnet'],
  ];
  return (
    <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, zIndex: 2, background: ink.page, display: 'flex', height: 78 }}>
      {tabs.map(([key, label, target]) => (
        <button key={label} type="button" onClick={() => go(target)} style={{ flex: 1, border: 'none', background: 'none', color: label !== 'Testnet' && active === key ? ink.accent : ink.secondary, fontFamily: font.tab, fontSize: 11 }}>
          {label}
        </button>
      ))}
    </div>
  );
}

function passwordOk(value: string) {
  return value.length >= 8 && /\d/.test(value) && /[^A-Za-z0-9]/.test(value);
}

function blocked(screen: Scr, canCreate: boolean, phraseOk: boolean, field: string) {
  if (screen.id === 'create') return !canCreate;
  if (screen.id === 'phrase-confirm') return !phraseOk;
  if (screen.id === 'import') return field.trim().split(/\s+/).length < 12;
  if (screen.id === 'vault-over') return true;
  if (screen.id === 'unlock') return false;
  return false;
}

function act(screen: Scr, props: { backup: 'drive' | 'manual'; password: string; toast: (v: string | null) => void }, go: (id: string) => void) {
  if (screen.id === 'backup') {
    go(props.backup === 'drive' ? 'drive-connect' : 'caution1');
    return;
  }
  if (screen.id === 'unlock' && props.password && props.password !== 'Arxon123!') {
    go('unlock-wrong');
    return;
  }
  if (screen.id === 'receive' && screen.primary?.[0] === 'Copy address') {
    props.toast('Address copied in this preview.');
    return;
  }
  if (screen.id === 'defaults') {
    props.toast('Defaults saved on this phone.');
  }
  if (screen.primary) go(screen.primary[1]);
}

function rowTarget(row: string, go: (id: string) => void) {
  if (row.startsWith('Buy')) go('buy');
  else if (row.startsWith('Mine')) go('mine-entry');
  else if (row.startsWith('Arxswap')) go('arxswap');
  else if (row.includes('Claim')) go('claim');
  else if (row.includes('Disclosure')) go('code-log');
  else if (row.includes('Connected')) go('connected');
  else if (row.startsWith('Private transfer')) go('priv-amount');
  else if (row.startsWith('Unshield')) go('unshield-amount');
  else if (row.startsWith('Sent')) go('tx');
  else if (row.startsWith('Moved to Vault')) go('tx-vault');
  else if (row.startsWith('Default privacy')) go('defaults');
  else if (row.startsWith('Arxon Mining')) go('mine-entry');
  else if (row.startsWith('Help')) go('help');
  else if (row.startsWith('Report')) go('report');
  else if (row.startsWith('Add account')) go('add-account');
  else if (row.startsWith('Arxon')) go('token-arx');
}

function Field({ label, value, onChange, secret }: { label: string; value: string; onChange: (v: string) => void; secret?: boolean }) {
  return (
    <label style={{ fontSize: 12, color: ink.secondary }}>
      {label}
      <input type={secret ? 'password' : 'text'} value={value} onChange={(e) => onChange(e.target.value)} style={{ display: 'block', width: '100%', marginTop: 6, boxSizing: 'border-box', background: ink.card, color: ink.text, border: 'none', borderRadius: 12, padding: 14, fontFamily: font.sans }} />
    </label>
  );
}

function Choice({ on, title, body, onClick }: { on: boolean; title: string; body: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} style={{ ...rowBtn, border: on ? `1px solid ${ink.accent}` : '1px solid transparent' }}>
      <span style={{ display: 'block', fontWeight: 600 }}>{title}</span>
      <span style={{ display: 'block', color: '#8b9097', fontSize: 12, marginTop: 4 }}>{body}</span>
    </button>
  );
}

function Mini({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} style={{ width: 72, background: 'none', border: 'none', color: ink.text, fontFamily: font.sans, cursor: 'pointer' }}>
      <span style={{ width: 52, height: 52, borderRadius: 26, background: ink.card, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 6px' }}>
        {label === 'More' ? <FigmaImg src="/wallet-figma/more.svg" width={52} height={52} alt="" /> : label.slice(0, 1)}
      </span>
      {label}
    </button>
  );
}

function Card({ title, body, onClick }: { title: string; body: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} style={{ width: 160, flex: '0 0 160px', height: 120, textAlign: 'left', background: ink.card, color: ink.text, border: 'none', borderRadius: 16, padding: 14, fontFamily: font.sans, cursor: 'pointer' }}>
      <strong style={{ display: 'block' }}>{title}</strong>
      <span style={{ display: 'block', marginTop: 6, color: '#8b9097', fontSize: 12 }}>{body}</span>
    </button>
  );
}

function Token({ name, sub, onClick }: { name: string; sub: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} style={{ ...rowBtn, marginTop: 8 }}>
      <span style={{ fontWeight: 600 }}>{name}</span>
      <span style={{ color: ink.secondary }}>{sub}</span>
    </button>
  );
}

function ruleColor(ok: boolean) {
  return ok ? ink.success : ink.secondary;
}

const linkBtn: CSSProperties = { background: 'none', border: 'none', color: ink.accent, fontFamily: font.sans, cursor: 'pointer', padding: 0 };
const cta: CSSProperties = { height: 52, border: 'none', borderRadius: 8, background: ink.accent, color: ink.accentText, fontFamily: font.sans, fontWeight: 600, fontSize: 16, cursor: 'pointer' };
const ghost: CSSProperties = { height: 48, border: 'none', borderRadius: 8, background: 'transparent', color: ink.text, fontFamily: font.sans, cursor: 'pointer' };
const rowBtn: CSSProperties = { width: '100%', textAlign: 'left', background: ink.card, color: ink.text, border: 'none', borderRadius: 14, padding: 14, fontFamily: font.sans, cursor: 'pointer', display: 'flex', justifyContent: 'space-between', gap: 8 };
const chip: CSSProperties = { background: ink.card, borderRadius: 10, padding: '10px 12px', fontSize: 14 };
const round: CSSProperties = { width: 36, height: 36, borderRadius: 18, background: ink.card, border: 'none', color: ink.text, marginLeft: 8, cursor: 'pointer' };
const pill: CSSProperties = { marginTop: 12, background: '#11161f', color: ink.accent, border: `1px solid ${ink.border}`, borderRadius: 20, padding: '7px 12px', fontFamily: font.sans, cursor: 'pointer' };
