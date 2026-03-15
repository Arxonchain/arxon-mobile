// v2.0 - Mobile UI Redesign: periwinkle nav, immersive space cards, crystal gem
import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect } from 'react';

interface MobileSplashProps {
  isAppReady: boolean;
  onFinish: () => void;
}

export default function MobileSplash({ isAppReady, onFinish }: MobileSplashProps) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    if (isAppReady) {
      const t = setTimeout(() => {
        setVisible(false);
        setTimeout(onFinish, 600);
      }, 800);
      return () => clearTimeout(t);
    }
  }, [isAppReady, onFinish]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.6 }}
          style={{
            position: 'fixed', inset: 0, zIndex: 9999,
            background: '#000000',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          {/* Subtle radial glow only */}
          <div style={{
            position: 'absolute',
            width: 300, height: 300, borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(158,179,224,0.08) 0%, transparent 70%)',
            pointerEvents: 'none',
          }} />

          {/* Arxon logo — no text, no fallback shown */}
          <motion.div
            initial={{ scale: 0.75, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.55, ease: [0.34, 1.56, 0.64, 1] }}
          >
            <img
              src="/arxon-logo.png"
              alt="Arxon"
              style={{ width: 100, height: 100, objectFit: 'contain' }}
            />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
