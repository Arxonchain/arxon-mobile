import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
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

/** One app, two modes. Wallet is the real chain wallet. Mining is the existing V2 miner. */
export default function ModeShell({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const [showToggle, setShowToggle] = useState(false);
  const [mode, setMode] = useState<Mode>(() => {
    try {
      return sessionStorage.getItem('arxon-app-mode') === 'mining' ? 'mining' : 'wallet';
    } catch {
      return 'wallet';
    }
  });
  const chrome = useMemo(() => ({ showToggle, setShowToggle }), [showToggle]);
  const showBar = mode === 'mining' || showToggle;

  function choose(next: Mode) {
    setMode(next);
    try {
      sessionStorage.setItem('arxon-app-mode', next);
    } catch {
      /* ignore */
    }
    navigate(next === 'mining' ? '/mine' : '/');
  }

  const actions = useMemo<WalletModeActions>(
    () => ({ openMining: () => choose('mining'), openWallet: () => choose('wallet') }),
    // choose is stable enough for this shell
    [],
  );

  return (
    <AppModeContext.Provider value={mode}>
      <WalletModeActionsContext.Provider value={actions}>
      <ModeChromeContext.Provider value={chrome}>
      <div style={{ height: '100vh', background: '#050505', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {showBar ? (
        <div
          style={{
            flexShrink: 0,
            zIndex: 60,
            height: 28,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#050505',
          }}
        >
          <ModeToggle mode={mode} onChoose={choose} />
        </div>
        ) : null}
        {mode === 'wallet' ? (
          <div style={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
            <LiveFrameProvider>
              <FlowStudio app />
            </LiveFrameProvider>
          </div>
        ) : (
          <div style={{ flex: 1, minHeight: 0, overflow: 'auto' }}>{children}</div>
        )}
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
        width: 118,
        height: 22,
        boxSizing: 'border-box',
        padding: 2,
        borderRadius: 11,
        background: '#1c2025',
      }}
    >
      <div
        aria-hidden
        style={{
          position: 'absolute',
          top: 2,
          left: mining ? 59 : 2,
          width: 57,
          height: 18,
          borderRadius: 9,
          background: '#accafe',
          transition: 'left 160ms ease',
        }}
      />
      <div style={{ position: 'relative', zIndex: 1, display: 'flex', height: 18 }}>
        <button type="button" role="tab" aria-selected={!mining} onClick={() => onChoose('wallet')} style={modeBtn(!mining)}>
          Wallet
        </button>
        <button type="button" role="tab" aria-selected={mining} onClick={() => onChoose('mining')} style={modeBtn(mining)}>
          Mining
        </button>
      </div>
    </div>
  );
}

function modeBtn(on: boolean) {
  return {
    flex: 1,
    height: 18,
    border: 'none',
    background: 'transparent',
    cursor: 'pointer',
    color: on ? '#0c1018' : '#8c8f99',
    fontFamily: font.sans,
    fontSize: 10,
    fontWeight: 600,
    lineHeight: '18px',
    padding: 0,
  };
}
