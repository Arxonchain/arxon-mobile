import { useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Flame, HelpCircle, Lock, Sparkles } from 'lucide-react';
import { WORD_FORGE_ENABLED } from '@/lib/wordForgeFeature';
import { frontierLevel } from '@/features/word-forge/engine/sectorProgress';
import { loadForgeProgress, saveForgeProgress } from '@/features/word-forge/hooks/useForgeProgress';
import { isDailyCompleted } from '@/features/word-forge/engine/dailyChallenge';
import { mobileScrollPadding } from '@/lib/mobileLayout';
import { FORGE_UI } from '@/features/word-forge/data/uiAssets';
import { GamePanel, GlossyButton, GlossyIconButton, TreasureBackdrop } from '@/features/word-forge/components/GlossyKit';
import { ForgeFaqModal } from '@/features/word-forge/components/ForgeFaqModal';
import { DailyMilestoneCard } from '@/features/word-forge/components/DailyMilestoneCard';

const INTRO_STEPS = [
  { n: '1', title: 'Swipe the wheel', body: 'Drag across letters on the forge disc to spell words.' },
  { n: '2', title: 'Fill the slots', body: 'Match words to the sector grid before the timer hits zero.' },
  { n: '3', title: 'Stack ARX-P', body: 'Longer words, streaks, and bonus terms pay more points.' },
];

export default function GamingHubPage() {
  const navigate = useNavigate();
  const progress = loadForgeProgress();
  const dailyDone = isDailyCompleted(progress.dailyCompletedDate);
  const [faqOpen, setFaqOpen] = useState(false);

  const startCampaign = useCallback(() => {
    const next = frontierLevel(progress);
    saveForgeProgress({ currentLevel: next });
    navigate('/word-forge');
  }, [navigate, progress]);

  const startDaily = useCallback(() => {
    navigate('/word-forge?mode=daily');
  }, [navigate]);

  return (
    <div style={{
      minHeight: '100vh', position: 'relative', overflow: 'hidden',
      fontFamily: "'Creato Display', 'Rajdhani', system-ui, sans-serif",
      paddingBottom: mobileScrollPadding(),
      background: '#04070f',
    }}>
      <TreasureBackdrop blur={7} brightness={0.72} />

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

        <motion.div
          initial={{ opacity: 0, y: 30, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ delay: 0.12, type: 'spring', stiffness: 220, damping: 24 }}
          style={{ width: '100%', marginTop: 22 }}
        >
          <GamePanel style={{ position: 'relative' }}>
            <div style={{ position: 'absolute', top: 14, right: 14, zIndex: 2 }}>
              <GlossyIconButton label="How to play" color="green" size={44} onClick={() => setFaqOpen(true)}>
                <HelpCircle size={22} strokeWidth={2.6} />
              </GlossyIconButton>
            </div>

            <p style={{
              margin: '0 0 6px', textAlign: 'center', fontSize: 11, fontWeight: 800,
              letterSpacing: '0.2em', color: 'rgba(79,216,235,0.65)', textTransform: 'uppercase',
            }}>
              Word Forge
            </p>
            <h1 style={{
              margin: 0, textAlign: 'center', fontSize: 22, fontWeight: 900, color: '#fff',
              lineHeight: 1.15, letterSpacing: '0.02em',
            }}>
              Spell. Stack. Survive.
            </h1>
            <p style={{
              margin: '10px 0 0', textAlign: 'center', fontSize: 12, fontWeight: 600,
              lineHeight: 1.55, color: 'rgba(220,240,255,0.62)', padding: '0 8px',
            }}>
              A sci-fi word arena where every sector is a timed puzzle. Forge words from the letter wheel,
              fill the grid, and earn ARX-P as you push deeper into the map.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 16 }}>
              {INTRO_STEPS.map((step) => (
                <div key={step.n} style={{
                  display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 12px',
                  borderRadius: 14, background: 'rgba(2,10,22,0.55)',
                  border: '1px solid rgba(79,216,235,0.18)',
                }}>
                  <span style={{
                    width: 26, height: 26, borderRadius: 8, flexShrink: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 12, fontWeight: 900, color: '#013647',
                    background: 'linear-gradient(180deg,#b8f4ff,#4FD8EB)',
                    border: '1px solid #08455a',
                  }}>
                    {step.n}
                  </span>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 900, color: '#ffe89a' }}>{step.title}</div>
                    <div style={{ fontSize: 11, fontWeight: 600, color: 'rgba(200,230,255,0.58)', marginTop: 2, lineHeight: 1.4 }}>
                      {step.body}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div style={{ marginTop: 18 }}>
              <GlossyButton
                size="xl"
                color="gold"
                disabled={!WORD_FORGE_ENABLED}
                onClick={startCampaign}
              >
                Play Campaign
              </GlossyButton>
            </div>
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
          </GamePanel>
        </motion.div>

        <DailyMilestoneCard
          completed={dailyDone}
          streak={progress.dailyStreak}
          disabled={!WORD_FORGE_ENABLED}
          onStart={startDaily}
        />

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
              <Sparkles size={10} style={{ display: 'inline', verticalAlign: -1, marginRight: 4 }} />
              Planned arcade mode — decode falling cipher tiles for bonus ARX-P. Not live yet.
            </p>
          </div>
        </motion.div>
      </div>

      <ForgeFaqModal open={faqOpen} onClose={() => setFaqOpen(false)} />

      <style>{`
        @keyframes wf-logo-float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-8px)} }
        @keyframes wf-sparkle { 0%,100%{opacity:0.15;transform:scale(0.7)} 50%{opacity:1;transform:scale(1.25)} }
      `}</style>
    </div>
  );
}
