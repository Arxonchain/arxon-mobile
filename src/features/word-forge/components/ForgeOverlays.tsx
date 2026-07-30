import { motion, AnimatePresence } from 'framer-motion';
import { HelpCircle, LogOut, Pause, Play, RotateCcw, Settings } from 'lucide-react';
import { GamePanel, GlossyButton, GlossyIconButton, RibbonBanner } from './GlossyKit';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  open, title, message, confirmLabel = 'Confirm', cancelLabel = 'Cancel', onConfirm, onCancel,
}: ConfirmDialogProps) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          style={{
            position: 'fixed', inset: 0, zIndex: 70,
            background: 'rgba(2,6,14,0.8)', backdropFilter: 'blur(4px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
          }}
        >
          <motion.div
            initial={{ scale: 0.86, y: 18 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.92, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 320, damping: 26 }}
            style={{ width: 'min(100%, 330px)' }}
          >
            <GamePanel style={{ textAlign: 'center' }}>
              <h3 style={{
                margin: '0 0 8px', fontSize: 18, fontWeight: 900, color: '#ffe89a',
                letterSpacing: '0.06em', textTransform: 'uppercase',
              }}>
                {title}
              </h3>
              <p style={{ margin: '0 0 20px', fontSize: 13, color: 'rgba(220,240,255,0.7)', lineHeight: 1.5 }}>
                {message}
              </p>
              <div style={{ display: 'grid', gap: 10 }}>
                <GlossyButton color="red" size="md" onClick={onConfirm}>{confirmLabel}</GlossyButton>
                <GlossyButton color="slate" size="md" onClick={onCancel}>{cancelLabel}</GlossyButton>
              </div>
            </GamePanel>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

interface PauseOverlayProps {
  open: boolean;
  onResume: () => void;
  onReplay: () => void;
  onExit: () => void;
  onFaq: () => void;
  onSettings: () => void;
}

/** Image-3 style pause card: banner tab, stacked actions, utility icon row */
export function PauseOverlay({ open, onResume, onReplay, onExit, onFaq, onSettings }: PauseOverlayProps) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          style={{
            position: 'fixed', inset: 0, zIndex: 50,
            background: 'rgba(2,6,14,0.78)', backdropFilter: 'blur(7px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
          }}
        >
          <motion.div
            initial={{ scale: 0.8, y: 34 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.88, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 280, damping: 24 }}
            style={{ width: 'min(100%, 320px)' }}
          >
            <GamePanel style={{ paddingTop: 38, textAlign: 'center' }}>
              <RibbonBanner color="gold">
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                  <Pause size={17} strokeWidth={3.2} /> Paused
                </span>
              </RibbonBanner>

              <div style={{ display: 'grid', gap: 12, marginTop: 6 }}>
                <GlossyButton color="cyan" size="lg" onClick={onResume}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                    <Play size={17} strokeWidth={3} fill="currentColor" /> Resume
                  </span>
                </GlossyButton>
                <GlossyButton color="green" size="lg" onClick={onReplay}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                    <RotateCcw size={17} strokeWidth={3} /> Replay
                  </span>
                </GlossyButton>
                <GlossyButton color="red" size="lg" onClick={onExit}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                    <LogOut size={17} strokeWidth={3} /> Exit
                  </span>
                </GlossyButton>
              </div>

              <div style={{ display: 'flex', justifyContent: 'center', gap: 18, marginTop: 20 }}>
                <GlossyIconButton label="How to play" color="cyan" size={50} onClick={onFaq}>
                  <HelpCircle size={22} strokeWidth={2.8} />
                </GlossyIconButton>
                <GlossyIconButton label="Settings" color="cyan" size={50} onClick={onSettings}>
                  <Settings size={22} strokeWidth={2.8} />
                </GlossyIconButton>
              </div>
            </GamePanel>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
