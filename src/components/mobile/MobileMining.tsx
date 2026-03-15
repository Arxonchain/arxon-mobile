// v2.0 - Mobile UI Redesign: periwinkle nav, immersive space cards, crystal gem
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useMining } from '@/hooks/useMining';
import { useAuth } from '@/contexts/AuthContext';
import { usePoints } from '@/hooks/usePoints';
import { useProfile } from '@/hooks/useProfile';
import { Clock, Zap, Copy } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { useState } from 'react';
import AuthDialog from '@/components/auth/AuthDialog';

const PERIWINKLE = '#9EB3E0';
const NAVY = '#1E3A5F';

export default function MobileMining() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { points } = usePoints();
  const { profile } = useProfile();
  const {
    isMining, loading, settingsLoading, elapsedTime, remainingTime,
    earnedPoints, maxTimeSeconds, startMining, stopMining, claimPoints,
    formatTime, pointsPerSecond, pointsPerHour, totalBoostPercentage, miningSettings
  } = useMining({ tickMs: 250 });
  const [showAuth, setShowAuth] = useState(false);

  const miningDisabled = !settingsLoading && !miningSettings?.publicMiningEnabled;
  const progressPct = maxTimeSeconds > 0 ? Math.min((elapsedTime / maxTimeSeconds) * 100, 100) : 0;
  const circumference = 2 * Math.PI * 84;

  const copyCode = () => {
    if (!profile?.referral_code) return;
    navigator.clipboard.writeText(profile.referral_code);
    toast({ title: 'Copied!', description: 'Referral code copied' });
  };

  const handleMine = () => {
    if (!user) { setShowAuth(true); return; }
    if (isMining) stopMining(); else startMining();
  };

  return (
    <div style={{ minHeight: '100vh', background: '#000', fontFamily: "'Creato Display', system-ui, sans-serif", paddingBottom: 90 }}>

      <div style={{ padding: '52px 20px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ fontSize: 21, fontWeight: 900, color: '#fff', letterSpacing: '-0.4px' }}>Mining</div>
        <div style={{ background: 'rgba(158,179,224,0.1)', border: '1px solid rgba(158,179,224,0.22)', borderRadius: 20, padding: '5px 12px' }}>
          <span style={{ color: '#8BAED6', fontSize: 12, fontWeight: 700 }}>{(points || 0).toLocaleString()} ARX-P</span>
        </div>
      </div>

      {/* Immersive ring card */}
      <div style={{ margin: '0 16px 14px', position: 'relative', borderRadius: 28, overflow: 'hidden', padding: '18px 18px 16px' }}>
        <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at 50% 110%,#0a2040 0%,#050e1c 50%,#020810 100%)' }} />
        {/* Rising particles */}
        <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }} viewBox="0 0 311 280">
          {[[40,1.2,'#8BAED6',0],[100,0.9,'#A8C4E8',1.2],[200,1.4,'white',0.6],[260,1,'#C8E0FF',2],[155,0.8,'#8BAED6',1.8]].map(([cx,r,fill,delay], i) => (
            <circle key={i} cx={cx as number} cy={240} r={r as number} fill={fill as string} opacity={0}>
              <animate attributeName="cy" values="240;60;60" dur={`${3.5+i*0.5}s`} repeatCount="indefinite" begin={`${delay}s`}/>
              <animate attributeName="opacity" values="0;0.6;0" dur={`${3.5+i*0.5}s`} repeatCount="indefinite" begin={`${delay}s`}/>
            </circle>
          ))}
        </svg>
        {/* Energy beam */}
        <div style={{ position: 'absolute', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: 1, height: '70%', background: 'linear-gradient(to top,rgba(139,174,214,0.5),transparent)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', inset: 0, borderRadius: 28, border: '1px solid rgba(139,174,214,0.16)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1, background: 'linear-gradient(90deg,transparent,rgba(200,228,255,0.18),transparent)', pointerEvents: 'none' }} />

        <div style={{ position: 'relative', zIndex: 2 }}>
          {/* Ring */}
          <div style={{ display: 'flex', justifyContent: 'center', padding: '4px 0 16px', position: 'relative' }}>
            <div style={{ position: 'relative', width: 196, height: 196 }}>
              <svg style={{ position: 'absolute', top: 0, left: 0 }} width="196" height="196" viewBox="0 0 196 196">
                <defs>
                  <linearGradient id="rg" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#3a70aa"/>
                    <stop offset="100%" stopColor="#A8C4E8"/>
                  </linearGradient>
                </defs>
                <circle cx="98" cy="98" r="84" fill="none" stroke="rgba(139,174,214,0.05)" strokeWidth="10"/>
                <circle cx="98" cy="98" r="84" fill="none" stroke="rgba(139,174,214,0.08)" strokeWidth="18" strokeLinecap="round"
                  strokeDasharray={circumference} strokeDashoffset={circumference * (1 - progressPct / 100)}
                  transform="rotate(-90 98 98)" style={{ filter: 'blur(5px)', transition: 'stroke-dashoffset 0.5s' }}/>
                <circle cx="98" cy="98" r="84" fill="none" stroke="url(#rg)" strokeWidth="10" strokeLinecap="round"
                  strokeDasharray={circumference} strokeDashoffset={circumference * (1 - progressPct / 100)}
                  transform="rotate(-90 98 98)" style={{ transition: 'stroke-dashoffset 0.5s' }}/>
              </svg>
              <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ fontSize: 8, textTransform: 'uppercase', letterSpacing: '1.2px', color: 'rgba(139,174,214,0.42)', fontWeight: 600, marginBottom: 4 }}>
                  {isMining ? 'Time Left' : 'Ready'}
                </div>
                <div style={{ fontSize: 28, fontWeight: 900, letterSpacing: '-1.5px', color: '#fff', fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>
                  {isMining ? formatTime(remainingTime) : formatTime(maxTimeSeconds)}
                </div>
                {isMining && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 6 }}>
                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#8BAED6', animation: 'pulse 2s infinite' }} />
                    <span style={{ color: '#8BAED6', fontSize: 11, fontWeight: 600 }}>Active</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Earnings */}
          <div style={{ background: 'rgba(139,174,214,0.06)', border: '1px solid rgba(139,174,214,0.14)', borderRadius: 18, padding: '14px 16px', marginBottom: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: 8, textTransform: 'uppercase', letterSpacing: '1px', color: 'rgba(139,174,214,0.38)', marginBottom: 4, fontWeight: 600 }}>Session Earnings</div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 5 }}>
                  <span style={{ fontSize: 26, fontWeight: 900, letterSpacing: '-0.8px', color: '#8BAED6' }}>+{earnedPoints?.toFixed(2) || '0.00'}</span>
                  <span style={{ fontSize: 11, fontWeight: 700, color: 'rgba(139,174,214,0.5)' }}>ARX-P</span>
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 8, color: 'rgba(139,174,214,0.38)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 3 }}>Rate</div>
                <div style={{ fontSize: 14, fontWeight: 800, color: '#EEF2F7' }}>{pointsPerHour?.toFixed(1)}/hr</div>
                {totalBoostPercentage > 0 && (
                  <div style={{ fontSize: 10, fontWeight: 600, color: '#d4884a', marginTop: 2 }}>🔥 +{totalBoostPercentage}%</div>
                )}
              </div>
            </div>
            {isMining && earnedPoints > 0 && (
              <motion.button whileTap={{ scale: 0.96 }} onClick={claimPoints}
                style={{ width: '100%', marginTop: 12, padding: 13, borderRadius: 13, border: '1px solid rgba(139,174,214,0.22)', background: 'rgba(139,174,214,0.1)', color: '#8BAED6', fontSize: 14, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontFamily: "'Creato Display', system-ui" }}>
                <Zap size={14} /> Claim {earnedPoints?.toFixed(0)} ARX-P
              </motion.button>
            )}
          </div>

          {/* Stats */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
            <div style={{ background: 'rgba(139,174,214,0.05)', border: '1px solid rgba(139,174,214,0.1)', borderRadius: 14, padding: '12px 14px' }}>
              <Clock size={14} color="#8BAED6" />
              <div style={{ fontSize: 8, textTransform: 'uppercase', letterSpacing: '0.8px', color: 'rgba(139,174,214,0.38)', margin: '5px 0 2px', fontWeight: 600 }}>Elapsed</div>
              <div style={{ fontSize: 18, fontWeight: 900, color: '#EEF2F7', fontVariantNumeric: 'tabular-nums' }}>{formatTime(elapsedTime)}</div>
            </div>
            <div style={{ background: 'rgba(139,174,224,0.05)', border: '1px solid rgba(139,174,214,0.1)', borderRadius: 14, padding: '12px 14px' }}>
              <Zap size={14} color="#8BAED6" />
              <div style={{ fontSize: 8, textTransform: 'uppercase', letterSpacing: '0.8px', color: 'rgba(139,174,214,0.38)', margin: '5px 0 2px', fontWeight: 600 }}>Per Second</div>
              <div style={{ fontSize: 18, fontWeight: 900, color: '#EEF2F7' }}>{pointsPerSecond?.toFixed(4)}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Action button */}
      <motion.button whileTap={{ scale: 0.97 }} onClick={handleMine}
        disabled={loading || miningDisabled}
        style={{
          width: 'calc(100% - 32px)', margin: '0 16px 14px', padding: 17, borderRadius: 17,
          background: isMining ? 'rgba(224,96,96,0.1)' : PERIWINKLE,
          border: isMining ? '1px solid rgba(224,96,96,0.25)' : '1px solid rgba(255,255,255,0.25)',
          color: isMining ? '#E06060' : NAVY,
          fontSize: 15, fontWeight: 800, cursor: miningDisabled ? 'not-allowed' : 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 9,
          fontFamily: "'Creato Display', system-ui",
        }}>
        {isMining ? '■ Stop & Collect' : '▶ Start Mining'}
      </motion.button>

      {/* Referral */}
      {profile?.referral_code && (
        <div style={{ margin: '0 16px', background: 'rgba(139,174,214,0.05)', border: '1px solid rgba(139,174,214,0.1)', borderRadius: 16, padding: '13px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: 8, textTransform: 'uppercase', letterSpacing: '0.8px', color: 'rgba(139,174,214,0.38)', marginBottom: 3, fontWeight: 600 }}>Referral Code</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#8BAED6', letterSpacing: '0.05em' }}>{profile.referral_code}</div>
          </div>
          <motion.button whileTap={{ scale: 0.88 }} onClick={copyCode}
            style={{ width: 34, height: 34, borderRadius: 10, background: 'rgba(139,174,214,0.1)', border: '1px solid rgba(139,174,214,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
            <Copy size={13} color="#8BAED6" />
          </motion.button>
        </div>
      )}

      {showAuth && <AuthDialog open={showAuth} onOpenChange={setShowAuth} />}
    </div>
  );
}
