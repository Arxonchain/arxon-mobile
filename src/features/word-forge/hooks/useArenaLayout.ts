import { useEffect, useMemo, useState } from 'react';

interface ArenaLayoutInput {
  slotCount: number;
  hasDailyStrip: boolean;
  maxWordLen: number;
}

/** Responsive arena sizing so slots, wheel, and dock never overlap. */
export function useArenaLayout({ slotCount, hasDailyStrip, maxWordLen }: ArenaLayoutInput) {
  const [vh, setVh] = useState(() =>
    typeof window !== 'undefined' ? window.innerHeight : 740,
  );
  const [vw, setVw] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth : 380,
  );

  useEffect(() => {
    const onResize = () => {
      setVh(window.innerHeight);
      setVw(window.innerWidth);
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  return useMemo(() => {
    const contentW = Math.min(vw, 440) - 28;
    const compact = slotCount >= 5 || vh < 700 || (hasDailyStrip && slotCount >= 4);
    const tight = slotCount >= 6 || vh < 640;

    const headerH = compact ? 46 : 52;
    const progressH = compact ? 28 : 34;
    const dailyH = hasDailyStrip ? (compact ? 44 : 52) : 0;
    const traceH = compact ? 36 : 44;
    const boosterH = 46;
    const dockH = compact ? 50 : 56;
    const gaps = compact ? 28 : 38;

    const fixedStack = headerH + progressH + dailyH + traceH + boosterH + dockH + gaps + 140;
    const slotsBudget = Math.max(64, vh - fixedStack);
    const slotsMaxH = Math.min(
      tight ? 110 : compact ? 140 : 200,
      Math.max(64, slotsBudget * 0.42),
    );

    const wheelCap = tight ? 200 : compact ? 232 : 272;
    const wheelFloor = tight ? 148 : 168;
    const wheelFromHeight = vh - fixedStack - slotsMaxH - 24;
    const wheelSize = Math.round(
      Math.min(wheelCap, contentW - 8, Math.max(wheelFloor, wheelFromHeight)),
    );

    const boxSize = Math.max(
      20,
      Math.min(34, Math.floor((contentW - 16) / Math.max(3, maxWordLen)) - 3),
    );

    return { slotsMaxH, wheelSize, boxSize, compact, tight, slotGap: compact ? 5 : 7 };
  }, [slotCount, hasDailyStrip, maxWordLen, vh, vw]);
}
