import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { font } from '@/walletFigma/tokens';

/** Pill swipe used on Testnet and Vault. A tap does nothing; the arrow has to reach the end. */
export function SwipeVault({ label, onOpen }: { label: string; onOpen: () => void }) {
  const track = useRef<HTMLDivElement>(null);
  const xRef = useRef(0);
  const drag = useRef<{ startX: number; origin: number } | null>(null);
  const [x, setX] = useState(0);

  function limit() {
    return Math.max(0, (track.current?.clientWidth ?? 160) - 40);
  }

  function place(next: number) {
    const clamped = Math.min(limit(), Math.max(0, next));
    xRef.current = clamped;
    setX(clamped);
  }

  function down(e: ReactPointerEvent) {
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { startX: e.clientX, origin: xRef.current };
  }

  function move(e: ReactPointerEvent) {
    if (!drag.current) return;
    e.stopPropagation();
    place(drag.current.origin + e.clientX - drag.current.startX);
  }

  function up(e: ReactPointerEvent) {
    if (!drag.current) return;
    e.stopPropagation();
    drag.current = null;
    if (xRef.current >= limit() - 6) onOpen();
    place(0);
  }

  return (
    <div ref={track} style={{ position: 'relative', flex: 1, minWidth: 0, height: 44, borderRadius: 22, background: '#1c2025', overflow: 'hidden', touchAction: 'none' }}>
      <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: x + 40, background: '#243044' }} />
      <span style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 8px 0 40px', fontSize: 13, fontWeight: 600, color: '#fff', pointerEvents: 'none' }}>{label}</span>
      <div
        role="slider"
        aria-label={`Swipe to open ${label}`}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={limit() ? Math.round((x / limit()) * 100) : 0}
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={up}
        onPointerCancel={up}
        style={{ position: 'absolute', left: 4 + x, top: 4, width: 36, height: 36, borderRadius: 18, background: '#accafe', display: 'flex', alignItems: 'center', justifyContent: 'center', touchAction: 'none', cursor: 'grab' }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
          <path d="M12 19V5" stroke="#0c1018" strokeWidth="2.2" strokeLinecap="round" />
          <path d="M5 12L12 5L19 12" stroke="#0c1018" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
    </div>
  );
}

/** Rectangular swipe, same gesture as Private pay on Testnet. */
export function SwipeConfirm({ label, disabled, processing, onConfirm }: { label: string; disabled?: boolean; processing?: boolean; onConfirm: () => void }) {
  const track = useRef<HTMLDivElement>(null);
  const xRef = useRef(0);
  const drag = useRef<{ startX: number; origin: number } | null>(null);
  const [x, setX] = useState(0);

  function limit() {
    return Math.max(0, (track.current?.clientWidth ?? 320) - 44);
  }

  function place(next: number) {
    const clamped = Math.min(limit(), Math.max(0, next));
    xRef.current = clamped;
    setX(clamped);
  }

  function down(e: ReactPointerEvent) {
    if (disabled || processing) return;
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { startX: e.clientX, origin: xRef.current };
  }

  function move(e: ReactPointerEvent) {
    if (!drag.current) return;
    e.stopPropagation();
    place(drag.current.origin + e.clientX - drag.current.startX);
  }

  function up(e: ReactPointerEvent) {
    if (!drag.current) return;
    e.stopPropagation();
    drag.current = null;
    const done = xRef.current >= limit() - 8;
    place(0);
    if (done && !disabled && !processing) onConfirm();
  }

  return (
    <div ref={track} style={{ position: 'relative', width: '100%', height: 48, borderRadius: 12, background: processing ? '#1c2025' : disabled ? '#161a1f' : '#1c2025', overflow: 'hidden', touchAction: 'none', flex: '0 0 auto', opacity: disabled && !processing ? 0.55 : 1 }}>
      <style>{`@keyframes arxon-process{0%{transform:translateX(-120%)}100%{transform:translateX(220%)}}`}</style>
      {processing ? <div style={{ position: 'absolute', top: 0, bottom: 0, width: '40%', background: 'linear-gradient(90deg, transparent, rgba(172,202,254,0.45), transparent)', animation: 'arxon-process 1.1s linear infinite' }} /> : <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: x + 44, background: '#243044' }} />}
      <span style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 12px 0 44px', fontFamily: font.sans, fontSize: 15, fontWeight: 600, color: '#fff', pointerEvents: 'none' }}>{processing ? <ProcessingWord /> : label}</span>
      <div
        role="slider"
        aria-label={`Swipe to ${label}`}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={limit() ? Math.round((x / limit()) * 100) : 0}
        aria-disabled={disabled || processing || undefined}
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={up}
        onPointerCancel={up}
        style={{ position: 'absolute', left: processing ? 4 : 4 + x, top: 4, width: 40, height: 40, borderRadius: 10, background: '#accafe', display: 'flex', alignItems: 'center', justifyContent: 'center', touchAction: 'none', cursor: disabled || processing ? 'default' : 'grab' }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
          <path d="M12 19V5" stroke="#0c1018" strokeWidth="2.2" strokeLinecap="round" />
          <path d="M5 12L12 5L19 12" stroke="#0c1018" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
    </div>
  );
}

function ProcessingWord() {
  const [n, setN] = useState(0);
  useEffect(() => {
    const timer = window.setInterval(() => setN((value) => (value + 1) % 4), 400);
    return () => window.clearInterval(timer);
  }, []);
  return <>Processing{'.'.repeat(n)}</>;
}

export function CenterLine({ label, value, color = '#fff' }: { label: string; value: string; color?: string }) {
  return (
    <div style={{ padding: '8px 0', textAlign: 'left' }}>
      <div style={{ color: '#8b9097', fontSize: 12, lineHeight: 1.2 }}>{label}</div>
      <div style={{ marginTop: 3, fontWeight: 600, fontSize: 15, lineHeight: 1.25, color, wordBreak: 'break-all' }}>{value}</div>
    </div>
  );
}
