import { createPortal } from 'react-dom';
import { ChevronRight, X } from 'lucide-react';
import arxonLogo from '@/assets/arxon-icon-dark.svg';
import { neon } from '@/features/arxon-v2/design/neonTokens';
import { frostWash } from '@/walletFigma/flow/LiveScroll';

export default function ConnectWalletModal({
  open,
  onClose,
  onPickArxon,
}: {
  open: boolean;
  onClose: () => void;
  onPickArxon: () => void;
}) {
  if (!open) return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Connect wallet"
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 120,
        background: 'rgba(0,0,0,0.62)',
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'center',
        padding: '0 12px 16px',
        paddingBottom: 'max(16px, env(safe-area-inset-bottom, 0px))',
        boxSizing: 'border-box',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: 400,
          borderRadius: 22,
          overflow: 'hidden',
          ...frostWash,
          boxShadow: '0 18px 40px rgba(0,0,0,0.4)',
          fontFamily: neon.font,
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '16px 16px 8px',
          }}
        >
          <p style={{ margin: 0, fontSize: 18, fontWeight: 750, color: '#0c1018', letterSpacing: '-0.4px' }}>
            Connect wallet
          </p>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            style={{
              width: 32,
              height: 32,
              border: 'none',
              borderRadius: 16,
              background: 'rgba(12,16,24,0.08)',
              color: '#0c1018',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <X size={16} strokeWidth={2.4} />
          </button>
        </div>
        <button
          type="button"
          onClick={onPickArxon}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            padding: '12px 16px 16px',
            border: 'none',
            background: 'none',
            cursor: 'pointer',
            fontFamily: neon.font,
            textAlign: 'left',
          }}
        >
          <span
            style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              border: '1.5px solid #0c1018',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              boxSizing: 'border-box',
            }}
          >
            <img src={arxonLogo} alt="" style={{ width: 22, height: 22 }} />
          </span>
          <span style={{ flex: 1, minWidth: 0 }}>
            <span style={{ display: 'block', fontSize: 15, fontWeight: 700, color: '#0c1018' }}>
              Arxon Wallet
            </span>
            <span style={{ display: 'block', marginTop: 2, fontSize: 12, color: '#8c8f99' }}>
              This device
            </span>
          </span>
          <ChevronRight size={18} color="#8c8f99" />
        </button>
      </div>
    </div>,
    document.body,
  );
}
