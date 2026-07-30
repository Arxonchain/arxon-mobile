import { motion, AnimatePresence } from 'framer-motion';
import { Clock3, ListChecks, RotateCw } from 'lucide-react';
import { GamePanel, GlossyButton, RibbonBanner } from './GlossyKit';
import { prefersReducedMotion } from '../design-system/forgeTheme';

const STEPS = [
  {
    title: 'Spin the Wheel',
    body: 'Drag across the letters on the wheel to spell a word, then release to forge it.',
    icon: RotateCw,
    color: '#4FD8EB',
  },
  {
    title: 'Fill the Slots',
    body: 'Every word you forge fills a slot and pays ARX-P. Longer words and streaks pay more.',
    icon: ListChecks,
    color: '#84d92f',
  },
  {
    title: 'Beat the Clock',
    body: 'Fill all the slots before the timer hits zero to clear the sector and advance.',
    icon: Clock3,
    color: '#ffd93d',
  },
];

interface TutorialOverlayProps {
  open: boolean;
  step: number;
  onNext: () => void;
  onSkip: () => void;
}

export function TutorialOverlay({ open, step, onNext, onSkip }: TutorialOverlayProps) {
  const reduced = prefersReducedMotion();
  const current = STEPS[step] ?? STEPS[0];
  const isLast = step >= STEPS.length - 1;
  const Icon = current.icon;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          style={{
            position: 'fixed', inset: 0, zIndex: 55,
            background: 'rgba(2,6,14,0.85)', backdropFilter: 'blur(7px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 22,
          }}
        >
          <motion.div
            key={step}
            initial={reduced ? {} : { scale: 0.88, y: 22 }}
            animate={{ scale: 1, y: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 24 }}
            style={{ width: 'min(100%, 330px)' }}
          >
            <GamePanel style={{ paddingTop: 36, textAlign: 'center' }}>
              <RibbonBanner color="cyan">How to Play</RibbonBanner>

              {/* Step icon medallion */}
              <motion.div
                initial={reduced ? {} : { scale: 0, rotate: -30 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ delay: 0.12, type: 'spring', stiffness: 320, damping: 16 }}
                style={{
                  width: 72, height: 72, borderRadius: '50%', margin: '4px auto 0',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: `radial-gradient(circle at 50% 32%, ${current.color}33, rgba(4,14,28,0.9) 70%)`,
                  border: `2px solid ${current.color}66`,
                  boxShadow: `0 0 26px ${current.color}44, inset 0 2px 0 rgba(255,255,255,0.15)`,
                }}
              >
                <Icon size={32} color={current.color} strokeWidth={2.6}
                  style={{ filter: `drop-shadow(0 0 10px ${current.color})` }} />
              </motion.div>

              <p style={{
                margin: '12px 0 0', fontSize: 8.5, fontWeight: 900, letterSpacing: '0.3em',
                color: 'rgba(79,216,235,0.65)',
              }}>
                STEP {step + 1} / {STEPS.length}
              </p>
              <h2 style={{
                margin: '6px 0 6px', fontSize: 22, fontWeight: 900, color: '#fff',
                textShadow: `0 2px 12px ${current.color}44`,
              }}>
                {current.title}
              </h2>
              <p style={{ margin: '0 0 18px', fontSize: 13, lineHeight: 1.55, color: 'rgba(220,240,255,0.72)' }}>
                {current.body}
              </p>

              {/* Progress dots */}
              <div style={{ display: 'flex', justifyContent: 'center', gap: 7, marginBottom: 16 }}>
                {STEPS.map((s, i) => (
                  <span key={s.title} style={{
                    width: i === step ? 22 : 8, height: 8, borderRadius: 4,
                    background: i === step ? current.color : 'rgba(255,255,255,0.18)',
                    boxShadow: i === step ? `0 0 8px ${current.color}88` : undefined,
                    transition: 'all 0.25s ease',
                  }} />
                ))}
              </div>

              <div style={{ display: 'grid', gap: 10 }}>
                <GlossyButton color="gold" size="lg" onClick={onNext}>
                  {isLast ? 'Start Forge' : 'Next'}
                </GlossyButton>
                <GlossyButton color="slate" size="md" onClick={onSkip}>
                  Skip Tutorial
                </GlossyButton>
              </div>
            </GamePanel>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
