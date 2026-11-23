import { useEffect, useState, type CSSProperties, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, Lock, Wallet, X } from 'lucide-react';
import arxonLogo from '@/assets/arxon-icon.svg';
import { useChainWallet } from '@/chainWallet/ChainWalletContext';
import { useFourTxClaim } from '@/hooks/useFourTxClaim';
import { useWalletModeActions } from '@/walletFigma/flow/ModeShell';
import { useMobileNav } from '@/contexts/MobileNavContext';
import { frostWash } from '@/walletFigma/flow/LiveScroll';
import { mobileTopPaddingPage } from '@/lib/mobileLayout';
import { neon } from '@/features/arxon-v2/design/neonTokens';
import { NeonPage } from '@/features/arxon-v2/design/NeonKit';
import {
  clearTestnetConnect,
  consumeTestnetConnectHandoff,
  startTestnetConnect,
  takeTestnetConnectReturn,
} from '@/lib/testnetConnectSession';
import { shortAddress } from '@/lib/testnetWalletLink';
import { looksLikeInternalError, PUBLIC_ERROR_HINT } from '@/lib/publicError';
import { SkelCss, SkelTokenList } from '@/walletFigma/flow/ScreenSkeleton';

type Step = 'connecting' | 'setup' | 'unlock' | 'approve' | 'done';

const card: CSSProperties = {
  ...frostWash,
  borderRadius: 22,
  padding: '22px 18px 18px',
  boxSizing: 'border-box',
};

const primaryBtn: CSSProperties = {
  width: '100%',
  height: 48,
  border: 'none',
  borderRadius: 14,
  background: '#0c1018',
  color: '#fff',
  fontFamily: neon.font,
  fontSize: 15,
  fontWeight: 700,
  cursor: 'pointer',
};

const ghostBtn: CSSProperties = {
  width: '100%',
  height: 44,
  marginTop: 8,
  border: 'none',
  borderRadius: 14,
  background: 'none',
  color: '#5c6370',
  fontFamily: neon.font,
  fontSize: 14,
  fontWeight: 650,
  cursor: 'pointer',
};

export default function TestnetConnectV2() {
  const navigate = useNavigate();
  const { setHideNav } = useMobileNav();
  const actions = useWalletModeActions();
  const { ready, locked, address } = useChainWallet();
  const { linkedAddress, linkWallet } = useFourTxClaim(true);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [handingOff, setHandingOff] = useState(true);

  useEffect(() => {
    startTestnetConnect();
  }, []);

  useEffect(() => {
    setHideNav(true);
    return () => setHideNav(false);
  }, [setHideNav]);

  const goBack = (replace = false) => {
    const dest = takeTestnetConnectReturn();
    clearTestnetConnect();
    navigate(dest, { replace });
  };

  useEffect(() => {
    if (!linkedAddress || done) return;
    const dest = takeTestnetConnectReturn();
    clearTestnetConnect();
    navigate(dest, { replace: true });
  }, [done, linkedAddress, navigate]);

  useEffect(() => {
    if (!ready || done) return;
    if (address) {
      setHandingOff(false);
      return;
    }
    if (consumeTestnetConnectHandoff()) {
      if (actions) actions.openWallet();
      else setHandingOff(false);
      return;
    }
    setHandingOff(false);
  }, [actions, address, done, ready]);

  const exit = () => {
    goBack();
  };

  const openWallet = () => actions?.openWallet();

  const confirm = () => {
    if (!address) return;
    const res = linkWallet(address);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    clearTestnetConnect();
    setDone(true);
  };

  const step: Step = (() => {
    if (done) return 'done';
    if (!ready || handingOff) return 'connecting';
    if (address) return 'approve';
    if (locked) return 'unlock';
    return 'setup';
  })();

  return (
    <NeonPage>
      <div
        style={{
          minHeight: '100%',
          padding: `${mobileTopPaddingPage()} 16px 24px`,
          boxSizing: 'border-box',
          display: 'flex',
          justifyContent: 'center',
        }}
      >
        <div style={{ width: '100%', maxWidth: 400 }}>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
            <button
              type="button"
              onClick={exit}
              aria-label="Close"
              style={{
                width: 36,
                height: 36,
                border: 'none',
                borderRadius: 18,
                background: 'rgba(255,255,255,0.08)',
                color: '#fff',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <X size={16} strokeWidth={2.4} />
            </button>
          </div>

          {step === 'connecting' && (
            <Sheet title="Connecting" icon={<Wallet size={18} color="#0c1018" />}>
              <SkelCss />
              <div style={{ padding: '4px 0 2px' }}>
                <SkelTokenList n={3} h={48} />
              </div>
            </Sheet>
          )}

          {step === 'setup' && (
            <Sheet title="No wallet" icon={<Wallet size={18} color="#0c1018" />}>
              <p style={line}>Create or import in Wallet.</p>
              <button type="button" onClick={openWallet} style={primaryBtn}>
                Open Wallet
              </button>
              <button type="button" onClick={exit} style={ghostBtn}>
                Cancel
              </button>
            </Sheet>
          )}

          {step === 'unlock' && (
            <Sheet title="Wallet locked" icon={<Lock size={18} color="#0c1018" />}>
              <p style={line}>Unlock in Wallet to continue.</p>
              <button type="button" onClick={openWallet} style={primaryBtn}>
                Open Wallet
              </button>
              <button type="button" onClick={exit} style={ghostBtn}>
                Cancel
              </button>
            </Sheet>
          )}

          {step === 'approve' && address && (
            <Sheet title="Connect" icon={<img src={arxonLogo} alt="" style={{ width: 18, height: 18 }} />}>
              <p style={line}>Link this wallet to mining.</p>
              <div
                style={{
                  margin: '0 0 16px',
                  padding: '12px 14px',
                  borderRadius: 14,
                  background: '#fff',
                  border: '1px solid rgba(12,16,24,0.10)',
                  fontSize: 14,
                  fontWeight: 650,
                  color: '#0c1018',
                  letterSpacing: '-0.2px',
                }}
              >
                {shortAddress(address)}
              </div>
              {error ? (
                <p style={{ margin: '0 0 10px', fontSize: 12, color: '#c2410c' }}>
                  {looksLikeInternalError(error) ? PUBLIC_ERROR_HINT : error}
                </p>
              ) : null}
              <button type="button" onClick={confirm} style={primaryBtn}>
                Connect
              </button>
              <button type="button" onClick={exit} style={ghostBtn}>
                Cancel
              </button>
            </Sheet>
          )}

          {step === 'done' && (
            <Sheet title="Connected" icon={<Check size={18} color="#0c1018" />}>
              <p style={line}>Only txns from this wallet are credited.</p>
              <button type="button" onClick={() => goBack()} style={primaryBtn}>
                Done
              </button>
            </Sheet>
          )}
        </div>
      </div>
    </NeonPage>
  );
}

function Sheet({ title, icon, children }: { title: string; icon: ReactNode; children: ReactNode }) {
  return (
    <div style={card}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
        <span
          style={{
            width: 36,
            height: 36,
            borderRadius: 12,
            background: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          {icon}
        </span>
        <p style={{ margin: 0, fontSize: 20, fontWeight: 750, color: '#0c1018', letterSpacing: '-0.5px' }}>
          {title}
        </p>
      </div>
      {children}
    </div>
  );
}

const line: CSSProperties = {
  margin: '0 0 16px',
  fontSize: 14,
  lineHeight: 1.4,
  color: '#5c6370',
};
