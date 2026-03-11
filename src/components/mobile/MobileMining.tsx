import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useMining } from '@/hooks/useMining';
import { useAuth } from '@/contexts/AuthContext';
import { usePoints } from '@/hooks/usePoints';
import { useProfile } from '@/hooks/useProfile';
import { Zap, Clock, TrendingUp, Copy, Play, Square } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { useState } from 'react';
import AuthDialog from '@/components/auth/AuthDialog';

export default function MobileMining() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { points } = usePoints();
  const { profile } = useProfile();
  const { isMining, loading, settingsLoading, elapsedTime, remainingTime, earnedPoints, maxTimeSeconds, startMining, stopMining, claimPoints, formatTime, pointsPerSecond, pointsPerHour, totalBoostPercentage, miningSettings } = useMining({ tickMs: 250 });
  const [showAuth, setShowAuth] = useState(false);

  const miningDisabled = !settingsLoading && !miningSettings?.publicMiningEnabled;
  const progressPct = maxTimeSeconds > 0 ? Math.min((elapsedTime / maxTimeSeconds) * 100, 100) : 0;
  const remainingPct = 100 - progressPct;
  const circumference = 2 * Math.PI * 100;

  const copyReferralCode = () => {
    const code = profile?.referral_code;
    if (!code) return;
    navigator.clipboard.writeText(code);
    toast({ title: 'Copied!', description: 'Referral code copied' });
  };

  const handleMineAction = () => {
    if (!user) { setShowAuth(true); return; }
    if (isMining) stopMining();
    else startMining();
  };

  return (
    <div style={{ minHeight: '100vh', background: '#080B14', fontFamily: "'Creato Display', sans-serif", paddingBottom: '90px' }}>
      {/* Header */}
      <div style={{ padding: '52px 20px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h1 style={{ color: '#fff', fontSize: '22px', fontWeight: 800, margin: 0, letterSpacing: '-0.02em' }}>Mining</h1>
        <div style={{ background: 'rgba(0,212,255,0.1)', border: '1px solid rgba(0,212,255,0.2)', borderRadius: '20px', padding: '6px 14px' }}>
          <span style={{ color: '#00D4FF', fontSize: '13px', fontWeight: 700 }}>{(points || 0).toLocaleString()} ARX-P</span>
        </div>
      </div>

      {/* Ring Timer */}
      <div style={{ display: 'flex', justifyContent: 'center', padding: '10px 20px 28px' }}>
        <div style={{ position: 'relative', width: 240, height: 240 }}>
          <svg width="240" height="240" style={{ transform: 'rotate(-90deg)' }}>
            {/* Track */}
            <circle cx="120" cy="120" r="100" fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="8" />
            {/* Progress */}
            <motion.circle cx="120" cy="120" r="100" fill="none"
              stroke={isMining ? '#00D4FF' : 'rgba(0,212,255,0.2)'}
              strokeWidth="8" strokeLinecap="round"
              strokeDasharray={circumference}
              animate={{ strokeDashoffset: circumference * (1 - progressPct / 100) }}
              transition={{ duration: 0.5 }}
              style={{ filter: isMining ? 'drop-shadow(0 0 8px #00D4FF)' : 'none' }}
            />
          </svg>
          {/* Center content */}
          <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            {isMining ? (
              <>
                <p style={{ color: '#4A5568', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.1em', margin: '0 0 4px', fontWeight: 600 }}>Time Left</p>
                <p style={{ color: '#fff', fontSize: '30px', fontWeight: 900, margin: '0 0 2px', letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums' }}>{formatTime(remainingTime)}</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#00E5A0', boxShadow: '0 0 6px #00E5A0' }} />
                  <p style={{ color: '#00E5A0', fontSize: '12px', fontWeight: 600, margin: 0 }}>Active</p>
                </div>
              </>
            ) : (
              <>
                <Zap size={28} color="#00D4FF" style={{ marginBottom: 8 }} />
                <p style={{ color: '#fff', fontSize: '16px', fontWeight: 800, margin: '0 0 2px' }}>Ready</p>
                <p style={{ color: '#4A5568', fontSize: '12px', margin: 0 }}>Tap to mine</p>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Earnings Card */}
      <div style={{ padding: '0 20px 20px' }}>
        <div style={{ 
          borderRadius: '20px', padding: '20px',
          background: isMining ? 'linear-gradient(135deg, rgba(0,229,160,0.1), rgba(0,212,255,0.05))' : 'rgba(255,255,255,0.03)',
          border: `1px solid ${isMining ? 'rgba(0,229,160,0.2)' : 'rgba(255,255,255,0.06)'}`,
          marginBottom: '12px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <p style={{ color: '#4A5568', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 4px', fontWeight: 600 }}>Session Earnings</p>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                <span style={{ color: isMining ? '#00E5A0' : '#fff', fontSize: '28px', fontWeight: 900, letterSpacing: '-0.02em' }}>+{earnedPoints?.toFixed(2) || '0.00'}</span>
                <span style={{ color: '#00D4FF', fontSize: '14px', fontWeight: 700 }}>ARX-P</span>
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <p style={{ color: '#4A5568', fontSize: '11px', margin: '0 0 4px' }}>Rate</p>
              <p style={{ color: '#fff', fontSize: '16px', fontWeight: 700, margin: 0 }}>{pointsPerHour?.toFixed(1)} /hr</p>
              {totalBoostPercentage > 0 && (
                <p style={{ color: '#FFB800', fontSize: '11px', margin: '2px 0 0', fontWeight: 600 }}>+{totalBoostPercentage}% boost 🔥</p>
              )}
            </div>
          </div>
          
          {isMining && earnedPoints > 0 && (
            <motion.button whileTap={{ scale: 0.96 }} onClick={claimPoints}
              style={{ width: '100%', marginTop: '16px', padding: '14px', borderRadius: '14px', background: 'linear-gradient(90deg, #00E5A0, #00D4FF)', border: 'none', cursor: 'pointer', color: '#080B14', fontWeight: 800, fontSize: '15px', fontFamily: "'Creato Display', sans-serif" }}>
              ⚡ Claim {earnedPoints?.toFixed(0)} ARX-P
            </motion.button>
          )}
        </div>

        {/* Stats row */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '20px' }}>
          <div style={{ borderRadius: '16px', padding: '16px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <Clock size={16} color="#B45FFF" style={{ marginBottom: 8 }} />
            <p style={{ color: '#4A5568', fontSize: '11px', margin: '0 0 2px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Elapsed</p>
            <p style={{ color: '#fff', fontSize: '18px', fontWeight: 800, margin: 0, fontVariantNumeric: 'tabular-nums' }}>{formatTime(elapsedTime)}</p>
          </div>
          <div style={{ borderRadius: '16px', padding: '16px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <TrendingUp size={16} color="#00D4FF" style={{ marginBottom: 8 }} />
            <p style={{ color: '#4A5568', fontSize: '11px', margin: '0 0 2px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Per Second</p>
            <p style={{ color: '#fff', fontSize: '18px', fontWeight: 800, margin: 0 }}>{pointsPerSecond?.toFixed(4)}</p>
          </div>
        </div>

        {/* Main Action Button */}
        <motion.button whileTap={{ scale: 0.97 }} onClick={handleMineAction} disabled={loading || miningDisabled}
          style={{ 
            width: '100%', padding: '18px', borderRadius: '18px', border: 'none', cursor: miningDisabled ? 'not-allowed' : 'pointer',
            background: isMining 
              ? 'linear-gradient(90deg, rgba(255,59,59,0.15), rgba(255,59,59,0.08))' 
              : 'linear-gradient(90deg, #00D4FF, #B45FFF)',
            color: isMining ? '#FF3B3B' : '#fff',
            fontWeight: 800, fontSize: '16px', fontFamily: "'Creato Display', sans-serif",
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
            border: isMining ? '1px solid rgba(255,59,59,0.3)' : 'none'
          }}>
          {isMining ? <><Square size={18} /> Stop & Collect</> : <><Play size={18} /> Start Mining</>}
        </motion.button>

        {/* Referral Code */}
        {profile?.referral_code && (
          <div style={{ marginTop: '16px', borderRadius: '16px', padding: '14px 16px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <p style={{ color: '#4A5568', fontSize: '10px', margin: '0 0 2px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Your Referral Code</p>
              <p style={{ color: '#00D4FF', fontSize: '15px', fontWeight: 700, margin: 0, letterSpacing: '0.05em' }}>{profile.referral_code}</p>
            </div>
            <motion.button whileTap={{ scale: 0.88 }} onClick={copyReferralCode}
              style={{ width: 36, height: 36, borderRadius: '10px', background: 'rgba(0,212,255,0.1)', border: '1px solid rgba(0,212,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
              <Copy size={14} color="#00D4FF" />
            </motion.button>
          </div>
        )}
      </div>

      {showAuth && <AuthDialog open={showAuth} onOpenChange={setShowAuth} />}
    </div>
  );
}
