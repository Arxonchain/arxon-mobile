import { useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { motion } from 'framer-motion';
import { Download, RefreshCw } from 'lucide-react';
import { useAppUpdateRequired } from '@/hooks/useAppUpdateRequired';
import { openAppStore } from '@/lib/appUpdate';
import arxonLogo from '@/assets/arxon-icon.svg';

/** Blocking overlay on native when installed build is below min_build. */
export default function AppUpdateOverlay() {
  const { required, checking, currentBuild, requirement, recheck } = useAppUpdateRequired();
  const [opening, setOpening] = useState(false);

  if (checking || !required || !requirement) return null;

  const storeLabel = Capacitor.getPlatform() === 'ios' ? 'Update on App Store' : 'Update on Play Store';

  const onUpdate = async () => {
    setOpening(true);
    try {
      await openAppStore(requirement.storeUrl);
    } finally {
      setOpening(false);
    }
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 100000,
      background: 'hsl(225 30% 3%)',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      padding: '32px 24px',
      fontFamily: "'Creato Display',-apple-system,system-ui,sans-serif",
    }}>
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        style={{ textAlign: 'center', maxWidth: 320, width: '100%' }}
      >
        <div style={{
          width: 88, height: 88, borderRadius: 24, overflow: 'hidden', margin: '0 auto 28px',
          border: '2px solid hsl(215 35% 62%/0.35)',
          boxShadow: '0 0 40px hsl(215 55% 62%/0.2)',
        }}>
          <img src={arxonLogo} alt="Arxon" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        </div>

        <h1 style={{ fontSize: 22, fontWeight: 700, color: 'hsl(215 20% 93%)', marginBottom: 10 }}>
          Update Required
        </h1>
        <p style={{ fontSize: 14, color: 'hsl(215 14% 48%)', lineHeight: 1.55, marginBottom: 8 }}>
          {requirement.message}
        </p>
        {currentBuild != null && (
          <p style={{ fontSize: 11, color: 'hsl(215 14% 32%)', marginBottom: 28 }}>
            Your version: {currentBuild} · Required: {requirement.minBuild}+
          </p>
        )}

        <motion.button
          whileTap={{ scale: 0.96 }}
          onClick={onUpdate}
          disabled={opening}
          style={{
            width: '100%', padding: '16px 20px', borderRadius: 16, border: 'none',
            background: 'linear-gradient(135deg, hsl(215 35% 55%), hsl(215 45% 45%))',
            color: 'white', fontSize: 15, fontWeight: 700, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
            boxShadow: '0 8px 24px hsl(215 35% 40%/0.35)', marginBottom: 12,
            opacity: opening ? 0.7 : 1,
          }}
        >
          <Download size={18} />
          {opening ? 'Opening store…' : storeLabel}
        </motion.button>

        <button
          onClick={() => void recheck()}
          style={{
            width: '100%', padding: '14px', borderRadius: 14, border: '1px solid hsl(215 22% 20%)',
            background: 'transparent', color: 'hsl(215 25% 55%)', fontSize: 13, fontWeight: 600,
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          }}
        >
          <RefreshCw size={14} />
          I&apos;ve updated — check again
        </button>
      </motion.div>
    </div>
  );
}
