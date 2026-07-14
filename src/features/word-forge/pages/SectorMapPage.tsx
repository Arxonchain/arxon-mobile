import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useMobileNav } from '@/contexts/MobileNavContext';
import { loadForgeProgress, saveForgeProgress } from '@/features/word-forge/hooks/useForgeProgress';
import { FORGE_UI } from '@/features/word-forge/data/uiAssets';
import { ForgeTitle, TechButton } from '@/features/word-forge/components/ForgeTitle';
import { mobileScrollPadding } from '@/lib/mobileLayout';

const MAX_SECTORS = 50;

function sectorState(sector: number, current: number, best: number): 'locked' | 'current' | 'cleared' | 'available' {
  if (sector > best + 1) return 'locked';
  if (sector === current) return 'current';
  if (sector < current) return 'cleared';
  return 'available';
}

export default function SectorMapPage() {
  const navigate = useNavigate();
  const { setHideNav } = useMobileNav();
  const progress = loadForgeProgress();
  const visible = Math.min(MAX_SECTORS, Math.max(20, progress.bestLevel + 3));

  useEffect(() => {
    setHideNav(true);
    return () => setHideNav(false);
  }, [setHideNav]);

  const selectSector = (sector: number) => {
    const state = sectorState(sector, progress.currentLevel, progress.bestLevel);
    if (state === 'locked') return;
    saveForgeProgress({ currentLevel: sector });
    navigate('/word-forge');
  };

  const colors: Record<string, { border: string; bg: string; text: string }> = {
    locked: { border: 'rgba(255,255,255,0.08)', bg: 'rgba(0,0,0,0.4)', text: 'rgba(255,255,255,0.2)' },
    current: { border: '#ffd93d', bg: 'rgba(255,217,61,0.15)', text: '#ffd93d' },
    cleared: { border: 'rgba(79,216,235,0.35)', bg: 'rgba(79,216,235,0.08)', text: '#4FD8EB' },
    available: { border: 'rgba(79,216,235,0.55)', bg: 'rgba(79,216,235,0.12)', text: '#e8fcff' },
  };

  return (
    <div style={{
      minHeight: '100vh', background: '#050810', position: 'relative', overflow: 'hidden',
      fontFamily: "'Creato Display', 'Rajdhani', system-ui, sans-serif",
      paddingBottom: mobileScrollPadding(),
    }}>
      <div style={{
        position: 'absolute', inset: 0,
        backgroundImage: `url(${FORGE_UI.discoveryBg})`,
        backgroundSize: 'cover', backgroundPosition: 'center',
        filter: 'blur(6px) brightness(0.28)', transform: 'scale(1.06)',
      }} />
      <div style={{
        position: 'relative', zIndex: 2,
        padding: 'max(48px, env(safe-area-inset-top)) 16px 24px',
        maxWidth: 420, margin: '0 auto',
      }}>
        <button
          type="button"
          onClick={() => navigate('/games')}
          style={{
            marginBottom: 12, padding: '6px 12px', borderRadius: 4,
            border: '1px solid rgba(79,216,235,0.22)', background: 'rgba(0,0,0,0.55)',
            color: 'rgba(79,216,235,0.85)', cursor: 'pointer', fontSize: 10, fontWeight: 800,
            letterSpacing: '0.12em',
          }}
        >
          ← HUB
        </button>

        <ForgeTitle />
        <p style={{
          margin: '8px 0 16px', textAlign: 'center', fontSize: 10, fontWeight: 700,
          color: 'rgba(255,255,255,0.4)', letterSpacing: '0.1em',
        }}>
          SELECT SECTOR · BEST {progress.bestLevel}
        </p>

        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 8,
        }}>
          {Array.from({ length: visible }, (_, i) => i + 1).map((sector) => {
            const state = sectorState(sector, progress.currentLevel, progress.bestLevel);
            const c = colors[state];
            const locked = state === 'locked';
            return (
              <motion.button
                key={sector}
                type="button"
                disabled={locked}
                onClick={() => selectSector(sector)}
                whileTap={locked ? undefined : { scale: 0.92 }}
                style={{
                  aspectRatio: '1', borderRadius: 6, cursor: locked ? 'default' : 'pointer',
                  border: `1px solid ${c.border}`, background: c.bg,
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                  opacity: locked ? 0.5 : 1,
                }}
              >
                <span style={{ fontSize: 8, fontWeight: 800, letterSpacing: '0.1em', color: 'rgba(255,255,255,0.35)' }}>
                  {state === 'current' ? 'NOW' : locked ? '🔒' : 'SEC'}
                </span>
                <span style={{ fontSize: 18, fontWeight: 900, color: c.text, lineHeight: 1 }}>{sector}</span>
              </motion.button>
            );
          })}
        </div>

        <div style={{ marginTop: 20 }}>
          <TechButton onClick={() => navigate('/word-forge')}>
            Continue Sector {progress.currentLevel}
          </TechButton>
        </div>
      </div>
    </div>
  );
}
