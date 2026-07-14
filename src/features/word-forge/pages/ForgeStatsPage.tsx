import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMobileNav } from '@/contexts/MobileNavContext';
import { loadForgeProgress } from '@/features/word-forge/hooks/useForgeProgress';
import { dailySeed, isDailyCompleted } from '@/features/word-forge/engine/dailyChallenge';
import { FORGE_UI } from '@/features/word-forge/data/uiAssets';
import { ForgeTitle, TechButton } from '@/features/word-forge/components/ForgeTitle';
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

  const stats = [
    { label: 'Current Sector', value: progress.currentLevel },
    { label: 'Best Sector', value: progress.bestLevel },
    { label: 'Total Words', value: progress.totalWords },
    { label: 'Best Streak', value: progress.bestStreak },
    { label: 'Longest Word', value: progress.longestWord || '—' },
    { label: 'Session High', value: `${progress.sessionHigh} ARX-P` },
    { label: 'Hints Left', value: progress.hintsLeft },
    { label: 'Shuffles Left', value: progress.shufflesLeft },
    { label: 'Skins Unlocked', value: `${progress.unlockedSkins}/5` },
    { label: 'Daily Challenge', value: dailyDone ? `Done (${dailySeed()})` : 'Available +50 ARX-P' },
    { label: 'Tutorial', value: progress.tutorialCompleted ? 'Complete' : 'Incomplete' },
  ];

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
        filter: 'blur(8px) brightness(0.3)', transform: 'scale(1.06)',
      }} />
      <div style={{
        position: 'relative', zIndex: 2,
        padding: 'max(48px, env(safe-area-inset-top)) 20px 24px',
        maxWidth: 420, margin: '0 auto',
      }}>
        <button
          type="button"
          onClick={() => navigate('/games')}
          style={{
            marginBottom: 16, padding: '6px 12px', borderRadius: 4,
            border: '1px solid rgba(79,216,235,0.22)', background: 'rgba(0,0,0,0.55)',
            color: 'rgba(79,216,235,0.85)', cursor: 'pointer', fontSize: 10, fontWeight: 800,
            letterSpacing: '0.12em',
          }}
        >
          ← HUB
        </button>

        <ForgeTitle />
        <p style={{
          margin: '10px 0 20px', textAlign: 'center', fontSize: 11, fontWeight: 600,
          color: 'rgba(255,255,255,0.45)', letterSpacing: '0.08em',
        }}>
          FORGE OPERATOR STATS
        </p>

        <div style={{ display: 'grid', gap: 8 }}>
          {stats.map((s) => (
            <div key={s.label} style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '12px 14px', borderRadius: 4,
              border: '1px solid rgba(79,216,235,0.18)', background: 'rgba(0,8,16,0.72)',
            }}>
              <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.12em', color: 'rgba(79,216,235,0.55)' }}>
                {s.label}
              </span>
              <span style={{ fontSize: 14, fontWeight: 900, color: '#e8fcff', textAlign: 'right', maxWidth: '55%' }}>
                {s.value}
              </span>
            </div>
          ))}
        </div>

        <div style={{ display: 'grid', gap: 8, marginTop: 20 }}>
          <TechButton onClick={() => navigate('/word-forge/map')}>Sector Map</TechButton>
          <TechButton variant="ghost" onClick={() => navigate('/word-forge/leaderboard')}>Forge Leaderboard</TechButton>
          <TechButton variant="ghost" onClick={() => navigate('/games')}>Back to Hub</TechButton>
        </div>
      </div>
    </div>
  );
}
