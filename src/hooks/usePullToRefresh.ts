import { useState, useRef, useCallback } from 'react';

export const PULL_THRESHOLD = 70;

/**
 * Shared pull-to-refresh gesture handling.
 * Attach `scrollRef` to the scrollable container, wire up the three
 * touch handlers, and render <PullToRefreshIndicator> above your content.
 *
 * Usage:
 *   const ptr = usePullToRefresh(async () => { await refetch(); });
 *   <div ref={ptr.scrollRef} onTouchStart={ptr.onTouchStart}
 *        onTouchMove={ptr.onTouchMove} onTouchEnd={ptr.onTouchEnd}>
 *     <PullToRefreshIndicator pullDistance={ptr.pullDistance} isRefreshing={ptr.isRefreshing} />
 *     <div style={{ transform: `translateY(${ptr.isRefreshing ? 60 : ptr.pullDistance * 0.7}px)` }}>
 *       ...page content...
 *     </div>
 *   </div>
 */
export function usePullToRefresh(onRefresh: () => Promise<void> | void) {
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const touchStartY = useRef(0);
  const isPulling = useRef(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    const el = scrollRef.current;
    if (!el || el.scrollTop > 0) return;
    touchStartY.current = e.touches[0].clientY;
    isPulling.current = true;
  }, []);

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isPulling.current || isRefreshing) return;
    const el = scrollRef.current;
    if (!el || el.scrollTop > 0) { isPulling.current = false; setPullDistance(0); return; }
    const delta = e.touches[0].clientY - touchStartY.current;
    if (delta <= 0) { setPullDistance(0); return; }
    // Rubber band resistance
    setPullDistance(Math.min(delta * 0.5, 110));
  }, [isRefreshing]);

  const onTouchEnd = useCallback(async () => {
    if (!isPulling.current) return;
    isPulling.current = false;
    if (pullDistance >= PULL_THRESHOLD) {
      setIsRefreshing(true);
      try {
        await onRefresh();
      } finally {
        setIsRefreshing(false);
        setPullDistance(0);
      }
    } else {
      setPullDistance(0);
    }
  }, [pullDistance, onRefresh]);

  return { pullDistance, isRefreshing, scrollRef, onTouchStart, onTouchMove, onTouchEnd };
}
