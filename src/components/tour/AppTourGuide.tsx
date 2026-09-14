import { useCallback, useEffect, useLayoutEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, X } from 'lucide-react';
import { useAppTourOptional } from '@/contexts/AppTourContext';
import { tourTargetSelector } from '@/lib/tour/steps';
import { v2 } from '@/features/arxon-v2/design/tokens';
import arxonRobot from '@/assets/arxon-robot-guide.png';

type Rect = { top: number; left: number; width: number; height: number };

const PAD = 10;
const Z = 10060;

function measureTarget(selector: string | null): Rect | null {
  if (!selector) return null;
  const el = document.querySelector(selector);
  if (!el) return null;
  const r = el.getBoundingClientRect();
  if (r.width < 2 || r.height < 2) return null;
  return { top: r.top, left: r.left, width: r.width, height: r.height };
}

export default function AppTourGuide() {
  const tour = useAppTourOptional();
  const [targetRect, setTargetRect] = useState<Rect | null>(null);

  const step = tour?.active ? tour.step : null;
  const selector = tourTargetSelector(step?.target);

  const remeasure = useCallback(() => {
    setTargetRect(measureTarget(selector));
  }, [selector]);

  useLayoutEffect(() => {
    remeasure();
  }, [remeasure, step?.id, step?.target]);

  useEffect(() => {
    if (!tour?.active || !selector) return;
    remeasure();
    const id = window.setInterval(remeasure, 400);
    window.addEventListener('resize', remeasure);
    window.addEventListener('scroll', remeasure, true);
    return () => {
      window.clearInterval(id);
      window.removeEventListener('resize', remeasure);
      window.removeEventListener('scroll', remeasure, true);
    };
  }, [tour?.active, selector, remeasure]);

  if (!tour?.active || !step) return null;

  const isWelcome = step.id === 'welcome';
  const accent = step.accent;
  const progress = tour.totalSteps > 0 ? (tour.stepIndex + 1) / tour.totalSteps : 0;

  const spotlight = targetRect && !isWelcome && (
    <motion.div
      key={`spot-${step.id}`}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      style={{
        position: 'fixed',
        top: targetRect.top - PAD,
        left: targetRect.left - PAD,
        width: targetRect.width + PAD * 2,
        height: targetRect.height + PAD * 2,
        borderRadius: 18,
        boxShadow: '0 0 0 9999px rgba(2, 6, 14, 0.88)',
        border: `2px solid ${accent}`,
        pointerEvents: 'none',
        zIndex: Z,
        transition: 'top 0.35s ease, left 0.35s ease, width 0.35s ease, height 0.35s ease',
      }}
    />
  );

  return (
    <AnimatePresence>
      <motion.div
        key="tour-root"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        style={{ position: 'fixed', inset: 0, zIndex: Z - 1, pointerEvents: 'none' }}
      >
        {isWelcome && (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(2, 6, 14, 0.88)',
              pointerEvents: 'auto',
              zIndex: Z - 1,
            }}
          />
        )}

        {spotlight}

        <motion.div
          initial={{ opacity: 0, y: 28 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 380, damping: 32 }}
          style={{
            position: 'fixed',
            left: 16,
            right: 16,
            bottom: 'max(96px, calc(env(safe-area-inset-bottom, 0px) + 88px))',
            maxWidth: 440,
            margin: '0 auto',
            pointerEvents: 'auto',
            zIndex: Z + 1,
          }}
        >
          <div
            style={{
              borderRadius: 24,
              overflow: 'hidden',
              background: 'linear-gradient(165deg, rgba(14,30,52,0.97) 0%, rgba(6,12,24,0.98) 100%)',
              border: `1px solid ${accent}44`,
              boxShadow: `0 24px 60px rgba(0,0,0,0.55), 0 0 40px ${accent}18`,
            }}
          >
            <div style={{ display: 'flex', gap: 14, padding: '16px 16px 14px', alignItems: 'flex-end' }}>
              <div
                style={{
                  flexShrink: 0,
                  width: 88,
                  height: 88,
                  borderRadius: 20,
                  overflow: 'hidden',
                  background: `linear-gradient(145deg, ${accent}22, rgba(255,255,255,0.04))`,
                  border: `1px solid ${accent}33`,
                  boxShadow: `0 8px 24px ${accent}22`,
                }}
              >
                <img
                  src={arxonRobot}
                  alt="Arxon robot guide"
                  style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                />
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                  <p
                    style={{
                      margin: 0,
                      fontSize: 10,
                      fontWeight: 800,
                      letterSpacing: '0.14em',
                      textTransform: 'uppercase',
                      color: accent,
                    }}
                  >
                    Arxon Guide · {tour.stepIndex + 1}/{tour.totalSteps}
                  </p>
                  <button
                    type="button"
                    onClick={tour.skipTour}
                    aria-label="Skip tour"
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: v2.brand.mutedSoft,
                      cursor: 'pointer',
                      padding: 4,
                      display: 'flex',
                    }}
                  >
                    <X size={16} />
                  </button>
                </div>
                <h3
                  style={{
                    margin: '6px 0 0',
                    fontSize: 18,
                    fontWeight: 900,
                    color: v2.brand.steelBright,
                    letterSpacing: '-0.3px',
                    lineHeight: 1.2,
                  }}
                >
                  {step.title}
                </h3>
                <p style={{ margin: '8px 0 0', fontSize: 13, lineHeight: 1.45, color: v2.brand.mutedSoft }}>
                  {step.message}
                </p>
              </div>
            </div>

            <div style={{ height: 3, background: 'rgba(255,255,255,0.06)' }}>
              <motion.div
                initial={false}
                animate={{ width: `${progress * 100}%` }}
                style={{ height: '100%', background: `linear-gradient(90deg, ${accent}, ${v2.accent.cyan})` }}
              />
            </div>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 10,
                padding: '12px 16px 16px',
              }}
            >
              <button
                type="button"
                onClick={tour.skipTour}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: v2.brand.mutedSoft,
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: 'pointer',
                  padding: '8px 4px',
                }}
              >
                Skip tour
              </button>

              {isWelcome ? (
                <button
                  type="button"
                  onClick={tour.nextStep}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '12px 20px',
                    borderRadius: 99,
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: 14,
                    fontWeight: 800,
                    color: '#041018',
                    background: `linear-gradient(135deg, ${v2.accent.cyan}, ${accent})`,
                    boxShadow: `0 8px 24px ${accent}44`,
                  }}
                >
                  Start
                  <ChevronRight size={16} />
                </button>
              ) : (
                <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: accent, textAlign: 'right' }}>
                  {step.id === 'verify' && 'Complete verification above ↑'}
                  {step.id === 'tasks' && 'Check in or claim a task above ↑'}
                  {step.id === 'mining' && 'Tap the mining orb ↑'}
                  {step.id === 'play' && 'Open Arena or Word Forge ↑'}
                </p>
              )}
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
