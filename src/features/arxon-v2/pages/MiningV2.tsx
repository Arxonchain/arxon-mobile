import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { Copy, TrendingUp, Zap } from 'lucide-react';
import { useMining } from '@/hooks/useMining';
import { useAuth } from '@/contexts/AuthContext';
import { usePoints } from '@/hooks/usePoints';
import { useProfile } from '@/hooks/useProfile';
import { toast } from '@/hooks/use-toast';
import AuthDialog from '@/components/auth/AuthDialog';
import arxonLogo from '@/assets/arxon-icon.svg';
import { v2 } from '../design/tokens';
import {
  V2Page,
  V2Header,
  V2BalanceHero,
  V2Button,
  V2ButtonGhost,
  V2HeroCard,
  V2Card,
  V2SectionHeader,
  V2StatGrid,
  fadeUp,
  stagger,
} from '../design/Kit';

const MINING_CSS = `
@keyframes miningCore{0%,100%{transform:scale(1);filter:drop-shadow(0 0 16px hsl(215 55% 62%/0.6))}50%{transform:scale(1.06);filter:drop-shadow(0 0 32px hsl(215 55% 62%/1))}}
@keyframes idleFloat{0%,100%{transform:translateY(0) rotateY(0deg)}50%{transform:translateY(-8px) rotateY(8deg)}}
@keyframes orbitRing{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
@keyframes orbitRingRev{from{transform:rotate(0deg)}to{transform:rotate(-360deg)}}
@keyframes rippleRing{0%{transform:scale(1);opacity:0.3}100%{transform:scale(2.4);opacity:0}}
@keyframes progressPulse{0%,100%{opacity:0.8}50%{opacity:1}}
@keyframes particleUp{0%{transform:translateY(0);opacity:0}15%{opacity:0.7}85%{opacity:0.3}100%{transform:translateY(-70px);opacity:0}}
@keyframes spinSlow{to{transform:rotate(360deg)}}
`;

const MAX_HOURS = 8;
const MIN_CLAIM_ARX = 10;

function fmtTime(s: number) {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const ss = s % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(ss).padStart(2, '0')}`;
}

function MiningOrb({ isMining }: { isMining: boolean }) {
  return (
    <div style={{ position: 'relative', marginBottom: 8 }}>
      <div
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: 200,
          height: 200,
          borderRadius: '50%',
          pointerEvents: 'none',
          background: `radial-gradient(circle, ${v2.brand.glow}${isMining ? '26' : '0f'} 0%, transparent 70%)`,
          transition: 'background 0.5s',
        }}
      />
      <svg
        style={{ position: 'absolute', inset: -16, animation: 'spinSlow 12s linear infinite' }}
        width="152"
        height="152"
        viewBox="0 0 152 152"
      >
        <circle cx="76" cy="76" r="70" fill="none" stroke={`${v2.brand.steel}14`} strokeWidth="1" />
        <circle
          cx="76"
          cy="76"
          r="70"
          fill="none"
          stroke={`${v2.brand.steel}38`}
          strokeWidth="1.2"
          strokeDasharray="32 408"
          strokeLinecap="round"
        />
      </svg>
      {isMining &&
        [0, 1].map((i) => (
          <div
            key={i}
            style={{
              position: 'absolute',
              inset: -8,
              borderRadius: '50%',
              border: `1px solid ${v2.accent.mining}66`,
              animation: `rippleRing 2.4s ease-out ${i * 1.2}s infinite`,
              pointerEvents: 'none',
            }}
          />
        ))}
      {isMining &&
        [0, 1, 2, 3, 4].map((i) => (
          <div
            key={i}
            style={{
              position: 'absolute',
              bottom: '100%',
              left: `${30 + i * 10}%`,
              width: 3,
              height: 3,
              borderRadius: '50%',
              background: v2.brand.steelLight,
              animation: `particleUp 2.5s ease-out ${i * 0.5}s infinite`,
              pointerEvents: 'none',
            }}
          />
        ))}
      <div style={{ animation: 'orbitRing 5s linear infinite', position: 'absolute', inset: -10, pointerEvents: 'none' }}>
        <div
          style={{
            width: 8,
            height: 8,
            borderRadius: '50%',
            background: v2.brand.steel,
            boxShadow: `0 0 12px ${v2.brand.glow}`,
            position: 'absolute',
            top: -4,
            left: '50%',
            transform: 'translateX(-50%)',
          }}
        />
      </div>
      <div style={{ animation: 'orbitRingRev 9s linear infinite', position: 'absolute', inset: -22, pointerEvents: 'none' }}>
        <div
          style={{
            width: 5,
            height: 5,
            borderRadius: '50%',
            background: `${v2.brand.steelLight}b3`,
            position: 'absolute',
            top: -2.5,
            left: '50%',
            transform: 'translateX(-50%)',
          }}
        />
      </div>
      <div
        style={{
          width: 120,
          height: 120,
          borderRadius: '50%',
          overflow: 'hidden',
          border: `2.5px solid ${v2.brand.steel}59`,
          boxShadow: `0 0 ${isMining ? '40px' : '20px'} ${v2.brand.glow}${isMining ? '59' : '26'}, inset 0 0 20px ${v2.brand.steel}1a`,
          animation: isMining ? 'miningCore 2s ease-in-out infinite' : 'idleFloat 5s ease-in-out infinite',
          transition: 'box-shadow 0.5s',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: `radial-gradient(circle, hsl(215 40% 14%) 0%, hsl(215 35% 8%) 100%)`,
          margin: '0 auto',
        }}
      >
        <img src={arxonLogo} alt="ARX" style={{ width: '62%', height: '62%', objectFit: 'contain' }} />
      </div>
    </div>
  );
}

export default function MiningV2() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { points, rank } = usePoints();
  const { profile } = useProfile();
  const [showAuth, setShowAuth] = useState(false);

  const {
    isMining,
    earnedPoints,
    elapsedTime: elapsedSeconds,
    pointsPerHour,
    totalBoostPercentage: boostPercentage,
    startMining,
    stopMining,
    claimPoints,
    isStarting,
    isStopping,
    isClaiming,
  } = useMining({ tickMs: 1000 });

  const totalPoints = Math.round(points?.total_points ?? 0);
  const referralCode = profile?.referral_code;
  const progress = Math.min((elapsedSeconds / (MAX_HOURS * 3600)) * 100, 100);
  const claimable = Math.floor(earnedPoints);
  const canClaim = isMining && claimable >= MIN_CLAIM_ARX;
  const claimProgress =
    isMining && claimable < MIN_CLAIM_ARX ? `${MIN_CLAIM_ARX - claimable} more ARX-P to claim` : null;

  const handleMineToggle = async () => {
    if (!user) {
      setShowAuth(true);
      return;
    }
    if (isMining) await stopMining();
    else await startMining();
  };

  const handleClaim = async () => {
    if (!user) {
      setShowAuth(true);
      return;
    }
    if (earnedPoints >= MIN_CLAIM_ARX) await claimPoints();
  };

  const copyRef = async () => {
    if (!referralCode) return;
    await navigator.clipboard.writeText(referralCode);
    toast({ title: 'Copied!', description: 'Referral code copied to clipboard' });
  };

  const statusBadge = (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 5,
        background: isMining ? `${v2.accent.success}1f` : `${v2.brand.raised}cc`,
        border: `1px solid ${isMining ? `${v2.accent.success}4d` : v2.brand.border}`,
        borderRadius: 20,
        padding: '6px 12px',
      }}
    >
      {isMining && (
        <div
          style={{
            width: 6,
            height: 6,
            borderRadius: '50%',
            background: v2.accent.mining,
            boxShadow: `0 0 8px ${v2.accent.mining}`,
          }}
        />
      )}
      <span style={{ fontSize: 11, fontWeight: 700, color: isMining ? v2.accent.mining : v2.brand.mutedSoft }}>
        {isMining ? `${pointsPerHour.toFixed(1)}/hr` : 'Idle'}
      </span>
    </div>
  );

  return (
    <V2Page>
      <style>{MINING_CSS}</style>

      <V2Header
        title="Mining"
        subtitle="Live session dashboard"
        onBack={() => navigate(-1)}
        right={statusBadge}
      />

      <motion.div variants={stagger} initial="hidden" animate="show" style={{ padding: '0 20px' }}>
        {/* Balance hero */}
        <motion.div variants={fadeUp} style={{ marginTop: 18 }}>
          <V2BalanceHero
            balance={totalPoints}
            rank={rank}
            stats={[
              { label: 'Session', value: `${Math.floor(earnedPoints)} ARX-P`, accent: v2.brand.steelLight },
              { label: 'Rate', value: `${pointsPerHour.toFixed(1)}/hr`, accent: v2.accent.mining },
              { label: 'Boost', value: boostPercentage > 0 ? `+${boostPercentage}%` : '—', accent: v2.accent.gold },
            ]}
          >
            <div
              style={{
                width: 52,
                height: 52,
                borderRadius: 16,
                overflow: 'hidden',
                border: `1px solid ${v2.brand.steel}33`,
                boxShadow: `0 0 16px ${v2.brand.glow}1f`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: v2.brand.surface,
                flexShrink: 0,
              }}
            >
              <img src={arxonLogo} alt="ARX" style={{ width: '68%', height: '68%', objectFit: 'contain' }} />
            </div>
          </V2BalanceHero>
        </motion.div>

        {/* Carousel-style status heroes */}
        <motion.div variants={fadeUp} style={{ marginTop: 16 }}>
          <V2SectionHeader title="Session Status" badge={isMining ? 'LIVE' : undefined} />
          <div
            style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 4, scrollSnapType: 'x mandatory' }}
            className="scrollbar-none"
          >
            <div style={{ minWidth: '78%', flexShrink: 0, scrollSnapAlign: 'start' }}>
              <V2HeroCard
                eyebrow={isMining ? 'Active Session' : 'Ready to Mine'}
                title={isMining ? fmtTime(elapsedSeconds) : 'Start Earning'}
                subtitle={
                  isMining
                    ? `${Math.floor(earnedPoints)} ARX-P earned · Max ${MAX_HOURS}hr session`
                    : 'Tap start to begin mining ARX-P rewards'
                }
                accent={isMining ? v2.accent.mining : v2.brand.steel}
                gradient={isMining ? v2.gradient.mining : v2.gradient.steel}
                compact
              />
            </div>
            <div style={{ minWidth: '78%', flexShrink: 0, scrollSnapAlign: 'start' }}>
              <V2HeroCard
                eyebrow="Mining Rate"
                title={`${pointsPerHour.toFixed(1)} ARX-P/hr`}
                subtitle={boostPercentage > 0 ? `+${boostPercentage}% boost active` : 'Base mining rate'}
                accent={v2.accent.gold}
                gradient={v2.gradient.steel}
                compact
              />
            </div>
            {canClaim && (
              <div style={{ minWidth: '78%', flexShrink: 0, scrollSnapAlign: 'start' }}>
                <V2HeroCard
                  eyebrow="Claim Ready"
                  title={`${claimable} ARX-P`}
                  subtitle="Claim mid-session without stopping"
                  cta="Claim Now"
                  onCta={handleClaim}
                  accent={v2.accent.success}
                  gradient={v2.gradient.mining}
                  compact
                />
              </div>
            )}
          </div>
        </motion.div>

        {/* Mining orb + session earnings */}
        <motion.div variants={fadeUp} style={{ marginTop: 16 }}>
          <V2Card accent={v2.brand.glow} padding="28px 20px 24px">
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <MiningOrb isMining={isMining} />

              <p
                style={{
                  fontSize: 9,
                  textTransform: 'uppercase',
                  letterSpacing: '0.16em',
                  color: v2.brand.muted,
                  fontWeight: 600,
                  marginBottom: 6,
                  marginTop: 16,
                }}
              >
                Session Earnings
              </p>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 4 }}>
                <span
                  style={{
                    fontSize: 48,
                    fontWeight: 800,
                    color: v2.brand.steelBright,
                    letterSpacing: '-2px',
                    lineHeight: 1,
                  }}
                >
                  {Math.floor(earnedPoints)}
                </span>
                <span style={{ fontSize: 18, fontWeight: 700, color: v2.brand.steel }}>
                  .{String(Math.floor((earnedPoints % 1) * 100)).padStart(2, '0')}
                </span>
              </div>
              <p style={{ fontSize: 11, color: v2.brand.muted, marginBottom: 16 }}>ARX-P this session</p>

              <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 5,
                    background: `${v2.accent.mining}1a`,
                    border: `1px solid ${v2.accent.mining}40`,
                    borderRadius: 20,
                    padding: '5px 12px',
                  }}
                >
                  <TrendingUp size={12} color={v2.accent.mining} />
                  <span style={{ fontSize: 11, fontWeight: 700, color: v2.accent.mining }}>
                    {pointsPerHour.toFixed(1)} ARX-P/hr
                  </span>
                </div>
                {boostPercentage > 0 && (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 5,
                      background: `${v2.accent.gold}1a`,
                      border: `1px solid ${v2.accent.gold}40`,
                      borderRadius: 20,
                      padding: '5px 12px',
                    }}
                  >
                    <Zap size={12} color={v2.accent.gold} />
                    <span style={{ fontSize: 11, fontWeight: 700, color: v2.accent.gold }}>
                      +{boostPercentage}%
                    </span>
                  </div>
                )}
              </div>

              {/* Progress bar */}
              <div style={{ width: '100%', marginBottom: 8 }}>
                <div style={{ height: 6, borderRadius: 3, background: v2.brand.raised, overflow: 'hidden' }}>
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    transition={{ duration: 1, ease: 'easeOut' }}
                    style={{
                      height: '100%',
                      borderRadius: 3,
                      background: `linear-gradient(90deg, ${v2.brand.steel}, ${v2.brand.steelLight})`,
                      animation: 'progressPulse 2s ease-in-out infinite',
                    }}
                  />
                </div>
              </div>
              <p style={{ fontSize: 9, color: v2.brand.muted, marginBottom: 0 }}>
                {fmtTime(elapsedSeconds)} elapsed · Max {MAX_HOURS}hr session
              </p>
            </div>
          </V2Card>
        </motion.div>

        {/* Stats grid */}
        <motion.div variants={fadeUp} style={{ marginTop: 12 }}>
          <V2Card padding="16px 18px">
            <V2StatGrid
              stats={[
                { label: 'Elapsed', value: fmtTime(elapsedSeconds), accent: v2.brand.steel },
                { label: 'Per Hour', value: pointsPerHour.toFixed(1), accent: v2.accent.mining },
                { label: 'Boost', value: boostPercentage > 0 ? `+${boostPercentage}%` : '—', accent: v2.accent.gold },
              ]}
            />
          </V2Card>
        </motion.div>

        {/* Actions */}
        <motion.div variants={fadeUp} style={{ marginTop: 14 }}>
          {isMining ? (
            <V2ButtonGhost
              onClick={handleMineToggle}
              accent={v2.accent.danger}
              fullWidth
            >
              {isStopping ? 'Stopping…' : '■  Stop Mining'}
            </V2ButtonGhost>
          ) : (
            <V2Button
              onClick={handleMineToggle}
              accent={v2.brand.steel}
              fullWidth
              disabled={isStarting}
              style={{
                background: `linear-gradient(135deg, ${v2.brand.steel}, hsl(215 40% 45%))`,
                color: v2.brand.steelBright,
                boxShadow: `0 6px 20px ${v2.brand.glow}44`,
              }}
            >
              {isStarting ? 'Starting…' : '▶  Start Mining'}
            </V2Button>
          )}

          {isMining && (
            <>
              {canClaim ? (
                <div style={{ marginTop: 10 }}>
                  <V2Button onClick={handleClaim} accent={v2.accent.mining} fullWidth disabled={isClaiming}>
                    <Zap size={16} style={{ marginRight: 4 }} />
                    {isClaiming ? 'Claiming…' : `Claim ${claimable} ARX-P (keep mining)`}
                  </V2Button>
                </div>
              ) : claimProgress ? (
                <p style={{ textAlign: 'center', fontSize: 12, color: v2.brand.mutedSoft, marginTop: 10 }}>
                  {claimProgress} (minimum {MIN_CLAIM_ARX} ARX-P)
                </p>
              ) : (
                <p style={{ textAlign: 'center', fontSize: 11, color: v2.brand.muted, marginTop: 8 }}>
                  Stop ends your session and credits ARX-P · Claim mid-session without stopping
                </p>
              )}
            </>
          )}
        </motion.div>

        {/* Referral */}
        {referralCode && (
          <motion.div variants={fadeUp} style={{ marginTop: 12 }}>
            <V2Card padding="14px 18px" accent={v2.brand.steel}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <p
                    style={{
                      fontSize: 9,
                      textTransform: 'uppercase',
                      letterSpacing: '0.12em',
                      color: v2.brand.muted,
                      fontWeight: 700,
                      marginBottom: 5,
                    }}
                  >
                    Your Referral Code
                  </p>
                  <p
                    style={{
                      fontSize: 16,
                      fontWeight: 800,
                      color: v2.brand.steelLight,
                      fontFamily: 'monospace',
                      letterSpacing: '0.06em',
                      margin: 0,
                    }}
                  >
                    {referralCode}
                  </p>
                </div>
                <motion.button
                  type="button"
                  whileTap={{ scale: 0.9 }}
                  onClick={copyRef}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '9px 14px',
                    borderRadius: 12,
                    background: `${v2.brand.steel}1a`,
                    border: `1px solid ${v2.brand.steel}33`,
                    color: v2.brand.steel,
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: 'pointer',
                    fontFamily: v2.font,
                  }}
                >
                  <Copy size={13} /> Copy
                </motion.button>
              </div>
            </V2Card>
          </motion.div>
        )}
      </motion.div>

      <AuthDialog open={showAuth} onOpenChange={setShowAuth} />
    </V2Page>
  );
}
