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
      }, 600);
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
            background: '#080B14',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexDirection: 'column'
          }}>
          {/* Glow background */}
          <div style={{
            position: 'absolute', width: 300, height: 300, borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(0,212,255,0.08) 0%, transparent 70%)',
            pointerEvents: 'none'
          }} />
          
          {/* Logo */}
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5, ease: [0.34, 1.56, 0.64, 1] }}>
            <img src="/arxon-logo.png" alt="Arxon" 
              style={{ width: 90, height: 90, objectFit: 'contain' }}
              onError={(e) => {
                // Fallback to text logo if image fails
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
            {/* Fallback text logo */}
            <div style={{
              width: 90, height: 90, borderRadius: '24px',
              background: 'linear-gradient(135deg, rgba(0,212,255,0.15), rgba(180,95,255,0.1))',
              border: '1px solid rgba(0,212,255,0.2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <span style={{ color: '#00D4FF', fontSize: '32px', fontWeight: 900, fontFamily: "'Creato Display', sans-serif" }}>A</span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
