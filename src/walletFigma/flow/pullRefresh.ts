import { useRef, useState, type TouchEvent } from 'react';

export function usePullRefresh(onRefresh: () => Promise<void> | void) {
  const [pull, setPull] = useState(0);
  const [busy, setBusy] = useState(false);
  const startY = useRef(0);
  const armed = useRef(false);
  const distance = useRef(0);
  const busyRef = useRef(false);

  const onTouchStart = (e: TouchEvent<HTMLElement>) => {
    armed.current = e.currentTarget.scrollTop <= 2;
    startY.current = e.touches[0]?.clientY ?? 0;
    distance.current = 0;
  };

  const onTouchMove = (e: TouchEvent<HTMLElement>) => {
    if (!armed.current || busyRef.current) return;
    const dy = (e.touches[0]?.clientY ?? 0) - startY.current;
    if (dy > 8) {
      const next = Math.min(72, dy);
      distance.current = next;
      setPull(next);
    }
  };

  const onTouchEnd = () => {
    const should = distance.current > 52 && !busyRef.current;
    armed.current = false;
    if (!should) {
      distance.current = 0;
      setPull(0);
      return;
    }
    busyRef.current = true;
    setBusy(true);
    setPull(56);
    void Promise.resolve(onRefresh()).finally(() => {
      busyRef.current = false;
      setBusy(false);
      distance.current = 0;
      setPull(0);
    });
  };

  return { pull, busy, onTouchStart, onTouchMove, onTouchEnd };
}
