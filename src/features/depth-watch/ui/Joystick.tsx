import { useCallback, useRef } from 'react';

interface JoystickProps {
  onMove: (x: number, y: number) => void;
  disabled?: boolean;
}

export default function Joystick({ onMove, disabled }: JoystickProps) {
  const baseRef = useRef<HTMLDivElement>(null);
  const stickRef = useRef<HTMLDivElement>(null);
  const centerRef = useRef({ x: 0, y: 0 });
  const activeRef = useRef(false);
  const maxR = 38;

  const reset = useCallback(() => {
    activeRef.current = false;
    onMove(0, 0);
    if (stickRef.current) {
      stickRef.current.style.left = '31px';
      stickRef.current.style.top = '31px';
    }
  }, [onMove]);

  const handleMove = useCallback((clientX: number, clientY: number) => {
    if (!activeRef.current || disabled) return;
    let dx = clientX - centerRef.current.x;
    let dy = clientY - centerRef.current.y;
    const dist = Math.hypot(dx, dy);
    if (dist > maxR) {
      dx = (dx / dist) * maxR;
      dy = (dy / dist) * maxR;
    }
    if (stickRef.current) {
      stickRef.current.style.left = `${31 + dx}px`;
      stickRef.current.style.top = `${31 + dy}px`;
    }
    onMove(dx / maxR, dy / maxR);
  }, [disabled, onMove]);

  const onStart = (clientX: number, clientY: number) => {
    if (disabled) return;
    activeRef.current = true;
    const r = baseRef.current?.getBoundingClientRect();
    if (!r) return;
    centerRef.current = { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    handleMove(clientX, clientY);
  };

  return (
    <div
      ref={baseRef}
      style={{
        position: 'absolute', bottom: 36, left: 28, width: 110, height: 110,
        borderRadius: '50%', background: 'rgba(244,228,193,0.08)',
        border: '2px solid rgba(244,228,193,0.25)', zIndex: 15, touchAction: 'none',
        opacity: disabled ? 0.35 : 1,
      }}
      onTouchStart={(e) => { e.preventDefault(); onStart(e.touches[0].clientX, e.touches[0].clientY); }}
      onTouchMove={(e) => { e.preventDefault(); handleMove(e.touches[0].clientX, e.touches[0].clientY); }}
      onTouchEnd={(e) => { e.preventDefault(); reset(); }}
      onMouseDown={(e) => { onStart(e.clientX, e.clientY); }}
      onMouseMove={(e) => { if (e.buttons) handleMove(e.clientX, e.clientY); }}
      onMouseUp={reset}
      onMouseLeave={() => { if (activeRef.current) reset(); }}
    >
      <div
        ref={stickRef}
        style={{
          position: 'absolute', width: 48, height: 48, borderRadius: '50%',
          background: 'rgba(127,231,196,0.5)', border: '2px solid #7FE7C4',
          top: 31, left: 31, pointerEvents: 'none',
        }}
      />
    </div>
  );
}
