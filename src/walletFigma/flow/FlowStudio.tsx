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
import { MarketScreen } from './HomeMarket';
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
import { InAppBrowserHost } from './InAppBrowserHost';
import { WalletNetworkContext, type WalletNet } from './WalletTabs';
import { useLiveFrame } from './liveFrame';
import { isHomeRoot, isOnboardingScreen, isSetupScreen, isWelcomeScreen, useModeChrome } from './modeChrome';
import { markBootOk } from '@/lib/bootState';
import { sessionStore } from '@/chainWallet/session';

const PHRASE = ['canyon', 'river', 'amber', 'north', 'silver', 'garden', 'orbit', 'maple', 'quiet', 'harbor', 'velvet', 'stone'];

const HIDE_SCROLLBARS_CSS = `
.arxon-app-scroll,
.arxon-app-scroll *,
.arxon-app-frame,
.arxon-flow-frame,
.home-cards,
.dapp-row,
.arxon-token-scroll {
  scrollbar-width: none !important;
  -ms-overflow-style: none !important;
}
.arxon-app-scroll::-webkit-scrollbar,
.arxon-app-scroll::-webkit-scrollbar-thumb,
.arxon-app-scroll::-webkit-scrollbar-track,
.arxon-app-scroll::-webkit-scrollbar-corner,
.arxon-app-scroll *::-webkit-scrollbar,
.arxon-app-scroll *::-webkit-scrollbar-thumb,
.arxon-app-scroll *::-webkit-scrollbar-track,
.arxon-app-frame::-webkit-scrollbar,
.arxon-flow-frame::-webkit-scrollbar,
.home-cards::-webkit-scrollbar,
.dapp-row::-webkit-scrollbar,
.arxon-token-scroll::-webkit-scrollbar {
  display: none !important;
  width: 0 !important;
  height: 0 !important;
  background: transparent !important;
}
`;

const APP_SCROLL_CSS = `
.arxon-app-frame { transform: translateZ(0); }
.arxon-app-frame > .arxon-app-scroll > div {
  min-height: 100% !important;
  height: 100% !important;
  width: 100% !important;
  box-sizing: border-box;
}
.arxon-app-scroll {
  -webkit-overflow-scrolling: touch;
  overscroll-behavior: contain;
  touch-action: pan-x pan-y;
}
.arxon-app-scroll .home-cards,
.arxon-app-scroll .dapp-row {
  overflow-x: auto !important;
  overflow-y: hidden;
  touch-action: pan-x;
  -webkit-overflow-scrolling: touch;
  overscroll-behavior-x: contain;
}
.arxon-app-frame nav {
  position: absolute !important;
  top: auto !important;
  bottom: 0 !important;
  left: 0 !important;
  width: 390px !important;
  z-index: 8;
  padding-bottom: env(safe-area-inset-bottom, 0px);
}
.arxon-app-scroll:has([data-amount-entry]) {
  overflow: hidden !important;
}
`;
const CHECKS = [3, 7, 12];
const SPLASH_HOLD_MS = 3500;
const SPLASH_DONE_KEY = 'arxon.splash.done';
const LIVE_SCREEN_KEY = 'arxon.live.screen';

function splashAlreadyPlayed(): boolean {
  try {
    return sessionStorage.getItem(SPLASH_DONE_KEY) === '1';
  } catch {
    return false;
  }
}

function markSplashPlayed() {
  try {
    sessionStorage.setItem(SPLASH_DONE_KEY, '1');
  } catch {
    /* private mode */
  }
}

function initialLiveScreen(app: boolean): string {
  if (!app) return 'splash';
  if (splashAlreadyPlayed()) {
    try {
      const saved = sessionStorage.getItem(LIVE_SCREEN_KEY);
      if (saved && saved !== 'splash' && SCREEN_MAP[saved]) return saved;
    } catch {
      /* ignore */
    }
    return 'gateway';
  }
  const started = window.__ARXON_SPLASH_AT__;
  if (started && Date.now() - started >= SPLASH_HOLD_MS) {
    markSplashPlayed();
    return 'gateway';
  }
  return 'splash';
}

export default function FlowStudio({ app = false }: { app?: boolean }) {
  const live = useLiveFrame();
  const { setShowToggle } = useModeChrome();
  const [id, setId] = useState(() => initialLiveScreen(app));
  const [appScale, setAppScale] = useState(() => {
    if (typeof window === 'undefined') return 1;
    return Math.max(window.innerWidth / 390, window.innerHeight / 844);
  });
  const [appOffsetX, setAppOffsetX] = useState(0);
  const [appOffsetY, setAppOffsetY] = useState(0);
  const [appFrameH, setAppFrameH] = useState(844);
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
  const jumpRef = useRef<string | null>(null);
  const netSynced = useRef(false);
  const [fit, setFit] = useState(1);

  const screen = SCREEN_MAP[id] ?? SCREENS[0];

  useEffect(() => {
    if (app && id === 'splash') return;
    markBootOk();
  }, [app, id]);

  useEffect(() => {
    if (!app || !id || id === 'splash') return;
    markSplashPlayed();
    try {
      sessionStorage.setItem(LIVE_SCREEN_KEY, id);
    } catch {
      /* private mode */
    }
  }, [app, id]);

  useEffect(() => {
    if (!app) return;
    try {
      const jump = sessionStorage.getItem('arxon-flow-screen');
      if (jump && SCREEN_MAP[jump]) {
        sessionStorage.removeItem('arxon-flow-screen');
        jumpRef.current = jump;
        setStack([]);
        if (jump === 'testnet') setNet('testnet');
        setId(jump);
      }
    } catch {
      /* preview jump is optional */
    }
  }, [app]);

  useEffect(() => {
    if (!app || !live?.app || !live.ready) return;
    if (jumpRef.current) return;
    if (!live.startId || live.startId === 'splash') return;
    const lockedAway = live.locked && id !== 'unlock' && id !== 'unlock-wrong';
    if (id === 'splash' || isWelcomeScreen(id) || lockedAway) {
      setId(live.startId);
    }
  }, [app, live?.ready, live?.startId, live?.locked, id]);

  useEffect(() => {
    if (!app || !live?.app || !live.ready || netSynced.current) return;
    if (jumpRef.current === 'testnet') {
      netSynced.current = true;
      setNet('testnet');
      return;
    }
    netSynced.current = true;
    setNet(live.chainNetwork === 'arxon' ? 'testnet' : 'mainnet');
  }, [app, live?.app, live?.ready, live?.chainNetwork]);

  useEffect(() => {
    if (live?.sessionPassword && !password) setPassword(live.sessionPassword);
  }, [live?.sessionPassword]);

  useEffect(() => {
    if (!app || !note) return;
    const t = window.setTimeout(() => setNote(null), Math.max(2600, note.length * 60));
    return () => window.clearTimeout(t);
  }, [app, note]);

  useEffect(() => {
    if (!app || !live?.app || !live.wcKind) return;
    if (live.wcKind === 'proposal' && id !== 'dapp') setId('dapp');
    if (live.wcKind === 'request' && id !== 'dapp-tx') setId('dapp-tx');
  }, [app, live?.app, live?.wcKind]);

  useEffect(() => {
    if (id !== 'splash') return;
    if (jumpRef.current) return;
    if (app && live?.startId && live.startId !== 'splash') return;
    if (app && splashAlreadyPlayed()) {
      setId('gateway');
      return;
    }
    const started = window.__ARXON_SPLASH_AT__ || Date.now();
    const remain = Math.max(0, SPLASH_HOLD_MS - (Date.now() - started));
    const t = window.setTimeout(() => {
      markSplashPlayed();
      setId('gateway');
    }, remain);
    return () => window.clearTimeout(t);
  }, [id, app, live?.startId]);

  useEffect(() => {
    if (!app) return;
    setShowToggle(!isOnboardingScreen(id) && !live?.locked && isHomeRoot(id));
  }, [app, id, live?.locked, setShowToggle]);

  useEffect(() => {
    if (!app || !live?.app || !live.ready) return;
    if (live.address || live.locked) return;
    if (isOnboardingScreen(id) || isWelcomeScreen(id)) return;
    setStack([]);
    setId('slide16');
  }, [app, live?.app, live?.ready, live?.address, live?.locked, id]);

  useEffect(() => {
    if (!app || !live?.app || !live.flight) return;
    if (live.flight.phase === 'processing' || live.flight.detail) return;
    if (id === live.flight.done) live.clearFlight();
  }, [app, id, live]);

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
    let fullW = 0;
    let fullH = 0;
    let pinnedY = 0;
    const measure = () => {
      const rawW = Math.max(stage.clientWidth, 1);
      const rawH = Math.max(stage.clientHeight, 1);
      if (rawW > fullW) fullW = rawW;
      if (rawH > fullH) fullH = rawH;
      const amount = !!stage.querySelector('[data-amount-entry]');
      const heightDrop = fullH - rawH;
      // Amount pages keep the top of the frame put when the WebView shrinks.
      if (amount && heightDrop > 12) {
        setAppOffsetY(pinnedY);
        return;
      }
      // Keyboard shrinks the WebView. Keep the 390 frame where it is.
      const w = fullW - rawW > 72 ? fullW : rawW;
      const h = fullH - rawH > 72 ? fullH : rawH;
      const cover = Math.max(w / 390, h / 844);
      const welcome = isWelcomeScreen(id);
      const scale = welcome ? cover : (844 * cover - h > 16 ? h / 844 : cover);
      const frameW = 390 * scale;
      const frameH = 844 * scale;
      setAppScale(scale);
      setAppFrameH(844);
      setAppOffsetX((w - frameW) / 2);
      // Welcome covers the width on every phone. Extra height is cropped from the top so the actions stay on screen.
      const y = welcome && frameH > h + 1 ? h - frameH : (h - frameH) / 2;
      pinnedY = y;
      setAppOffsetY(y);
    };
    measure();
    const watcher = new ResizeObserver(measure);
    watcher.observe(stage);
    window.addEventListener('resize', measure);
    const pin = () => {
      if (window.scrollX || window.scrollY) window.scrollTo(0, 0);
    };
    const onFocus = (event: FocusEvent) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) return;
      if (target.closest('[data-amount-entry]') || target.matches('input, textarea')) {
        requestAnimationFrame(() => {
          pin();
          if (!target.closest('[data-amount-entry]')) return;
          stage.querySelectorAll('.arxon-app-scroll').forEach((el) => {
            if (el instanceof HTMLElement) el.scrollTop = 0;
          });
        });
      }
    };
    document.addEventListener('focusin', onFocus);
    return () => {
      watcher.disconnect();
      window.removeEventListener('resize', measure);
      document.removeEventListener('focusin', onFocus);
    };
  }, [app, id]);

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
    void (async () => {
      let dest = next;
      if (live?.app) {
        const decision = await live.beforeGo(id, next, password);
        if (decision.note) setNote(decision.note);
        if (decision.block && !decision.replace) return;
        if (decision.replace) dest = decision.replace;
      }
      if (live?.app) {
        if (
          (dest === 'testnet' && live.testnetAdded) ||
          dest.startsWith('vault') ||
          dest.startsWith('priv-') ||
          dest.startsWith('unshield-') ||
          dest.startsWith('shield-') ||
          dest === 'send-amount-vault'
        ) {
          if (dest === 'testnet' || live.testnetAdded) void live.setNetwork('arxon');
        } else if (dest === 'home' || dest.startsWith('home-')) {
          void live.setNetwork('ethereum');
        }
      }
      if (dest === 'testnet') {
        setNet('testnet');
        if (remember) setStack((prev) => [...prev, id]);
        setId('testnet');
        return;
      }
      if (
        dest.startsWith('vault') ||
        dest.startsWith('priv-') ||
        dest.startsWith('unshield-') ||
        dest.startsWith('shield-') ||
        dest === 'send-amount-vault'
      ) {
        setNet('testnet');
      }
      if (dest === 'home' || dest === 'home-funded' || dest === 'home-hidden' || dest === 'home-vaulted' || dest === 'home-unvaulted') {
        setNet('mainnet');
      }
      if (!SCREEN_MAP[dest]) return;
      if (isWelcomeScreen(dest) && !isSetupScreen(id)) {
        setStack([]);
        setId(dest);
        if (!live?.app) setNote(null);
        return;
      }
      if ((isHomeRoot(dest) || dest === 'unlock') && isSetupScreen(id)) {
        setStack([]);
        setId(dest);
        if (!live?.app) setNote(null);
        return;
      }
      if (remember) setStack((prev) => [...prev, id]);
      setId(dest);
      if (!live?.app) setNote(null);
    })();
  }

  function back() {
    const walleted = Boolean(live?.app && (live.address || live.startId === 'home' || live.startId === 'unlock'));
    let rest = stack.slice();
    while (rest.length) {
      const prev = rest[rest.length - 1];
      rest = rest.slice(0, -1);
      if (walleted && (isWelcomeScreen(prev) || (isOnboardingScreen(prev) && !isOnboardingScreen(id)))) {
        continue;
      }
      setStack(rest);
      setId(prev);
      return;
    }
    setStack([]);
    if (walleted && !isOnboardingScreen(id) && !isWelcomeScreen(id)) {
      setId('home');
      return;
    }
    if (id === 'create') {
      setId(sessionStore.setupPath() === 'import' ? 'import' : 'phrase-confirm');
      return;
    }
    if (id === 'import' || id === 'backup' || id === 'backup-manual' || id === 'drive-connect' || id === 'caution1') {
      setId('slide16');
    }
  }

  const homeDesigned = id === 'home' || id === 'home-hidden' || id === 'home-funded' || id === 'more' || id === 'home-vaulted' || id === 'home-unvaulted' || id === 'testnet';
  const marketDesigned = id === 'market';
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
  const designed = homeDesigned || marketDesigned || tokenDesigned || sendDesigned || receiveDesigned || swapDesigned || buyDesigned || activityDesigned || receiptDesigned || claimDesigned || vaultDesigned || accountDesigned || privacyDesigned || exploreDesigned || unlockDesigned;
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
    <div style={{ height: app ? '100%' : '100vh', width: app ? '100%' : undefined, minHeight: app ? 0 : undefined, overflow: 'hidden', display: 'flex', background: app ? '#050505' : '#07080c', color: ink.text, fontFamily: font.sans }}>
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
      <main style={{ flex: 1, width: app ? '100%' : undefined, minWidth: 0, minHeight: 0, height: app ? '100%' : '100vh', overflow: 'hidden', display: 'flex', flexDirection: 'column', padding: app ? 0 : '12px 16px 16px' }}>
        {!app && (
        <div style={{ width: '100%', maxWidth: 390, alignSelf: 'center', display: 'flex', justifyContent: 'space-between', marginBottom: 8, flexShrink: 0 }}>
          <button type="button" onClick={() => setMenu((v) => !v)} style={linkBtn}>{menu ? 'Hide list' : 'All screens'}</button>
          <span style={{ color: ink.secondary, fontSize: 12 }}>{screen.name}</span>
        </div>
        )}
        <div ref={stageRef} style={{ flex: 1, width: '100%', minHeight: 0, height: app ? '100%' : undefined, display: 'flex', justifyContent: app ? undefined : 'center', alignItems: 'flex-start', overflow: 'hidden', position: app ? 'relative' : undefined, background: app ? '#050505' : undefined }}>
        <WalletNetworkContext.Provider value={net}>
        <div
          className={app ? 'arxon-app-frame' : 'arxon-flow-frame'}
          style={app
          ? {
            width: 390,
            height: appFrameH,
            transform: `translate(${appOffsetX}px, ${appOffsetY}px) scale(${appScale})`,
            transformOrigin: 'top left',
            background: ink.page,
            position: 'absolute',
            left: 0,
            top: 0,
            overflow: 'hidden',
          }
          : { width: 390, height: 844, zoom: fit, background: ink.page, borderRadius: 28, overflow: 'auto', position: 'relative', boxShadow: '0 20px 80px rgba(0,0,0,0.45)', display: 'flex', flexDirection: 'column', flexShrink: 0, WebkitOverflowScrolling: 'touch' }}>
          <style>{HIDE_SCROLLBARS_CSS}{app ? APP_SCROLL_CSS : ''}</style>
          <div
            className={app ? 'arxon-app-scroll' : undefined}
            style={app ? {
              position: 'absolute',
              left: 0,
              right: 0,
              top: 0,
              bottom: 0,
              overflowX: 'hidden',
              overflowY: 'auto',
              WebkitOverflowScrolling: 'touch',
            } : { height: '100%' }}
          >
          {homeDesigned ? (
            <HomeScreens id={id} network={id === 'testnet' || net === 'testnet' ? 'testnet' : 'mainnet'} go={go} back={back} behind={stack[stack.length - 1]} />
          ) : marketDesigned ? (
            <MarketScreen go={go} />
          ) : tokenDesigned ? (
            <TokenScreens id={id} go={go} back={back} />
          ) : sendDesigned ? (
            <SendScreens id={id} go={go} back={back} />
          ) : receiveDesigned ? (
            <ReceiveScreens id={id} go={go} back={back} />
          ) : swapDesigned ? (
            <SwapScreens id={id} go={go} back={back} />
          ) : buyDesigned ? (
            <BuyScreens id={id} go={go} back={back} />
          ) : activityDesigned ? (
            <ActivityScreens id={id} go={go} back={back} />
          ) : receiptDesigned ? (
            <ReceiptScreens id={id} go={go} back={back} />
          ) : claimDesigned ? (
            <ClaimScreens id={id} go={go} back={back} />
          ) : vaultDesigned ? (
            <VaultScreens id={id} go={go} back={back} behind={stack[stack.length - 1]} password={password} />
          ) : accountDesigned ? (
            <AccountScreens id={id} go={go} back={back} />
          ) : privacyDesigned ? (
            <PrivacyScreens id={id} go={go} back={back} password={password} setPassword={setPassword} />
          ) : exploreDesigned ? (
            <ExploreScreens id={id} go={go} back={back} />
          ) : unlockDesigned ? (
            <UnlockScreens id={id} go={go} back={back} password={password} />
          ) : shown.id === 'splash' || shown.id === 'gateway' || shown.id === 'slide15' || shown.id === 'slide16' ? (
            <WelcomeScreens id={shown.id} go={go} />
          ) : shown.id === 'create' || shown.id === 'backup' || shown.id === 'backup-manual' || shown.id === 'drive-connect' || shown.id === 'drive-confirm' || shown.id === 'drive-done' ? (
            <CreateWalletScreens id={shown.id} go={go} back={back} password={password} setPassword={setPassword} confirm={confirm} setConfirm={setConfirm} agree={agree} setAgree={setAgree} backup={backup} setBackup={setBackup} />
          ) : shown.id === 'caution1' || shown.id === 'caution2' || shown.id === 'caution3' || shown.id === 'phrase-hidden' || shown.id === 'phrase-shown' || shown.id === 'phrase-confirm' || shown.id === 'phrase-done' ? (
            <PhraseBackupScreens id={shown.id} go={go} back={back} />
          ) : shown.id === 'import' ? (
            <ImportWalletScreen go={go} back={back} />
          ) : shown.id === 'face' || shown.id === 'ready-skip' ? (
            <FinishScreens id={shown.id} go={go} />
          ) : shown.id === 'search' || shown.id === 'manage' || shown.id === 'add-token' || shown.id === 'notifications' ? (
            <FindScreens id={shown.id} go={go} back={back} />
          ) : (
            <Body screen={shown} hidden={hidden} onToggleHide={() => { setHidden((v) => !v); go(hidden ? 'home' : 'home-hidden', false); }} go={go} back={back} backup={backup} setBackup={setBackup} password={password} setPassword={setPassword} confirm={confirm} setConfirm={setConfirm} agree={agree} setAgree={setAgree} phrasePick={phrasePick} setPhrasePick={setPhrasePick} flags={flags} setFlags={setFlags} toast={setNote} />
          )}
          {shown.tab && !homeDesigned && !marketDesigned && !tokenDesigned && !sendDesigned && !receiveDesigned && !swapDesigned && !buyDesigned && !activityDesigned && !receiptDesigned && !claimDesigned && !vaultDesigned && !accountDesigned && !privacyDesigned && !exploreDesigned && <PhoneTabs active={shown.tab} go={go} />}
          </div>
          <InAppBrowserHost />
          {live?.app && live.flight && id !== live.flight.screen && !(live.flight.phase === 'done' && !live.flight.detail && id === live.flight.done) ? (
            <button
              type="button"
              onClick={() => {
                const flight = live.flight;
                if (!flight) return;
                const dest = flight.phase === 'done' && !flight.detail ? flight.done : flight.screen;
                go(dest, false);
              }}
              style={{ position: 'absolute', left: 18, right: 18, bottom: 120, zIndex: 40, minHeight: 44, borderRadius: 12, border: '1px solid #accafe', background: '#1c2433', color: '#fff', fontFamily: font.sans, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}
            >
              {live.flight.title} · {live.flight.phase === 'processing' ? 'Still processing' : live.flight.phase === 'error' ? 'Needs attention' : 'Finished'}
            </button>
          ) : null}
          {overlay && (
            <button type="button" onClick={() => go(overlay.parent || 'home', false)} style={{ position: 'absolute', inset: 0, zIndex: 6, background: 'rgba(0,0,0,0.55)', border: 'none', padding: 0 }}>
              <div onClick={(e) => e.stopPropagation()} style={{ position: 'absolute', left: 0, right: 0, bottom: 0, background: ink.card, borderRadius: '16px 16px 0 0', padding: 18, textAlign: 'left' }}>
                <Body screen={overlay} hidden={hidden} go={go} compact toast={setNote} flags={flags} setFlags={setFlags} password="" setPassword={() => {}} confirm="" setConfirm={() => {}} agree={false} setAgree={() => {}} phrasePick={phrasePick} setPhrasePick={setPhrasePick} backup={backup} setBackup={setBackup} />
              </div>
            </button>
          )}
        </div>
        </WalletNetworkContext.Provider>
        </div>
        {note && (app ? (
          <p role="status" style={{ position: 'fixed', left: '50%', bottom: 100, transform: 'translateX(-50%)', width: 'max-content', maxWidth: 342, margin: 0, padding: '10px 16px', borderRadius: 12, background: '#1C2126', border: '1px solid #29333D', color: '#FFFFFF', fontFamily: font.sans, fontSize: 13, lineHeight: 1.35, textAlign: 'center', zIndex: 50, pointerEvents: 'none' }}>{note}</p>
        ) : <p style={{ color: ink.accent, fontSize: 13, margin: '8px 0 0', flexShrink: 0 }}>{note}</p>)}
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
    ['history', 'Market', 'market'],
    ['explore', 'Explore', tabTarget('explore')],
    ['home', 'Testnet', 'testnet'],
    ['account', 'Account', tabTarget('account')],
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
  else if (row.startsWith('Arxswap') || row.startsWith('Uniswap') || row.startsWith('Jupiter')) go('explore');
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
