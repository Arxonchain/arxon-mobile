import { useState, type ReactNode } from 'react';
import { font } from '@/walletFigma/tokens';
import FlowStudio from './FlowStudio';

type Mode = 'wallet' | 'mining';

/** One app, two modes. Wallet is the designed flow. Mining is the existing V2 miner. */
export default function ModeShell({ mining }: { mining: ReactNode }) {
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
  }

  return (
    <div style={{ height: '100vh', background: '#050505', display: 'flex', flexDirection: 'column' }}>
      <div style={{ height: 48, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, background: '#050505' }}>
        <Toggle on={mode === 'wallet'} onClick={() => choose('wallet')}>Wallet</Toggle>
        <Toggle on={mode === 'mining'} onClick={() => choose('mining')}>Mining</Toggle>
      </div>
      <div style={{ flex: 1, minHeight: 0, overflow: mode === 'mining' ? 'auto' : 'hidden' }}>
        {mode === 'wallet' ? <FlowStudio app /> : mining}
      </div>
    </div>
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
