import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, RotateCcw } from 'lucide-react';
import { FORGE_UI } from '../data/uiAssets';
import { GamePanel, GlossyButton, RibbonBanner } from './GlossyKit';

interface LevelCompleteModalProps {
  open: boolean;
  passed: boolean;
  level: number;
  wordsFormed: number;
  wordsRequired: number;
  balance: number;
  /** 0-3, only meaningful when passed */
  stars: number;
  newBest?: boolean;
  isDaily?: boolean;
  completionistBonus?: number;
  dailyBonus?: number;
  onReplay: () => void;
  onContinue: () => void;
}

/** Image-4 style result card: ribbon, star rating, score, replay/next */
export function LevelCompleteModal({
  open, passed, level, wordsFormed, wordsRequired, balance, stars, newBest,
  isDaily, completionistBonus = 0, dailyBonus = 0, onReplay, onContinue,
}: LevelCompleteModalProps) {
  const totalEarn = balance + completionistBonus + (passed && isDaily ? dailyBonus : 0);
  const heading = isDaily ? 'Daily Challenge' : `Level ${level}`;
  const continueLabel = isDaily
    ? (passed ? 'Hub' : 'Retry')
    : (passed ? 'Next' : 'Retry');

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          style={{
            position: 'fixed', inset: 0, zIndex: 60, overflow: 'hidden',
            background: 'rgba(2,5,12,0.86)', backdropFilter: 'blur(6px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
          }}
        >
          {/* Rotating celebration rays behind the card */}
          {passed && (
            <div style={{
              position: 'absolute', width: 620, height: 620, borderRadius: '50%',
              background: 'conic-gradient(from 0deg, rgba(255,217,61,0.14) 0deg, transparent 24deg, rgba(255,217,61,0.14) 48deg, transparent 72deg, rgba(255,217,61,0.14) 96deg, transparent 120deg, rgba(255,217,61,0.14) 144deg, transparent 168deg, rgba(255,217,61,0.14) 192deg, transparent 216deg, rgba(255,217,61,0.14) 240deg, transparent 264deg, rgba(255,217,61,0.14) 288deg, transparent 312deg, rgba(255,217,61,0.14) 336deg, transparent 360deg)',
              animation: 'wf-rays-spin 14s linear infinite',
              maskImage: 'radial-gradient(circle, black 0%, transparent 68%)',
              WebkitMaskImage: 'radial-gradient(circle, black 0%, transparent 68%)',
            }} />
          )}

          <motion.div
            initial={{ opacity: 0, scale: 0.72, y: 46 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.86, y: 24 }}
            transition={{ type: 'spring', stiffness: 260, damping: 22, delay: 0.06 }}
            style={{ position: 'relative', width: 'min(100%, 340px)' }}
          >
            <GamePanel style={{ paddingTop: 40, textAlign: 'center' }}>
              <RibbonBanner color={passed ? 'green' : 'red'}>
                {passed ? 'Complete!' : 'Time Up'}
              </RibbonBanner>

              <motion.p
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                style={{
                  margin: 0, fontSize: 24, fontWeight: 900, color: '#fff',
                  letterSpacing: '0.08em', textTransform: 'uppercase',
                  textShadow: '0 2px 10px rgba(79,216,235,0.4)',
                }}
              >
                {heading}
              </motion.p>
              {newBest && passed && (
                <motion.p
                  initial={{ opacity: 0, scale: 0.7 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.32, type: 'spring', stiffness: 320 }}
                  style={{
                    margin: '4px 0 0', fontSize: 10, fontWeight: 900, letterSpacing: '0.22em',
                    color: '#ffd93d', textShadow: '0 0 12px rgba(255,217,61,0.7)',
                  }}
                >
                  ★ NEW BEST ★
                </motion.p>
              )}

              {/* Star rating */}
              <div style={{ display: 'flex', justifyContent: 'center', gap: 6, margin: '14px 0 4px' }}>
                {[1, 2, 3].map((s) => {
                  const earned = passed && stars >= s;
                  const mid = s === 2;
                  return (
                    <motion.div
                      key={s}
                      initial={{ scale: 0, rotate: -32 }}
                      animate={{ scale: 1, rotate: 0 }}
                      transition={{ delay: 0.34 + s * 0.14, type: 'spring', stiffness: 340, damping: 14 }}
                      style={{
                        fontSize: mid ? 54 : 42,
                        lineHeight: 1,
                        marginTop: mid ? 0 : 10,
                        filter: earned
                          ? 'drop-shadow(0 0 14px rgba(255,200,40,0.8)) drop-shadow(0 3px 4px rgba(0,0,0,0.5))'
                          : 'grayscale(1) brightness(0.32)',
                      }}
                    >
                      <span style={{
                        background: earned
                          ? 'linear-gradient(180deg,#fff3b0 0%,#ffd93d 42%,#ff9d1b 100%)'
                          : 'linear-gradient(180deg,#3a4a5c,#1a2635)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                      }}>
                        ★
                      </span>
                    </motion.div>
                  );
                })}
              </div>

              {/* Score card */}
              <motion.div
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.62 }}
                style={{
                  margin: '10px 0 0', padding: '12px 14px', borderRadius: 14,
                  background: 'rgba(2,10,22,0.75)', border: '1px solid rgba(255,217,61,0.3)',
                  boxShadow: 'inset 0 2px 8px rgba(0,0,0,0.5)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
                  <img src={FORGE_UI.arxCoin} alt="" style={{
                    width: 30, height: 30, objectFit: 'contain',
                    filter: 'drop-shadow(0 0 8px rgba(140,180,255,0.6))',
                    animation: 'wf-result-coin-spin 2.8s ease-in-out infinite',
                  }} />
                  <div style={{ textAlign: 'left' }}>
                    <div style={{ fontSize: 8.5, fontWeight: 900, letterSpacing: '0.2em', color: 'rgba(255,232,154,0.6)' }}>
                      SESSION EARNINGS
                    </div>
                    <div style={{ fontSize: 26, fontWeight: 900, color: '#ffd93d', lineHeight: 1.05, textShadow: '0 0 16px rgba(255,217,61,0.45)' }}>
                      +{totalEarn} <span style={{ fontSize: 11, opacity: 0.7 }}>ARX-P</span>
                    </div>
                  </div>
                </div>

                <div style={{
                  display: 'flex', justifyContent: 'center', gap: 14, marginTop: 8,
                  fontSize: 10, fontWeight: 800, color: 'rgba(200,230,255,0.6)',
                }}>
                  <span>{wordsFormed}/{wordsRequired} words</span>
                  {completionistBonus > 0 && <span style={{ color: '#7FE7C4' }}>+{completionistBonus} completionist</span>}
                  {passed && isDaily && dailyBonus > 0 && <span style={{ color: '#ffd93d' }}>+{dailyBonus} daily</span>}
                </div>
              </motion.div>

              {/* Actions */}
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.74 }}
                style={{ display: 'grid', gridTemplateColumns: passed && !isDaily ? '1fr 1.4fr' : '1fr', gap: 10, marginTop: 16 }}
              >
                {passed && !isDaily && (
                  <GlossyButton color="cyan" size="lg" onClick={onReplay}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                      <RotateCcw size={15} strokeWidth={3} /> Replay
                    </span>
                  </GlossyButton>
                )}
                <GlossyButton color={passed ? 'green' : 'gold'} size="lg" onClick={onContinue}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                    {continueLabel} <ChevronRight size={17} strokeWidth={3.4} />
                  </span>
                </GlossyButton>
              </motion.div>
            </GamePanel>
          </motion.div>

          <style>{`
            @keyframes wf-rays-spin { from{transform:rotate(0)} to{transform:rotate(360deg)} }
            @keyframes wf-result-coin-spin { 0%,100%{transform:rotateY(0)} 50%{transform:rotateY(180deg)} }
          `}</style>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function RoundEndModal(props: LevelCompleteModalProps) {
  return <LevelCompleteModal {...props} />;
}
