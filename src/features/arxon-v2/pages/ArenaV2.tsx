/**
 * Arena — game hub dashboard. Pick Prediction Market, Word Forge, or Dice Roll.
 */
import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ChevronRight, Dices, Lock, Sparkles, Swords, TrendingUp } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { usePoints } from '@/hooks/usePoints';
import { supabase } from '@/integrations/supabase/client';
import { WORD_FORGE_ENABLED } from '@/lib/wordForgeFeature';
import { mobileTopPadding, mobileScrollPadding, mobilePageScrollRoot } from '@/lib/mobileLayout';
import { FORGE_UI } from '@/features/word-forge/data/uiAssets';
import arenaBattleground from '@/assets/arxon-v2/arena-battleground.png';
import { neon } from '@/features/arxon-v2/design/neonTokens';
import { NeonEyebrow } from '@/features/arxon-v2/design/NeonKit';
import { useIsAppPreview, toPreviewPath } from '@/features/arxon-v2/preview/AppPreviewContext';
import { DiceFace } from '@/features/dice/components/DiceFace';
import { diceAccent } from '@/features/dice/diceTokens';

const fadeUp = {
  hidden: { opacity: 0, y: 22 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] } },
};
const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.1, delayChildren: 0.08 } } };

const GLASS = {
  bg: 'linear-gradient(145deg, rgba(12,32,58,0.72) 0%, rgba(6,14,28,0.82) 100%)',
  border: 'rgba(79,216,235,0.22)',
  blur: 'blur(18px)',
};

interface GameCardProps {
  id: string;
  eyebrow: string;
  title: string;
  tagline: string;
  description: string;
  cta: string;
  accent: string;
  banner?: string;
  /** Custom banner art (e.g. 3D dice) — takes precedence over `banner` when set. */
  bannerContent?: ReactNode;
  icon: ReactNode;
  badge?: string;
  badgeLive?: boolean;
  locked?: boolean;
  soon?: boolean;
  onClick?: () => void;
  delay?: number;
}

/** Stacked neon dice for the Arena hub entry — reads as “this goes to Dice Roll”. */
function DiceHubBannerArt() {
  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        pointerEvents: 'none',
      }}
    >
      <div
        style={{
          position: 'absolute',
          width: 90,
          height: 90,
          borderRadius: '50%',
          background: `radial-gradient(circle, ${neon.cyan}35 0%, transparent 70%)`,
          filter: 'blur(6px)',
        }}
      />
      <div style={{ position: 'relative', width: 96, height: 92 }}>
        <div style={{ position: 'absolute', left: 2, top: 18, transform: 'rotate(-14deg)', zIndex: 1 }}>
          <DiceFace value={5} size={42} accent={neon.cyan} />
        </div>
        <div style={{ position: 'absolute', right: 0, top: 0, transform: 'rotate(16deg)', zIndex: 2 }}>
          <DiceFace value={6} size={46} accent={diceAccent.gold} />
        </div>
      </div>
    </div>
  );
}

function GameBattleCard({
  eyebrow,
  title,
  tagline,
  description,
  cta,
  accent,
  banner,
  bannerContent,
  icon,
  badge,
  badgeLive,
  locked,
  soon,
  onClick,
}: GameCardProps) {
  return (
    <motion.button
      type="button"
      variants={fadeUp}
      whileTap={locked ? undefined : { scale: 0.985 }}
      onClick={locked ? undefined : onClick}
      disabled={locked}
      style={{
        width: '100%',
        position: 'relative',
        borderRadius: 22,
        overflow: 'hidden',
        padding: 0,
        border: `1px solid ${locked ? 'rgba(255,255,255,0.08)' : `${accent}40`}`,
        background: GLASS.bg,
        backdropFilter: GLASS.blur,
        WebkitBackdropFilter: GLASS.blur,
        boxShadow: locked
          ? '0 8px 28px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.04)'
          : `0 14px 40px rgba(0,0,0,0.45), 0 0 32px ${accent}12, inset 0 1px 0 rgba(255,255,255,0.08)`,
        cursor: locked ? 'default' : 'pointer',
        textAlign: 'left',
        fontFamily: neon.font,
        opacity: locked ? 0.72 : 1,
      }}
    >
      {/* Spotlight beam */}
      {!locked && (
        <div style={{
          position: 'absolute', top: -40, left: '20%', width: '60%', height: 120,
          background: `radial-gradient(ellipse, ${accent}18 0%, transparent 70%)`,
          pointerEvents: 'none',
        }} />
      )}

      {/* Octagon ring hint */}
      <div style={{
        position: 'absolute', inset: 8, borderRadius: 16,
        border: `1px dashed ${locked ? 'rgba(255,255,255,0.06)' : `${accent}20`}`,
        pointerEvents: 'none',
      }} />

      <div style={{ display: 'flex', minHeight: 148, position: 'relative' }}>
        <div style={{
          flex: 1, minWidth: 0, padding: '18px 16px 16px',
          display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
          zIndex: 2,
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <div style={{
                width: 32, height: 32, borderRadius: 10, flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: `${accent}16`, border: `1px solid ${accent}35`, color: accent,
              }}>
                {icon}
              </div>
              {badge && (
                <span style={{
                  fontSize: 8, fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase',
                  padding: '3px 8px', borderRadius: 8,
                  color: badgeLive ? '#fff' : accent,
                  background: badgeLive ? 'rgba(220,38,38,0.85)' : `${accent}14`,
                  border: `1px solid ${badgeLive ? 'rgba(255,100,100,0.4)' : `${accent}30`}`,
                  boxShadow: badgeLive ? '0 0 12px rgba(255,68,68,0.35)' : undefined,
                }}>
                  {badgeLive && (
                    <span style={{
                      display: 'inline-block', width: 5, height: 5, borderRadius: '50%',
                      background: '#fff', marginRight: 4, verticalAlign: 'middle',
                      animation: 'arenaPulse 1.2s ease-in-out infinite',
                    }} />
                  )}
                  {badge}
                </span>
              )}
              {soon && (
                <span style={{
                  fontSize: 8, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase',
                  padding: '3px 8px', borderRadius: 8, color: neon.textMuted,
                  background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
                }}>
                  Coming Soon
                </span>
              )}
            </div>

            <p style={{
              margin: 0, fontSize: 8, fontWeight: 700, letterSpacing: '0.14em',
              textTransform: 'uppercase', color: `${accent}cc`,
            }}>
              {eyebrow}
            </p>
            <h3 style={{
              margin: '4px 0 0', fontSize: 17, fontWeight: 800, color: neon.text,
              lineHeight: 1.15, letterSpacing: '-0.02em',
            }}>
              {title}
            </h3>
            <p style={{
              margin: '5px 0 0', fontSize: 11, fontWeight: 600, color: accent,
              opacity: 0.9,
            }}>
              {tagline}
            </p>
            <p style={{
              margin: '8px 0 0', fontSize: 10, fontWeight: 400, lineHeight: 1.45,
              color: 'rgba(184,239,248,0.65)', maxWidth: 200,
            }}>
              {description}
            </p>
          </div>

          <div style={{
            marginTop: 14, display: 'inline-flex', alignItems: 'center', gap: 6,
            alignSelf: 'flex-start', padding: '8px 14px', borderRadius: 12,
            background: locked ? 'rgba(255,255,255,0.04)' : `${accent}18`,
            border: `1px solid ${locked ? 'rgba(255,255,255,0.1)' : `${accent}40`}`,
            color: locked ? neon.textMuted : accent,
            fontSize: 10, fontWeight: 800, letterSpacing: '0.06em',
          }}>
            {locked ? <Lock size={12} strokeWidth={2.5} /> : null}
            {cta}
            {!locked && <ChevronRight size={14} strokeWidth={2.5} />}
          </div>
        </div>

        {(bannerContent || banner) && (
          <div style={{
            width: 130, flexShrink: 0, position: 'relative', overflow: 'hidden',
          }}>
            <div style={{
              position: 'absolute', inset: 0,
              background: bannerContent
                ? `radial-gradient(ellipse 80% 70% at 60% 50%, ${accent}22 0%, transparent 65%), linear-gradient(90deg, rgba(6,14,28,0.92) 0%, rgba(6,14,28,0.2) 55%, transparent 100%)`
                : `linear-gradient(90deg, rgba(6,14,28,0.95) 0%, transparent 45%)`,
              zIndex: 1,
              pointerEvents: 'none',
            }} />
            {bannerContent ? (
              <div style={{
                position: 'absolute', inset: 0, zIndex: 2,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                filter: locked ? 'grayscale(0.6) brightness(0.5)' : undefined,
              }}>
                {bannerContent}
              </div>
            ) : (
              <img
                src={banner}
                alt=""
                style={{
                  position: 'absolute', right: -8, top: '50%', transform: 'translateY(-50%)',
                  height: '115%', width: 'auto', maxWidth: 'none', objectFit: 'cover',
                  filter: locked ? 'grayscale(0.6) brightness(0.5)' : 'saturate(1.1)',
                }}
              />
            )}
          </div>
        )}
      </div>
    </motion.button>
  );
}

function ArenaBattlegroundShell({ children }: { children: ReactNode }) {
  const contained = useIsAppPreview();
  return (
    <div style={{
      ...mobilePageScrollRoot(contained),
      paddingBottom: mobileScrollPadding(),
      fontFamily: neon.font,
      background: '#02060e',
      boxSizing: 'border-box',
    }}>
      <div style={{ position: contained ? 'absolute' : 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none' }}>
        <div style={{
          position: 'absolute', inset: -30,
          backgroundImage: `url(${arenaBattleground})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center 35%',
          filter: 'brightness(0.55) saturate(1.15)',
          transform: 'scale(1.05)',
        }} />
        <div style={{
          position: 'absolute', inset: 0,
          background: `
            radial-gradient(ellipse 90% 55% at 50% 0%, rgba(79,216,235,0.2) 0%, transparent 55%),
            radial-gradient(ellipse 70% 40% at 50% 100%, rgba(6,14,28,0.95) 0%, transparent 60%),
            linear-gradient(180deg, rgba(2,6,14,0.35) 0%, rgba(2,6,14,0.88) 55%, rgba(2,6,14,0.97) 100%)
          `,
        }} />
        <div style={{
          position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)',
          width: '80%', height: 280,
          background: 'radial-gradient(ellipse, rgba(79,216,235,0.12) 0%, transparent 70%)',
          filter: 'blur(24px)',
        }} />
      </div>
      <div style={{ position: 'relative', zIndex: 1 }}>{children}</div>
      <style>{'@keyframes arenaPulse{0%,100%{opacity:1}50%{opacity:.4}}'}</style>
    </div>
  );
}

export default function ArenaV2() {
  const navigate = useNavigate();
  const preview = useIsAppPreview();
  const { user } = useAuth();
  const { points } = usePoints();
  const [liveBattles, setLiveBattles] = useState(0);

  const go = useCallback((path: string) => {
    navigate(preview ? toPreviewPath(path) : path);
  }, [navigate, preview]);

  useEffect(() => {
    const fetchLive = async () => {
      const now = Date.now();
      const { data } = await supabase.from('arena_battles')
        .select('starts_at, ends_at, winner_side')
        .order('created_at', { ascending: false })
        .limit(20);
      const live = (data || []).filter((b) => {
        const started = new Date(b.starts_at).getTime() <= now;
        const notEnded = new Date(b.ends_at).getTime() > now;
        return started && notEnded && !b.winner_side;
      });
      setLiveBattles(live.length);
    };
    void fetchLive();
    const channel = supabase
      .channel('arena-hub-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'arena_battles' }, () => { void fetchLive(); })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const balance = Math.round(points?.total_points ?? (preview ? 34766 : 0));
  const gamesAvailable = (WORD_FORGE_ENABLED ? 1 : 0) + 2; // prediction + word forge + dice roll

  return (
    <ArenaBattlegroundShell>
      <motion.div variants={stagger} initial="hidden" animate="show" style={{ padding: '0 18px' }}>
        {/* Header */}
        <motion.div variants={fadeUp} style={{ padding: `${mobileTopPadding()} 4px 20px` }}>
          <NeonEyebrow color={neon.cyan}>Arxon Game Arena</NeonEyebrow>
          <h1 style={{
            margin: '8px 0 0', fontSize: 28, fontWeight: 900, color: neon.text,
            lineHeight: 1.1, letterSpacing: '-0.03em',
            textShadow: '0 0 40px rgba(79,216,235,0.25)',
          }}>
            Choose Your<br />Battleground
          </h1>
          <p style={{
            margin: '10px 0 0', fontSize: 12, fontWeight: 400, lineHeight: 1.5,
            color: 'rgba(184,239,248,0.7)', maxWidth: 300,
          }}>
            Stake, spell, and roll your way to ARX-P. Pick a game mode and enter the ring.
          </p>
        </motion.div>

        {/* Stats strip */}
        <motion.div variants={fadeUp} style={{
          display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 22,
        }}>
          {[
            { label: 'Live Battles', value: liveBattles > 0 ? String(liveBattles) : '—', accent: liveBattles > 0 ? '#ff6b6b' : neon.cyan },
            { label: 'Your ARX-P', value: balance.toLocaleString(), accent: neon.teal },
            { label: 'Games', value: `${gamesAvailable}+`, accent: neon.purple },
          ].map((s) => (
            <div key={s.label} style={{
              borderRadius: 14, padding: '10px 8px', textAlign: 'center',
              background: 'rgba(255,255,255,0.04)', backdropFilter: 'blur(12px)',
              border: `1px solid ${GLASS.border}`,
            }}>
              <p style={{ margin: 0, fontSize: 15, fontWeight: 800, color: s.accent, fontVariantNumeric: 'tabular-nums' }}>
                {s.value}
              </p>
              <p style={{ margin: '3px 0 0', fontSize: 8, fontWeight: 600, letterSpacing: '0.06em', color: 'rgba(184,239,248,0.55)' }}>
                {s.label}
              </p>
            </div>
          ))}
        </motion.div>

        {/* Game cards */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <GameBattleCard
            id="prediction"
            eyebrow="Game 01"
            title="Prediction Market"
            tagline="Stake. Predict. Earn."
            description="Back battle outcomes with ARX-P. Winners take the pool."
            cta="Enter Market"
            accent={neon.purple}
            banner={FORGE_UI.bannerArena}
            icon={<TrendingUp size={16} strokeWidth={2.2} />}
            badge={liveBattles > 0 ? `${liveBattles} LIVE` : undefined}
            badgeLive={liveBattles > 0}
            onClick={() => go('/arena/prediction-market')}
          />

          {WORD_FORGE_ENABLED && (
            <GameBattleCard
              id="word-forge"
              eyebrow="Game 02"
              title="Word Forge"
              tagline="Spell. Stack. Survive."
              description="Swipe the forge wheel, fill sector slots, and stack ARX-P before time runs out."
              cta="Play Forge"
              accent={neon.gold}
              banner={FORGE_UI.bannerWordForge}
              icon={<Sparkles size={16} strokeWidth={2.2} />}
              badge="HOT"
              onClick={() => go('/word-forge')}
            />
          )}

          <GameBattleCard
            id="dice-roll"
            eyebrow="Game 03"
            title="Dice Roll"
            tagline="Roll. Risk. Reward."
            description="Free daily rolls, plus best-of-3 dice duels against the house for real ARX-P stakes."
            cta="Roll the Dice"
            accent={neon.cyan}
            bannerContent={<DiceHubBannerArt />}
            icon={<Dices size={16} strokeWidth={2.2} />}
            badge="NEW"
            onClick={() => go('/arena/dice')}
          />
        </div>

        {/* Footer hint */}
        <motion.div variants={fadeUp} style={{
          marginTop: 24, padding: '16px 14px', borderRadius: 16, textAlign: 'center',
          background: 'rgba(79,216,235,0.06)', border: '1px dashed rgba(79,216,235,0.2)',
        }}>
          <Swords size={18} color={neon.cyan} style={{ marginBottom: 8, opacity: 0.7 }} />
          <p style={{ margin: 0, fontSize: 11, fontWeight: 500, color: 'rgba(184,239,248,0.65)', lineHeight: 1.5 }}>
            {user
              ? 'More games drop soon. Mine ARX-P daily to stay battle-ready.'
              : 'Sign in to play and track your stakes across all game modes.'}
          </p>
          {!user && (
            <button type="button" onClick={() => go('/auth')} style={{
              marginTop: 12, padding: '9px 18px', borderRadius: 11, border: 'none', cursor: 'pointer',
              background: `linear-gradient(135deg, ${neon.cyan}, ${neon.teal})`,
              color: '#02060e', fontSize: 10, fontWeight: 800, fontFamily: neon.font,
            }}>
              Sign In to Play
            </button>
          )}
        </motion.div>
      </motion.div>
    </ArenaBattlegroundShell>
  );
}
