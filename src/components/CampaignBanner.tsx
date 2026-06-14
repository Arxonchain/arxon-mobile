/**
 * CampaignBanner — shows on BOTH web and mobile dashboards.
 *
 * Mobile: opens claim modal (only new installs can claim)
 * Web:    opens "Download App" modal with link to Play Store
 */
import { useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { motion, AnimatePresence } from 'framer-motion';
import { Gift, X, Smartphone, Download, CheckCircle, Clock, Zap, Star } from 'lucide-react';
import { useNewUserCampaign } from '@/hooks/useNewUserCampaign';
import { useToast } from '@/hooks/use-toast';

const IS_NATIVE = Capacitor.isNativePlatform();
const APP_DOWNLOAD_URL = 'https://t.co/N5qAMjQBUK';

// ── Day progress dots ──────────────────────────────────────────────────────
function DayDots({ claimed, total = 7 }: { claimed: number; total?: number }) {
  return (
    <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
      {Array.from({ length: total }).map((_, i) => (
        <div key={i} style={{
          width: i < claimed ? 10 : 8,
          height: i < claimed ? 10 : 8,
          borderRadius: '50%',
          background: i < claimed
            ? 'linear-gradient(135deg,hsl(155 55% 50%),hsl(155 45% 38%))'
            : 'hsl(215 22% 18%)',
          border: i < claimed ? 'none' : '1px solid hsl(215 22% 25%)',
          boxShadow: i < claimed ? '0 0 6px hsl(155 55% 50%/0.5)' : 'none',
          transition: 'all 0.3s',
          flexShrink: 0,
        }} />
      ))}
    </div>
  );
}

// ── Mobile claim modal ─────────────────────────────────────────────────────
function ClaimModal({ onClose, campaign }: { onClose: () => void; campaign: ReturnType<typeof useNewUserCampaign> }) {
  const { toast } = useToast();
  const [result, setResult] = useState<{ success: boolean; points?: number } | null>(null);

  const handleClaim = async () => {
    const res = await campaign.claim();
    if (res.success) {
      setResult({ success: true, points: res.pointsAwarded });
      toast({ title: `+${res.pointsAwarded?.toLocaleString()} ARX-P claimed! 🎉`, description: `Day ${campaign.daysClaimed + 1} of 7 complete.` });
    } else {
      toast({ title: 'Claim failed', description: res.error, variant: 'destructive' });
    }
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)',
      display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
      fontFamily: "'Creato Display',-apple-system,system-ui,sans-serif",
    }} onClick={onClose}>
      <motion.div
        initial={{ y: 100, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }} transition={{ type: 'spring', damping: 24 }}
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: 480,
          background: 'linear-gradient(160deg,hsl(225 30% 8%),hsl(225 26% 5%))',
          border: '1px solid hsl(155 45% 43%/0.3)',
          borderRadius: '28px 28px 0 0', padding: '28px 24px 48px',
        }}>
        {/* Handle */}
        <div style={{ width: 40, height: 4, borderRadius: 2, background: 'hsl(215 20% 22%)', margin: '0 auto 24px' }} />

        <button onClick={onClose} style={{
          position: 'absolute', top: 20, right: 20,
          background: 'hsl(215 22% 14%)', border: '1px solid hsl(215 20% 22%)',
          borderRadius: 10, width: 32, height: 32, cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}><X size={16} color="hsl(215 18% 50%)" /></button>

        {/* Icon */}
        <div style={{ textAlign: 'center', marginBottom: 20 }}>
          <div style={{
            width: 72, height: 72, borderRadius: 24, margin: '0 auto 12px',
            background: 'linear-gradient(135deg,hsl(155 55% 42%/0.2),hsl(155 45% 30%/0.1))',
            border: '1.5px solid hsl(155 45% 43%/0.35)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Gift size={32} color="hsl(155 55% 55%)" />
          </div>
          <h2 style={{ fontSize: 22, fontWeight: 800, color: 'hsl(215 20% 95%)', margin: 0 }}>
            New User Reward
          </h2>
          <p style={{ fontSize: 13, color: 'hsl(215 14% 45%)', marginTop: 6 }}>
            Welcome to Arxon! Claim your free daily ARX-P for 7 days.
          </p>
        </div>

        {/* Points display */}
        <div style={{
          background: 'hsl(215 26% 10%)', border: '1px solid hsl(215 22% 18%)',
          borderRadius: 20, padding: '18px 20px', marginBottom: 16, textAlign: 'center',
        }}>
          <p style={{ fontSize: 13, color: 'hsl(215 14% 40%)', marginBottom: 4 }}>Daily Reward</p>
          <p style={{ fontSize: 42, fontWeight: 900, color: 'hsl(155 55% 55%)', lineHeight: 1 }}>
            1,000
          </p>
          <p style={{ fontSize: 13, color: 'hsl(155 45% 45%)', marginTop: 4 }}>ARX-P per day</p>
        </div>

        {/* Progress */}
        <div style={{
          background: 'hsl(215 26% 10%)', border: '1px solid hsl(215 22% 18%)',
          borderRadius: 16, padding: '14px 16px', marginBottom: 20,
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
            <span style={{ fontSize: 12, color: 'hsl(215 14% 42%)' }}>Progress</span>
            <span style={{ fontSize: 12, fontWeight: 700, color: 'hsl(155 45% 55%)' }}>
              {campaign.daysClaimed}/7 days claimed
            </span>
          </div>
          <DayDots claimed={campaign.daysClaimed} />
          {!campaign.campaignEnded && (
            <p style={{ fontSize: 11, color: 'hsl(215 14% 36%)', marginTop: 8 }}>
              {campaign.daysRemaining} day{campaign.daysRemaining !== 1 ? 's' : ''} remaining
            </p>
          )}
        </div>

        {/* Claim result */}
        {result?.success && (
          <div style={{
            background: 'hsl(155 45% 43%/0.1)', border: '1px solid hsl(155 45% 43%/0.3)',
            borderRadius: 14, padding: '12px 16px', marginBottom: 16,
            display: 'flex', alignItems: 'center', gap: 10,
          }}>
            <CheckCircle size={20} color="hsl(155 55% 55%)" />
            <p style={{ fontSize: 14, fontWeight: 700, color: 'hsl(155 55% 60%)' }}>
              +{result.points?.toLocaleString()} ARX-P added to your balance!
            </p>
          </div>
        )}

        {/* CTA */}
        {campaign.campaignEnded ? (
          <div style={{
            padding: '16px', borderRadius: 18, textAlign: 'center',
            background: 'hsl(215 22% 10%)', border: '1px solid hsl(215 22% 16%)',
          }}>
            <p style={{ fontSize: 15, fontWeight: 700, color: 'hsl(215 18% 45%)' }}>
              🏁 Campaign Ended
            </p>
            <p style={{ fontSize: 12, color: 'hsl(215 14% 32%)', marginTop: 4 }}>
              You've completed the 7-day new user reward campaign.
            </p>
          </div>
        ) : !campaign.canClaimToday ? (
          <div style={{
            padding: '16px', borderRadius: 18, textAlign: 'center',
            background: 'hsl(215 22% 10%)', border: '1px solid hsl(215 22% 16%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          }}>
            <Clock size={18} color="hsl(215 18% 45%)" />
            <p style={{ fontSize: 14, fontWeight: 700, color: 'hsl(215 18% 45%)' }}>
              Already claimed today — come back tomorrow!
            </p>
          </div>
        ) : !campaign.isNewInstall ? (
          <div style={{
            padding: '16px', borderRadius: 18, textAlign: 'center',
            background: 'hsl(215 22% 10%)', border: '1px solid hsl(215 22% 16%)',
          }}>
            <p style={{ fontSize: 13, color: 'hsl(215 14% 38%)' }}>
              This reward is only available for new installs of the Arxon app.
            </p>
          </div>
        ) : (
          <button onClick={handleClaim} disabled={campaign.claiming}
            style={{
              width: '100%', padding: '18px', borderRadius: 18, cursor: 'pointer',
              border: 'none', fontFamily: "'Creato Display',-apple-system,sans-serif",
              fontSize: 16, fontWeight: 800,
              background: campaign.claiming
                ? 'hsl(215 25% 14%)'
                : 'linear-gradient(135deg,hsl(155 55% 42%),hsl(155 45% 32%))',
              color: campaign.claiming ? 'hsl(215 18% 40%)' : 'white',
              boxShadow: campaign.claiming ? 'none' : '0 6px 24px hsl(155 55% 42%/0.35)',
              transition: 'all 0.2s',
            }}>
            {campaign.claiming ? 'Claiming…' : '🎁 Claim 1,000 ARX-P'}
          </button>
        )}
      </motion.div>
    </div>
  );
}

// ── Web download modal ─────────────────────────────────────────────────────
function DownloadModal({ onClose }: { onClose: () => void }) {
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
      fontFamily: 'system-ui,sans-serif',
    }} onClick={onClose}>
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: 420,
          background: 'linear-gradient(160deg,hsl(225 30% 8%),hsl(225 26% 5%))',
          border: '1px solid hsl(215 30% 22%)',
          borderRadius: 28, padding: '36px 28px',
          textAlign: 'center', position: 'relative',
        }}>
        <button onClick={onClose} style={{
          position: 'absolute', top: 16, right: 16,
          background: 'hsl(215 22% 14%)', border: '1px solid hsl(215 20% 22%)',
          borderRadius: 10, width: 32, height: 32, cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}><X size={16} color="hsl(215 18% 50%)" /></button>

        <div style={{
          width: 72, height: 72, borderRadius: 24, margin: '0 auto 20px',
          background: 'linear-gradient(135deg,hsl(215 55% 55%/0.2),hsl(215 45% 35%/0.1))',
          border: '1.5px solid hsl(215 45% 55%/0.3)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Smartphone size={32} color="hsl(215 55% 65%)" />
        </div>

        <h2 style={{ fontSize: 22, fontWeight: 800, color: 'hsl(215 20% 95%)', marginBottom: 10 }}>
          Mobile App Only 📱
        </h2>
        <p style={{ fontSize: 14, color: 'hsl(215 14% 45%)', lineHeight: 1.6, marginBottom: 24 }}>
          The New User Campaign is exclusively available on the <strong style={{ color: 'hsl(215 35% 70%)' }}>Arxon Mobile App</strong>.
          Download the app on your Android device to claim <strong style={{ color: 'hsl(155 55% 55%)' }}>1,000 ARX-P free daily for 7 days</strong>!
        </p>

        <div style={{
          background: 'hsl(215 26% 10%)', border: '1px solid hsl(215 22% 18%)',
          borderRadius: 18, padding: '14px 18px', marginBottom: 24,
        }}>
          {[
            '✅ 1,000 free ARX-P every day',
            '✅ 7 days straight after install',
            '✅ New installs only',
            '✅ Points added instantly',
          ].map(item => (
            <p key={item} style={{ fontSize: 13, color: 'hsl(215 18% 65%)', marginBottom: 6, textAlign: 'left' }}>{item}</p>
          ))}
        </div>

        <a href={APP_DOWNLOAD_URL} target="_blank" rel="noopener noreferrer"
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
            width: '100%', padding: '16px', borderRadius: 18,
            background: 'linear-gradient(135deg,hsl(215 55% 50%),hsl(215 45% 38%))',
            color: 'white', fontWeight: 800, fontSize: 16, textDecoration: 'none',
            boxShadow: '0 6px 24px hsl(215 55% 50%/0.3)',
          }}>
          <Download size={20} />
          Download Arxon App
        </a>
      </motion.div>
    </div>
  );
}

// ── The Banner itself ─────────────────────────────────────────────────────
export default function CampaignBanner() {
  const campaign = useNewUserCampaign();
  const [showModal, setShowModal] = useState(false);

  // Always show the banner — even for non-eligible users (they see "Campaign Ended")
  // Loading state: show skeleton
  if (campaign.loading) return (
    <div style={{
      height: 72, borderRadius: 18, margin: '0 0 14px',
      background: 'hsl(215 22% 10%)', border: '1px solid hsl(215 22% 16%)',
      animation: 'pulse 1.5s ease-in-out infinite',
    }} />
  );

  const ended = campaign.campaignEnded;
  const eligible = campaign.isEligible && campaign.isNewInstall;

  return (
    <>
      <motion.div
        whileTap={{ scale: 0.98 }}
        onClick={() => setShowModal(true)}
        style={{
          borderRadius: 18, padding: '14px 18px', marginBottom: 14, cursor: 'pointer',
          background: ended
            ? 'hsl(215 22% 8%)'
            : 'linear-gradient(135deg,hsl(155 45% 43%/0.12),hsl(215 35% 55%/0.08))',
          border: `1.5px solid ${ended ? 'hsl(215 22% 15%)' : 'hsl(155 45% 43%/0.3)'}`,
          display: 'flex', alignItems: 'center', gap: 14,
          boxShadow: ended ? 'none' : '0 4px 20px hsl(155 45% 43%/0.1)',
          position: 'relative', overflow: 'hidden',
        }}>
        {/* Shimmer for active */}
        {!ended && (
          <div style={{
            position: 'absolute', top: 0, left: '-100%', width: '60%', height: '100%',
            background: 'linear-gradient(90deg,transparent,hsl(155 55% 55%/0.07),transparent)',
            animation: 'shimmer 3s ease-in-out infinite',
          }} />
        )}
        <style>{`@keyframes shimmer{0%{left:-100%}100%{left:200%}}`}</style>

        {/* Icon */}
        <div style={{
          width: 44, height: 44, borderRadius: 14, flexShrink: 0,
          background: ended ? 'hsl(215 22% 12%)' : 'hsl(155 45% 43%/0.15)',
          border: `1px solid ${ended ? 'hsl(215 22% 18%)' : 'hsl(155 45% 43%/0.25)'}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {ended ? <Clock size={22} color="hsl(215 18% 38%)" /> : <Gift size={22} color="hsl(155 55% 55%)" />}
        </div>

        {/* Text */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: 13, fontWeight: 800, color: ended ? 'hsl(215 18% 42%)' : 'hsl(215 20% 92%)', marginBottom: 2 }}>
            {ended ? '🏁 New User Campaign Ended' : '🎁 New User Reward — Free 1,000 ARX-P/Day!'}
          </p>
          <p style={{ fontSize: 11, color: ended ? 'hsl(215 14% 30%)' : 'hsl(215 14% 45%)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {ended
              ? 'The 7-day new user campaign has ended for you.'
              : IS_NATIVE
                ? `${campaign.canClaimToday ? 'Tap to claim today\'s reward!' : 'Already claimed today — come back tomorrow.'} · ${campaign.daysRemaining} days left`
                : 'Download the mobile app to claim free daily ARX-P for 7 days!'}
          </p>
          {!ended && IS_NATIVE && (
            <div style={{ marginTop: 6 }}>
              <DayDots claimed={campaign.daysClaimed} />
            </div>
          )}
        </div>

        {/* Badge */}
        {!ended && (
          <div style={{
            flexShrink: 0, padding: '4px 10px', borderRadius: 20,
            background: IS_NATIVE && campaign.canClaimToday
              ? 'hsl(155 55% 43%/0.2)' : 'hsl(215 22% 12%)',
            border: `1px solid ${IS_NATIVE && campaign.canClaimToday ? 'hsl(155 55% 43%/0.4)' : 'hsl(215 22% 20%)'}`,
          }}>
            <p style={{
              fontSize: 10, fontWeight: 800,
              color: IS_NATIVE && campaign.canClaimToday ? 'hsl(155 55% 60%)' : 'hsl(215 18% 42%)',
            }}>
              {IS_NATIVE ? (campaign.canClaimToday ? 'CLAIM' : 'CLAIMED') : 'DOWNLOAD'}
            </p>
          </div>
        )}
      </motion.div>

      {/* Modal */}
      <AnimatePresence>
        {showModal && (
          IS_NATIVE
            ? <ClaimModal onClose={() => setShowModal(false)} campaign={campaign} />
            : <DownloadModal onClose={() => setShowModal(false)} />
        )}
      </AnimatePresence>
    </>
  );
}
