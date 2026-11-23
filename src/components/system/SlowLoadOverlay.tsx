import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import PageSkeleton from '@/features/arxon-v2/components/PageSkeleton';
import { errorUi } from './errorUiTokens';

interface Props {
  loading: boolean;
  delayMs?: number;
  /** Kept for callers; skeleton has no spinner copy. */
  message?: string;
}

/** Delayed dark skeleton — only if bootstrap is actually slow. */
export default function SlowLoadOverlay({
  loading,
  delayMs = 3500,
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
          transition={{ duration: 0.2 }}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: errorUi.overlayZ,
            background: '#0a0c10',
            pointerEvents: 'none',
          }}
        >
          <PageSkeleton delayMs={0} />
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
