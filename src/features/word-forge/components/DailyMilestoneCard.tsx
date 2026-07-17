import { motion } from 'framer-motion';
import { Check, Target } from 'lucide-react';
import { DAILY_BONUS_PAYOUT } from '../engine/dailyChallenge';
import { getDailyMission } from '../engine/dailyMission';
import { GlossyButton } from './GlossyKit';

interface DailyMilestoneCardProps {
  completed: boolean;
  streak: number;
  onStart: () => void;
  disabled?: boolean;
}

/** Hub card — today's unique milestone goal, separate from campaign play. */
export function DailyMilestoneCard({ completed, streak, onStart, disabled }: DailyMilestoneCardProps) {
  const mission = getDailyMission();
  const dateLabel = new Date().toISOString().slice(5, 10);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.22 }}
      style={{
        width: '100%',
        marginTop: 16,
        padding: '14px 16px 16px',
        borderRadius: 18,
        background: completed
          ? 'linear-gradient(180deg, rgba(20,48,32,0.88) 0%, rgba(8,28,18,0.94) 100%)'
          : 'linear-gradient(180deg, rgba(48,38,12,0.88) 0%, rgba(28,22,8,0.94) 100%)',
        border: completed
          ? '1.5px solid rgba(132,217,47,0.35)'
          : '1.5px solid rgba(255,217,61,0.4)',
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.08), 0 8px 24px rgba(0,0,0,0.35)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
        <div style={{
          width: 44, height: 44, borderRadius: 14, flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 22,
          background: 'rgba(0,0,0,0.25)',
          border: '1px solid rgba(255,255,255,0.12)',
        }}>
          {completed ? <Check size={22} strokeWidth={3} color="#84d92f" /> : mission.emoji}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4,
            fontSize: 8.5, fontWeight: 900, letterSpacing: '0.2em',
            color: completed ? 'rgba(132,217,47,0.75)' : 'rgba(255,217,61,0.75)',
            textTransform: 'uppercase',
          }}>
            <Target size={10} strokeWidth={3} />
            Daily Milestone · {dateLabel}
          </div>
          <div style={{ fontSize: 16, fontWeight: 900, color: '#fff', lineHeight: 1.2 }}>
            {mission.title}
          </div>
          <p style={{
            margin: '5px 0 0', fontSize: 11, fontWeight: 600, lineHeight: 1.45,
            color: 'rgba(220,240,255,0.62)',
          }}>
            {completed ? 'Milestone cleared for today — come back tomorrow.' : mission.description}
          </p>
          {streak > 0 && (
            <p style={{ margin: '6px 0 0', fontSize: 10, fontWeight: 800, color: '#ff9d4a' }}>
              {streak}-day streak active
            </p>
          )}
        </div>
      </div>

      {!completed && (
        <div style={{ marginTop: 14 }}>
          <GlossyButton
            color="gold"
            size="lg"
            disabled={disabled}
            onClick={onStart}
          >
            Start Milestone · +{DAILY_BONUS_PAYOUT} ARX-P
          </GlossyButton>
        </div>
      )}
    </motion.div>
  );
}
