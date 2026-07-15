import { useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { BarChart3, Flame, Gift, HelpCircle, Lock, Map, Settings, Sparkles, Trophy } from 'lucide-react';
import { WORD_FORGE_ENABLED } from '@/lib/wordForgeFeature';
import { frontierLevel } from '@/features/word-forge/engine/sectorProgress';
import { loadForgeProgress, saveForgeProgress } from '@/features/word-forge/hooks/useForgeProgress';
import { isDailyCompleted } from '@/features/word-forge/engine/dailyChallenge';
import { loadForgeSettings, saveForgeSettings } from '@/features/word-forge/hooks/useForgeSettings';
import { setForgeAudioSettings } from '@/features/word-forge/audio/forgeAudio';
import { mobileScrollPadding } from '@/lib/mobileLayout';
import { FORGE_UI } from '@/features/word-forge/data/uiAssets';
import { GamePanel, GlossyButton, GlossyIconButton, TreasureBackdrop } from '@/features/word-forge/components/GlossyKit';
import { ForgeFaqModal } from '@/features/word-forge/components/ForgeFaqModal';
import { ForgeSettingsPanel } from '@/features/word-forge/components/ForgeSettingsPanel';

export default function GamingHubPage() {
  const navigate = useNavigate();
  const progress = loadForgeProgress();
  const dailyDone = isDailyCompleted(progress.dailyCompletedDate);
  const [faqOpen, setFaqOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [rewardsToast, setRewardsToast] = useState(false);
  const [settings, setSettings] = useState(loadForgeSettings);

  const updateSettings = useCallback((s: typeof settings) => {
    setSettings(s);
    saveForgeSettings(s);
    setForgeAudioSettings(s);
  }, []);

  const startCampaign = useCallback(() => {
    const next = frontierLevel(progress);
    saveForgeProgress({ currentLevel: next });
    navigate('/word-forge');
  }, [navigate, progress]);

  return (
    <div style={{
      minHeight: '100vh', position: 'relative', overflow: 'hidden',
      fontFamily: "'Creato Display', 'Rajdhani', system-ui, sans-serif",
      paddingBottom: mobileScrollPadding(),
      background: '#04070f',
    }}>
      {/* Treasure background — blurred so the panel stays readable */}
      <TreasureBackdrop blur={7} brightness={0.72} />

      {/* Ambient sparkles */}
      {[
        { top: '9%', left: '12%', s: 5, d: 0 }, { top: '15%', left: '84%', s: 4, d: 0.9 },
        { top: '30%', left: '6%', s: 3, d: 1.7 }, { top: '26%', left: '92%', s: 5, d: 0.4 },
        { top: '58%', left: '8%', s: 4, d: 1.2 }, { top: '64%', left: '90%', s: 3, d: 2.1 },
      ].map((p, i) => (
        <span key={i} style={{
          position: 'absolute', top: p.top, left: p.left, width: p.s, height: p.s,
          borderRadius: '50%', background: '#ffe89a',
          boxShadow: '0 0 10px 3px rgba(255,220,120,0.55)',
          animation: `wf-sparkle 2.6s ease-in-out ${p.d}s infinite`,
          zIndex: 1,
        }} />
      ))}

      <div style={{
        position: 'relative', zIndex: 2, maxWidth: 400, margin: '0 auto',
        padding: 'max(26px, env(safe-area-inset-top)) 22px 20px',
        display: 'flex', flexDirection: 'column', alignItems: 'center',
      }}>
        {/* Logo overlay — transparent cutout, floating */}
        <motion.img
          src={FORGE_UI.forgeLogo}
          alt="Arxon Word Forge"
          initial={{ opacity: 0, y: -24, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ type: 'spring', stiffness: 200, damping: 20 }}
          style={{
            width: 'min(76%, 290px)', height: 'auto', marginTop: 8,
            filter: 'drop-shadow(0 10px 26px rgba(0,0,0,0.7)) drop-shadow(0 0 30px rgba(255,180,50,0.25))',
            animation: 'wf-logo-float 3.6s ease-in-out infinite',
          }}
        />

        {/* Main menu panel — image-1 layout */}
        <motion.div
          initial={{ opacity: 0, y: 30, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ delay: 0.12, type: 'spring', stiffness: 220, damping: 24 }}
          style={{ width: '100%', marginTop: 22 }}
        >
          <GamePanel>
            <GlossyButton
              size="xl"
              color="gold"
              disabled={!WORD_FORGE_ENABLED}
              onClick={startCampaign}
            >
              Play
            </GlossyButton>
            <p style={{
              margin: '8px 0 0', textAlign: 'center', fontSize: 10.5, fontWeight: 800,
              letterSpacing: '0.14em', color: 'rgba(255,232,154,0.8)', textTransform: 'uppercase',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
            }}>
              <span>Sector {frontierLevel(progress)}</span>
              {progress.dailyStreak > 0 && (
                <span style={{
                  display: 'inline-flex', alignItems: 'center', gap: 3,
                  color: '#ff9d4a', textShadow: '0 0 10px rgba(255,140,50,0.5)',
                }}>
                  <Flame size={12} strokeWidth={3} />
                  {progress.dailyStreak}-day
                </span>
              )}
            </p>

            <div style={{
              display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14,
              justifyItems: 'center', marginTop: 20,
            }}>
              <GlossyIconButton label="Stats" caption="Stats" color="green"
                onClick={() => navigate('/word-forge/stats')}>
                <BarChart3 size={26} strokeWidth={2.6} />
              </GlossyIconButton>
              <GlossyIconButton label="Settings" caption="Settings" color="green"
                onClick={() => setSettingsOpen(true)}>
                <Settings size={26} strokeWidth={2.6} />
              </GlossyIconButton>
              <GlossyIconButton label="Leaderboard" caption="Ranks" color="green"
                onClick={() => navigate('/word-forge/leaderboard')}>
                <Trophy size={26} strokeWidth={2.6} />
              </GlossyIconButton>
              <GlossyIconButton label="Sector map" caption="Map" color="green"
                onClick={() => navigate('/word-forge/map')}>
                <Map size={26} strokeWidth={2.6} />
              </GlossyIconButton>
              <GlossyIconButton label="Daily reward challenge" caption="Daily" color={dailyDone ? 'slate' : 'gold'}
                badge={dailyDone ? null : '+50'}
                disabled={!WORD_FORGE_ENABLED || dailyDone}
                onClick={() => navigate('/word-forge?mode=daily')}>
                <Gift size={26} strokeWidth={2.6} />
              </GlossyIconButton>
              <GlossyIconButton label="Forge rewards" caption="Rewards" color="slate"
                onClick={() => {
                  setRewardsToast(true);
                  window.setTimeout(() => setRewardsToast(false), 2400);
                }}>
                <Sparkles size={26} strokeWidth={2.6} />
              </GlossyIconButton>
              <GlossyIconButton label="How to play" caption="FAQ" color="green"
                onClick={() => setFaqOpen(true)}>
                <HelpCircle size={26} strokeWidth={2.6} />
              </GlossyIconButton>
            </div>
          </GamePanel>
        </motion.div>

        {/* Compact career stats */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.28 }}
          style={{
            display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10,
            width: '100%', marginTop: 16,
          }}
        >
          {[
            { label: 'Best Sector', value: progress.bestLevel },
            { label: 'Words', value: progress.totalWords },
            { label: 'Top Streak', value: progress.bestStreak },
          ].map((s) => (
            <div key={s.label} style={{
              padding: '10px 6px', textAlign: 'center', borderRadius: 14,
              background: 'rgba(5,14,28,0.78)', border: '1px solid rgba(79,216,235,0.22)',
              boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.08)',
            }}>
              <div style={{ fontSize: 8, fontWeight: 900, letterSpacing: '0.16em', color: 'rgba(79,216,235,0.6)', textTransform: 'uppercase' }}>
                {s.label}
              </div>
              <div style={{ fontSize: 21, fontWeight: 900, color: '#ffe89a', marginTop: 3, textShadow: '0 2px 8px rgba(255,200,60,0.3)' }}>
                {s.value}
              </div>
            </div>
          ))}
        </motion.div>

        <p style={{
          margin: '16px 0 0', fontSize: 10, fontWeight: 700, letterSpacing: '0.08em',
          color: 'rgba(255,255,255,0.4)', textAlign: 'center',
        }}>
          Spell words · Stack ARX-P · Clear sectors
        </p>

        {/* Second game — clearly marked coming soon */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.36 }}
          style={{ width: '100%', marginTop: 18 }}
        >
          <div style={{
            padding: '14px 16px', borderRadius: 16, textAlign: 'center',
            background: 'rgba(5,14,28,0.72)', border: '1px dashed rgba(79,216,235,0.28)',
            boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.06)',
            opacity: 0.88,
          }}>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 6, marginBottom: 6,
              fontSize: 9, fontWeight: 900, letterSpacing: '0.18em', color: 'rgba(79,216,235,0.65)',
              textTransform: 'uppercase',
            }}>
              <Lock size={11} strokeWidth={3} /> Coming Soon
            </div>
            <div style={{ fontSize: 17, fontWeight: 900, color: 'rgba(255,255,255,0.55)', letterSpacing: '0.04em' }}>
              Cipher Drop
            </div>
            <p style={{ margin: '6px 0 0', fontSize: 10, color: 'rgba(220,240,255,0.38)', lineHeight: 1.45 }}>
              Decode falling ciphers for bonus ARX-P
            </p>
          </div>
        </motion.div>
      </div>

      {rewardsToast && (
        <div role="status" style={{
          position: 'fixed', bottom: 96, left: '50%', transform: 'translateX(-50%)',
          zIndex: 40, padding: '10px 18px', borderRadius: 12, maxWidth: '86vw',
          background: 'rgba(3,10,22,0.94)', border: '1px solid rgba(255,217,61,0.4)',
          fontSize: 12, fontWeight: 700, textAlign: 'center', color: '#ffd93d',
        }}>
          Forge rewards shop — coming soon
        </div>
      )}

      <ForgeFaqModal open={faqOpen} onClose={() => setFaqOpen(false)} />
      <ForgeSettingsPanel
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        settings={settings}
        onChange={updateSettings}
        accent="#4FD8EB"
      />

      <style>{`
        @keyframes wf-logo-float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-8px)} }
        @keyframes wf-sparkle { 0%,100%{opacity:0.15;transform:scale(0.7)} 50%{opacity:1;transform:scale(1.25)} }
      `}</style>
    </div>
  );
}
