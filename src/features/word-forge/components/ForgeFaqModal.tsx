import { motion, AnimatePresence } from 'framer-motion';
import { GamePanel, GlossyButton, RibbonBanner } from './GlossyKit';

const FAQ_ITEMS: { q: string; a: string }[] = [
  { q: 'How do I play?', a: 'Drag across the letters on the wheel to spell a word, then release to forge it. Longer words pay more ARX-P.' },
  { q: 'How do I clear a sector?', a: 'Fill every word slot before the timer runs out. Bonus words beyond the slots still earn ARX-P.' },
  { q: 'What are streaks?', a: 'Forge words back-to-back without a miss. 3 in a row pays 1.5x, 5 in a row pays 2x.' },
  { q: 'What are bonus words?', a: 'Crypto-themed words marked with a gem. They pay 4x and show you their meaning.' },
  { q: 'What do hints do?', a: 'A hint reveals the first and last letters of a hidden word. You get 3 per sector, refilled when you clear it.' },
  { q: 'Daily Milestone?', a: 'Each day brings a new goal — speed runs, long words, no-hint clears, and more. Hit today\'s milestone on the shared puzzle for +50 ARX-P.' },
  { q: 'Where do my points go?', a: 'ARX-P earned in the forge is credited to your Arxon balance automatically.' },
];

export function ForgeFaqModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          style={{
            position: 'fixed', inset: 0, zIndex: 80,
            background: 'rgba(2,6,14,0.82)', backdropFilter: 'blur(6px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
          }}
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.85, y: 24 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 26 }}
            style={{ width: 'min(100%, 380px)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <GamePanel style={{ paddingTop: 34 }}>
              <RibbonBanner color="cyan">How to Play</RibbonBanner>
              <div style={{ maxHeight: '56vh', overflowY: 'auto', display: 'grid', gap: 10, padding: '4px 2px' }}>
                {FAQ_ITEMS.map((item) => (
                  <div key={item.q} style={{
                    padding: '10px 12px', borderRadius: 12,
                    background: 'rgba(2,10,22,0.7)', border: '1px solid rgba(79,216,235,0.18)',
                  }}>
                    <p style={{ margin: 0, fontSize: 12, fontWeight: 900, color: '#4FD8EB', letterSpacing: '0.04em' }}>
                      {item.q}
                    </p>
                    <p style={{ margin: '5px 0 0', fontSize: 11.5, lineHeight: 1.55, color: 'rgba(220,240,255,0.75)' }}>
                      {item.a}
                    </p>
                  </div>
                ))}
              </div>
              <div style={{ marginTop: 16 }}>
                <GlossyButton color="gold" size="md" onClick={onClose}>Got It</GlossyButton>
              </div>
            </GamePanel>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
