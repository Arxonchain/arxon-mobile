import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import arxonLogo from '@/assets/arxon-icon.svg';
import BrandedSpinner from './BrandedSpinner';
import { errorUi } from './errorUiTokens';

interface Props {
  /** Parent is still loading */
  loading: boolean;
  /** Delay before showing overlay (ms) */
  delayMs?: number;
  message?: string;
}

/** Branded spinner overlay after slow load — avoids blank screen during auth/bootstrap. */
export default function SlowLoadOverlay({
  loading,
  delayMs = 3500,
  message = 'Still loading…',
}: Props) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!loading) {
      setVisible(false);
      return;
    }
    const t = window.setTimeout(() => setVisible(true), delayMs);
    return () => window.clearTimeout(t);
  }, [loading, delayMs]);

  return (
    <AnimatePresence>
      {loading && visible ? (
        <motion.div
          key="slow-load"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: errorUi.overlayZ,
            background: `${errorUi.bg}ee`,
            backdropFilter: 'blur(8px)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 28,
            fontFamily: errorUi.font,
            pointerEvents: 'none',
          }}
        >
          <motion.img
            src={arxonLogo}
            alt=""
            animate={{
              boxShadow: [
                `0 0 20px ${errorUi.cyan}33`,
                `0 0 48px ${errorUi.cyanGlow}`,
                `0 0 20px ${errorUi.cyan}33`,
              ],
            }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
            style={{ width: 72, height: 72, borderRadius: 18, objectFit: 'contain' }}
          />
          <BrandedSpinner label={message} />
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
