import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, Sparkles, Swords } from 'lucide-react';
import { WORD_FORGE_ENABLED } from '@/lib/wordForgeFeature';
import { FORGE_UI } from '@/features/word-forge/data/uiAssets';

interface Slide {
  id: string;
  image?: string;
  gradient?: string;
  eyebrow: string;
  title: string;
  subtitle: string;
  cta: string;
  path: string;
  accent: string;
}

const SLIDES: Slide[] = [
  ...(WORD_FORGE_ENABLED ? [{
    id: 'word-forge',
    image: FORGE_UI.dashboardBanner,
    eyebrow: 'New Game Mode',
    title: 'Word Forge',
    subtitle: 'Spell. Stack. Survive. Earn ARX-P in the sci-fi word arena.',
    cta: 'Go to Game',
    path: '/games',
    accent: 'hsl(38 90% 55%)',
  }] : []),
  {
    id: 'arena',
    gradient: 'linear-gradient(135deg, hsl(255 45% 22%), hsl(280 50% 18%), hsl(225 35% 10%))',
    eyebrow: 'Live Now',
    title: 'Arena Battles',
    subtitle: 'Stake ARX-P on predictions. Win pools when your side takes the sector.',
    cta: 'Enter Arena',
    path: '/arena',
    accent: 'hsl(255 55% 68%)',
  },
  {
    id: 'tasks',
    gradient: 'linear-gradient(135deg, hsl(155 40% 18%), hsl(175 45% 14%), hsl(225 35% 10%))',
    eyebrow: 'Daily Rewards',
    title: 'Complete Tasks',
    subtitle: 'Check in, post on X, and finish missions to boost your mining rate.',
    cta: 'View Tasks',
    path: '/tasks',
    accent: 'hsl(155 50% 52%)',
  },
];

const ROTATE_MS = 5500;

export function DashboardActivityCarousel() {
  const navigate = useNavigate();
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
    <div style={{ position: 'relative' }}>
      <AnimatePresence mode="wait">
        <motion.div
          key={slide.id}
          initial={{ opacity: 0, x: 24 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -24 }}
          transition={{ duration: 0.35, ease: 'easeOut' }}
          style={{
            borderRadius: 22,
            overflow: 'hidden',
            border: `1px solid ${slide.accent}33`,
            boxShadow: `0 16px 40px -12px ${slide.accent}22, 0 4px 20px rgba(0,0,0,0.35)`,
            background: slide.gradient ?? 'hsl(225 30% 8%)',
            position: 'relative',
            minHeight: 168,
          }}
        >
          {slide.image && (
            <img
              src={slide.image}
              alt=""
              aria-hidden
              style={{
                position: 'absolute', inset: 0, width: '100%', height: '100%',
                objectFit: 'cover', objectPosition: 'center',
                opacity: 0.92,
              }}
            />
          )}
          <div style={{
            position: 'absolute', inset: 0,
            background: slide.image
              ? 'linear-gradient(90deg, rgba(4,8,18,0.92) 0%, rgba(4,8,18,0.55) 55%, rgba(4,8,18,0.25) 100%)'
              : 'linear-gradient(180deg, transparent, rgba(0,0,0,0.35))',
          }} />
          <div style={{
            position: 'relative', zIndex: 1,
            padding: '18px 18px 16px',
            display: 'flex', flexDirection: 'column', justifyContent: 'flex-end',
            minHeight: 168,
          }}>
            <p style={{
              margin: 0, fontSize: 9, fontWeight: 700, letterSpacing: '0.2em',
              textTransform: 'uppercase', color: slide.accent,
              display: 'flex', alignItems: 'center', gap: 6,
            }}>
              {slide.id === 'word-forge' ? <Sparkles size={11} /> : slide.id === 'arena' ? <Swords size={11} /> : <Sparkles size={11} />}
              {slide.eyebrow}
            </p>
            <h2 style={{
              margin: '6px 0 0', fontSize: 22, fontWeight: 800, letterSpacing: '-0.3px',
              color: 'hsl(215 20% 96%)', lineHeight: 1.1,
            }}>
              {slide.title}
            </h2>
            <p style={{
              margin: '8px 0 0', fontSize: 12, lineHeight: 1.45, maxWidth: '72%',
              color: 'hsl(215 20% 78%)', fontWeight: 500,
            }}>
              {slide.subtitle}
            </p>
            <motion.button
              type="button"
              whileTap={{ scale: 0.97 }}
              onClick={() => navigate(slide.path)}
              style={{
                marginTop: 14, alignSelf: 'flex-start',
                display: 'inline-flex', alignItems: 'center', gap: 8,
                padding: '10px 18px', borderRadius: 14, border: 'none', cursor: 'pointer',
                background: `linear-gradient(135deg, ${slide.accent}, hsl(38 80% 45%))`,
                color: 'hsl(225 30% 6%)', fontSize: 13, fontWeight: 800,
                boxShadow: `0 6px 20px ${slide.accent}44`,
              }}
            >
              {slide.cta}
              <ChevronRight size={16} strokeWidth={3} />
            </motion.button>
          </div>
        </motion.div>
      </AnimatePresence>

      {count > 1 && (
        <div style={{
          display: 'flex', justifyContent: 'center', gap: 6, marginTop: 10,
        }}>
          {slides.map((s, i) => (
            <button
              key={s.id}
              type="button"
              aria-label={`Show ${s.title}`}
              onClick={() => setIndex(i)}
              style={{
                width: i === index ? 18 : 7, height: 7, borderRadius: 99, border: 'none', padding: 0,
                background: i === index ? slide.accent : 'hsl(215 25% 28%)',
                transition: 'all 0.25s ease', cursor: 'pointer',
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
