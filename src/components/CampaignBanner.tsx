import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Gift, X, Smartphone, Download, CheckCircle, Clock } from 'lucide-react';
import { useNewUserCampaign } from '@/hooks/useNewUserCampaign';
import { useToast } from '@/hooks/use-toast';

const APP_DOWNLOAD_URL = 'https://t.co/N5qAMjQBUK';

const B = {
  primary:    'hsl(207 90% 54%)',
  soft:       'hsl(207 85% 70%)',
  glow:       'hsl(207 90% 54%/0.35)',
  bg:         'hsl(207 90% 54%/0.10)',
  border:     'hsl(207 90% 54%/0.28)',
  darkBorder: 'hsl(215 40% 20%)',
};

function DayDots({ claimed, total = 7 }: { claimed: number; total?: number }) {
  return (
    <div style={{ display: 'flex', gap: 7, alignItems: 'center' }}>
      {Array.from({ length: total }).map((_, i) => (
        <div key={i} style={{
          width: i < claimed ? 14 : 10,
          height: i < claimed ? 14 : 10,
          borderRadius: '50%',
          background: i < claimed
            ? `radial-gradient(circle at 35% 35%, hsl(207 100% 82%), ${B.primary})`
            : 'hsl(215 30% 16%)',
          border: `1.5px solid ${i < claimed ? B.soft : 'hsl(215 25% 26%)'}`,
          boxShadow: i < claimed
            ? `0 2px 8px ${B.glow}, inset 0 1px 2px hsl(207 100% 85%/0.35)`
            : 'inset 0 1px 3px rgba(0,0,0,0.4)',
          transition: 'all 0.35s cubic-bezier(0.34,1.56,0.64,1)',
          flexShrink: 0,
        }} />
      ))}
    </div>
  );
}

function IconBox({ size = 80, children }: { size?: number; children: React.ReactNode }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: size * 0.28,
      margin: '0 auto 16px',
      background: `linear-gradient(145deg, hsl(207 80% 26%), hsl(215 55% 14%))`,
      border: `1.5px solid ${B.border}`,
      boxShadow: `0 8px 32px ${B.glow}, 0 2px 8px rgba(0,0,0,0.5), inset 0 1px 1px hsl(207 100% 75%/0.2)`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      position: 'relative', overflow: 'hidden',
    }}>
      <div style={{
        position: 'absolute', top: 0, left: '15%', right: '15%', height: '40%',
        background: 'linear-gradient(to bottom, hsl(207 100% 90%/0.12), transparent)',
        borderRadius: '0 0 50% 50%', pointerEvents: 'none',
      }} />
      {children}
    </div>
  );
}

// ── Claim Modal ────────────────────────────────────────────────────────────
function ClaimModal({ onClose, campaign }: {
  onClose: () => void;
  campaign: ReturnType<typeof useNewUserCampaign>;
}) {
  const { toast } = useToast();
  const [claimed, setClaimed] = useState<number | null>(null);

  const handleClaim = async () => {
    const res = await campaign.claim();
    if (res.success) {
      setClaimed(res.pointsAwarded ?? 1000);
      toast({ title: `+${(res.pointsAwarded ?? 1000).toLocaleString()} ARX-P claimed! 🎉` });
    } else {
      toast({ title: 'Claim failed', description: res.error, variant: 'destructive' });
    }
  };

  const daysClaimed = campaign.daysClaimed;
  const daysRemaining = campaign.daysRemaining;
  const ended = campaign.campaignEnded;
  const canClaim = campaign.canClaimToday && claimed === null;
  const alreadyToday = !campaign.canClaimToday && !ended && daysClaimed > 0;

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: 'rgba(3,5,14,0.85)', backdropFilter: 'blur(14px)',
      display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
      fontFamily: "'Creato Display',-apple-system,system-ui,sans-serif",
    }} onClick={onClose}>
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        transition={{ type: 'spring', damping: 26, stiffness: 280 }}
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: 500, position: 'relative',
          background: 'linear-gradient(170deg,hsl(215 42% 9%),hsl(218 38% 6%))',
          border: `1.5px solid ${B.border}`,
          borderRadius: '32px 32px 0 0',
          padding: '30px 24px 56px',
          boxShadow: `0 -16px 64px ${B.glow}, 0 -2px 20px rgba(0,0,0,0.6)`,
        }}>
        <div style={{ width: 44, height: 5, borderRadius: 3, background: 'hsl(215 22% 22%)', margin: '0 auto 26px' }} />
        <button onClick={onClose} style={{
          position: 'absolute', top: 22, right: 22, width: 36, height: 36,
          background: 'hsl(215 28% 13%)', border: `1px solid ${B.darkBorder}`,
          borderRadius: 12, cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <X size={16} color="hsl(215 18% 52%)" />
        </button>

        {/* Header */}
        <div style={{ textAlign: 'center' }}>
          <IconBox size={78}>
            <Gift size={34} color={B.soft} strokeWidth={1.8} />
          </IconBox>
          <h2 style={{ fontSize: 24, fontWeight: 900, color: 'hsl(215 18% 96%)', margin: '0 0 8px' }}>
            Arxon Mobile User Reward
          </h2>
          <p style={{ fontSize: 13, color: 'hsl(215 16% 46%)', lineHeight: 1.55, marginBottom: 22 }}>
            Welcome to Arxon! Claim your free daily ARX-P for 7 days.
          </p>
        </div>

        {/* Points card */}
        <div style={{
          background: `linear-gradient(135deg, hsl(215 42% 11%), hsl(207 55% 13%))`,
          border: `1.5px solid ${B.border}`,
          borderRadius: 22, padding: '20px', marginBottom: 14, textAlign: 'center',
          boxShadow: `0 4px 24px ${B.glow}, inset 0 1px 0 hsl(207 100% 75%/0.07)`,
          position: 'relative', overflow: 'hidden',
        }}>
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1,
            background: `linear-gradient(90deg,transparent,${B.soft},transparent)` }} />
          <p style={{ fontSize: 11, color: B.soft, letterSpacing: '0.14em', fontWeight: 700, marginBottom: 8, textTransform: 'uppercase' }}>
            Daily Reward
          </p>
          <p style={{
            fontSize: 52, fontWeight: 900, lineHeight: 1,
            background: `linear-gradient(145deg, hsl(207 100% 84%), ${B.primary})`,
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            filter: `drop-shadow(0 0 18px ${B.glow})`,
            marginBottom: 6,
          }}>1,000</p>
          <p style={{ fontSize: 13, color: B.soft, fontWeight: 600 }}>ARX-P per day</p>
        </div>

        {/* Progress */}
        <div style={{
          background: 'hsl(215 35% 10%)', border: `1px solid ${B.darkBorder}`,
          borderRadius: 18, padding: '15px 17px', marginBottom: 18,
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 11 }}>
            <span style={{ fontSize: 12, color: 'hsl(215 14% 40%)' }}>Progress</span>
            <span style={{ fontSize: 12, fontWeight: 700, color: B.soft }}>
              {daysClaimed}/7 days claimed
            </span>
          </div>
          <DayDots claimed={daysClaimed} />
          {!ended && (
            <p style={{ fontSize: 11, color: 'hsl(215 14% 34%)', marginTop: 9 }}>
              {daysRemaining} day{daysRemaining !== 1 ? 's' : ''} remaining in campaign
            </p>
          )}
        </div>

        {/* Success */}
        {claimed !== null && (
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
            style={{
              background: B.bg, border: `1px solid ${B.border}`,
              borderRadius: 16, padding: '14px 18px', marginBottom: 16,
              display: 'flex', alignItems: 'center', gap: 12,
            }}>
            <CheckCircle size={22} color={B.primary} />
            <p style={{ fontSize: 15, fontWeight: 700, color: B.soft }}>
              +{claimed.toLocaleString()} ARX-P added to your balance!
            </p>
          </motion.div>
        )}

        {/* CTA */}
        {ended ? (
          <div style={{
            padding: '18px', borderRadius: 20, textAlign: 'center',
            background: 'hsl(215 25% 9%)', border: '1px solid hsl(215 22% 15%)',
          }}>
            <p style={{ fontSize: 15, fontWeight: 700, color: 'hsl(215 16% 40%)' }}>🏁 Campaign Ended</p>
            <p style={{ fontSize: 12, color: 'hsl(215 12% 28%)', marginTop: 5 }}>
              You've completed the 7-day new user reward campaign.
            </p>
          </div>
        ) : alreadyToday ? (
          <div style={{
            padding: '18px', borderRadius: 20,
            background: 'hsl(215 28% 10%)', border: `1px solid ${B.darkBorder}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
          }}>
            <Clock size={20} color={B.primary} />
            <div>
              <p style={{ fontSize: 14, fontWeight: 700, color: B.soft }}>
                Already claimed today!
              </p>
              <p style={{ fontSize: 11, color: 'hsl(215 14% 36%)', marginTop: 3 }}>
                Come back tomorrow for Day {daysClaimed + 1}
              </p>
            </div>
          </div>
        ) : (
          <motion.button
            whileTap={{ scale: canClaim ? 0.97 : 1 }}
            onClick={canClaim ? handleClaim : undefined}
            disabled={campaign.claiming || !canClaim}
            style={{
              width: '100%', padding: '19px', borderRadius: 20,
              border: 'none', outline: 'none', cursor: canClaim ? 'pointer' : 'default',
              fontFamily: "'Creato Display',-apple-system,sans-serif",
              fontSize: 17, fontWeight: 900,
              background: canClaim
                ? `linear-gradient(135deg, hsl(207 90% 58%), hsl(207 80% 40%))`
                : 'hsl(215 26% 12%)',
              color: canClaim ? 'white' : 'hsl(215 16% 38%)',
              boxShadow: canClaim
                ? `0 8px 32px ${B.glow}, inset 0 1px 1px hsl(207 100% 82%/0.2)`
                : 'none',
              transition: 'all 0.2s',
            }}>
            {campaign.claiming
              ? 'Claiming…'
              : claimed !== null
                ? '✓ Claimed! Come back tomorrow'
                : canClaim
                  ? '🎁 Claim 1,000 ARX-P Now'
                  : 'Loading…'}
          </motion.button>
        )}
      </motion.div>
    </div>
  );
}

// ── Download Modal (web) ───────────────────────────────────────────────────
function DownloadModal({ onClose }: { onClose: () => void }) {
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: 'rgba(3,5,14,0.85)', backdropFilter: 'blur(14px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
      fontFamily: 'system-ui,sans-serif',
    }} onClick={onClose}>
      <motion.div
        initial={{ scale: 0.88, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.88, opacity: 0 }}
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: 420, position: 'relative',
          background: 'linear-gradient(165deg,hsl(215 40% 9%),hsl(218 36% 6%))',
          border: `1.5px solid ${B.border}`, borderRadius: 28,
          padding: '40px 28px', textAlign: 'center',
          boxShadow: `0 24px 80px ${B.glow}, 0 8px 32px rgba(0,0,0,0.6)`,
        }}>
        <button onClick={onClose} style={{
          position: 'absolute', top: 16, right: 16, width: 36, height: 36,
          background: 'hsl(215 28% 13%)', border: `1px solid ${B.darkBorder}`,
          borderRadius: 12, cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <X size={16} color="hsl(215 18% 50%)" />
        </button>
        <IconBox size={74}>
          <Smartphone size={32} color={B.soft} strokeWidth={1.8} />
        </IconBox>
        <h2 style={{ fontSize: 22, fontWeight: 900, color: 'hsl(215 18% 96%)', marginBottom: 10 }}>
          Mobile App Only 📱
        </h2>
        <p style={{ fontSize: 14, color: 'hsl(215 14% 46%)', lineHeight: 1.65, marginBottom: 24 }}>
          The New User Campaign is exclusively on the{' '}
          <strong style={{ color: B.soft }}>Arxon Mobile App</strong>.
          Download now to claim{' '}
          <strong style={{ color: B.primary }}>1,000 ARX-P free daily for 7 days</strong>!
        </p>
        <div style={{
          background: 'hsl(215 32% 10%)', border: `1px solid ${B.darkBorder}`,
          borderRadius: 18, padding: '14px 18px', marginBottom: 24, textAlign: 'left',
        }}>
          {['1,000 free ARX-P every day','7 days after install','New installs only','Points added instantly'].map(item => (
            <p key={item} style={{ fontSize: 13, color: 'hsl(215 16% 60%)', marginBottom: 7, display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ color: B.primary, fontWeight: 800 }}>✦</span> {item}
            </p>
          ))}
        </div>
        <a href={APP_DOWNLOAD_URL} target="_blank" rel="noopener noreferrer" style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
          width: '100%', padding: '18px', borderRadius: 20,
          background: `linear-gradient(135deg, hsl(207 90% 58%), hsl(207 80% 40%))`,
          color: 'white', fontWeight: 900, fontSize: 16, textDecoration: 'none',
          boxShadow: `0 8px 32px ${B.glow}`,
        }}>
          <Download size={20} /> Download Arxon App
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
      background: 'hsl(215 28% 9%)', border: `1px solid ${B.darkBorder}`,
    }} />
  );

  const ended  = campaign.campaignEnded;
  const native = campaign.isNative;

  return (
    <>
      <motion.div whileTap={{ scale: 0.975 }} onClick={() => setShowModal(true)}
        style={{
          borderRadius: 20, padding: '15px 18px', marginBottom: 14, cursor: 'pointer',
          background: ended ? 'hsl(215 25% 8%)' : `linear-gradient(135deg,${B.bg},hsl(215 34% 9%))`,
          border: `1.5px solid ${ended ? 'hsl(215 20% 13%)' : B.border}`,
          display: 'flex', alignItems: 'center', gap: 14,
          boxShadow: ended ? 'none' : `0 4px 24px ${B.glow}`,
          position: 'relative', overflow: 'hidden',
        }}>
        {!ended && (
          <>
            <div style={{ position:'absolute',top:0,left:0,right:0,height:1,
              background:`linear-gradient(90deg,transparent,${B.soft},transparent)` }}/>
            <div style={{ position:'absolute',top:0,left:'-100%',width:'55%',height:'100%',
              background:`linear-gradient(90deg,transparent,hsl(207 90% 60%/0.06),transparent)`,
              animation:'shimmer 3.5s ease-in-out infinite' }}/>
          </>
        )}
        <style>{`@keyframes shimmer{0%{left:-100%}100%{left:210%}}`}</style>

        <div style={{
          width: 48, height: 48, borderRadius: 15, flexShrink: 0,
          background: ended ? 'hsl(215 26% 11%)' : `linear-gradient(145deg,hsl(207 80%26%),hsl(215 52%13%))`,
          border: `1.5px solid ${ended ? 'hsl(215 20% 17%)' : B.border}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: ended ? 'none' : `0 4px 16px ${B.glow}, inset 0 1px 1px hsl(207 100%75%/0.12)`,
        }}>
          {ended
            ? <Clock size={22} color="hsl(215 16% 34%)" />
            : <Gift size={22} color={B.primary} strokeWidth={2} />}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: 13, fontWeight: 800, marginBottom: 3,
            color: ended ? 'hsl(215 16% 36%)' : 'hsl(215 18% 94%)' }}>
            {ended ? '🏁 New User Campaign Ended' : '✦ New User Reward — Free 1,000 ARX-P/Day!'}
          </p>
          <p style={{ fontSize: 11, color: ended ? 'hsl(215 12% 27%)' : 'hsl(215 13% 44%)',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {ended
              ? 'The 7-day new user campaign has ended for you.'
              : native
                ? campaign.canClaimToday
                  ? "Tap to claim today's 1,000 ARX-P reward!"
                  : campaign.daysClaimed > 0
                    ? `Day ${campaign.daysClaimed}/7 claimed · Come back tomorrow!`
                    : 'Tap to claim your first daily reward!'
                : 'Download the mobile app to claim free daily ARX-P for 7 days!'}
          </p>
          {!ended && native && campaign.daysClaimed > 0 && (
            <div style={{ marginTop: 8 }}>
              <DayDots claimed={campaign.daysClaimed} />
            </div>
          )}
        </div>

        {!ended && (
          <div style={{
            flexShrink: 0, padding: '5px 11px', borderRadius: 20,
            background: native && campaign.canClaimToday ? B.bg : 'hsl(215 24% 11%)',
            border: `1px solid ${native && campaign.canClaimToday ? B.border : 'hsl(215 20% 17%)'}`,
            boxShadow: native && campaign.canClaimToday ? `0 2px 8px ${B.glow}` : 'none',
          }}>
            <p style={{ fontSize: 10, fontWeight: 800,
              color: native && campaign.canClaimToday ? B.primary : 'hsl(215 16% 36%)' }}>
              {native ? (campaign.canClaimToday ? 'CLAIM' : 'CLAIMED') : 'DOWNLOAD'}
            </p>
          </div>
        )}
      </motion.div>

      <AnimatePresence>
        {showModal && (
          native
            ? <ClaimModal key="claim" onClose={() => setShowModal(false)} campaign={campaign} />
            : <DownloadModal key="dl" onClose={() => setShowModal(false)} />
        )}
      </AnimatePresence>
    </>
  );
}
