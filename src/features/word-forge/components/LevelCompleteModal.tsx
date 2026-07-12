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
            position: 'fixed', inset: 0, zIndex: 50,
            background: 'rgba(0,0,0,0.82)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: 20,
          }}
        >
          <motion.div
            initial={{ scale: 0.82, opacity: 0, rotateY: -12 }}
            animate={{ scale: 1, opacity: 1, rotateY: 0 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 260, damping: 22 }}
            style={{ position: 'relative', width: 'min(100%, 340px)', textAlign: 'center' }}
          >
            <motion.img
              src={FORGE_UI.levelCoin}
              alt=""
              animate={{ rotate: [0, 2, -2, 0], y: [0, -6, 0] }}
              transition={{ duration: 3.2, repeat: Infinity, ease: 'easeInOut' }}
              style={{
                width: '100%', height: 'auto', display: 'block',
                filter: 'drop-shadow(0 16px 40px rgba(79,216,235,0.35))',
              }}
            />

            <div style={{
              position: 'absolute', inset: 0,
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              padding: '8% 14%',
            }}>
              <motion.p
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
                style={{
                  margin: 0, fontSize: 10, fontWeight: 800, letterSpacing: '0.35em',
                  color: 'rgba(180,230,255,0.9)', textTransform: 'uppercase',
                }}
              >
                {passed ? 'Sector Cleared' : 'Time Expired'}
              </motion.p>

              <motion.div
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: 'spring', delay: 0.25, stiffness: 320, damping: 18 }}
                style={{
                  marginTop: 8, fontSize: 52, fontWeight: 900, lineHeight: 1,
                  color: '#fff',
                  textShadow: '0 0 24px rgba(79,216,235,0.8), 0 2px 0 rgba(0,60,80,0.9)',
                  fontFamily: "'Creato Display', system-ui, sans-serif",
                }}
              >
                {passed ? nextLevel : level}
              </motion.div>

              <p style={{
                margin: '6px 0 0', fontSize: 11, fontWeight: 700,
                color: 'rgba(200,230,255,0.75)', letterSpacing: '0.08em',
              }}>
                {passed ? `LEVEL ${nextLevel} UNLOCKED` : `NEED ${wordsRequired} WORDS`}
              </p>

              <div style={{
                marginTop: 16, padding: '10px 16px', borderRadius: 4,
                background: 'rgba(0,20,40,0.55)', border: '1px solid rgba(79,216,235,0.25)',
                width: '100%',
              }}>
                <p style={{ margin: 0, fontSize: 12, color: 'rgba(255,255,255,0.85)' }}>
                  <strong>{wordsFormed}</strong> words forged
                </p>
                <p style={{ margin: '6px 0 0', fontSize: 14, fontWeight: 900, color: '#ffd93d' }}>
                  +{balance} ARX-P
                </p>
              </div>

              <div style={{ marginTop: 18, width: '100%' }}>
                <TechButton onClick={onContinue}>
                  {passed ? `Enter Level ${nextLevel}` : 'Retry Sector'}
                </TechButton>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
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
