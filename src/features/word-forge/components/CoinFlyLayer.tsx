import { FORGE_UI } from '../data/uiAssets';

interface CoinFlyLayerProps {
  events: { id: number; amount: number; fromX: number; fromY: number }[];
  targetRef: React.RefObject<HTMLDivElement | null>;
}

/** Deterministic jitter so coins re-render identically for an event */
function jitter(seed: number, spread: number): number {
  const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
  return ((x - Math.floor(x)) - 0.5) * 2 * spread;
}

/**
 * Payout burst: 5-10 3D coins scatter from the forged word, arc up, then
 * stream into the balance counter with a spinning flip.
 */
export function CoinFlyLayer({ events, targetRef }: CoinFlyLayerProps) {
  return (
    <>
      {events.map((ev) => {
        const target = targetRef.current?.getBoundingClientRect();
        const toX = target ? target.left + target.width / 2 : ev.fromX;
        const toY = target ? target.top + target.height / 2 : 40;
        const coinCount = Math.min(10, Math.max(5, Math.round(ev.amount / 12) + 4));

        return (
          <div key={ev.id} style={{ position: 'fixed', inset: 0, zIndex: 50, pointerEvents: 'none' }}>
            {Array.from({ length: coinCount }, (_, i) => {
              const seed = ev.id * 31 + i;
              const startX = ev.fromX + jitter(seed, 34);
              const startY = ev.fromY + jitter(seed + 7, 22);
              const dx = toX - startX;
              const dy = toY - startY;
              const lift = -(46 + Math.abs(jitter(seed + 13, 40)));
              const dur = 0.62 + Math.abs(jitter(seed + 19, 0.22));
              const delay = i * 0.05 + Math.abs(jitter(seed + 23, 0.05));
              const coinSize = 30 + Math.abs(jitter(seed + 29, 10));
              return (
                <div
                  key={i}
                  style={{
                    position: 'absolute',
                    left: startX - coinSize / 2,
                    top: startY - coinSize / 2,
                    width: coinSize,
                    height: coinSize,
                    animation: `wf-coin-x ${dur}s cubic-bezier(0.35,0,0.65,1) ${delay}s both`,
                    ['--wf-dx' as string]: `${dx}px`,
                  }}
                >
                  <div style={{
                    width: '100%', height: '100%',
                    animation: `wf-coin-y ${dur}s cubic-bezier(0.5,0,0.9,0.6) ${delay}s both`,
                    ['--wf-dy' as string]: `${dy}px`,
                    ['--wf-lift' as string]: `${lift}px`,
                  }}>
                    <img
                      src={FORGE_UI.arxCoin}
                      alt=""
                      style={{
                        width: '100%', height: '100%', objectFit: 'contain',
                        filter: 'drop-shadow(0 0 10px rgba(140,180,255,0.7)) drop-shadow(0 3px 6px rgba(0,0,0,0.5))',
                        animation: `wf-coin-spin3d ${dur}s linear ${delay}s both`,
                      }}
                    />
                  </div>
                </div>
              );
            })}

            {/* Amount tag floats up from the origin */}
            <span style={{
              position: 'absolute',
              left: ev.fromX, top: ev.fromY - 10,
              transform: 'translateX(-50%)',
              fontSize: 16, fontWeight: 900, color: '#ffd93d',
              fontFamily: "'Creato Display', system-ui, sans-serif",
              textShadow: '0 0 12px rgba(255,217,61,0.9), 0 2px 4px rgba(0,0,0,0.8)',
              animation: 'wf-amount-rise 0.9s ease-out both',
              whiteSpace: 'nowrap',
            }}>
              +{ev.amount}
            </span>
          </div>
        );
      })}
      <style>{`
        @keyframes wf-coin-x {
          0% { transform: translateX(0); opacity: 1; }
          88% { opacity: 1; }
          100% { transform: translateX(var(--wf-dx)); opacity: 0; }
        }
        @keyframes wf-coin-y {
          0% { transform: translateY(0) scale(0.7); }
          28% { transform: translateY(var(--wf-lift)) scale(1.08); }
          100% { transform: translateY(var(--wf-dy)) scale(0.42); }
        }
        @keyframes wf-coin-spin3d {
          0% { transform: rotateY(0deg) rotateZ(0deg); }
          100% { transform: rotateY(900deg) rotateZ(28deg); }
        }
        @keyframes wf-amount-rise {
          0% { opacity: 0; transform: translate(-50%, 6px) scale(0.7); }
          25% { opacity: 1; transform: translate(-50%, -8px) scale(1.15); }
          100% { opacity: 0; transform: translate(-50%, -34px) scale(1); }
        }
      `}</style>
    </>
  );
}
