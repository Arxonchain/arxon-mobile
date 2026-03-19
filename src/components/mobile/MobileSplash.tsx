import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect } from 'react';
import arxonLogo from '@/assets/arxon-logo.jpg';

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
        setTimeout(onFinish, 700);
      }, 900);
      return () => clearTimeout(t);
    }
  }, [isAppReady, onFinish]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.7, ease: 'easeInOut' }}
          style={{
            position: 'fixed', inset: 0, zIndex: 9999,
            background: '#000',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          {/* Background glow */}
          <div style={{
            position: 'absolute', top: '50%', left: '50%',
            transform: 'translate(-50%,-50%)',
            width: 320, height: 320, borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(139,174,214,0.12) 0%, transparent 70%)',
            pointerEvents: 'none',
          }}/>
          {/* Animated ring */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, ease: [0.34,1.56,0.64,1] }}
            style={{ position: 'absolute', width: 160, height: 160 }}
          >
            <svg width="160" height="160" viewBox="0 0 160 160">
              <motion.circle
                cx="80" cy="80" r="74"
                fill="none"
                stroke="rgba(139,174,214,0.2)"
                strokeWidth="1"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 1.2, ease: 'easeOut', delay: 0.2 }}
                strokeLinecap="round"
              />
              <motion.circle
                cx="80" cy="80" r="74"
                fill="none"
                stroke="rgba(139,174,214,0.5)"
                strokeWidth="1.5"
                strokeDasharray="60 400"
                initial={{ rotate: 0 }}
                animate={{ rotate: 360 }}
                transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
                style={{ transformOrigin: '80px 80px' }}
              />
            </svg>
          </motion.div>
          {/* Logo only — no text */}
          <motion.img
            src={arxonLogo}
            alt=""
            initial={{ scale: 0.7, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.6, ease: [0.34, 1.56, 0.64, 1], delay: 0.1 }}
            style={{
              width: 90, height: 90,
              objectFit: 'contain',
              borderRadius: 22,
              position: 'relative', zIndex: 2,
            }}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
