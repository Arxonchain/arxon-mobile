import { useCallback, useEffect, useLayoutEffect, useState } from 'react';
import { X } from 'lucide-react';
import { useAppTour } from '@/contexts/AppTourContext';
import { frostWash } from '@/walletFigma/flow/LiveScroll';
import { neon } from '@/features/arxon-v2/design/neonTokens';
import { tourTargetSelector } from '@/lib/tour/steps';
import robotGuide from '@/assets/arxon-robot-guide.png';

const Z = 10060;
const PAD = 6;
const NAV_CLEAR = 100;

type Rect = { top: number; left: number; width: number; height: number };

function readRect(el: Element): Rect {
  const r = el.getBoundingClientRect();
  return {
    top: Math.max(0, r.top - PAD),
    left: Math.max(0, r.left - PAD),
    width: r.width + PAD * 2,
    height: r.height + PAD * 2,
  };
}

export default function AppTourGuide() {
  const { active, step, stepIndex, totalSteps, continueTour, skipTour } = useAppTour();
  const [targetRect, setTargetRect] = useState<Rect | null>(null);

  const selector = tourTargetSelector(step?.target);

  const remeasure = useCallback(() => {
    if (!selector) {
      setTargetRect(null);
      return;
    }
    const el = document.querySelector(selector);
    setTargetRect(el ? readRect(el) : null);
  }, [selector]);

  useLayoutEffect(() => {
    if (!active) return;
    if (selector) {
      const el = document.querySelector(selector);
      el?.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'smooth' });
    }
    const t = window.setTimeout(remeasure, 280);
    remeasure();
    return () => window.clearTimeout(t);
  }, [active, step?.id, selector, remeasure]);

  useEffect(() => {
    if (!active) return;
    const onResize = () => remeasure();
    window.addEventListener('resize', onResize);
    window.addEventListener('scroll', onResize, true);
    const id = window.setInterval(remeasure, 400);
    return () => {
      window.removeEventListener('resize', onResize);
      window.removeEventListener('scroll', onResize, true);
      window.clearInterval(id);
    };
  }, [active, remeasure]);

  if (!active || !step) return null;

  const last = stepIndex >= totalSteps - 1;
  const preferTop =
    step.card === 'top' ||
    (step.card !== 'bottom' && targetRect && targetRect.top + targetRect.height > window.innerHeight * 0.48);
  const cardAtTop = Boolean(preferTop);

  const hole = targetRect;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: Z,
        pointerEvents: 'none',
        fontFamily: neon.font,
      }}
    >
      {hole ? (
        <>
          <DimPane top={0} left={0} width="100%" height={hole.top} />
          <DimPane
            top={hole.top}
            left={0}
            width={hole.left}
            height={hole.height}
          />
          <DimPane
            top={hole.top}
            left={hole.left + hole.width}
            width={`calc(100% - ${hole.left + hole.width}px)`}
            height={hole.height}
          />
          <DimPane
            top={hole.top + hole.height}
            left={0}
            width="100%"
            height={`calc(100% - ${hole.top + hole.height}px)`}
          />
          <div
            aria-hidden
            style={{
              position: 'absolute',
              top: hole.top,
              left: hole.left,
              width: hole.width,
              height: hole.height,
              borderRadius: 14,
              border: '1.5px solid rgba(172,202,254,0.85)',
              boxShadow: '0 0 0 1px rgba(10,12,16,0.35)',
              pointerEvents: 'none',
            }}
          />
        </>
      ) : (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'rgba(6,8,12,0.62)',
            pointerEvents: 'auto',
          }}
        />
      )}

      <div
        role="dialog"
        aria-labelledby="arxon-tour-title"
        style={{
          position: 'absolute',
          left: 16,
          right: 16,
          ...(cardAtTop
            ? { top: 'max(12px, env(safe-area-inset-top, 0px))' }
            : { bottom: NAV_CLEAR }),
          display: 'flex',
          justifyContent: 'center',
          pointerEvents: 'none',
        }}
      >
        <div
          style={{
            width: '100%',
            maxWidth: 300,
            pointerEvents: 'auto',
            borderRadius: 18,
            ...frostWash,
            border: '1px solid rgba(61,109,255,0.28)',
            boxShadow: '0 10px 28px rgba(0,0,0,0.28)',
            padding: '12px 12px 12px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
            <img
              src={robotGuide}
              alt=""
              width={40}
              height={40}
              style={{ width: 40, height: 40, objectFit: 'contain', flexShrink: 0 }}
            />
            <div style={{ flex: 1, minWidth: 0 }}>
              <p
                id="arxon-tour-title"
                style={{
                  margin: 0,
                  fontSize: 14,
                  fontWeight: 750,
                  color: '#0c1018',
                  letterSpacing: '-0.2px',
                  lineHeight: 1.25,
                }}
              >
                {step.title}
              </p>
              <p
                style={{
                  margin: '4px 0 0',
                  fontSize: 12,
                  lineHeight: 1.4,
                  color: '#5c6370',
                }}
              >
                {step.message}
              </p>
            </div>
            <button
              type="button"
              onClick={skipTour}
              aria-label="Skip guide"
              style={{
                width: 28,
                height: 28,
                borderRadius: 10,
                border: '1px solid rgba(12,16,24,0.12)',
                background: 'rgba(12,16,24,0.04)',
                color: '#5c6370',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                flexShrink: 0,
              }}
            >
              <X size={13} strokeWidth={2.2} />
            </button>
          </div>

          <div
            style={{
              marginTop: 10,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 8,
            }}
          >
            <span style={{ fontSize: 11, fontWeight: 650, color: '#8c8f99' }}>
              {stepIndex + 1} / {totalSteps}
            </span>
            <button
              type="button"
              onClick={continueTour}
              style={{
                height: 32,
                padding: '0 14px',
                borderRadius: 11,
                border: 'none',
                background: '#0c1018',
                color: '#fff',
                fontSize: 12,
                fontWeight: 700,
                fontFamily: neon.font,
                cursor: 'pointer',
              }}
            >
              {last ? 'Finish' : step.id === 'welcome' ? 'Start' : 'Next'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function DimPane({
  top,
  left,
  width,
  height,
}: {
  top: number;
  left: number;
  width: number | string;
  height: number | string;
}) {
  return (
    <div
      style={{
        position: 'absolute',
        top,
        left,
        width,
        height,
        background: 'rgba(6,8,12,0.58)',
        pointerEvents: 'auto',
      }}
    />
  );
}
