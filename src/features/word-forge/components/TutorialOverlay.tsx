import { motion, AnimatePresence } from 'framer-motion';
import { TechButton } from './ForgeTitle';
import { prefersReducedMotion } from '../design-system/forgeTheme';

const STEPS = [
  { title: 'Swipe Letters', body: 'Drag across adjacent tiles to spell a word. Lift to deselect.' },
  { title: 'Forge It', body: 'Tap FORGE when your word is ready. Valid words earn ARX-P credits.' },
  { title: 'Clear the Sector', body: 'Find enough words before the timer hits zero to advance.' },
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

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          style={{
            position: 'fixed', inset: 0, zIndex: 55,
            background: 'rgba(0,4,12,0.88)', backdropFilter: 'blur(8px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
          }}
        >
          <motion.div
            initial={reduced ? {} : { scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            style={{
              width: 'min(100%, 360px)', padding: '24px 20px',
              borderRadius: 8, background: 'rgba(4,18,32,0.96)',
              border: '1px solid rgba(79,216,235,0.35)',
              boxShadow: '0 0 48px rgba(79,216,235,0.15)',
            }}
          >
            <p style={{ margin: 0, fontSize: 9, fontWeight: 800, letterSpacing: '0.3em', color: 'rgba(79,216,235,0.7)' }}>
              STEP {step + 1} / {STEPS.length}
            </p>
            <h2 style={{ margin: '8px 0 6px', fontSize: 22, fontWeight: 900, color: '#fff' }}>{current.title}</h2>
            <p style={{ margin: '0 0 20px', fontSize: 13, lineHeight: 1.55, color: 'rgba(255,255,255,0.65)' }}>{current.body}</p>
            <div style={{ display: 'flex', gap: 8 }}>
              <TechButton variant="ghost" onClick={onSkip}>Skip</TechButton>
              <div style={{ flex: 1 }} />
              <TechButton onClick={onNext}>{isLast ? 'Start Forge' : 'Next'}</TechButton>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
