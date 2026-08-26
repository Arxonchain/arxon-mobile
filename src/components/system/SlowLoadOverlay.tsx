import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import arxonLogo from '@/assets/arxon-icon.svg';
import BrandedSpinner from './BrandedSpinner';
import { errorUi, glassPanelStyle } from './errorUiTokens';

interface Props {
  /** Parent is still loading */
  loading: boolean;
  /** Delay before showing overlay (ms) */
  delayMs?: number;
  message?: string;
}

/** Branded frosted-glass spinner overlay after slow load — avoids blank screen during auth/bootstrap. */
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

  const g = errorUi.glass;

  return (
    <AnimatePresence>
      {loading && visible ? (
        <motion.div
          key="slow-load"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: errorUi.overlayZ,
            background: g.overlayBg,
            backdropFilter: g.blur,
            WebkitBackdropFilter: g.blur,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: errorUi.font,
            pointerEvents: 'none',
          }}
        >
          <motion.div
            initial={{ opacity: 0, y: 12, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            style={{
              ...glassPanelStyle({ compact: true }),
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 24,
              padding: '36px 40px',
              maxWidth: 280,
            }}
          >
            <motion.img
              src={arxonLogo}
              alt=""
              animate={{
                boxShadow: [
                  `0 0 20px ${errorUi.cyan}33, inset 0 1px 0 rgba(255,255,255,0.12)`,
                  `0 0 48px ${errorUi.cyanGlow}, inset 0 1px 0 rgba(255,255,255,0.12)`,
                  `0 0 20px ${errorUi.cyan}33, inset 0 1px 0 rgba(255,255,255,0.12)`,
                ],
              }}
              transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
              style={{
                width: 72,
                height: 72,
                borderRadius: 18,
                objectFit: 'contain',
                border: `1px solid ${g.badgeBorder}`,
              }}
            />
            <BrandedSpinner label={message} />
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
