import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useCallback, useEffect, useState } from 'react';
import { Copy, Zap } from 'lucide-react';
import { useMining } from '@/hooks/useMining';
import { useAuth } from '@/contexts/AuthContext';
import { usePoints } from '@/hooks/usePoints';
import { useProfile } from '@/hooks/useProfile';
import { toast } from '@/hooks/use-toast';
import AuthDialog from '@/components/auth/AuthDialog';
import { MiningPillWidget } from '../components/DashboardWidgets';
import { NeonPanel, NeonEyebrow } from '../design/NeonKit';
import { neon } from '../design/neonTokens';
import { V2Page, V2Header, V2Button, V2ButtonGhost, fadeUp, stagger } from '../design/Kit';
import { APP_PREVIEW_BASE } from '../preview/AppPreviewContext';

const MAX_HOURS = 8;
const MIN_CLAIM_ARX = 10;

function fmtTime(s: number) {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const ss = s % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(ss).padStart(2, '0')}`;
}

export default function MiningV2({ preview = false }: { preview?: boolean }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { points, rank } = usePoints();
  const { profile } = useProfile();
  const [showAuth, setShowAuth] = useState(false);

  const [previewMining, setPreviewMining] = useState(false);
  const [previewEarn, setPreviewEarn] = useState(127.4);
  const [previewElapsed, setPreviewElapsed] = useState(3720);
  const [previewRemain, setPreviewRemain] = useState(6 * 3600 + 2280);

  const mining = useMining({ tickMs: 1000 });

  const isMining = preview ? previewMining : mining.isMining;
  const earnedPoints = preview ? previewEarn : mining.earnedPoints;
  const elapsedSeconds = preview ? previewElapsed : mining.elapsedTime;
  const remainingTime = preview ? previewRemain : mining.remainingTime;
  const pointsPerHour = preview ? 11.5 : mining.pointsPerHour;
  const boostPercentage = preview ? 15 : mining.totalBoostPercentage;
  const sessionMaxed = preview ? false : mining.sessionMaxed;
  const loading = preview ? false : mining.loading;
  const isStarting = preview ? false : mining.isStarting;
  const isStopping = preview ? false : mining.isStopping;
  const isClaiming = preview ? false : mining.isClaiming;

  const totalPoints = preview ? 34766 : Math.round(points?.total_points ?? 0);
  const displayRank = preview ? 42 : rank;
  const referralCode = preview ? 'ARXON42' : profile?.referral_code;
  const progress = Math.min((elapsedSeconds / (MAX_HOURS * 3600)) * 100, 100);
  const claimable = Math.floor(earnedPoints);
  const canClaim = isMining && claimable >= MIN_CLAIM_ARX;
  const claimProgress =
    isMining && claimable < MIN_CLAIM_ARX ? `${MIN_CLAIM_ARX - claimable} more ARX-P to claim` : null;

  useEffect(() => {
    if (!preview || !previewMining) return;
    const id = window.setInterval(() => {
      setPreviewEarn((e) => e + 11.5 / 3600);
      setPreviewElapsed((s) => s + 1);
      setPreviewRemain((s) => Math.max(0, s - 1));
    }, 1000);
    return () => window.clearInterval(id);
  }, [preview, previewMining]);

  const handleMiningToggle = useCallback(async () => {
    if (preview) {
      setPreviewMining((m) => !m);
      return;
    }
    if (!user) {
      setShowAuth(true);
      return;
    }
    if (sessionMaxed) await mining.claimPoints();
    else if (isMining) await mining.stopMining();
    else await mining.startMining();
  }, [preview, user, sessionMaxed, isMining, mining]);

  const handleClaim = async () => {
    if (preview) {
      toast({ title: 'Preview', description: 'Claim simulated in preview mode' });
      return;
    }
    if (!user) {
      setShowAuth(true);
      return;
    }
    if (earnedPoints >= MIN_CLAIM_ARX) await mining.claimPoints();
  };

  const copyRef = async () => {
    if (!referralCode) return;
    await navigator.clipboard.writeText(referralCode);
    toast({ title: 'Copied!', description: 'Referral code copied to clipboard' });
  };

  const goBack = () => {
    if (preview) navigate(APP_PREVIEW_BASE);
    else navigate(-1);
  };

  const statusBadge = (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 5,
      background: isMining ? 'rgba(127,231,196,0.12)' : 'rgba(255,255,255,0.04)',
      border: `1px solid ${isMining ? 'rgba(127,231,196,0.35)' : 'rgba(255,255,255,0.08)'}`,
      borderRadius: 20, padding: '6px 12px',
    }}>
      {isMining && (
        <div style={{ width: 6, height: 6, borderRadius: '50%', background: neon.teal, boxShadow: `0 0 8px ${neon.teal}` }} />
      )}
      <span style={{ fontSize: 11, fontWeight: 700, color: isMining ? neon.teal : neon.textMuted }}>
        {isMining ? `${pointsPerHour.toFixed(1)}/hr` : 'Idle'}
      </span>
    </div>
  );

  return (
    <V2Page>
      <V2Header title="Mining" subtitle="Live session dashboard" onBack={goBack} right={statusBadge} />

      <motion.div variants={stagger} initial="hidden" animate="show" style={{ padding: '0 20px' }}>
        <motion.div variants={fadeUp} style={{ marginTop: 14 }}>
          <NeonPanel glow={neon.cyan} style={{ padding: '16px 16px 14px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
              <div>
                <NeonEyebrow>Available Balance</NeonEyebrow>
                <p style={{ margin: '6px 0 0', fontSize: 28, fontWeight: 900, color: neon.text, letterSpacing: '-1px' }}>
                  {totalPoints.toLocaleString()}
                  <span style={{ fontSize: 12, color: neon.cyan, marginLeft: 6 }}>ARX-P</span>
                </p>
              </div>
              {displayRank && (
                <span style={{ fontSize: 10, fontWeight: 800, color: neon.gold, padding: '4px 10px', borderRadius: 20, background: 'rgba(255,201,60,0.12)', border: '1px solid rgba(255,201,60,0.3)' }}>
                  #{displayRank}
                </span>
              )}
            </div>
            <MiningPillWidget
              isMining={isMining}
              earnedPoints={earnedPoints}
              remainingSeconds={remainingTime}
              pointsPerHour={pointsPerHour}
              boostPercentage={boostPercentage}
              onToggle={handleMiningToggle}
              loading={loading || isStarting || isStopping || isClaiming}
              sessionMaxed={sessionMaxed}
            />
          </NeonPanel>
        </motion.div>

        <motion.div variants={fadeUp} style={{ marginTop: 12 }}>
          <NeonPanel glow={neon.teal} style={{ padding: '16px 18px' }}>
            <p style={{ margin: 0, fontSize: 9, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: neon.textMuted }}>
              Session Progress
            </p>
            <div style={{ height: 6, borderRadius: 3, background: 'rgba(255,255,255,0.06)', overflow: 'hidden', marginTop: 10 }}>
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 1, ease: 'easeOut' }}
                style={{ height: '100%', borderRadius: 3, background: `linear-gradient(90deg, ${neon.cyan}, ${neon.teal})` }}
              />
            </div>
            <p style={{ margin: '8px 0 0', fontSize: 10, color: neon.textMuted }}>
              {fmtTime(elapsedSeconds)} elapsed · Max {MAX_HOURS}hr session
            </p>
          </NeonPanel>
        </motion.div>

        {isMining && canClaim && (
          <motion.div variants={fadeUp} style={{ marginTop: 10 }}>
            <V2Button onClick={handleClaim} accent={neon.teal} fullWidth disabled={isClaiming}>
              <Zap size={16} style={{ marginRight: 4 }} />
              {isClaiming ? 'Claiming…' : `Claim ${claimable} ARX-P (keep mining)`}
            </V2Button>
          </motion.div>
        )}

        {claimProgress && (
          <motion.p variants={fadeUp} style={{ textAlign: 'center', fontSize: 11, color: neon.textMuted, marginTop: 10 }}>
            {claimProgress} (minimum {MIN_CLAIM_ARX} ARX-P)
          </motion.p>
        )}

        {!isMining && (
          <motion.div variants={fadeUp} style={{ marginTop: 10 }}>
            <p style={{ textAlign: 'center', fontSize: 11, color: neon.textMuted, margin: 0 }}>
              Tap the center orb to start mining ARX-P rewards
            </p>
          </motion.div>
        )}

        {isMining && !canClaim && !claimProgress && (
          <motion.div variants={fadeUp} style={{ marginTop: 10 }}>
            <V2ButtonGhost onClick={handleMiningToggle} accent="#ff6b4a" fullWidth>
              {isStopping ? 'Stopping…' : '■ Stop Mining'}
            </V2ButtonGhost>
            <p style={{ textAlign: 'center', fontSize: 10, color: neon.textMuted, marginTop: 8 }}>
              Stop ends your session and credits ARX-P
            </p>
          </motion.div>
        )}

        {referralCode && (
          <motion.div variants={fadeUp} style={{ marginTop: 12 }}>
            <NeonPanel glow={neon.gold} style={{ padding: '14px 16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <NeonEyebrow color={neon.gold}>Your Referral Code</NeonEyebrow>
                  <p style={{ margin: '6px 0 0', fontSize: 16, fontWeight: 800, color: neon.text, fontFamily: 'monospace', letterSpacing: '0.06em' }}>
                    {referralCode}
                  </p>
                </div>
                <motion.button
                  type="button"
                  whileTap={{ scale: 0.9 }}
                  onClick={copyRef}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6, padding: '9px 14px', borderRadius: 12,
                    background: 'rgba(255,201,60,0.12)', border: '1px solid rgba(255,201,60,0.35)',
                    color: neon.gold, fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: neon.font,
                  }}
                >
                  <Copy size={13} /> Copy
                </motion.button>
              </div>
            </NeonPanel>
          </motion.div>
        )}
      </motion.div>

      {!preview && <AuthDialog open={showAuth} onOpenChange={setShowAuth} />}
    </V2Page>
  );
}
