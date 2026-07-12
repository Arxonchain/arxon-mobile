import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { WORD_FORGE_ENABLED } from '@/lib/wordForgeFeature';
import { loadForgeProgress } from '@/features/word-forge/hooks/useForgeProgress';
import { mobileScrollPadding } from '@/lib/mobileLayout';

interface GamingDashboardProps {
  onSwipeHint?: () => void;
}

export default function GamingDashboard({ onSwipeHint }: GamingDashboardProps) {
  const navigate = useNavigate();
  const progress = loadForgeProgress();

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'linear-gradient(180deg, #0c1628 0%, #1a1040 38%, #0a0f18 100%)',
        padding: `max(48px, env(safe-area-inset-top)) 20px ${mobileScrollPadding(12)}`,
        fontFamily: "'Creato Display', system-ui, sans-serif",
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Ambient orbs */}
      <div style={{
        position: 'absolute', top: -80, right: -60, width: 220, height: 220,
        borderRadius: '50%', background: 'radial-gradient(circle, rgba(255,140,60,0.25), transparent 70%)',
        pointerEvents: 'none',
      }} />
      <div style={{
        position: 'absolute', bottom: 120, left: -40, width: 180, height: 180,
        borderRadius: '50%', background: 'radial-gradient(circle, rgba(127,231,196,0.18), transparent 70%)',
        pointerEvents: 'none',
      }} />

      <button
        type="button"
        onClick={onSwipeHint}
        style={{
          position: 'absolute', top: 'max(14px, env(safe-area-inset-top))', left: 16,
          background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)',
          borderRadius: 12, padding: '8px 12px', color: 'rgba(255,255,255,0.7)',
          fontSize: 11, fontWeight: 700, cursor: 'pointer',
        }}
      >
        ← Hub
      </button>

      <div style={{ textAlign: 'center', marginTop: 24, position: 'relative', zIndex: 1 }}>
        <p style={{
          margin: '0 0 6px', fontSize: 11, fontWeight: 800, letterSpacing: 3,
          color: 'rgba(255,217,61,0.85)', textTransform: 'uppercase',
        }}>
          Arxon Play
        </p>

        <h1 style={{ margin: 0, lineHeight: 0.95, position: 'relative', display: 'inline-block' }}>
          <span style={{
            display: 'block', fontSize: 'clamp(42px, 11vw, 56px)', fontWeight: 900,
            background: 'linear-gradient(180deg, #fff5c0 0%, #ffd93d 45%, #ff8c3a 100%)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            filter: 'drop-shadow(0 4px 0 #8a3a08) drop-shadow(0 8px 16px rgba(0,0,0,0.45))',
          }}>
            WORD
          </span>
          <span style={{
            display: 'block', fontSize: 'clamp(38px, 10vw, 50px)', fontWeight: 900,
            background: 'linear-gradient(180deg, #c8f0ff 0%, #4FD8EB 50%, #7FE7C4 100%)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            filter: 'drop-shadow(0 4px 0 #0e4a52) drop-shadow(0 8px 16px rgba(0,0,0,0.4))',
            marginTop: -4,
          }}>
            FORGE
          </span>
        </h1>

        <p style={{
          margin: '14px auto 0', maxWidth: 280, fontSize: 13, lineHeight: 1.5,
          color: 'rgba(255,255,255,0.55)', fontWeight: 600,
        }}>
          Spell words from the letter pool — earn ARX-P on every forge.
        </p>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        style={{
          margin: '28px auto 0', maxWidth: 340, display: 'grid',
          gridTemplateColumns: '1fr 1fr 1fr', gap: 10, position: 'relative', zIndex: 1,
        }}
      >
        {[
          { label: 'Best Level', value: progress.bestLevel, color: '#ffd93d' },
          { label: 'Current', value: progress.currentLevel, color: '#7FE7C4' },
          { label: 'Words', value: progress.totalWords, color: '#4FD8EB' },
        ].map((stat) => (
          <div
            key={stat.label}
            style={{
              padding: '14px 10px', borderRadius: 16, textAlign: 'center',
              background: 'rgba(0,0,0,0.35)', border: '1px solid rgba(255,255,255,0.1)',
              boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.06)',
            }}
          >
            <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: 1, color: 'rgba(255,255,255,0.45)', textTransform: 'uppercase' }}>
              {stat.label}
            </div>
            <div style={{ fontSize: 22, fontWeight: 900, color: stat.color, marginTop: 4, lineHeight: 1 }}>
              {stat.value}{stat.suffix ?? ''}
            </div>
          </div>
        ))}
      </motion.div>

      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.25, type: 'spring', stiffness: 280, damping: 22 }}
        style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: 36, position: 'relative', zIndex: 1 }}
      >
        {WORD_FORGE_ENABLED ? (
          <button
            type="button"
            onClick={() => navigate('/word-forge')}
            style={{
              width: 120, height: 120, borderRadius: '50%', border: '5px solid rgba(255,255,255,0.9)',
              background: 'linear-gradient(180deg, #7FE7C4 0%, #2dd4a8 55%, #0d9488 100%)',
              boxShadow: '0 10px 0 #065f46, 0 16px 40px rgba(0,0,0,0.45), inset 0 4px 12px rgba(255,255,255,0.35)',
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <span style={{
              width: 0, height: 0, marginLeft: 8,
              borderTop: '22px solid transparent', borderBottom: '22px solid transparent',
              borderLeft: '36px solid #fff', filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.25))',
            }} />
          </button>
        ) : (
          <div style={{
            padding: '16px 24px', borderRadius: 16, background: 'rgba(255,255,255,0.06)',
            border: '1px dashed rgba(255,255,255,0.2)', color: 'rgba(255,255,255,0.5)',
            fontSize: 13, fontWeight: 700, textAlign: 'center',
          }}>
            Enable VITE_WORD_FORGE_ENABLED to play
          </div>
        )}
        <p style={{ margin: '16px 0 0', fontSize: 12, fontWeight: 800, color: 'rgba(255,255,255,0.45)', letterSpacing: 2 }}>
          TAP TO PLAY
        </p>
      </motion.div>

      <div style={{
        marginTop: 32, padding: '16px 18px', borderRadius: 18, maxWidth: 340, margin: '32px auto 0',
        background: 'linear-gradient(135deg, rgba(255,140,60,0.12), rgba(127,231,196,0.08))',
        border: '1px solid rgba(255,255,255,0.12)', position: 'relative', zIndex: 1,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{
            width: 52, height: 52, borderRadius: 14, flexShrink: 0,
            background: 'linear-gradient(145deg, #ffd93d, #ff8c3a)',
            boxShadow: '0 4px 12px rgba(255,140,60,0.35), inset 0 2px 4px rgba(255,255,255,0.4)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26,
          }}>
            🎒
          </div>
          <div>
            <p style={{ margin: 0, fontSize: 13, fontWeight: 900, color: '#ffd93d' }}>
              Biome levels unlock as you advance
            </p>
            <p style={{ margin: '4px 0 0', fontSize: 11, color: 'rgba(255,255,255,0.5)', lineHeight: 1.4 }}>
              Rock → Timber → Ancient → Neon City tiles &amp; arenas
            </p>
          </div>
        </div>
      </div>

      <p style={{
        textAlign: 'center', marginTop: 20, fontSize: 10, fontWeight: 700,
        color: 'rgba(255,255,255,0.3)', letterSpacing: 1,
      }}>
        Swipe right for Mining Hub →
      </p>
    </div>
  );
}
