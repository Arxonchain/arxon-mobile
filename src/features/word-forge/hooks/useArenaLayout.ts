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
    const dockH = 44;
    const gaps = compact ? 22 : 30;

    const fixedStack = headerH + progressH + dailyH + traceH + boosterH + dockH + gaps + 88;
    const slotsBudget = Math.max(80, vh - fixedStack);
    const slotsMaxH = Math.min(
      tight ? 160 : compact ? 200 : 260,
      Math.max(80, slotsBudget * (slotCount >= 5 ? 0.58 : 0.48)),
    );

    const wheelCap = tight ? 188 : compact ? 220 : 256;
    const wheelFloor = tight ? 132 : 152;
    const wheelFromHeight = vh - fixedStack - slotsMaxH - 24;
    const wheelSize = Math.round(
      Math.min(wheelCap, contentW - 8, Math.max(wheelFloor, wheelFromHeight)),
    );

    const boxSize = Math.max(
      18,
      Math.min(tight ? 28 : 32, Math.floor((contentW - 16) / Math.max(3, maxWordLen)) - 2),
    );

    return { slotsMaxH, wheelSize, boxSize, compact, tight, slotGap: compact ? 4 : 6 };
  }, [slotCount, hasDailyStrip, maxWordLen, vh, vw]);
}
