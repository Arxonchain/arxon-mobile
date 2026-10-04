import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AuthDialog from '@/components/auth/AuthDialog';
import { useAuth } from '@/contexts/AuthContext';
import { useMining } from '@/hooks/useMining';
import { usePoints } from '@/hooks/usePoints';
import { walletBtn, walletGhost, walletPage } from '@/chainWallet/ui';
import { TokenMark } from '@/components/wallet/TokenMark';

const MIN_CLAIM = 10;
const RING = 2 * Math.PI * 54;

export default function WalletMine() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { points } = usePoints();
  const [showAuth, setShowAuth] = useState(false);
  const {
    isMining,
    loading,
    settingsLoading,
    elapsedTime,
    remainingTime,
    earnedPoints,
    maxTimeSeconds,
    startMining,
    stopMining,
    claimPoints,
    formatTime,
    pointsPerHour,
    pointsPerSecond,
    totalBoostPercentage,
    miningSettings,
    sessionMaxed,
    isClaiming,
  } = useMining({ tickMs: 250 });

  const miningDisabled = !settingsLoading && !miningSettings.publicMiningEnabled;
  const progress = isMining ? Math.min((elapsedTime / maxTimeSeconds) * 100, 100) : 0;
  const isSessionComplete = elapsedTime >= maxTimeSeconds && !isMining;
  const claimable = Math.floor(earnedPoints);
  const canClaim = isMining && claimable >= MIN_CLAIM;
  const totalPts = Math.round(points?.total_points ?? 0);
  const hasBoost = totalBoostPercentage > 0;

  const earnedLabel = useMemo(() => {
    if (earnedPoints < 0.01) return earnedPoints.toFixed(6);
    if (earnedPoints < 1) return earnedPoints.toFixed(4);
    if (earnedPoints < 10) return earnedPoints.toFixed(3);
    return earnedPoints.toFixed(2);
  }, [earnedPoints]);

  const needUser = () => {
    if (user) return false;
    setShowAuth(true);
    return true;
  };

  const onStart = () => {
    if (needUser()) return;
    void startMining();
  };

  const onStop = () => {
    if (needUser()) return;
    void stopMining();
  };

  const onClaim = () => {
    if (needUser()) return;
    void claimPoints();
  };

  return (
    <div style={{ ...walletPage, padding: '52px 20px 0' }}>
      <button
        type="button"
        onClick={() => navigate('/')}
        style={{ background: 'none', border: 'none', color: 'hsl(215 18% 62%)', fontSize: 13, cursor: 'pointer', padding: 0 }}
      >
        Back
      </button>
      <p style={{ fontSize: 11, letterSpacing: '0.18em', color: 'hsl(215 35% 62%)', fontWeight: 700, marginTop: 12 }}>
        MINE
      </p>
      <h1 style={{ fontSize: 26, fontWeight: 700, margin: '8px 0 6px' }}>Mine</h1>
      <p
        style={{
          display: 'inline-block',
          fontSize: 12,
          fontWeight: 800,
          padding: '6px 10px',
          borderRadius: 999,
          marginBottom: 18,
          background: 'hsl(215 35% 62%/0.15)',
          border: '1px solid hsl(215 35% 62%/0.4)',
        }}
      >
        Arxon Testnet · play
      </p>

      <p style={{ fontSize: 13, color: 'hsl(215 14% 48%)', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
        <TokenMark id="ARX" size={16} />
        ARX-P
      </p>
      <p style={{ fontSize: 32, fontWeight: 700, letterSpacing: '-0.8px', margin: '0 0 20px' }}>
        {totalPts.toLocaleString()}
      </p>

      {isMining ? (
        <div
          style={{
            padding: 16,
            borderRadius: 18,
            background: 'hsl(155 40% 12%/0.45)',
            border: '1px solid hsl(155 45% 36%/0.4)',
            marginBottom: 18,
            textAlign: 'center',
          }}
        >
          <p style={{ fontSize: 12, color: 'hsl(155 45% 62%)', fontWeight: 700, marginBottom: 4 }}>Session</p>
          <p style={{ fontSize: 28, fontWeight: 800, color: 'hsl(155 55% 70%)', fontVariantNumeric: 'tabular-nums' }}>
            +{earnedLabel}
          </p>
          <p style={{ fontSize: 11, color: 'hsl(215 14% 48%)', marginTop: 4 }}>
            +{pointsPerSecond.toFixed(6)}/sec
            {hasBoost ? ` · ${totalBoostPercentage}%` : ''}
          </p>
          {canClaim ? (
            <button
              type="button"
              style={{ ...walletBtn, width: '100%', marginTop: 12 }}
              disabled={isClaiming}
              onClick={onClaim}
            >
              {isClaiming ? 'Processing' : `Claim ${claimable}`}
            </button>
          ) : (
            <p style={{ fontSize: 12, color: 'hsl(215 14% 48%)', marginTop: 10 }}>
              {MIN_CLAIM - claimable} more to claim
            </p>
          )}
        </div>
      ) : null}

      <div style={{ position: 'relative', width: 180, height: 180, margin: '0 auto 20px' }}>
        <svg width="180" height="180" viewBox="0 0 120 120" style={{ transform: 'rotate(-90deg)' }}>
          <circle cx="60" cy="60" r="54" fill="none" stroke="hsl(215 22% 16%)" strokeWidth="6" />
          <circle
            cx="60"
            cy="60"
            r="54"
            fill="none"
            stroke={isMining ? 'hsl(155 45% 46%)' : 'hsl(215 35% 55%)'}
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={RING}
            strokeDashoffset={RING * (1 - progress / 100)}
          />
        </svg>
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {loading ? (
            <p style={{ fontSize: 13, color: 'hsl(215 14% 48%)' }}>Processing</p>
          ) : isMining ? (
            <>
              <p style={{ fontSize: 11, color: 'hsl(215 14% 48%)' }}>Time</p>
              <p style={{ fontSize: 20, fontWeight: 800, fontVariantNumeric: 'tabular-nums' }}>
                {formatTime(remainingTime)}
              </p>
            </>
          ) : (
            <>
              <p style={{ fontSize: 11, color: 'hsl(215 14% 48%)' }}>Max 8 hours</p>
              <p style={{ fontSize: 16, fontWeight: 700 }}>+{pointsPerHour.toFixed(hasBoost ? 1 : 0)}/hr</p>
            </>
          )}
        </div>
      </div>

      {isMining ? (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
          <div style={{ padding: 12, borderRadius: 16, background: 'hsl(225 26% 8%)', textAlign: 'center' }}>
            <p style={{ fontSize: 11, color: 'hsl(215 14% 48%)' }}>Elapsed</p>
            <p style={{ fontSize: 14, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{formatTime(elapsedTime)}</p>
          </div>
          <div style={{ padding: 12, borderRadius: 16, background: 'hsl(225 26% 8%)', textAlign: 'center' }}>
            <p style={{ fontSize: 11, color: 'hsl(215 14% 48%)' }}>Rate</p>
            <p style={{ fontSize: 14, fontWeight: 700 }}>+{pointsPerHour.toFixed(hasBoost ? 1 : 0)}/hr</p>
          </div>
        </div>
      ) : null}

      {miningDisabled ? (
        <p style={{ fontSize: 13, color: 'hsl(0 70% 62%)', textAlign: 'center' }}>Mining paused</p>
      ) : isMining ? (
        <button type="button" style={{ ...walletGhost, width: '100%', color: 'hsl(0 70% 62%)' }} onClick={onStop}>
          Stop
        </button>
      ) : (
        <button type="button" style={{ ...walletBtn, width: '100%' }} onClick={onStart}>
          {isSessionComplete || sessionMaxed ? 'Start' : 'Start'}
        </button>
      )}

      <AuthDialog open={showAuth} onOpenChange={setShowAuth} defaultMode="signin" />
    </div>
  );
}
