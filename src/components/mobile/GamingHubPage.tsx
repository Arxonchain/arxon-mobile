import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { WORD_FORGE_ENABLED } from '@/lib/wordForgeFeature';
import { loadForgeProgress } from '@/features/word-forge/hooks/useForgeProgress';
import { isDailyCompleted, dailySeed } from '@/features/word-forge/engine/dailyChallenge';
import { mobileScrollPadding } from '@/lib/mobileLayout';
import { FORGE_UI } from '@/features/word-forge/data/uiAssets';
import { ForgeTitle, TechButton } from '@/features/word-forge/components/ForgeTitle';

export default function GamingHubPage() {
  const navigate = useNavigate();
  const progress = loadForgeProgress();
  const dailyDone = isDailyCompleted(progress.dailyCompletedDate);
  const dailyBadge = dailyDone ? null : 'DAILY';

  const continueGame = () => navigate('/word-forge');
  const openDaily = () => navigate('/word-forge?mode=daily');
  const openStats = () => navigate('/word-forge/stats');
  const openLeaderboard = () => navigate('/leaderboard');

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
        filter: 'blur(6px) brightness(0.35)', transform: 'scale(1.06)',
      }} />
      <div style={{
        position: 'absolute', inset: 0,
        background: 'radial-gradient(ellipse 80% 60% at 50% 30%, rgba(79,216,235,0.12), transparent 70%)',
      }} />

      <div style={{ position: 'relative', zIndex: 2, padding: 'max(48px, env(safe-area-inset-top)) 20px 24px' }}>
        <ForgeTitle />
        <p style={{
          margin: '12px auto 0', maxWidth: 320, textAlign: 'center',
          fontSize: 12, lineHeight: 1.55, color: 'rgba(255,255,255,0.45)', fontWeight: 600,
        }}>
          Spell words. Stack ARX-P. Clear sectors before the forge cools.
        </p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          style={{ margin: '24px auto 0', maxWidth: 360, display: 'grid', gap: 10 }}
        >
          <TechButton onClick={continueGame} disabled={!WORD_FORGE_ENABLED}>
            Continue Sector {progress.currentLevel}
          </TechButton>
          <TechButton variant="ghost" onClick={openDaily} disabled={!WORD_FORGE_ENABLED || dailyDone}>
            {dailyDone ? `Daily Complete (${dailySeed()})` : 'Daily Forge Challenge +50 ARX-P'}
          </TechButton>
        </motion.div>

        <div style={{
          display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10,
          margin: '20px auto 0', maxWidth: 360,
        }}>
          {[
            { label: 'Best', value: progress.bestLevel },
            { label: 'Words', value: progress.totalWords },
            { label: 'Streak', value: progress.bestStreak },
          ].map((s) => (
            <div key={s.label} style={{
              padding: '12px 8px', textAlign: 'center', borderRadius: 4,
              border: '1px solid rgba(79,216,235,0.18)', background: 'rgba(0,8,16,0.65)',
            }}>
              <div style={{ fontSize: 8, fontWeight: 800, letterSpacing: '0.2em', color: 'rgba(79,216,235,0.55)' }}>{s.label}</div>
              <div style={{ fontSize: 22, fontWeight: 900, color: '#e8fcff', marginTop: 4 }}>{s.value}</div>
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 16 }}>
          <TechButton variant="ghost" onClick={openStats}>Stats</TechButton>
          <TechButton variant="ghost" onClick={openLeaderboard}>Leaderboard</TechButton>
        </div>

        {dailyBadge && (
          <div style={{
            position: 'absolute', top: 'max(48px, env(safe-area-inset-top))', right: 20,
            padding: '4px 10px', borderRadius: 3, fontSize: 9, fontWeight: 900,
            letterSpacing: '0.15em', color: '#ffd93d', border: '1px solid #ffd93d55',
            background: 'rgba(255,217,61,0.12)',
          }}>
            {dailyBadge}
          </div>
        )}
      </div>
    </div>
  );
}
