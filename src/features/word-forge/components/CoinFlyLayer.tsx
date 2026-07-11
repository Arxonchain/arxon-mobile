import type { ThemeSkin } from '../data/themes';

interface CoinFlyLayerProps {
  events: { id: number; amount: number; fromX: number; fromY: number }[];
  targetRef: React.RefObject<HTMLDivElement | null>;
}

export function CoinFlyLayer({ events, targetRef }: CoinFlyLayerProps) {
  return (
    <>
      {events.map((ev) => {
        const target = targetRef.current?.getBoundingClientRect();
        const toX = target ? target.left + target.width / 2 : ev.fromX;
        const toY = target ? target.top + target.height / 2 : 40;
        const dx = toX - ev.fromX;
        const dy = toY - ev.fromY;
        return (
          <div
            key={ev.id}
            style={{
              position: 'fixed',
              left: ev.fromX,
              top: ev.fromY,
              zIndex: 50,
              pointerEvents: 'none',
              animation: 'wf-coin-fly 0.65s cubic-bezier(0.22,1,0.36,1) forwards',
              ['--wf-dx' as string]: `${dx}px`,
              ['--wf-dy' as string]: `${dy}px`,
            }}
          >
            <div style={{
              width: 32, height: 32, borderRadius: '50%',
              background: 'linear-gradient(145deg,#ffd93d,#ffb800)',
              border: '2px solid #fff8dc',
              boxShadow: '0 0 16px rgba(255,217,61,0.7)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 10, fontWeight: 900, color: '#3d2800',
            }}>
              +{ev.amount}
            </div>
          </div>
        );
      })}
      <style>{`
        @keyframes wf-coin-fly {
          0% { transform: translate(0,0) scale(1.2); opacity: 1; }
          60% { transform: translate(calc(var(--wf-dx)*0.8), calc(var(--wf-dy)*0.8)) scale(1); opacity: 1; }
          100% { transform: translate(var(--wf-dx), var(--wf-dy)) scale(0.35); opacity: 0; }
        }
      `}</style>
    </>
  );
}

export function ThemeParticles({ theme, count = 24 }: { theme: ThemeSkin; count?: number }) {
  const dots = Array.from({ length: count }, (_, i) => ({
    id: i,
    left: `${(i * 37 + 11) % 100}%`,
    top: `${(i * 53 + 7) % 100}%`,
    delay: `${(i % 5) * 0.8}s`,
    size: 2 + (i % 4),
  }));

  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
      {dots.map((d) => (
        <div
          key={d.id}
          style={{
            position: 'absolute',
            left: d.left,
            top: d.top,
            width: d.size,
            height: d.size,
            borderRadius: '50%',
            background: theme.particle,
            animation: `wf-drift 4s ease-in-out ${d.delay} infinite alternate`,
          }}
        />
      ))}
      <style>{`
        @keyframes wf-drift {
          from { transform: translate(0,0); opacity: 0.2; }
          to { transform: translate(10px,-14px); opacity: 0.75; }
        }
      `}</style>
    </div>
  );
}

export function TimerRing({
  timeLeft,
  total,
  accent,
  urgent,
}: {
  timeLeft: number;
  total: number;
  accent: string;
  urgent: boolean;
}) {
  const pct = total > 0 ? timeLeft / total : 0;
  const r = 22;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - pct);

  return (
    <svg width={52} height={52} style={{ display: 'block', margin: '0 auto' }}>
      <circle cx={26} cy={26} r={r} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth={4} />
      <circle
        cx={26} cy={26} r={r} fill="none"
        stroke={urgent ? '#ff6b4a' : accent}
        strokeWidth={4}
        strokeDasharray={circ}
        strokeDashoffset={offset}
        strokeLinecap="round"
        transform="rotate(-90 26 26)"
        style={{ transition: 'stroke-dashoffset 0.9s linear, stroke 0.3s' }}
      />
    </svg>
  );
}
