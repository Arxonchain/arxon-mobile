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
  const maxR = 42;

  const reset = useCallback(() => {
    activeRef.current = false;
    onMove(0, 0);
    if (stickRef.current) {
      stickRef.current.style.left = '34px';
      stickRef.current.style.top = '34px';
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
      stickRef.current.style.left = `${34 + dx}px`;
      stickRef.current.style.top = `${34 + dy}px`;
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
        position: 'absolute', bottom: 32, left: 22, width: 120, height: 120,
        borderRadius: '50%',
        background: 'linear-gradient(180deg,rgba(255,255,255,0.18),rgba(0,0,0,0.35))',
        border: '4px solid #fff',
        boxShadow: '0 6px 0 rgba(0,0,0,0.35), inset 0 2px 8px rgba(255,255,255,0.15)',
        zIndex: 15, touchAction: 'none',
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
          position: 'absolute', width: 52, height: 52, borderRadius: '50%',
          background: 'linear-gradient(180deg,#7FE7C4,#4FD8EB)',
          border: '3px solid #fff',
          boxShadow: '0 4px 0 #2a9d8f',
          top: 34, left: 34, pointerEvents: 'none',
        }}
      />
    </div>
  );
}
