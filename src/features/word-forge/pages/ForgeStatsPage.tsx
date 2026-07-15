import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Award, Flame, Hash, Map as MapIcon, Sparkles, Trophy } from 'lucide-react';
import { useMobileNav } from '@/contexts/MobileNavContext';
import { loadForgeProgress, saveForgeProgress } from '@/features/word-forge/hooks/useForgeProgress';
import { frontierLevel } from '@/features/word-forge/engine/sectorProgress';
import { dailySeed, isDailyCompleted } from '@/features/word-forge/engine/dailyChallenge';
import { FORGE_UI } from '@/features/word-forge/data/uiAssets';
import {
  GamePanel, GlossyBackButton, GlossyButton, RibbonBanner, TreasureBackdrop,
} from '@/features/word-forge/components/GlossyKit';
import { mobileScrollPadding } from '@/lib/mobileLayout';

export default function ForgeStatsPage() {
  const navigate = useNavigate();
  const { setHideNav } = useMobileNav();
  const progress = loadForgeProgress();
  const dailyDone = isDailyCompleted(progress.dailyCompletedDate);

  useEffect(() => {
    setHideNav(true);
    return () => setHideNav(false);
  }, [setHideNav]);

  const nextSector = frontierLevel(progress);

  const startCampaign = () => {
    saveForgeProgress({ currentLevel: nextSector });
    navigate('/word-forge');
  };

  const heroStats = [
    { label: 'Best Sector', value: progress.bestLevel, icon: Trophy, color: '#ffd93d' },
    { label: 'Words Forged', value: progress.totalWords, icon: Hash, color: '#4FD8EB' },
    { label: 'Top Streak', value: progress.bestStreak, icon: Flame, color: '#ff9d1b' },
  ];

  const detailStats = [
    { label: 'Current Sector', value: nextSector },
    { label: 'Longest Word', value: progress.longestWord || '—' },
    { label: 'Session High', value: `${progress.sessionHigh} ARX-P` },
    { label: 'Hints Ready', value: `${progress.hintsLeft}/3` },
    { label: 'Shuffles Ready', value: `${progress.shufflesLeft}/2` },
    { label: 'Skins Unlocked', value: `${progress.unlockedSkins}/5` },
    { label: 'Daily Challenge', value: dailyDone ? `Done · ${dailySeed()}` : '+50 ARX-P waiting' },
    { label: 'Daily Streak', value: progress.dailyStreak > 0 ? `${progress.dailyStreak} day${progress.dailyStreak === 1 ? '' : 's'}` : '—' },
  ];

  return (
    <div style={{
      minHeight: '100vh', background: '#04070f', position: 'relative', overflow: 'hidden',
      fontFamily: "'Creato Display', 'Rajdhani', system-ui, sans-serif",
      paddingBottom: mobileScrollPadding(),
    }}>
      <TreasureBackdrop />

      <div style={{
        position: 'relative', zIndex: 2,
        padding: 'max(26px, env(safe-area-inset-top)) 20px 24px',
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

        {/* Hero stat cards */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginTop: 20 }}>
          {heroStats.map((s, i) => (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, y: 18, scale: 0.92 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ delay: 0.06 + i * 0.08, type: 'spring', stiffness: 300, damping: 22 }}
              style={{
                padding: '14px 8px 12px', textAlign: 'center', borderRadius: 16,
                background: 'linear-gradient(180deg, rgba(21,54,86,0.9) 0%, rgba(9,26,48,0.95) 100%)',
                border: `1.5px solid ${s.color}44`,
                boxShadow: `0 5px 0 rgba(3,14,28,0.9), inset 0 2px 0 rgba(255,255,255,0.12), 0 0 22px ${s.color}22`,
              }}
            >
              <s.icon size={20} color={s.color} strokeWidth={2.6}
                style={{ filter: `drop-shadow(0 0 8px ${s.color}88)` }} />
              <div style={{ fontSize: 24, fontWeight: 900, color: '#fff', marginTop: 5, textShadow: `0 0 14px ${s.color}55` }}>
                {s.value}
              </div>
              <div style={{ fontSize: 7.5, fontWeight: 900, letterSpacing: '0.14em', color: 'rgba(220,240,255,0.55)', textTransform: 'uppercase', marginTop: 3 }}>
                {s.label}
              </div>
            </motion.div>
          ))}
        </div>

        {/* Detail panel */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, type: 'spring', stiffness: 260, damping: 24 }}
          style={{ marginTop: 30 }}
        >
          <GamePanel style={{ paddingTop: 34 }}>
            <RibbonBanner color="cyan">
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                <Award size={16} strokeWidth={3} /> Operator Log
              </span>
            </RibbonBanner>

            <div style={{ display: 'grid', gap: 7 }}>
              {detailStats.map((s) => (
                <div key={s.label} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '10px 13px', borderRadius: 12,
                  background: 'rgba(2,10,22,0.7)', border: '1px solid rgba(79,216,235,0.16)',
                }}>
                  <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.1em', color: 'rgba(79,216,235,0.65)', textTransform: 'uppercase' }}>
                    {s.label}
                  </span>
                  <span style={{ fontSize: 13.5, fontWeight: 900, color: '#fff', textAlign: 'right', maxWidth: '55%' }}>
                    {s.value}
                  </span>
                </div>
              ))}
            </div>

            <div style={{ display: 'grid', gap: 10, marginTop: 16 }}>
              <GlossyButton color="gold" size="lg" onClick={startCampaign}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                  <Sparkles size={16} strokeWidth={3} /> Play Sector {nextSector}
                </span>
              </GlossyButton>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <GlossyButton color="cyan" onClick={() => navigate('/word-forge/map')}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                    <MapIcon size={14} strokeWidth={3} /> Map
                  </span>
                </GlossyButton>
                <GlossyButton color="green" onClick={() => navigate('/word-forge/leaderboard')}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                    <Trophy size={14} strokeWidth={3} /> Ranks
                  </span>
                </GlossyButton>
              </div>
            </div>
          </GamePanel>
        </motion.div>
      </div>
    </div>
  );
}
