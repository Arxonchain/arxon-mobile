import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldCheck, X, Mail, Globe, Sparkles } from 'lucide-react';
import { Capacitor } from '@capacitor/core';
import { useAuth } from '@/contexts/AuthContext';
import { useVerification } from '@/hooks/useVerification';
import { v2 } from '@/features/arxon-v2/design/tokens';
import arxonIcon from '@/assets/arxon-icon.svg';

const SKIP_PATHS = ['/auth', '/admin', '/reset-password', '/change-password', '/auth/confirm'];

function pathSkipped(pathname: string) {
  return SKIP_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

export default function VerificationDailyPrompt() {
  const { user } = useAuth();
  const { promptVisible, dismissDailyPrompt, steps, completedCount, requiredCount, loading, isComplete } = useVerification();
  const navigate = useNavigate();
  const location = useLocation();
  const isNative = Capacitor.isNativePlatform();

  const show = Boolean(
    user &&
    !loading &&
    !isComplete &&
    promptVisible &&
    !pathSkipped(location.pathname),
  );

  const remaining = steps.filter((s) => !s.done && !s.comingSoon && !s.optional);

  const goVerify = () => {
    dismissDailyPrompt();
    navigate('/settings?tab=verification');
  };

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 10050,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: isNative ? '24px 20px 32px' : '24px',
            background: 'rgba(0, 0, 0, 0.72)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
          }}
          onClick={dismissDailyPrompt}
        >
          <motion.div
            initial={{ opacity: 0, y: 28, scale: 0.94 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.96 }}
            transition={{ type: 'spring', damping: 26, stiffness: 320 }}
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '100%',
              maxWidth: isNative ? 360 : 420,
              borderRadius: isNative ? 28 : 24,
              overflow: 'hidden',
              background: v2.brand.surface,
              border: `1px solid ${v2.brand.steel}33`,
              boxShadow: `0 32px 80px rgba(0,0,0,0.55), 0 0 0 1px ${v2.accent.mining}22, 0 0 48px ${v2.accent.mining}18`,
            }}
          >
            {/* Hero illustration band */}
            <div style={{
              position: 'relative',
              height: isNative ? 148 : 132,
              background: `linear-gradient(145deg, hsl(155 45% 28%), hsl(175 50% 22%), hsl(225 35% 12%))`,
              overflow: 'hidden',
            }}>
              <div style={{
                position: 'absolute', inset: 0,
                background: `radial-gradient(circle at 30% 20%, ${v2.accent.mining}44, transparent 55%),
                  radial-gradient(circle at 80% 80%, ${v2.brand.steel}33, transparent 50%)`,
              }} />
              <motion.div
                animate={{ y: [0, -6, 0] }}
                transition={{ duration: 3.2, repeat: Infinity, ease: 'easeInOut' }}
                style={{
                  position: 'absolute', left: '50%', top: '54%', transform: 'translate(-50%, -50%)',
                  width: 72, height: 72, borderRadius: 22,
                  background: `linear-gradient(135deg, ${v2.accent.mining}, hsl(175 55% 40%))`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: `0 12px 32px ${v2.accent.mining}55`,
                }}
              >
                <ShieldCheck size={36} color="white" strokeWidth={2.2} />
              </motion.div>
              <motion.img
                src={arxonIcon}
                alt=""
                animate={{ rotate: [0, 8, -8, 0] }}
                transition={{ duration: 5, repeat: Infinity }}
                style={{
                  position: 'absolute', right: 28, top: 24, width: 36, height: 36, opacity: 0.85,
                }}
              />
              <Sparkles size={20} color={v2.accent.gold} style={{ position: 'absolute', left: 32, top: 28, opacity: 0.9 }} />
            </div>

            <div style={{ padding: isNative ? '22px 22px 20px' : '24px 24px 20px' }}>
              <p style={{
                fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase',
                color: v2.accent.mining, margin: '0 0 8px',
              }}>
                Account verification
              </p>
              <h2 style={{
                fontSize: isNative ? 22 : 24, fontWeight: 800, lineHeight: 1.15, margin: '0 0 12px',
                color: v2.brand.steelBright, fontFamily: v2.font,
              }}>
                Secure your Arxon account
              </h2>
              <p style={{ fontSize: 13, color: v2.brand.mutedSoft, lineHeight: 1.55, margin: '0 0 16px' }}>
                Complete verification when you&apos;re ready. Mining and all features stay open — this helps us prepare for future airdrop claims.
              </p>

              <ul style={{ listStyle: 'none', margin: '0 0 20px', padding: 0 }}>
                {remaining.slice(0, 3).map((s, i) => (
                  <li key={s.id} style={{
                    display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8,
                    fontSize: 13, color: v2.brand.steelLight,
                  }}>
                    <span style={{
                      width: 22, height: 22, borderRadius: 8, flexShrink: 0,
                      background: `${v2.accent.mining}18`, border: `1px solid ${v2.accent.mining}44`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 11, fontWeight: 800, color: v2.accent.mining,
                    }}>{i + 1}</span>
                    {s.label}
                  </li>
                ))}
              </ul>

              <div style={{
                display: 'flex', alignItems: 'center', gap: 8, marginBottom: 18,
                padding: '10px 12px', borderRadius: 14,
                background: `${v2.brand.steel}0c`, border: `1px solid ${v2.brand.border}`,
              }}>
                <Mail size={16} color={v2.brand.steel} />
                <Globe size={16} color={v2.brand.steel} />
                <span style={{ fontSize: 11, color: v2.brand.muted, marginLeft: 4 }}>
                  {completedCount}/{requiredCount} required steps done
                </span>
              </div>

              <button
                type="button"
                onClick={goVerify}
                style={{
                  width: '100%', padding: '16px 20px', borderRadius: 99, border: 'none',
                  cursor: 'pointer', fontFamily: v2.font, fontSize: 15, fontWeight: 800,
                  color: 'hsl(225 30% 6%)',
                  background: `linear-gradient(135deg, ${v2.accent.mining}, hsl(175 55% 48%))`,
                  boxShadow: `0 8px 28px ${v2.accent.mining}44`,
                }}
              >
                Complete verification
              </button>
            </div>
          </motion.div>

          <motion.button
            type="button"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ delay: 0.1 }}
            onClick={dismissDailyPrompt}
            aria-label="Dismiss"
            style={{
              position: 'absolute',
              bottom: isNative ? 'max(28px, env(safe-area-inset-bottom))' : 32,
              left: '50%',
              transform: 'translateX(-50%)',
              width: 44, height: 44, borderRadius: '50%',
              background: v2.brand.raised,
              border: `1px solid ${v2.brand.border}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', color: v2.brand.steelBright,
              boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
            }}
          >
            <X size={20} />
          </motion.button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
