import { ArrowLeft } from 'lucide-react';
import { EXPOSURE_MAX } from '../three/constants';

interface SubwayHUDProps {
  level: number;
  elapsed: number;
  exposure: number;
  hiding: boolean;
  running: boolean;
  onBack: () => void;
}

function formatTime(t: number): string {
  const m = Math.floor(t / 60).toString().padStart(2, '0');
  const s = Math.floor(t % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

export default function SubwayHUD({ level, elapsed, exposure, hiding, running, onBack }: SubwayHUDProps) {
  const pct = Math.min(100, (exposure / EXPOSURE_MAX) * 100);
  const hot = pct > 60;

  return (
    <div style={{
      position: 'absolute', top: 0, left: 0, right: 0, zIndex: 20, pointerEvents: 'none',
      padding: '12px 14px 0', fontFamily: "'Creato Display',system-ui,sans-serif",
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <button
          type="button"
          onClick={onBack}
          style={{
            pointerEvents: 'all', width: 42, height: 42, borderRadius: 14,
            background: 'linear-gradient(180deg,#ff6b35,#e8542a)', border: '3px solid #fff',
            boxShadow: '0 4px 0 #b8381a', display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <ArrowLeft size={20} color="#fff" strokeWidth={3} />
        </button>

        <div style={{
          padding: '8px 20px', borderRadius: 20, background: 'linear-gradient(180deg,#ffd93d,#ffb800)',
          border: '3px solid #fff', boxShadow: '0 4px 0 #c98a00',
          fontSize: 15, fontWeight: 900, color: '#5c3d00', letterSpacing: 1,
        }}>
          SECTOR {level}
        </div>

        <div style={{
          padding: '8px 14px', borderRadius: 16, background: 'rgba(0,0,0,0.55)',
          border: '2px solid rgba(255,255,255,0.35)', fontSize: 14, fontWeight: 800, color: '#fff',
        }}>
          {formatTime(elapsed)}
        </div>
      </div>

      <div style={{
        background: 'rgba(0,0,0,0.45)', borderRadius: 16, padding: '8px 12px',
        border: '2px solid rgba(255,255,255,0.25)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
          <span style={{ fontSize: 10, fontWeight: 800, color: hot ? '#ff6b4a' : '#7FE7C4', letterSpacing: 1.2 }}>
            SIGNAL EXPOSURE
          </span>
          {hiding && (
            <span style={{ fontSize: 10, fontWeight: 800, color: '#7FE7C4' }}>IN COVER</span>
          )}
          {running && !hiding && (
            <span style={{ fontSize: 10, fontWeight: 800, color: '#ffd93d' }}>SPRINT</span>
          )}
        </div>
        <div style={{
          height: 14, borderRadius: 10, background: 'rgba(255,255,255,0.12)',
          overflow: 'hidden', border: '2px solid rgba(255,255,255,0.2)',
        }}>
          <div style={{
            width: `${pct}%`, height: '100%',
            background: hot
              ? 'linear-gradient(90deg,#ffb347,#ff4444)'
              : 'linear-gradient(90deg,#7FE7C4,#4FD8EB)',
            transition: 'width 0.1s linear',
          }} />
        </div>
      </div>
    </div>
  );
}
