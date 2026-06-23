export default function PullToRefreshIndicator({ pullDistance, isRefreshing }: { pullDistance: number; isRefreshing: boolean }) {
  const threshold = 70;
  const progress = Math.min(pullDistance / threshold, 1);
  const ready = pullDistance >= threshold;

  return (
    <div style={{
      position: 'absolute', top: 0, left: 0, right: 0, zIndex: 50,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      height: isRefreshing ? 60 : Math.max(0, pullDistance * 0.7),
      overflow: 'hidden', transition: isRefreshing ? 'height 0.2s ease' : 'none',
      pointerEvents: 'none',
    }}>
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
        opacity: isRefreshing ? 1 : progress,
        transform: `scale(${0.6 + progress * 0.4})`,
        transition: 'opacity 0.1s, transform 0.1s',
      }}>
        <div style={{
          width: 32, height: 32, borderRadius: '50%',
          background: 'hsl(215 35% 62%/0.12)',
          border: `2px solid ${ready || isRefreshing ? 'hsl(215 55% 62%)' : 'hsl(215 35% 42%)'}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          animation: isRefreshing ? 'spinRefresh 0.8s linear infinite' : 'none',
          transition: 'border-color 0.2s',
        }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
            stroke={ready || isRefreshing ? 'hsl(215 55% 72%)' : 'hsl(215 35% 52%)'}
            strokeWidth="2.5" strokeLinecap="round"
            style={{
              transform: isRefreshing ? 'none' : `rotate(${progress * 360}deg)`,
              transition: isRefreshing ? 'none' : 'transform 0.05s',
            }}>
            <polyline points="23 4 23 10 17 10" />
            <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
          </svg>
        </div>
        <p style={{
          fontSize: 10, fontWeight: 600,
          color: ready || isRefreshing ? 'hsl(215 55% 72%)' : 'hsl(215 25% 45%)',
          transition: 'color 0.2s',
        }}>
          {isRefreshing ? 'Refreshing...' : ready ? 'Release to refresh' : 'Pull to refresh'}
        </p>
      </div>
      <style>{'@keyframes spinRefresh{to{transform:rotate(360deg)}}'}</style>
    </div>
  );
}
