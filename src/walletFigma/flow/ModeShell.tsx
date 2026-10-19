import { createContext, useContext, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { font } from '@/walletFigma/tokens';
import FlowStudio from './FlowStudio';
import { LiveFrameProvider } from './liveFrame';

type Mode = 'wallet' | 'mining';

const AppModeContext = createContext<Mode>('mining');

export function useAppMode() {
  return useContext(AppModeContext);
}

/** One app, two modes. Wallet is the real chain wallet. Mining is the existing V2 miner. */
export default function ModeShell({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>(() => {
    try {
      return sessionStorage.getItem('arxon-app-mode') === 'mining' ? 'mining' : 'wallet';
    } catch {
      return 'wallet';
    }
  });

  function choose(next: Mode) {
    setMode(next);
    try {
      sessionStorage.setItem('arxon-app-mode', next);
    } catch {
      /* ignore */
    }
    navigate(next === 'mining' ? '/mine' : '/');
  }

  return (
    <AppModeContext.Provider value={mode}>
      <div style={{ height: '100vh', background: '#050505', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div
          style={{
            flexShrink: 0,
            zIndex: 60,
            height: 48,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            background: '#050505',
          }}
        >
          <Toggle on={mode === 'wallet'} onClick={() => choose('wallet')}>Wallet</Toggle>
          <Toggle on={mode === 'mining'} onClick={() => choose('mining')}>Mining</Toggle>
        </div>
        {mode === 'wallet' ? (
          <div style={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
            <LiveFrameProvider>
              <FlowStudio app />
            </LiveFrameProvider>
          </div>
        ) : (
          <div style={{ flex: 1, minHeight: 0, overflow: 'auto' }}>{children}</div>
        )}
      </div>
    </AppModeContext.Provider>
  );
}

function Toggle({ on, onClick, children }: { on: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        height: 32,
        minWidth: 96,
        borderRadius: 8,
        border: 'none',
        cursor: 'pointer',
        background: on ? '#accafe' : '#1c2025',
        color: on ? '#0c1018' : '#fff',
        fontFamily: font.sans,
        fontSize: 14,
        fontWeight: 600,
      }}
    >
      {children}
    </button>
  );
}
