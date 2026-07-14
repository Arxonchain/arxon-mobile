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
  newBest?: boolean;
  isDaily?: boolean;
  completionistBonus?: number;
  dailyBonus?: number;
  onContinue: () => void;
}

export function LevelCompleteModal({
  open, passed, level, wordsFormed, wordsRequired, balance, newBest,
  isDaily, completionistBonus = 0, dailyBonus = 0, onContinue,
}: LevelCompleteModalProps) {
  const nextLevel = level + 1;
  const accent = passed ? '#4FD8EB' : '#ff6b4a';
  const accentGlow = passed ? 'rgba(79,216,235,0.55)' : 'rgba(255,107,74,0.45)';
  const headline = isDaily ? (passed ? 'DAILY' : 'DAILY') : (passed ? nextLevel : level);
  const subtitle = isDaily
    ? (passed ? `+${dailyBonus} ARX-P Daily Bonus${completionistBonus ? ` · +${completionistBonus} completionist` : ''}` : `${wordsRequired - wordsFormed} Words Short`)
    : passed
      ? (newBest ? `NEW BEST — Level ${nextLevel} Ready` : `Level ${nextLevel} Ready`)
      : `${wordsRequired - wordsFormed} Words Short`;
  const continueLabel = isDaily
    ? (passed ? 'Back to Hub' : 'Retry Daily')
    : (passed ? `Enter Level ${nextLevel}` : 'Retry Sector');

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.35 }}
          style={{
            position: 'fixed', inset: 0, zIndex: 60,
            overflow: 'hidden',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          {/* Animated background */}
          <motion.div
            initial={{ scale: 1.08, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
            style={{
              position: 'absolute', inset: 0,
              backgroundImage: `url(${FORGE_UI.forgeFrameBg})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center 20%',
            }}
          />

          {/* Dark vignette */}
          <div style={{
            position: 'absolute', inset: 0,
            background: 'radial-gradient(ellipse 80% 70% at 50% 45%, rgba(0,8,18,0.55) 0%, rgba(0,2,8,0.92) 100%)',
          }} />

          {/* Animated scan lines */}
          <div style={{
            position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden',
          }}>
            <motion.div
              animate={{ y: ['-100%', '200%'] }}
              transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}
              style={{
                position: 'absolute', left: 0, right: 0, height: '30%',
                background: 'linear-gradient(180deg, transparent 0%, rgba(79,216,235,0.04) 50%, transparent 100%)',
              }}
            />
          </div>

          {/* Horizontal accent bars */}
          <motion.div
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ delay: 0.15, duration: 0.5, ease: 'easeOut' }}
            style={{
              position: 'absolute', top: '18%', left: '8%', right: '8%', height: 1,
              background: `linear-gradient(90deg, transparent, ${accent}, transparent)`,
              transformOrigin: 'center',
              boxShadow: `0 0 12px ${accentGlow}`,
            }}
          />
          <motion.div
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ delay: 0.2, duration: 0.5, ease: 'easeOut' }}
            style={{
              position: 'absolute', bottom: '18%', left: '8%', right: '8%', height: 1,
              background: `linear-gradient(90deg, transparent, ${accent}88, transparent)`,
              transformOrigin: 'center',
            }}
          />

          {/* Center terminal card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.88, y: 30 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 20 }}
            transition={{ type: 'spring', stiffness: 260, damping: 28, delay: 0.08 }}
            style={{
              position: 'relative', zIndex: 2,
              width: 'min(92%, 380px)',
              padding: '28px 22px 24px',
              borderRadius: 8,
              background: 'linear-gradient(180deg, rgba(4,18,32,0.94) 0%, rgba(2,8,16,0.97) 100%)',
              border: `1px solid ${accent}55`,
              boxShadow: `0 0 48px ${accentGlow}, 0 24px 64px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.06)`,
            }}
          >
            {/* Top glow strip */}
            <div style={{
              position: 'absolute', top: 0, left: '10%', right: '10%', height: 2,
              background: `linear-gradient(90deg, transparent, ${accent}, transparent)`,
              borderRadius: 1,
            }} />

            {/* Status badge */}
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              style={{ textAlign: 'center', marginBottom: 6 }}
            >
              <span style={{
                display: 'inline-block',
                padding: '4px 14px', borderRadius: 2,
                fontSize: 9, fontWeight: 800, letterSpacing: '0.35em',
                textTransform: 'uppercase',
                color: accent,
                background: `${accent}18`,
                border: `1px solid ${accent}44`,
              }}>
                {passed ? 'Sector Cleared' : 'Forge Timeout'}
              </span>
            </motion.div>

            {/* Level number */}
            <motion.div
              initial={{ opacity: 0, scale: 0.6 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: 'spring', stiffness: 200, damping: 18, delay: 0.25 }}
              style={{ textAlign: 'center', marginBottom: 4 }}
            >
              <motion.div
                animate={{ textShadow: [`0 0 20px ${accentGlow}`, `0 0 40px ${accentGlow}`, `0 0 20px ${accentGlow}`] }}
                transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
                style={{
                  fontSize: isDaily ? 48 : 72, fontWeight: 900, lineHeight: 1,
                  color: '#fff',
                  fontFamily: "'Creato Display', system-ui, sans-serif",
                  letterSpacing: isDaily ? '0.08em' : undefined,
                }}
              >
                {headline}
              </motion.div>
              <p style={{
                margin: '6px 0 0', fontSize: 11, fontWeight: 700,
                color: 'rgba(200,230,255,0.65)', letterSpacing: '0.14em',
                textTransform: 'uppercase',
              }}>
                {subtitle}
              </p>
            </motion.div>

            {/* Stats row */}
            <div style={{
              display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10,
              margin: '20px 0 18px',
            }}>
              <ResultCard
                delay={0.32}
                label="Words Forged"
                value={`${wordsFormed}/${wordsRequired}`}
                accent="#4FD8EB"
                slideFrom="left"
              />
              <ResultCard
                delay={0.38}
                label="Session Earn"
                value={`+${balance + completionistBonus + (passed && isDaily ? dailyBonus : 0)}`}
                sub="ARX-P"
                accent="#ffd93d"
                slideFrom="right"
              />
            </div>

            {/* Continue button */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.46 }}
            >
              <TechButton onClick={onContinue}>
                {continueLabel}
              </TechButton>
            </motion.div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function ResultCard({
  label, value, sub, accent, delay, slideFrom,
}: {
  label: string;
  value: string;
  sub?: string;
  accent: string;
  delay: number;
  slideFrom: 'left' | 'right';
}) {
  return (
    <motion.div
      initial={{ opacity: 0, x: slideFrom === 'left' ? -20 : 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay, type: 'spring', stiffness: 280, damping: 26 }}
      style={{
        padding: '12px 14px', borderRadius: 6,
        background: 'rgba(0,10,20,0.75)',
        border: `1px solid ${accent}33`,
        boxShadow: `inset 0 1px 0 rgba(255,255,255,0.04), 0 4px 16px ${accent}15`,
        textAlign: 'center',
      }}
    >
      <div style={{
        fontSize: 9, fontWeight: 800, letterSpacing: '0.14em',
        color: 'rgba(255,255,255,0.45)', textTransform: 'uppercase', marginBottom: 4,
      }}>
        {label}
      </div>
      <div style={{ fontSize: 22, fontWeight: 900, color: accent, lineHeight: 1 }}>
        {value}
      </div>
      {sub && (
        <div style={{ fontSize: 8, fontWeight: 700, letterSpacing: '0.18em', color: 'rgba(255,255,255,0.35)', marginTop: 2 }}>
          {sub}
        </div>
      )}
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
  newBest?: boolean;
  isDaily?: boolean;
  completionistBonus?: number;
  dailyBonus?: number;
  onContinue: () => void;
}

export function RoundEndModal(props: TimeUpModalProps) {
  return <LevelCompleteModal {...props} />;
}
