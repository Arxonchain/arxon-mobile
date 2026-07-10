import { useCallback, useEffect, useRef } from 'react';

interface JoystickProps {
  onMove: (x: number, y: number) => void;
  disabled?: boolean;
}

export default function Joystick({ onMove, disabled }: JoystickProps) {
  const baseRef = useRef<HTMLDivElement>(null);
  const stickRef = useRef<HTMLDivElement>(null);
  const centerRef = useRef({ x: 0, y: 0 });
  const activeRef = useRef(false);
  const onMoveRef = useRef(onMove);
  const maxR = 46;

  useEffect(() => {
    onMoveRef.current = onMove;
  }, [onMove]);

  const reset = useCallback(() => {
    activeRef.current = false;
    onMoveRef.current(0, 0);
    if (stickRef.current) {
      stickRef.current.style.left = '37px';
      stickRef.current.style.top = '37px';
    }
  }, []);

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
      stickRef.current.style.left = `${37 + dx}px`;
      stickRef.current.style.top = `${37 + dy}px`;
    }
    onMoveRef.current(dx / maxR, dy / maxR);
  }, [disabled]);

  useEffect(() => {
    const onTouchMove = (e: TouchEvent) => {
      if (!activeRef.current) return;
      e.preventDefault();
      const t = e.touches[0];
      if (t) handleMove(t.clientX, t.clientY);
    };
    const onTouchEnd = () => reset();
    const onMouseMove = (e: MouseEvent) => {
      if (!activeRef.current) return;
      handleMove(e.clientX, e.clientY);
    };
    const onMouseUp = () => reset();

    document.addEventListener('touchmove', onTouchMove, { passive: false });
    document.addEventListener('touchend', onTouchEnd);
    document.addEventListener('touchcancel', onTouchEnd);
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
    return () => {
      document.removeEventListener('touchmove', onTouchMove);
      document.removeEventListener('touchend', onTouchEnd);
      document.removeEventListener('touchcancel', onTouchEnd);
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };
  }, [handleMove, reset]);

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
        position: 'absolute', bottom: 28, left: 18, width: 130, height: 130,
        borderRadius: '50%',
        background: 'linear-gradient(180deg,rgba(255,255,255,0.18),rgba(0,0,0,0.35))',
        border: '4px solid #fff',
        boxShadow: '0 6px 0 rgba(0,0,0,0.35), inset 0 2px 8px rgba(255,255,255,0.15)',
        zIndex: 30, touchAction: 'none', pointerEvents: 'auto',
        opacity: disabled ? 0.35 : 1,
      }}
      onTouchStart={(e) => { e.preventDefault(); e.stopPropagation(); onStart(e.touches[0].clientX, e.touches[0].clientY); }}
      onMouseDown={(e) => { e.preventDefault(); onStart(e.clientX, e.clientY); }}
    >
      <div
        ref={stickRef}
        style={{
          position: 'absolute', width: 56, height: 56, borderRadius: '50%',
          background: 'linear-gradient(180deg,#7FE7C4,#4FD8EB)',
          border: '3px solid #fff',
          boxShadow: '0 4px 0 #2a9d8f',
          top: 37, left: 37, pointerEvents: 'none',
        }}
      />
    </div>
  );
}
