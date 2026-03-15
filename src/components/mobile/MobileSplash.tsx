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
          {/* Radial glow */}
          <div style={{
            position: 'absolute',
            width: 300, height: 300, borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(139,174,214,0.1) 0%, transparent 70%)',
            pointerEvents: 'none',
          }}/>
          {/* Animated stroke ring behind logo */}
          <svg style={{ position:'absolute', width:180, height:180 }} viewBox="0 0 180 180">
            <circle cx="90" cy="90" r="82" fill="none" stroke="rgba(139,174,214,0.15)" strokeWidth="1"
              strokeDasharray="515" strokeDashoffset="515"
              style={{ animation:'strokeDash 1.2s ease-out 0.3s forwards' }}/>
            <style>{`@keyframes strokeDash{to{stroke-dashoffset:0}}`}</style>
          </svg>
          <motion.div
            initial={{ scale: 0.75, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.55, ease: [0.34, 1.56, 0.64, 1] }}
          >
            <img
              src="/arxon-logo.png"
              alt="Arxon"
              style={{ width: 100, height: 100, objectFit: 'contain' }}
              onError={(e) => {
                // fallback to inline SVG coin if logo not found
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
            {/* Inline coin fallback */}
            <svg width="100" height="100" viewBox="0 0 92 92" style={{ display:'none' }}>
              <defs>
                <radialGradient id="splashCf" cx="36%" cy="30%" r="68%">
                  <stop offset="0%" stopColor="#C8E0FF"/><stop offset="65%" stopColor="#3A6898"/><stop offset="100%" stopColor="#0E2244"/>
                </radialGradient>
              </defs>
              <circle cx="46" cy="46" r="36" fill="url(#splashCf)"/>
              <text x="46" y="52" textAnchor="middle" fontSize="16" fontWeight="900" fill="white" fontFamily="-apple-system,sans-serif">ARX</text>
            </svg>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
