import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { font } from '@/walletFigma/tokens';
import FlowStudio from './FlowStudio';
import { LiveFrameProvider } from './liveFrame';
import { ModeChromeContext } from './modeChrome';

type Mode = 'wallet' | 'mining';

const AppModeContext = createContext<Mode>('mining');

export function useAppMode() {
  return useContext(AppModeContext);
}

type WalletModeActions = { openMining: () => void; openWallet: () => void };

const WalletModeActionsContext = createContext<WalletModeActions | null>(null);

export function useWalletModeActions() {
  return useContext(WalletModeActionsContext);
}

const MINE_PREFIXES = [
  '/mine',
  '/mining',
  '/arena',
  '/games',
  '/profile',
  '/tasks',
  '/referrals',
  '/nexus',
  '/leaderboard',
  '/settings',
  '/notifications',
  '/points-history',
  '/word-forge',
];

function isMiningPath(path: string) {
  return MINE_PREFIXES.some((p) => path === p || path.startsWith(`${p}/`));
}

/** One app, two modes. Wallet is the real chain wallet. Mining is the existing V2 miner. */
export default function ModeShell({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [showToggle, setShowToggle] = useState(false);
  const [mode, setMode] = useState<Mode>(() => {
    try {
      return sessionStorage.getItem('arxon-app-mode') === 'mining' ? 'mining' : 'wallet';
    } catch {
      return 'wallet';
    }
  });
  const modeRef = useRef(mode);
  modeRef.current = mode;
  const locRef = useRef(location);
  locRef.current = location;
  const lastMiningPath = useRef(isMiningPath(location.pathname) ? `${location.pathname}${location.search}` : '/mine');
  const chrome = useMemo(() => ({ showToggle, setShowToggle }), [showToggle]);
  const showBar = mode === 'mining' || showToggle;

  const choose = useCallback((next: Mode) => {
    const prev = modeRef.current;
    const loc = locRef.current;
    if (prev === 'mining') {
      lastMiningPath.current = isMiningPath(loc.pathname) ? `${loc.pathname}${loc.search}` : '/mine';
    }
    setMode(next);
    try {
      sessionStorage.setItem('arxon-app-mode', next);
    } catch {
      /* ignore */
    }
    if (next === 'mining') {
      const dest = isMiningPath(lastMiningPath.current.split('?')[0]) ? lastMiningPath.current : '/mine';
      if (`${loc.pathname}${loc.search}` !== dest) navigate(dest);
    } else if (isMiningPath(loc.pathname)) {
      navigate('/');
    }
  }, [navigate]);

  useEffect(() => {
    document.title = mode === 'mining' ? 'Arxon Mining' : 'Arxon';
  }, [mode]);

  useEffect(() => {
    if (mode === 'mining' && isMiningPath(location.pathname)) {
      lastMiningPath.current = `${location.pathname}${location.search}`;
    }
  }, [mode, location.pathname, location.search]);

  useEffect(() => {
    if (mode !== 'mining') return;
    if (isMiningPath(location.pathname)) return;
    const dest = isMiningPath(lastMiningPath.current.split('?')[0]) ? lastMiningPath.current : '/mine';
    if (`${location.pathname}${location.search}` !== dest) navigate(dest, { replace: true });
  }, [mode, location.pathname, location.search, navigate]);

  const actions = useMemo<WalletModeActions>(
    () => ({ openMining: () => choose('mining'), openWallet: () => choose('wallet') }),
    [choose],
  );

  return (
    <AppModeContext.Provider value={mode}>
      <WalletModeActionsContext.Provider value={actions}>
      <ModeChromeContext.Provider value={chrome}>
      <div style={{ height: '100%', width: '100%', background: '#050505', position: 'relative', overflow: 'hidden' }}>
        <div
          aria-hidden={mode !== 'wallet'}
          style={{ position: 'absolute', inset: 0, overflow: 'hidden', display: mode === 'wallet' ? 'flex' : 'none', flexDirection: 'column' }}
        >
          <LiveFrameProvider>
            <FlowStudio app />
          </LiveFrameProvider>
        </div>
        <div
          aria-hidden={mode !== 'mining'}
          className="arxon-mode-scroll"
          style={{ position: 'absolute', inset: 0, overflow: 'auto', display: mode === 'mining' ? 'block' : 'none' }}
        >
          {mode === 'mining' || isMiningPath(location.pathname) ? children : null}
        </div>
        {showBar ? (
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            zIndex: 80,
            paddingTop: 'max(28px, env(safe-area-inset-top, 0px))',
            paddingBottom: 6,
            display: 'flex',
            justifyContent: 'center',
            pointerEvents: 'none',
            background: 'linear-gradient(180deg, #050505 0%, #050505 62%, rgba(5,5,5,0) 100%)',
          }}
        >
          <div style={{ pointerEvents: 'auto' }}>
            <ModeToggle mode={mode} onChoose={choose} />
          </div>
        </div>
        ) : null}
      </div>
      </ModeChromeContext.Provider>
      </WalletModeActionsContext.Provider>
    </AppModeContext.Provider>
  );
}

function ModeToggle({ mode, onChoose }: { mode: Mode; onChoose: (next: Mode) => void }) {
  const mining = mode === 'mining';
  return (
    <div
      role="tablist"
      aria-label="Wallet or Mining"
      style={{
        position: 'relative',
        width: 180,
        height: 40,
        boxSizing: 'border-box',
        padding: 3,
        borderRadius: 20,
        background: '#1c2025',
        touchAction: 'manipulation',
      }}
    >
      <div
        aria-hidden
        style={{
          position: 'absolute',
          top: 3,
          left: mining ? 90 : 3,
          width: 87,
          height: 34,
          borderRadius: 17,
          background: '#accafe',
          transition: 'left 160ms ease',
        }}
      />
      <div style={{ position: 'relative', zIndex: 1, display: 'flex', height: 34 }}>
        <button
          type="button"
          role="tab"
          aria-selected={!mining}
          onClick={(e) => {
            e.stopPropagation();
            onChoose('wallet');
          }}
          style={modeBtn(!mining)}
        >
          Wallet
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={mining}
          onClick={(e) => {
            e.stopPropagation();
            onChoose('mining');
          }}
          style={modeBtn(mining)}
        >
          Mining
        </button>
      </div>
    </div>
  );
}

function modeBtn(on: boolean) {
  return {
    flex: 1,
    height: 34,
    border: 'none',
    background: 'transparent',
    cursor: 'pointer',
    color: on ? '#0c1018' : '#8c8f99',
    fontFamily: font.sans,
    fontSize: 13,
    fontWeight: 600,
    lineHeight: '34px',
    padding: 0,
    touchAction: 'manipulation' as const,
  };
}
