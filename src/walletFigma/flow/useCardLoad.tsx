import { useEffect, useState, type ReactNode } from 'react';
import { useLiveFrame } from './liveFrame';
import { SkelBanner, SkelBanners, SkelFrostCard, SkelHero, SkelTokenList } from './ScreenSkeleton';

/** Only swap in a skeleton if the wait is actually slow. Instant navigations keep real data. */
const SLOW_MS = 450;

export function useCardLoad(extra = false) {
  const live = useLiveFrame();
  const waiting = !!live?.app && (extra || !live.ready);
  const [slow, setSlow] = useState(false);
  useEffect(() => {
    if (!waiting) {
      setSlow(false);
      return;
    }
    const t = window.setTimeout(() => setSlow(true), SLOW_MS);
    return () => window.clearTimeout(t);
  }, [waiting]);
  if (!live?.app) return false;
  return waiting && slow;
}

/** Swap a live card for the same skeleton used on the full-page loader. */
export function CardLoad({
  extra,
  kind,
  n = 4,
  h,
  children,
}: {
  extra?: boolean;
  kind: 'hero' | 'frost' | 'banner' | 'banners' | 'rows';
  n?: number;
  h?: number;
  children: ReactNode;
}) {
  const load = useCardLoad(!!extra);
  if (!load) return children;
  if (kind === 'hero') return <SkelHero h={h} />;
  if (kind === 'banner') return <SkelBanner h={h} />;
  if (kind === 'banners') return <SkelBanners />;
  if (kind === 'frost') return <SkelFrostCard h={h} />;
  return <SkelTokenList n={n} h={h} />;
}
