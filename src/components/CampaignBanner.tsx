/**
 * CampaignBanner — BOTH web and mobile dashboards.
 * Mobile: opens claim modal (new installs only)
 * Web:    opens Download App modal
 * Design: 3D light blue brand colours, no green
 */
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Gift, X, Smartphone, Download, CheckCircle, Clock } from 'lucide-react';
import { useNewUserCampaign } from '@/hooks/useNewUserCampaign';
import { useToast } from '@/hooks/use-toast';

const APP_DOWNLOAD_URL = 'https://t.co/N5qAMjQBUK';

// Brand light blue palette
const BLUE = {
  primary:   'hsl(207 90% 54%)',       // #1DA1F2-ish bright blue
  soft:      'hsl(207 85% 65%)',
  glow:      'hsl(207 90% 54%/0.35)',
  bg:        'hsl(207 90% 54%/0.10)',
  border:    'hsl(207 90% 54%/0.30)',
  dark:      'hsl(215 45% 12%)',
  darkBorder:'hsl(215 40% 20%)',
};

// campaign.isNative comes from the campaign hook which detects it lazily at runtime

// ── 3D Day progress dots ───────────────────────────────────────────────────
function DayDots({ claimed, total = 7 }: { claimed: number; total?: number }) {
  return (
    <div style={{ display: 'flex', gap: 7, alignItems: 'center' }}>
      {Array.from({ length: total }).map((_, i) => (
        <div key={i} style={{
          width: i < claimed ? 14 : 10,
          height: i < claimed ? 14 : 10,
          borderRadius: '50%',
          background: i < claimed
            ? `radial-gradient(circle at 35% 35%, hsl(207 100% 80%), ${BLUE.primary})`
            : 'hsl(215 30% 18%)',
          border: i < claimed ? `1.5px solid ${BLUE.soft}` : '1.5px solid hsl(215 25% 28%)',
          boxShadow: i < claimed
            ? `0 2px 8px ${BLUE.glow}, inset 0 1px 2px hsl(207 100% 85%/0.4)`
            : 'inset 0 1px 3px rgba(0,0,0,0.4)',
          transition: 'all 0.35s cubic-bezier(0.34,1.56,0.64,1)',
          flexShrink: 0,
        }} />
      ))}
    </div>
  );
}

// ── 3D icon container ──────────────────────────────────────────────────────
function IconBox({ size = 80, children }: { size?: number; children: React.ReactNode }) {
  return (
    <div style={{
      width: size, height: size,
      borderRadius: size * 0.28,
      margin: '0 auto 16px',
      background: `linear-gradient(145deg, hsl(207 85% 30%), hsl(215 60% 16%))`,
      border: `1.5px solid ${BLUE.border}`,
      boxShadow: `
        0 8px 32px ${BLUE.glow},
        0 2px 8px rgba(0,0,0,0.5),
        inset 0 1px 1px hsl(207 100% 75%/0.25),
        inset 0 -1px 1px rgba(0,0,0,0.3)
      `,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      position: 'relative', overflow: 'hidden',
    }}>
      {/* Top shine */}
      <div style={{
        position: 'absolute', top: 0, left: '15%', right: '15%', height: '40%',
        background: 'linear-gradient(to bottom, hsl(207 100% 90%/0.15), transparent)',
        borderRadius: '0 0 50% 50%',
        pointerEvents: 'none',
      }} />
      {children}
    </div>
  );
}

// ── Claim Modal (mobile only) ──────────────────────────────────────────────
function ClaimModal({ onClose, campaign }: {
  onClose: () => void;
  campaign: ReturnType<typeof useNewUserCampaign>;
}) {
  const { toast } = useToast();
  const [result, setResult] = useState<{ success: boolean; points?: number } | null>(null);

  const handleClaim = async () => {
    const res = await campaign.claim();
    if (res.success) {
      setResult({ success: true, points: res.pointsAwarded });
      toast({
        title: `+${res.pointsAwarded?.toLocaleString()} ARX-P claimed! 🎉`,
        description: `Day ${campaign.daysClaimed + 1} of 7 complete.`,
      });
    } else {
      toast({ title: 'Claim failed', description: res.error, variant: 'destructive' });
    }
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: 'rgba(4,6,16,0.82)', backdropFilter: 'blur(12px)',
      display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
      fontFamily: "'Creato Display',-apple-system,system-ui,sans-serif",
    }} onClick={onClose}>
      <motion.div
        initial={{ y: 120, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 120, opacity: 0 }}
        transition={{ type: 'spring', damping: 26, stiffness: 280 }}
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: 500, position: 'relative',
          background: 'linear-gradient(160deg,hsl(215 40% 9%),hsl(220 35% 6%))',
          border: `1.5px solid ${BLUE.border}`,
          borderRadius: '32px 32px 0 0',
          padding: '32px 24px 52px',
          boxShadow: `0 -16px 64px ${BLUE.glow}, 0 -4px 24px rgba(0,0,0,0.6)`,
        }}>
        {/* Handle */}
        <div style={{
          width: 44, height: 5, borderRadius: 3,
          background: 'hsl(215 25% 25%)', margin: '0 auto 28px',
        }} />

        {/* Close */}
        <button onClick={onClose} style={{
          position: 'absolute', top: 22, right: 22,
          background: 'hsl(215 30% 14%)', border: `1px solid ${BLUE.darkBorder}`,
          borderRadius: 12, width: 36, height: 36, cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.05)',
        }}>
          <X size={16} color="hsl(215 20% 55%)" />
        </button>

        {/* Icon */}
        <div style={{ textAlign: 'center' }}>
          <IconBox size={80}>
            <Gift size={36} color={BLUE.soft} strokeWidth={1.8} />
          </IconBox>
          <h2 style={{ fontSize: 24, fontWeight: 900, color: 'hsl(215 20% 97%)', margin: '0 0 8px' }}>
            New User Reward
          </h2>
          <p style={{ fontSize: 13, color: 'hsl(215 18% 48%)', marginBottom: 24, lineHeight: 1.5 }}>
            Welcome to Arxon! Claim your free daily ARX-P for 7 days.
          </p>
        </div>

        {/* Points 3D card */}
        <div style={{
          background: `linear-gradient(135deg, hsl(215 40% 11%), hsl(207 60% 14%))`,
          border: `1.5px solid ${BLUE.border}`,
          borderRadius: 22,
          padding: '22px 20px',
          marginBottom: 14,
          textAlign: 'center',
          boxShadow: `0 4px 24px ${BLUE.glow}, inset 0 1px 1px hsl(207 100% 75%/0.08)`,
          position: 'relative', overflow: 'hidden',
        }}>
          {/* Top shimmer */}
          <div style={{
            position: 'absolute', top: 0, left: 0, right: 0, height: 1,
            background: `linear-gradient(90deg, transparent, ${BLUE.soft}, transparent)`,
          }} />
          <p style={{ fontSize: 12, color: BLUE.soft, letterSpacing: '0.12em', fontWeight: 700, marginBottom: 8, textTransform: 'uppercase' }}>
            Daily Reward
          </p>
          <p style={{
            fontSize: 52, fontWeight: 900, lineHeight: 1,
            background: `linear-gradient(145deg, hsl(207 100% 85%), ${BLUE.primary})`,
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            filter: `drop-shadow(0 0 16px ${BLUE.glow})`,
            marginBottom: 6,
          }}>
            1,000
          </p>
          <p style={{ fontSize: 13, color: BLUE.soft, fontWeight: 600 }}>ARX-P per day</p>
        </div>

        {/* Progress card */}
        <div style={{
          background: 'hsl(215 35% 10%)',
          border: `1px solid ${BLUE.darkBorder}`,
          borderRadius: 18, padding: '16px 18px', marginBottom: 20,
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
            <span style={{ fontSize: 12, color: 'hsl(215 16% 42%)' }}>Progress</span>
            <span style={{ fontSize: 12, fontWeight: 700, color: BLUE.soft }}>
              {campaign.daysClaimed}/7 days claimed
            </span>
          </div>
          <DayDots claimed={campaign.daysClaimed} />
          {!campaign.campaignEnded && (
            <p style={{ fontSize: 11, color: 'hsl(215 14% 36%)', marginTop: 10 }}>
              {campaign.daysRemaining} day{campaign.daysRemaining !== 1 ? 's' : ''} remaining
            </p>
          )}
        </div>

        {/* Success result */}
        {result?.success && (
          <div style={{
            background: BLUE.bg,
            border: `1px solid ${BLUE.border}`,
            borderRadius: 16, padding: '14px 18px', marginBottom: 16,
            display: 'flex', alignItems: 'center', gap: 12,
          }}>
            <CheckCircle size={22} color={BLUE.primary} />
            <p style={{ fontSize: 15, fontWeight: 700, color: BLUE.soft }}>
              +{result.points?.toLocaleString()} ARX-P added to your balance!
            </p>
          </div>
        )}

        {/* CTA */}
        {campaign.campaignEnded ? (
          <div style={{
            padding: '18px', borderRadius: 20, textAlign: 'center',
            background: 'hsl(215 28% 9%)', border: '1px solid hsl(215 22% 16%)',
          }}>
            <p style={{ fontSize: 15, fontWeight: 700, color: 'hsl(215 18% 42%)' }}>
              🏁 Campaign Ended
            </p>
            <p style={{ fontSize: 12, color: 'hsl(215 14% 30%)', marginTop: 6 }}>
              You've completed the 7-day new user reward campaign.
            </p>
          </div>
        ) : !campaign.canClaimToday && campaign.daysClaimed > 0 ? (
          <div style={{
            padding: '18px', borderRadius: 20, textAlign: 'center',
            background: 'hsl(215 28% 9%)', border: `1px solid ${BLUE.darkBorder}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
          }}>
            <Clock size={20} color={BLUE.primary} />
            <p style={{ fontSize: 14, fontWeight: 700, color: BLUE.soft }}>
              Already claimed today — come back tomorrow!
            </p>
          </div>
        ) : (
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={handleClaim}
            disabled={campaign.claiming || !campaign.canClaimToday}
            style={{
              width: '100%', padding: '19px', borderRadius: 20, cursor: campaign.canClaimToday ? 'pointer' : 'default',
              border: 'none', fontFamily: "'Creato Display',-apple-system,sans-serif",
              fontSize: 17, fontWeight: 900, outline: 'none',
              background: campaign.canClaimToday
                ? `linear-gradient(135deg, hsl(207 90% 58%), hsl(207 80% 42%))`
                : 'hsl(215 28% 12%)',
              color: campaign.canClaimToday ? 'white' : 'hsl(215 18% 35%)',
              boxShadow: campaign.canClaimToday
                ? `0 8px 32px ${BLUE.glow}, 0 2px 8px rgba(0,0,0,0.4), inset 0 1px 1px hsl(207 100% 80%/0.25)`
                : 'none',
              transition: 'all 0.2s',
            }}>
            {campaign.claiming ? 'Claiming…' : campaign.canClaimToday ? '🎁 Claim 1,000 ARX-P' : 'Not eligible for this device'}
          </motion.button>
        )}
      </motion.div>
    </div>
  );
}

// ── Web Download Modal ─────────────────────────────────────────────────────
function DownloadModal({ onClose }: { onClose: () => void }) {
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: 'rgba(4,6,16,0.82)', backdropFilter: 'blur(12px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
      fontFamily: 'system-ui,sans-serif',
    }} onClick={onClose}>
      <motion.div
        initial={{ scale: 0.88, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.88, opacity: 0, y: 20 }}
        transition={{ type: 'spring', damping: 24 }}
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: 420, position: 'relative',
          background: 'linear-gradient(160deg,hsl(215 40% 9%),hsl(220 35% 6%))',
          border: `1.5px solid ${BLUE.border}`,
          borderRadius: 28, padding: '40px 28px',
          textAlign: 'center',
          boxShadow: `0 24px 80px ${BLUE.glow}, 0 8px 32px rgba(0,0,0,0.6)`,
        }}>
        <button onClick={onClose} style={{
          position: 'absolute', top: 16, right: 16,
          background: 'hsl(215 30% 14%)', border: `1px solid ${BLUE.darkBorder}`,
          borderRadius: 12, width: 36, height: 36, cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <X size={16} color="hsl(215 20% 55%)" />
        </button>

        <IconBox size={76}>
          <Smartphone size={34} color={BLUE.soft} strokeWidth={1.8} />
        </IconBox>

        <h2 style={{ fontSize: 22, fontWeight: 900, color: 'hsl(215 20% 97%)', marginBottom: 10 }}>
          Mobile App Only 📱
        </h2>
        <p style={{ fontSize: 14, color: 'hsl(215 14% 48%)', lineHeight: 1.65, marginBottom: 24 }}>
          The New User Campaign is exclusively on the{' '}
          <strong style={{ color: BLUE.soft }}>Arxon Mobile App</strong>.
          Download now to claim{' '}
          <strong style={{ color: BLUE.primary }}>1,000 ARX-P free daily for 7 days</strong>!
        </p>

        <div style={{
          background: 'hsl(215 35% 10%)', border: `1px solid ${BLUE.darkBorder}`,
          borderRadius: 18, padding: '14px 18px', marginBottom: 24, textAlign: 'left',
        }}>
          {[
            '1,000 free ARX-P every day',
            '7 days straight after install',
            'New installs only',
            'Points added instantly',
          ].map(item => (
            <p key={item} style={{ fontSize: 13, color: 'hsl(215 18% 62%)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ color: BLUE.primary, fontWeight: 700 }}>✦</span> {item}
            </p>
          ))}
        </div>

        <a href={APP_DOWNLOAD_URL} target="_blank" rel="noopener noreferrer" style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
          width: '100%', padding: '18px', borderRadius: 20,
          background: `linear-gradient(135deg, hsl(207 90% 58%), hsl(207 80% 42%))`,
          color: 'white', fontWeight: 900, fontSize: 16, textDecoration: 'none',
          boxShadow: `0 8px 32px ${BLUE.glow}, inset 0 1px 1px hsl(207 100% 80%/0.2)`,
        }}>
          <Download size={20} />
          Download Arxon App
        </a>
      </motion.div>
    </div>
  );
}

// ── Main Banner ────────────────────────────────────────────────────────────
export default function CampaignBanner() {
  const campaign = useNewUserCampaign();
  const [showModal, setShowModal] = useState(false);

  if (campaign.loading) return (
    <div style={{
      height: 76, borderRadius: 20, marginBottom: 14,
      background: 'hsl(215 30% 10%)',
      border: `1px solid ${BLUE.darkBorder}`,
      animation: 'pulse 1.5s ease-in-out infinite',
    }} />
  );

  const ended = campaign.campaignEnded;

  return (
    <>
      <motion.div
        whileTap={{ scale: 0.975 }}
        onClick={() => setShowModal(true)}
        style={{
          borderRadius: 20, padding: '15px 18px', marginBottom: 14, cursor: 'pointer',
          background: ended
            ? 'hsl(215 28% 8%)'
            : `linear-gradient(135deg, ${BLUE.bg}, hsl(215 35% 9%))`,
          border: `1.5px solid ${ended ? 'hsl(215 22% 14%)' : BLUE.border}`,
          display: 'flex', alignItems: 'center', gap: 14,
          boxShadow: ended ? 'none' : `0 4px 24px ${BLUE.glow}`,
          position: 'relative', overflow: 'hidden',
        }}>
        {/* Shimmer */}
        {!ended && (
          <>
            <div style={{
              position: 'absolute', top: 0, left: 0, right: 0, height: 1,
              background: `linear-gradient(90deg, transparent, ${BLUE.soft}, transparent)`,
            }} />
            <div style={{
              position: 'absolute', top: 0, left: '-100%', width: '55%', height: '100%',
              background: `linear-gradient(90deg, transparent, hsl(207 90% 60%/0.06), transparent)`,
              animation: 'shimmer 3.5s ease-in-out infinite',
            }} />
          </>
        )}
        <style>{`@keyframes shimmer{0%{left:-100%}100%{left:210%}}`}</style>

        {/* 3D Icon */}
        <div style={{
          width: 48, height: 48, borderRadius: 15, flexShrink: 0,
          background: ended
            ? 'hsl(215 28% 12%)'
            : `linear-gradient(145deg, hsl(207 80% 28%), hsl(215 55% 14%))`,
          border: `1.5px solid ${ended ? 'hsl(215 22% 18%)' : BLUE.border}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: ended ? 'none' : `0 4px 16px ${BLUE.glow}, inset 0 1px 1px hsl(207 100% 75%/0.15)`,
        }}>
          {ended
            ? <Clock size={22} color="hsl(215 18% 35%)" />
            : <Gift size={22} color={BLUE.primary} strokeWidth={2} />}
        </div>

        {/* Text */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{
            fontSize: 13, fontWeight: 800, marginBottom: 3,
            color: ended ? 'hsl(215 18% 38%)' : 'hsl(215 20% 94%)',
          }}>
            {ended ? '🏁 New User Campaign Ended' : '✦ New User Reward — Free 1,000 ARX-P/Day!'}
          </p>
          <p style={{
            fontSize: 11,
            color: ended ? 'hsl(215 14% 28%)' : 'hsl(215 14% 46%)',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {ended
              ? 'The 7-day new user campaign has ended for you.'
              : campaign.isNative
                ? `${campaign.canClaimToday ? "Tap to claim today's reward!" : campaign.daysClaimed > 0 ? 'Come back tomorrow for next reward.' : 'Tap to get started!'} · ${campaign.daysRemaining} days left`
                : 'Download the mobile app to claim free daily ARX-P for 7 days!'}
          </p>
          {!ended && campaign.isNative && campaign.daysClaimed > 0 && (
            <div style={{ marginTop: 8 }}>
              <DayDots claimed={campaign.daysClaimed} />
            </div>
          )}
        </div>

        {/* Badge */}
        {!ended && (
          <div style={{
            flexShrink: 0, padding: '5px 11px', borderRadius: 20,
            background: campaign.isNative && campaign.canClaimToday ? BLUE.bg : 'hsl(215 25% 11%)',
            border: `1px solid ${campaign.isNative && campaign.canClaimToday ? BLUE.border : 'hsl(215 22% 18%)'}`,
            boxShadow: campaign.isNative && campaign.canClaimToday ? `0 2px 8px ${BLUE.glow}` : 'none',
          }}>
            <p style={{
              fontSize: 10, fontWeight: 800,
              color: campaign.isNative && campaign.canClaimToday ? BLUE.primary : 'hsl(215 18% 38%)',
            }}>
              {campaign.isNative ? (campaign.canClaimToday ? 'CLAIM' : 'CLAIMED') : 'DOWNLOAD'}
            </p>
          </div>
        )}
      </motion.div>

      <AnimatePresence>
        {showModal && (
          campaign.isNative
            ? <ClaimModal onClose={() => setShowModal(false)} campaign={campaign} />
            : <DownloadModal onClose={() => setShowModal(false)} />
        )}
      </AnimatePresence>
    </>
  );
}
