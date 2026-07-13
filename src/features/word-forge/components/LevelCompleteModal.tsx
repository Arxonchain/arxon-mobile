import { motion, AnimatePresence } from 'framer-motion';
import { FORGE_UI } from '../data/uiAssets';
import { TechButton } from './ForgeTitle';

interface LevelCompleteModalProps {
  open: boolean;
  passed: boolean;
  level: number;
  wordsFormed: number;
  wordsRequired: number;
  balance: number;
  onContinue: () => void;
}

export function LevelCompleteModal({
  open, passed, level, wordsFormed, wordsRequired, balance, onContinue,
}: LevelCompleteModalProps) {
  const nextLevel = level + 1;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          style={{
            position: 'fixed', inset: 0, zIndex: 60,
            overflow: 'hidden',
          }}
        >
          {/* Full-page level coin background */}
          <div style={{
            position: 'absolute', inset: 0,
            backgroundImage: `url(${FORGE_UI.levelCoin})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center 30%',
          }} />
          <div style={{
            position: 'absolute', inset: 0,
            background: 'linear-gradient(180deg, rgba(0,4,12,0.72) 0%, rgba(0,8,18,0.35) 35%, rgba(0,6,14,0.88) 100%)',
            backdropFilter: 'blur(6px)',
            WebkitBackdropFilter: 'blur(6px)',
          }} />
          <div style={{
            position: 'absolute', top: 0, left: 0, right: 0, height: '42%',
            background: 'linear-gradient(180deg, rgba(0,0,0,0.55) 0%, transparent 100%)',
            backdropFilter: 'blur(10px)',
            WebkitBackdropFilter: 'blur(10px)',
            pointerEvents: 'none',
          }} />

          {/* Bottom sheet cards */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 280, damping: 32 }}
            style={{
              position: 'absolute', bottom: 0, left: 0, right: 0,
              padding: '0 16px max(24px, env(safe-area-inset-bottom))',
              maxWidth: 480, margin: '0 auto',
            }}
          >
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.12 }}
              style={{
                textAlign: 'center', marginBottom: 14,
              }}
            >
              <p style={{
                margin: 0, fontSize: 10, fontWeight: 800, letterSpacing: '0.4em',
                color: 'rgba(180,230,255,0.85)', textTransform: 'uppercase',
              }}>
                {passed ? 'Sector Cleared' : 'Forge Timeout'}
              </p>
              <div style={{
                marginTop: 6, fontSize: 56, fontWeight: 900, lineHeight: 1,
                color: '#fff',
                textShadow: '0 0 28px rgba(79,216,235,0.75), 0 3px 0 rgba(0,40,60,0.9)',
                fontFamily: "'Creato Display', system-ui, sans-serif",
              }}>
                {passed ? nextLevel : level}
              </div>
              <p style={{
                margin: '8px 0 0', fontSize: 11, fontWeight: 700,
                color: 'rgba(200,230,255,0.7)', letterSpacing: '0.1em',
              }}>
                {passed ? `LEVEL ${nextLevel} READY` : `${wordsRequired - wordsFormed} WORDS SHORT`}
              </p>
            </motion.div>

            <div style={{ display: 'grid', gap: 10 }}>
              <ResultCard
                delay={0.18}
                label="Words Forged"
                value={`${wordsFormed} / ${wordsRequired}`}
                accent="#4FD8EB"
              />
              <ResultCard
                delay={0.26}
                label="Session Earn"
                value={`+${balance} ARX-P`}
                accent="#ffd93d"
              />
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.34 }}
              >
                <TechButton onClick={onContinue}>
                  {passed ? `Enter Level ${nextLevel}` : 'Retry Sector'}
                </TechButton>
              </motion.div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function ResultCard({
  label, value, accent, delay,
}: { label: string; value: string; accent: string; delay: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      style={{
        padding: '14px 16px', borderRadius: 8,
        background: 'rgba(0,12,24,0.82)',
        border: `1px solid ${accent}44`,
        boxShadow: `0 4px 20px ${accent}22, inset 0 1px 0 rgba(255,255,255,0.05)`,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}
    >
      <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', color: 'rgba(255,255,255,0.55)' }}>
        {label.toUpperCase()}
      </span>
      <span style={{ fontSize: 18, fontWeight: 900, color: accent }}>{value}</span>
    </motion.div>
  );
}

interface TimeUpModalProps {
  open: boolean;
  passed: boolean;
  level: number;
  wordsFormed: number;
  wordsRequired: number;
  balance: number;
  onContinue: () => void;
}

export function RoundEndModal(props: TimeUpModalProps) {
  return <LevelCompleteModal {...props} />;
}
