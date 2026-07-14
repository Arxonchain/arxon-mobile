import { motion, AnimatePresence } from 'framer-motion';
import { TechButton } from './ForgeTitle';

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
            background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
          }}
        >
          <motion.div
            initial={{ scale: 0.92, y: 12 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0 }}
            style={{
              width: 'min(100%, 340px)', padding: '20px 18px',
              borderRadius: 8, background: 'rgba(4,18,32,0.98)',
              border: '1px solid rgba(79,216,235,0.3)',
            }}
          >
            <h3 style={{ margin: '0 0 8px', fontSize: 16, fontWeight: 900, color: '#fff' }}>{title}</h3>
            <p style={{ margin: '0 0 18px', fontSize: 13, color: 'rgba(255,255,255,0.6)', lineHeight: 1.5 }}>{message}</p>
            <div style={{ display: 'flex', gap: 8 }}>
              <TechButton variant="ghost" onClick={onCancel}>{cancelLabel}</TechButton>
              <div style={{ flex: 1 }} />
              <TechButton onClick={onConfirm}>{confirmLabel}</TechButton>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

interface PauseOverlayProps {
  open: boolean;
  onResume: () => void;
  onExit: () => void;
}

export function PauseOverlay({ open, onResume, onExit }: PauseOverlayProps) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          style={{
            position: 'fixed', inset: 0, zIndex: 50,
            background: 'rgba(0,4,12,0.82)', backdropFilter: 'blur(6px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <div style={{ textAlign: 'center' }}>
            <p style={{ margin: '0 0 16px', fontSize: 11, fontWeight: 800, letterSpacing: '0.3em', color: 'rgba(79,216,235,0.7)' }}>FORGE PAUSED</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, minWidth: 200 }}>
              <TechButton onClick={onResume}>Resume</TechButton>
              <TechButton variant="ghost" onClick={onExit}>Exit Sector</TechButton>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
