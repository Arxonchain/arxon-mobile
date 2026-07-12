import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { WORD_FORGE_ENABLED } from '@/lib/wordForgeFeature';
import { loadForgeProgress } from '@/features/word-forge/hooks/useForgeProgress';
import { mobileScrollPadding } from '@/lib/mobileLayout';
import { FORGE_UI } from '@/features/word-forge/data/uiAssets';
import { ForgeTitle } from '@/features/word-forge/components/ForgeTitle';

/** Image 1 — arcade entry + image 10 discovery bg */
export default function GamingHubPage() {
  const navigate = useNavigate();
  const progress = loadForgeProgress();

  const launch = () => {
    if (WORD_FORGE_ENABLED) navigate('/word-forge');
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: '#050810',
      position: 'relative',
      overflow: 'hidden',
      fontFamily: "'Creato Display', system-ui, sans-serif",
      paddingBottom: mobileScrollPadding(),
    }}>
      <div style={{
        position: 'absolute', inset: 0,
        backgroundImage: `url(${FORGE_UI.discoveryBg})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        filter: 'blur(6px) brightness(0.35)',
        transform: 'scale(1.06)',
      }} />
      <div style={{
        position: 'absolute', inset: 0,
        background: 'radial-gradient(ellipse 80% 60% at 50% 30%, rgba(79,216,235,0.12), transparent 70%)',
      }} />

      <div style={{ position: 'relative', zIndex: 2, padding: 'max(48px, env(safe-area-inset-top)) 20px 24px' }}>
        <ForgeTitle />

        <p style={{
          margin: '12px auto 0', maxWidth: 300, textAlign: 'center',
          fontSize: 12, lineHeight: 1.55, color: 'rgba(255,255,255,0.45)', fontWeight: 600,
        }}>
          Spell words from the grid. Stack ARX-P. Clear sectors before the clock runs out.
        </p>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.12 }}
          style={{ margin: '28px auto 0', maxWidth: 360, position: 'relative' }}
        >
          <img
            src={FORGE_UI.arcadePlay}
            alt="Let's play a game"
            style={{
              width: '100%', borderRadius: 8,
              boxShadow: '0 24px 60px rgba(0,0,0,0.65)',
              display: 'block',
            }}
          />
          {/* Tap zone — arrow / launch area (right half) */}
          <button
            type="button"
            onClick={launch}
            disabled={!WORD_FORGE_ENABLED}
            aria-label="Launch Word Forge"
            style={{
              position: 'absolute', top: '18%', right: '4%', width: '42%', height: '55%',
              background: 'transparent', border: 'none', cursor: WORD_FORGE_ENABLED ? 'pointer' : 'default',
              borderRadius: 8,
            }}
          />
          <button
            type="button"
            onClick={launch}
            disabled={!WORD_FORGE_ENABLED}
            style={{
              position: 'absolute', bottom: '8%', left: '50%', transform: 'translateX(-50%)',
              padding: '12px 28px',
              background: 'linear-gradient(180deg, rgba(79,216,235,0.9), rgba(20,100,130,0.95))',
              border: '1px solid rgba(255,255,255,0.35)',
              borderRadius: 4,
              color: '#fff', fontWeight: 900, fontSize: 11, letterSpacing: '0.2em',
              textTransform: 'uppercase', cursor: WORD_FORGE_ENABLED ? 'pointer' : 'default',
              boxShadow: '0 0 28px rgba(79,216,235,0.45)',
              opacity: WORD_FORGE_ENABLED ? 1 : 0.5,
            }}
          >
            Launch Forge
          </button>
        </motion.div>

        <div style={{
          display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10,
          margin: '24px auto 0', maxWidth: 360,
        }}>
          {[
            { label: 'Best', value: progress.bestLevel },
            { label: 'Current', value: progress.currentLevel },
            { label: 'Words', value: progress.totalWords },
          ].map((s) => (
            <div key={s.label} style={{
              padding: '12px 8px', textAlign: 'center', borderRadius: 4,
              border: '1px solid rgba(79,216,235,0.18)',
              background: 'rgba(0,8,16,0.65)', backdropFilter: 'blur(8px)',
            }}>
              <div style={{ fontSize: 8, fontWeight: 800, letterSpacing: '0.2em', color: 'rgba(79,216,235,0.55)' }}>
                {s.label}
              </div>
              <div style={{ fontSize: 22, fontWeight: 900, color: '#e8fcff', marginTop: 4 }}>{s.value}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
