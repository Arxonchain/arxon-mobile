import type { PreviewHudState } from './PreviewPlayScene';

interface PreviewHUDProps {
  hud: PreviewHudState;
  onRestart: () => void;
}

function ExposureBar({ value }: { value: number }) {
  const pct = Math.min(100, Math.max(0, value));
  const hot = pct > 65;
  return (
    <div style={{ width: '100%' }}>
      <div style={{
        display: 'flex', justifyContent: 'space-between', marginBottom: 4,
        fontSize: 10, fontWeight: 800, letterSpacing: 1.2, color: '#94a3b8', textTransform: 'uppercase',
      }}>
        <span>Torch exposure</span>
        <span style={{ color: hot ? '#ff6b4a' : '#7FE7C4' }}>{Math.round(pct)}%</span>
      </div>
      <div style={{
        height: 8, borderRadius: 4, background: 'rgba(255,255,255,0.1)',
        overflow: 'hidden', border: '1px solid rgba(255,255,255,0.15)',
      }}>
        <div style={{
          width: `${pct}%`, height: '100%',
          background: hot
            ? 'linear-gradient(90deg,#ff6b4a,#ff3366)'
            : 'linear-gradient(90deg,#ffd166,#ff6b4a)',
          transition: 'width 0.12s ease-out',
        }} />
      </div>
    </div>
  );
}

export function PreviewHUD({ hud, onRestart }: PreviewHUDProps) {
  const { phase } = hud;
  const vaultReady = hud.coins >= hud.coinsRequired;

  return (
    <>
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, zIndex: 20,
        padding: '14px 18px', pointerEvents: 'none',
        background: 'linear-gradient(180deg, rgba(10,16,24,0.92) 0%, transparent 100%)',
      }}>
        <p style={{
          margin: 0, fontSize: 10, fontWeight: 800, letterSpacing: 2,
          color: '#7FE7C4', textTransform: 'uppercase',
        }}>
          Depth Watch — Playable Preview
        </p>
        <h1 style={{ margin: '4px 0 8px', fontSize: 18, fontWeight: 900, color: '#fff' }}>
          Infiltrate · collect · escape
        </h1>

        <div style={{
          display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, maxWidth: 420,
        }}>
          <div style={{
            padding: '8px 12px', borderRadius: 10,
            background: 'rgba(0,0,0,0.45)', border: '1px solid rgba(255,255,255,0.12)',
          }}>
            <div style={{ fontSize: 10, color: '#94a3b8', fontWeight: 700, letterSpacing: 1 }}>ARX GOLD</div>
            <div style={{ fontSize: 22, fontWeight: 900, color: '#ffd93d' }}>
              {hud.coins} <span style={{ fontSize: 13, color: '#94a3b8' }}>/ {hud.coinsRequired}</span>
            </div>
          </div>
          <div style={{
            padding: '8px 12px', borderRadius: 10,
            background: 'rgba(0,0,0,0.45)', border: '1px solid rgba(255,255,255,0.12)',
          }}>
            <div style={{ fontSize: 10, color: '#94a3b8', fontWeight: 700, letterSpacing: 1 }}>SECTOR TIMER</div>
            <div style={{
              fontSize: 22, fontWeight: 900,
              color: hud.sectorLeft < 30 ? '#ff6b4a' : '#7FE7C4',
            }}>
              {Math.ceil(hud.sectorLeft)}s
            </div>
          </div>
        </div>

        <div style={{ marginTop: 10, maxWidth: 420 }}>
          <ExposureBar value={hud.exposure} />
        </div>

        {hud.hiding && phase === 'playing' && (
          <p style={{
            margin: '8px 0 0', fontSize: 12, fontWeight: 800, color: '#4FD8EB',
            letterSpacing: 1.2, textTransform: 'uppercase',
          }}>
            Hidden — torch decay paused
          </p>
        )}

        {vaultReady && phase === 'playing' && !hud.hiding && (
          <p style={{
            margin: '8px 0 0', fontSize: 12, fontWeight: 700, color: '#7FE7C4',
          }}>
            Vault unlocked — reach the green ARX ring (east vault road)
          </p>
        )}

        <p style={{ margin: '8px 0 0', fontSize: 11, color: '#94a3b8', maxWidth: 440, lineHeight: 1.45 }}>
          Free roam the compound. WASD or joystick to move · pull stick down / Shift to crouch · hide in doorways and behind crates
        </p>
      </div>

      {phase !== 'playing' && (
        <div style={{
          position: 'absolute', inset: 0, zIndex: 25,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'rgba(0,0,0,0.55)', pointerEvents: 'auto',
        }}>
          <div style={{
            textAlign: 'center', padding: '28px 36px', borderRadius: 18,
            background: 'rgba(10,16,24,0.95)', border: '2px solid rgba(255,255,255,0.15)',
            maxWidth: 340,
          }}>
            <h2 style={{
              margin: '0 0 8px', fontSize: 26, fontWeight: 900,
              color: phase === 'won' ? '#7FE7C4' : '#ff6b4a',
            }}>
              {phase === 'won' ? 'Vault Secured' : 'Torch Got You'}
            </h2>
            <p style={{ margin: '0 0 18px', fontSize: 14, color: '#cbd5e1', lineHeight: 1.5 }}>
              {phase === 'won'
                ? `You extracted ${hud.coins} ARX gold. Reply "proceed" to ship this into the app.`
                : 'Stay in the shadows. Crouch behind crates. Time your sprint between patrols.'}
            </p>
            <button
              type="button"
              onClick={onRestart}
              style={{
                padding: '12px 28px', borderRadius: 12, border: 'none', cursor: 'pointer',
                background: 'linear-gradient(180deg,#7FE7C4,#4FD8EB)',
                color: '#0a1018', fontWeight: 800, fontSize: 14,
              }}
            >
              Try Again
            </button>
          </div>
        </div>
      )}
    </>
  );
}
