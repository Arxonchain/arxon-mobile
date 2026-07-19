import { AnimatePresence, motion } from 'framer-motion';
import { Share2, X } from 'lucide-react';
import { useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { usePoints } from '@/hooks/usePoints';
import { useReferrals } from '@/hooks/useReferrals';
import { dailySeed } from '../engine/dailyChallenge';
import {
  buildHintClaimsPatch,
  evaluateHintTasks,
  type HintTaskStatus,
} from '../engine/hintTasks';
import { loadForgeProgress } from '../hooks/useForgeProgress';
import { GamePanel, GlossyButton } from './GlossyKit';

interface HintRefillModalProps {
  open: boolean;
  onClose: () => void;
  onClaim: (reward: number, claimKey: string) => void;
  preview?: boolean;
}

export function HintRefillModal({ open, onClose, onClaim, preview = false }: HintRefillModalProps) {
  const { user } = useAuth();
  const { points } = usePoints();
  const { stats, getReferralLink, refreshReferrals } = useReferrals(user);

  const progress = loadForgeProgress(preview);
  const checkedInToday = points?.last_checkin_date === dailySeed();

  const tasks = useMemo(
    () => evaluateHintTasks(progress.hintTaskClaims, {
      referralCount: stats.totalReferrals,
      checkedInToday,
      dailyForgeDone: false,
      dailyCompletedDate: progress.dailyCompletedDate,
    }),
    [progress.hintTaskClaims, progress.dailyCompletedDate, stats.totalReferrals, checkedInToday],
  );

  const handleShare = async (status: HintTaskStatus) => {
    const link = getReferralLink();
    if (!link) return;
    const text = `Join me on Arxon and mine ARX-P — ${link}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: 'Arxon', text, url: link });
      } else {
        await navigator.clipboard.writeText(text);
      }
      onClaim(status.task.reward, status.claimKey);
    } catch { /* user cancelled share */ }
  };

  const handleClaim = (status: HintTaskStatus) => {
    if (!status.eligible || status.claimed) return;
    if (status.task.id === 'share-link') {
      void handleShare(status);
      return;
    }
    onClaim(status.task.reward, status.claimKey);
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          style={{
            position: 'fixed', inset: 0, zIndex: 55,
            background: 'rgba(2,5,12,0.88)', backdropFilter: 'blur(6px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
          }}
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 24 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 16 }}
            onClick={(e) => e.stopPropagation()}
            style={{ width: 'min(100%, 360px)' }}
          >
            <GamePanel style={{ padding: '18px 16px 16px' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
                <div>
                  <div style={{ fontSize: 9, fontWeight: 900, letterSpacing: '0.2em', color: 'rgba(255,217,61,0.65)' }}>
                    HINTS EMPTY
                  </div>
                  <h2 style={{ margin: '4px 0 0', fontSize: 20, fontWeight: 900, color: '#fff' }}>
                    Earn more hints
                  </h2>
                  <p style={{ margin: '6px 0 0', fontSize: 11, lineHeight: 1.45, color: 'rgba(200,230,255,0.6)' }}>
                    Complete a quick task that helps the project — each one refills hints.
                  </p>
                </div>
                <button
                  type="button"
                  aria-label="Close"
                  onClick={onClose}
                  style={{
                    border: 'none', background: 'rgba(255,255,255,0.08)', borderRadius: 10,
                    width: 34, height: 34, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: '#fff', cursor: 'pointer', flexShrink: 0,
                  }}
                >
                  <X size={18} />
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 14 }}>
                {tasks.map((status) => (
                  <HintTaskRow
                    key={status.claimKey}
                    status={status}
                    onClaim={() => handleClaim(status)}
                    onRefresh={status.task.id === 'refer-one' ? () => void refreshReferrals() : undefined}
                  />
                ))}
              </div>

              <GlossyButton color="slate" size="md" onClick={onClose} style={{ marginTop: 14, width: '100%' }}>
                Keep playing
              </GlossyButton>
            </GamePanel>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function HintTaskRow({
  status, onClaim, onRefresh,
}: {
  status: HintTaskStatus;
  onClaim: () => void;
  onRefresh?: () => void;
}) {
  const { task, eligible, claimed } = status;
  const done = claimed;
  const ready = eligible && !claimed;

  return (
    <div style={{
      padding: '10px 12px', borderRadius: 12,
      background: done ? 'rgba(132,217,47,0.08)' : 'rgba(4,14,28,0.75)',
      border: `1px solid ${done ? 'rgba(132,217,47,0.35)' : ready ? 'rgba(255,217,61,0.45)' : 'rgba(79,216,235,0.2)'}`,
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
        <span style={{ fontSize: 22, lineHeight: 1 }}>{task.emoji}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 12, fontWeight: 900, color: '#fff' }}>{task.title}</span>
            <span style={{
              fontSize: 9, fontWeight: 900, letterSpacing: '0.08em',
              color: '#ffd93d', padding: '2px 6px', borderRadius: 6,
              background: 'rgba(255,217,61,0.12)', border: '1px solid rgba(255,217,61,0.3)',
            }}>
              +{task.reward} hint{task.reward > 1 ? 's' : ''}
            </span>
          </div>
          <p style={{ margin: '4px 0 0', fontSize: 10, lineHeight: 1.4, color: 'rgba(200,230,255,0.55)' }}>
            {task.description}
          </p>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 8, marginTop: 8, justifyContent: 'flex-end' }}>
        {onRefresh && !done && (
          <GlossyButton color="slate" size="md" fullWidth={false} onClick={onRefresh}>
            Refresh
          </GlossyButton>
        )}
        {done ? (
          <span style={{ fontSize: 10, fontWeight: 800, color: '#84d92f', alignSelf: 'center' }}>Claimed ✓</span>
        ) : (
          <GlossyButton
            color={ready ? 'gold' : 'slate'}
            size="md"
            fullWidth={false}
            disabled={!ready}
            onClick={onClaim}
          >
            {task.id === 'share-link' ? (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                <Share2 size={13} /> Share & claim
              </span>
            ) : ready ? 'Claim hints' : 'Not done yet'}
          </GlossyButton>
        )}
      </div>
    </div>
  );
}

export { buildHintClaimsPatch };
