import { useCallback, useEffect, useRef, useState } from 'react';
import AppFailureScreen from '@/components/system/AppFailureScreen';
import AppLoadFailureScreen from '@/components/system/AppLoadFailureScreen';
import PageErrorState from '@/components/system/PageErrorState';
import SlowLoadOverlay from '@/components/system/SlowLoadOverlay';
import { errorUi } from '@/components/system/errorUiTokens';
import { neon } from '@/features/arxon-v2/design/neonTokens';

/** Phone bezel — sizes to flex parent; transform clips fixed overlays here. */
function PhoneFrame({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        aspectRatio: '390 / 844',
        width: 'auto',
        height: 'auto',
        maxWidth: 'min(390px, 100%)',
        maxHeight: '100%',
        borderRadius: 44,
        overflow: 'hidden',
        position: 'relative',
        border: '10px solid #141820',
        boxShadow: '0 24px 80px rgba(0,0,0,0.65), inset 0 0 0 1px rgba(255,255,255,0.06)',
        background: errorUi.bg,
        transform: 'translateZ(0)',
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: 10,
          left: '50%',
          transform: 'translateX(-50%)',
          width: 96,
          height: 28,
          borderRadius: 20,
          background: '#0a0e14',
          zIndex: 50,
          pointerEvents: 'none',
        }}
      />
      {children}
    </div>
  );
}

function MockPageShell({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        background: errorUi.bg,
        display: 'flex',
        flexDirection: 'column',
        fontFamily: errorUi.font,
      }}
    >
      <div
        style={{
          padding: '52px 20px 16px',
          borderBottom: `1px solid ${errorUi.panelBorder}`,
          background: 'rgba(9,26,48,0.6)',
        }}
      >
        <div style={{ height: 10, width: 80, borderRadius: 4, background: `${errorUi.cyan}33`, marginBottom: 8 }} />
        <div style={{ height: 14, width: 140, borderRadius: 4, background: `${errorUi.text}22` }} />
      </div>
      <div style={{ flex: 1, overflow: 'auto' }}>{children}</div>
    </div>
  );
}

interface Scenario {
  id: string;
  title: string;
  description: string;
  render: () => React.ReactNode;
}

const scenarios: Scenario[] = [
  {
    id: 'ota-dns',
    title: 'OTA / bundle load failed',
    description: 'DNS resolution failed loading the web bundle (ERR_NAME_NOT_RESOLVED). Shown before the app boots.',
    render: () => (
      <AppLoadFailureScreen
        kind="dns"
        detail="ERR_NAME_NOT_RESOLVED · arxon-mobile.pages.dev"
        showRestart
      />
    ),
  },
  {
    id: 'offline',
    title: 'Offline / no internet',
    description: 'Full-screen state when the device has no network connectivity.',
    render: () => <AppFailureScreen failureType="offline" onPrimary={() => {}} />,
  },
  {
    id: 'slow-load',
    title: 'Slow loading overlay',
    description: 'Non-blocking overlay while auth or boot takes longer than expected. Page content stays visible underneath.',
    render: () => (
      <>
        <MockPageShell>
          <div style={{ padding: 24, color: errorUi.textMuted, fontSize: 13, opacity: 0.4 }}>
            Dashboard content loading…
          </div>
        </MockPageShell>
        <SlowLoadOverlay loading delayMs={0} message="Still loading…" />
      </>
    ),
  },
  {
    id: 'backend',
    title: 'Backend / service down',
    description: 'API or Supabase unreachable — user can retry without leaving the app.',
    render: () => <AppFailureScreen failureType="backend_down" onPrimary={() => {}} />,
  },
  {
    id: 'session',
    title: 'Session expired',
    description: 'JWT or refresh token invalid — prompts re-authentication.',
    render: () => <AppFailureScreen failureType="session_expired" onPrimary={() => {}} />,
  },
  {
    id: 'timeout',
    title: 'API timeout',
    description: 'Request exceeded the timeout threshold. Includes optional restart for native builds.',
    render: () => <AppFailureScreen failureType="timeout" showRestart onPrimary={() => {}} />,
  },
  {
    id: 'maintenance',
    title: 'Maintenance mode',
    description: 'Server-side maintenance flag active — informational, no retry action.',
    render: () => <AppFailureScreen failureType="maintenance" onPrimary={() => {}} />,
  },
  {
    id: 'update',
    title: 'App update required',
    description: 'Native build below minimum version — directs user to the store.',
    render: () => <AppFailureScreen failureType="update_required" onPrimary={() => {}} />,
  },
  {
    id: '404',
    title: 'Page not found (404)',
    description: 'Unknown route within the app shell.',
    render: () => <AppFailureScreen failureType="not_found" onPrimary={() => {}} />,
  },
  {
    id: 'crash',
    title: 'Unknown / crash',
    description: 'ErrorBoundary catch-all with optional dev stack trace.',
    render: () => (
      <AppFailureScreen
        failureType="unknown"
        onPrimary={() => {}}
        devError={new Error('TypeError: Cannot read properties of undefined (reading "balance")')}
      />
    ),
  },
  {
    id: 'partial',
    title: 'Partial page error',
    description: 'Inline PageErrorState when one section fails but the rest of the page is usable.',
    render: () => (
      <MockPageShell>
        <PageErrorState
          failureType="backend_down"
          onRetry={() => {}}
          message="Could not load arena matches. Your balance is still up to date."
        />
      </MockPageShell>
    ),
  },
];

const SWIPE_THRESHOLD = 48;

function NavButton({
  label,
  onClick,
  disabled,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      disabled={disabled}
      style={{
        width: 44,
        height: 44,
        borderRadius: '50%',
        border: `1px solid ${disabled ? 'rgba(255,255,255,0.06)' : `${neon.cyan}44`}`,
        background: disabled ? 'rgba(255,255,255,0.03)' : 'rgba(0,212,255,0.08)',
        color: disabled ? neon.textMuted : neon.cyan,
        fontSize: 20,
        lineHeight: 1,
        cursor: disabled ? 'default' : 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'background 0.15s, border-color 0.15s',
      }}
    >
      {label === 'Previous slide' ? '‹' : '›'}
    </button>
  );
}

/** Standalone carousel — one failure screen at a time inside a 390×844 phone frame. */
export default function FailureUiPreview() {
  const [index, setIndex] = useState(0);
  const touchStartX = useRef<number | null>(null);
  const total = scenarios.length;
  const slide = scenarios[index];

  const goPrev = useCallback(() => {
    setIndex((i) => (i > 0 ? i - 1 : i));
  }, []);

  const goNext = useCallback(() => {
    setIndex((i) => (i < total - 1 ? i + 1 : i));
  }, [total]);

  const goTo = useCallback((i: number) => {
    setIndex(Math.max(0, Math.min(total - 1, i)));
  }, [total]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') goPrev();
      if (e.key === 'ArrowRight') goNext();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [goPrev, goNext]);

  const onTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0]?.clientX ?? null;
  };

  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current == null) return;
    const delta = (e.changedTouches[0]?.clientX ?? touchStartX.current) - touchStartX.current;
    touchStartX.current = null;
    if (delta > SWIPE_THRESHOLD) goPrev();
    else if (delta < -SWIPE_THRESHOLD) goNext();
  };

  return (
    <div
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
      style={{
        height: '100dvh',
        minHeight: '100vh',
        maxHeight: '100dvh',
        background: 'radial-gradient(ellipse 80% 60% at 50% 0%, #0a1628 0%, #030508 55%, #010204 100%)',
        fontFamily: neon.font,
        color: neon.text,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        userSelect: 'none',
        boxSizing: 'border-box',
      }}
    >
      <header style={{ textAlign: 'center', padding: '12px 20px 6px', flexShrink: 0 }}>
        <p
          style={{
            margin: '0 0 6px',
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            color: neon.cyan,
          }}
        >
          Dev preview
        </p>
        <h1 style={{ margin: '0 0 4px', fontSize: 22, fontWeight: 800, letterSpacing: '0.03em' }}>
          Failure & error UI
        </h1>
        <p style={{ margin: 0, fontSize: 13, color: neon.textMuted }}>
          {index + 1} / {total}
          <span style={{ margin: '0 8px', opacity: 0.4 }}>·</span>
          <span style={{ fontSize: 12 }}>← → keys · swipe on touch</span>
        </p>
      </header>

      <main
        style={{
          flex: 1,
          minHeight: 0,
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '8px 20px',
        }}
      >
        <div
          style={{
            flex: 1,
            minHeight: 0,
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <PhoneFrame key={slide.id}>{slide.render()}</PhoneFrame>
        </div>
      </main>

      <footer
        style={{
          flexShrink: 0,
          background: 'rgba(2, 6, 14, 0.92)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          borderTop: '1px solid rgba(255, 255, 255, 0.08)',
        }}
      >
        <div
          style={{
            textAlign: 'center',
            maxWidth: 480,
            margin: '0 auto',
            padding: '10px 20px 0',
          }}
        >
          <h2 style={{ margin: '0 0 4px', fontSize: 16, fontWeight: 700, letterSpacing: '0.02em' }}>
            {slide.title}
          </h2>
          <p
            style={{
              margin: 0,
              fontSize: 12,
              color: neon.textMuted,
              lineHeight: 1.45,
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}
          >
            {slide.description}
          </p>
        </div>

        <nav
          aria-label="Carousel navigation"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 16,
            padding: '10px 20px max(10px, env(safe-area-inset-bottom))',
          }}
        >
        <NavButton label="Previous slide" onClick={goPrev} disabled={index === 0} />

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {scenarios.map((s, i) => (
            <button
              key={s.id}
              type="button"
              aria-label={`Go to slide ${i + 1}: ${s.title}`}
              aria-current={i === index ? 'true' : undefined}
              onClick={() => goTo(i)}
              style={{
                width: i === index ? 22 : 8,
                height: 8,
                borderRadius: 4,
                border: 'none',
                padding: 0,
                cursor: 'pointer',
                background: i === index ? neon.cyan : 'rgba(255,255,255,0.22)',
                transition: 'width 0.2s, background 0.2s',
              }}
            />
          ))}
        </div>

        <NavButton label="Next slide" onClick={goNext} disabled={index === total - 1} />
        </nav>
      </footer>
    </div>
  );
}
