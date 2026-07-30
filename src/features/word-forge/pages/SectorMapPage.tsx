import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Lock, Star } from 'lucide-react';
import { useMobileNav } from '@/contexts/MobileNavContext';
import { loadForgeProgress, saveForgeProgress } from '@/features/word-forge/hooks/useForgeProgress';
import {
  canSelectSector, frontierLevel, maxUnlockedLevel, sectorMapState, type SectorMapState,
} from '@/features/word-forge/engine/sectorProgress';
import { FORGE_UI } from '@/features/word-forge/data/uiAssets';
import {
  GlossyBackButton, GlossyButton, TreasureBackdrop,
} from '@/features/word-forge/components/GlossyKit';
import { mobileScrollPadding } from '@/lib/mobileLayout';

const MAX_SECTORS = 50;

const NODE_STYLE: Record<SectorMapState, { grad: string; ridge: string; border: string; text: string; glow: string }> = {
  frontier: {
    grad: 'linear-gradient(180deg,#ffe89a 0%,#ffc93c 40%,#ff9d1b 100%)',
    ridge: '#a85a06', border: '#7d4203', text: '#5b2e00', glow: 'rgba(255,201,60,0.5)',
  },
  cleared: {
    grad: 'linear-gradient(180deg,#c9f77e 0%,#84d92f 45%,#4ba412 100%)',
    ridge: '#2e6f0a', border: '#245808', text: '#173f02', glow: 'rgba(132,217,47,0.35)',
  },
  locked: {
    grad: 'linear-gradient(180deg,#2c3d52 0%,#1b2a3c 50%,#101c2c 100%)',
    ridge: '#060e18', border: '#0a1420', text: 'rgba(255,255,255,0.28)', glow: 'transparent',
  },
};

export default function SectorMapPage() {
  const navigate = useNavigate();
  const { setHideNav } = useMobileNav();
  const progress = loadForgeProgress();
  const unlocked = maxUnlockedLevel(progress.bestLevel);
  const visible = Math.min(MAX_SECTORS, Math.max(20, unlocked + 4));

  useEffect(() => {
    setHideNav(true);
    return () => setHideNav(false);
  }, [setHideNav]);

  const selectSector = (sector: number) => {
    if (!canSelectSector(sector, progress.bestLevel)) return;
    saveForgeProgress({ currentLevel: sector });
    navigate('/word-forge');
  };

  const continueFrontier = () => {
    const next = frontierLevel(progress);
    saveForgeProgress({ currentLevel: next });
    navigate('/word-forge');
  };

  return (
    <div style={{
      minHeight: '100vh', background: '#04070f', position: 'relative', overflow: 'hidden',
      fontFamily: "'Creato Display', 'Rajdhani', system-ui, sans-serif",
      paddingBottom: mobileScrollPadding(),
    }}>
      <TreasureBackdrop />

      <div style={{
        position: 'relative', zIndex: 2,
        padding: 'max(26px, env(safe-area-inset-top)) 18px 24px',
        maxWidth: 400, margin: '0 auto',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <GlossyBackButton onClick={() => navigate('/games')} />
          <img src={FORGE_UI.forgeLogo} alt="Arxon Word Forge" style={{
            width: 128, height: 'auto',
            filter: 'drop-shadow(0 6px 16px rgba(0,0,0,0.65))',
          }} />
          <div style={{ width: 44 }} />
        </div>

        <p style={{
          margin: '14px 0 16px', textAlign: 'center', fontSize: 10, fontWeight: 900,
          color: 'rgba(255,232,154,0.75)', letterSpacing: '0.22em', textTransform: 'uppercase',
          textShadow: '0 2px 8px rgba(0,0,0,0.8)',
        }}>
          Sector Map · Unlocked through {unlocked}
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 11 }}>
          {Array.from({ length: visible }, (_, i) => i + 1).map((sector, i) => {
            const state = sectorMapState(sector, progress.bestLevel);
            const c = NODE_STYLE[state];
            const locked = state === 'locked';
            const isReplay = state === 'cleared' && sector === progress.currentLevel;
            const isFrontier = state === 'frontier';
            return (
              <motion.button
                key={sector}
                type="button"
                disabled={locked}
                aria-label={locked ? `Sector ${sector} locked` : `Sector ${sector}`}
                onClick={() => selectSector(sector)}
                initial={{ opacity: 0, scale: 0.7 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: Math.min(i * 0.018, 0.5), type: 'spring', stiffness: 380, damping: 22 }}
                whileTap={locked ? undefined : { scale: 0.9, y: 2 }}
                style={{
                  position: 'relative', aspectRatio: '1', borderRadius: 15,
                  cursor: locked ? 'not-allowed' : 'pointer',
                  opacity: locked ? 0.72 : 1,
                  border: `2px solid ${c.border}`,
                  background: c.grad,
                  boxShadow: locked
                    ? `0 3px 0 ${c.ridge}, inset 0 2px 0 rgba(255,255,255,0.08)`
                    : `0 4px 0 ${c.ridge}, inset 0 2px 0 rgba(255,255,255,0.5), 0 7px 14px rgba(0,0,0,0.45), 0 0 16px ${c.glow}`,
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                  WebkitTapHighlightColor: 'transparent',
                  animation: isFrontier ? 'wf-node-pulse 1.8s ease-in-out infinite' : undefined,
                }}
              >
                <span style={{
                  position: 'absolute', top: 2, left: '12%', right: '12%', height: '38%',
                  borderRadius: 10, pointerEvents: 'none',
                  background: 'linear-gradient(180deg, rgba(255,255,255,0.45), rgba(255,255,255,0.02))',
                }} />
                {locked ? (
                  <Lock size={16} color={c.text} strokeWidth={2.8} />
                ) : (
                  <>
                    <span style={{
                      fontSize: 19, fontWeight: 900, color: c.text, lineHeight: 1,
                      textShadow: '0 1px 0 rgba(255,255,255,0.4)', position: 'relative',
                    }}>
                      {sector}
                    </span>
                    {state === 'cleared' && (
                      <Star size={10} fill={c.text} color={c.text} style={{ marginTop: 2, position: 'relative' }} />
                    )}
                    {(isFrontier || isReplay) && (
                      <span style={{
                        fontSize: 6.5, fontWeight: 900, letterSpacing: '0.12em',
                        color: c.text, marginTop: 2, position: 'relative',
                      }}>
                        {isFrontier ? 'NEXT' : 'NOW'}
                      </span>
                    )}
                  </>
                )}
              </motion.button>
            );
          })}
        </div>

        <div style={{ marginTop: 22 }}>
          <GlossyButton color="gold" size="lg" onClick={continueFrontier}>
            Continue Sector {frontierLevel(progress)}
          </GlossyButton>
        </div>
      </div>

      <style>{`
        @keyframes wf-node-pulse {
          0%,100% { filter: brightness(1); }
          50% { filter: brightness(1.22); }
        }
      `}</style>
    </div>
  );
}
