import { FORGE_UI } from '../data/uiAssets';

interface CoinFlyLayerProps {
  events: { id: number; amount: number; fromX: number; fromY: number }[];
  targetRef: React.RefObject<HTMLDivElement | null>;
}

/** Image 9 — ARX coin flies to balance on forge */
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
              left: ev.fromX - 24,
              top: ev.fromY - 24,
              zIndex: 50,
              pointerEvents: 'none',
              animation: 'wf-arx-coin-fly 0.75s cubic-bezier(0.22,1,0.36,1) forwards',
              ['--wf-dx' as string]: `${dx}px`,
              ['--wf-dy' as string]: `${dy}px`,
            }}
          >
            <div style={{ position: 'relative', width: 48, height: 48 }}>
              <img
                src={FORGE_UI.arxCoin}
                alt=""
                style={{
                  width: '100%', height: '100%', objectFit: 'contain',
                  filter: 'drop-shadow(0 0 14px rgba(79,216,235,0.65))',
                  animation: 'wf-coin-spin 0.75s ease-out forwards',
                }}
              />
              <span style={{
                position: 'absolute', bottom: -4, left: '50%', transform: 'translateX(-50%)',
                fontSize: 10, fontWeight: 900, color: '#ffd93d',
                textShadow: '0 0 8px rgba(255,217,61,0.8)',
                whiteSpace: 'nowrap',
              }}>
                +{ev.amount}
              </span>
            </div>
          </div>
        );
      })}
      <style>{`
        @keyframes wf-arx-coin-fly {
          0% { transform: translate(0,0) scale(1.15); opacity: 1; }
          70% { transform: translate(calc(var(--wf-dx)*0.85), calc(var(--wf-dy)*0.85)) scale(1); opacity: 1; }
          100% { transform: translate(var(--wf-dx), var(--wf-dy)) scale(0.4); opacity: 0; }
        }
        @keyframes wf-coin-spin {
          from { transform: rotateY(0deg); }
          to { transform: rotateY(360deg); }
        }
      `}</style>
    </>
  );
}
