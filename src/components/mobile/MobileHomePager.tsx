import { useCallback, useRef, useState } from 'react';
import { motion, useMotionValue, useTransform, animate } from 'framer-motion';
import MobileDashboard from './MobileDashboard';
import GamingDashboard from './GamingDashboard';

const SWIPE_THRESHOLD = 60;

export default function MobileHomePager() {
  const [page, setPage] = useState(0);
  const startX = useRef(0);
  const startY = useRef(0);
  const dragging = useRef(false);
  const x = useMotionValue(0);
  const widthRef = useRef(typeof window !== 'undefined' ? window.innerWidth : 390);

  const goTo = useCallback((next: number) => {
    const clamped = Math.max(0, Math.min(1, next));
    setPage(clamped);
    animate(x, -clamped * widthRef.current, { type: 'spring', stiffness: 320, damping: 32 });
  }, [x]);

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    startX.current = e.touches[0].clientX;
    startY.current = e.touches[0].clientY;
    dragging.current = true;
    widthRef.current = window.innerWidth;
  }, []);

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    if (!dragging.current) return;
    const dx = e.touches[0].clientX - startX.current;
    const dy = e.touches[0].clientY - startY.current;
    if (Math.abs(dy) > Math.abs(dx) * 1.2) return;
    const base = -page * widthRef.current;
    x.set(base + dx);
  }, [page, x]);

  const onTouchEnd = useCallback((e: React.TouchEvent) => {
    if (!dragging.current) return;
    dragging.current = false;
    const dx = e.changedTouches[0].clientX - startX.current;
    if (dx < -SWIPE_THRESHOLD && page === 0) goTo(1);
    else if (dx > SWIPE_THRESHOLD && page === 1) goTo(0);
    else goTo(page);
  }, [goTo, page]);

  const indicatorOpacity = useTransform(x, [0, -widthRef.current], [1, 0.4]);

  return (
    <div
      style={{ overflow: 'hidden', width: '100vw', height: '100vh', touchAction: 'pan-y' }}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      <motion.div
        style={{
          display: 'flex', width: '200vw', height: '100vh', x,
        }}
      >
        <div style={{ width: '100vw', height: '100vh', overflow: 'hidden', flexShrink: 0 }}>
          <MobileDashboard />
        </div>
        <div style={{ width: '100vw', height: '100vh', overflowY: 'auto', flexShrink: 0, WebkitOverflowScrolling: 'touch' }}>
          <GamingDashboard onSwipeHint={() => goTo(0)} />
        </div>
      </motion.div>

      <motion.div
        style={{
          position: 'fixed', bottom: 108, left: '50%', transform: 'translateX(-50%)',
          display: 'flex', gap: 8, zIndex: 150, opacity: indicatorOpacity,
          pointerEvents: 'none',
        }}
      >
        {[0, 1].map((i) => (
          <div
            key={i}
            style={{
              width: page === i ? 22 : 8, height: 8, borderRadius: 4,
              background: page === i ? 'hsl(215 35% 62%)' : 'rgba(255,255,255,0.25)',
              transition: 'width 0.25s ease, background 0.25s ease',
            }}
          />
        ))}
      </motion.div>

      {page === 0 && (
        <button
          type="button"
          onClick={() => goTo(1)}
          style={{
            position: 'fixed', right: 12, top: '50%', transform: 'translateY(-50%)',
            zIndex: 150, width: 28, height: 56, borderRadius: 14,
            background: 'rgba(127,231,196,0.15)', border: '1px solid rgba(127,231,196,0.35)',
            color: '#7FE7C4', fontSize: 16, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
          }}
          aria-label="Open gaming dashboard"
        >
          ›
        </button>
      )}
    </div>
  );
}
