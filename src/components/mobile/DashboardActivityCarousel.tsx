import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, Sparkles, Swords, Target } from 'lucide-react';
import bannerTasks from '@/assets/word-forge/ui/banner-tasks-clean.png';
import bannerArena from '@/assets/word-forge/ui/banner-arena-clean.png';
import { neon } from '@/features/arxon-v2/design/neonTokens';

interface Slide {
  id: string;
  gradient: string;
  eyebrow: string;
  title: string;
  subtitle: string;
  cta: string;
  path: string;
  accent: string;
  heroImage: string;
  /** How the right-side art is composited */
  heroMode?: 'cutout' | 'arena-blend';
  /** Cutout hero dimensions (px) */
  heroSize?: number;
  icon?: 'sparkles' | 'swords' | 'target';
}

const SLIDES: Slide[] = [
  {
    id: 'arena',
    gradient: 'rgba(10,12,16,0.88)',
    eyebrow: 'Live Battles',
    title: 'Arena',
    subtitle: 'Stake ARX-P on live predictions.',
    cta: 'Enter Arena',
    path: '/arena',
    accent: neon.purple,
    heroImage: bannerArena,
    heroMode: 'arena-blend',
    icon: 'swords',
  },
  {
    id: 'tasks',
    gradient: 'rgba(10,12,16,0.88)',
    eyebrow: 'Daily Rewards',
    title: 'Tasks',
    subtitle: 'Complete missions. Boost mining.',
    cta: 'View Tasks',
    path: '/tasks',
    accent: neon.teal,
    heroImage: bannerTasks,
    heroMode: 'cutout',
    icon: 'target',
  },
];

const ROTATE_MS = 5500;

function SlideIcon({ type, color }: { type?: Slide['icon']; color: string }) {
  if (type === 'swords') return <Swords size={10} strokeWidth={2.2} color={color} />;
  if (type === 'target') return <Target size={10} strokeWidth={2.2} color={color} />;
  return <Sparkles size={10} strokeWidth={2.2} color={color} />;
}

function HeroArt({ slide }: { slide: Slide }) {
  if (slide.heroMode === 'arena-blend') {
    return (
      <>
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          background: `radial-gradient(ellipse 80% 90% at 88% 50%, rgba(220,38,38,0.35) 0%, rgba(168,85,247,0.12) 35%, transparent 68%)`,
        }} />
        <img
          src={slide.heroImage}
          alt=""
          aria-hidden
          style={{
            position: 'absolute', right: 0, top: 0, bottom: 0, width: '58%', height: '100%',
            objectFit: 'cover', objectPosition: 'center 55%',
            opacity: 0.92,
            WebkitMaskImage: 'linear-gradient(90deg, transparent 0%, rgba(0,0,0,0.35) 18%, black 42%)',
            maskImage: 'linear-gradient(90deg, transparent 0%, rgba(0,0,0,0.35) 18%, black 42%)',
          }}
        />
        <div style={{
          position: 'absolute', right: 0, top: 0, bottom: 0, width: '58%', pointerEvents: 'none',
          background: 'linear-gradient(90deg, rgba(4,8,18,0.92) 0%, rgba(4,8,18,0.25) 38%, transparent 72%)',
        }} />
        <div style={{
          position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)',
          width: 6, height: 6, borderRadius: '50%', background: '#ff4444',
          boxShadow: '0 0 12px #ff4444, 0 0 24px rgba(255,68,68,0.5)',
          animation: 'arenaPulse 1.4s ease-in-out infinite',
        }} />
        <style>{'@keyframes arenaPulse{0%,100%{opacity:1;transform:translateY(-50%) scale(1)}50%{opacity:.5;transform:translateY(-50%) scale(1.3)}}'}</style>
      </>
    );
  }

  return (
    <>
      <img
        src={slide.heroImage}
        alt=""
        aria-hidden
        style={{
          position: 'absolute',
          right: 4,
          bottom: -2,
          width: slide.heroSize ?? 108,
          height: slide.heroSize ?? 108,
          objectFit: 'contain',
          objectPosition: 'bottom right',
          filter: `drop-shadow(0 10px 28px ${slide.accent}66)`,
          pointerEvents: 'none',
        }}
      />
    </>
  );
}

export function DashboardActivityCarousel() {
  const navigate = useNavigate();
  const location = useLocation();
  const routePrefix = location.pathname.startsWith('/ui-preview') ? '/ui-preview' : '';
  const [index, setIndex] = useState(0);
  const slides = SLIDES;
  const count = slides.length;

  const next = useCallback(() => {
    if (count <= 1) return;
    setIndex((i) => (i + 1) % count);
  }, [count]);

  useEffect(() => {
    if (count <= 1) return;
    const id = window.setInterval(next, ROTATE_MS);
    return () => window.clearInterval(id);
  }, [count, next]);

  if (count === 0) return null;

  const slide = slides[index];

  return (
    <div data-tour="play-carousel" style={{ position: 'relative' }}>
      <AnimatePresence mode="wait">
        <motion.div
          key={slide.id}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.32, ease: 'easeOut' }}
          style={{
            borderRadius: 20,
            overflow: 'hidden',
            border: '1px solid rgba(255,255,255,0.08)',
            boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.08)',
            background: slide.gradient,
            position: 'relative',
            minHeight: 128,
          }}
        >
          <HeroArt slide={slide} />

          <div style={{
            position: 'relative', zIndex: 2,
            padding: '14px 14px 13px',
            maxWidth: slide.heroMode === 'arena-blend' ? '58%' : '62%',
            display: 'flex', flexDirection: 'column', justifyContent: 'center',
            minHeight: 128,
          }}>
            <p style={{
              margin: 0, fontSize: 8, fontWeight: 800, letterSpacing: '0.2em',
              textTransform: 'uppercase', color: slide.accent,
              display: 'flex', alignItems: 'center', gap: 5,
            }}>
              <SlideIcon type={slide.icon} color={slide.accent} />
              {slide.eyebrow}
            </p>
            <h2 style={{
              margin: '4px 0 0', fontSize: 18, fontWeight: 900, letterSpacing: '-0.4px',
              color: neon.text, lineHeight: 1.05,
            }}>
              {slide.title}
            </h2>
            <p style={{
              margin: '4px 0 0', fontSize: 10, lineHeight: 1.35, maxWidth: '95%',
              color: neon.textMuted, fontWeight: 500,
            }}>
              {slide.subtitle}
            </p>
            <motion.button
              type="button"
              whileTap={{ scale: 0.97 }}
              onClick={() => navigate(`${routePrefix}${slide.path}`)}
              style={{
                marginTop: 10,
                alignSelf: 'flex-start',
                display: 'inline-flex', alignItems: 'center', gap: 5,
                padding: '8px 14px', borderRadius: 12, border: 'none', cursor: 'pointer',
                background: '#accafe',
                color: '#0c1018', fontSize: 10, fontWeight: 700, letterSpacing: '0.04em',
                fontFamily: neon.font,
              }}
            >
              {slide.cta}
              <ChevronRight size={13} strokeWidth={3} />
            </motion.button>
          </div>
        </motion.div>
      </AnimatePresence>

      {count > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginTop: 8 }}>
          {slides.map((s, i) => (
            <button
              key={s.id}
              type="button"
              aria-label={`Show ${s.title}`}
              onClick={() => setIndex(i)}
              style={{
                width: i === index ? 16 : 6, height: 6, borderRadius: 99, border: 'none', padding: 0,
                background: i === index ? slide.accent : 'rgba(232,252,255,0.18)',
                transition: 'all 0.25s ease', cursor: 'pointer',
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
