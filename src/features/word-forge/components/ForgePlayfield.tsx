import { playfieldBgForLevel } from '../data/uiAssets';

interface ForgePlayfieldProps {
  level: number;
  children: React.ReactNode;
}

/** Image 3 — sci-fi frame with blurred outer zones */
export function ForgePlayfield({ level, children }: ForgePlayfieldProps) {
  const bg = playfieldBgForLevel(level);

  return (
    <div style={{
      position: 'relative',
      flex: 1,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: 300,
      margin: '0 -8px',
    }}>
      <div style={{
        position: 'absolute', inset: -20,
        backgroundImage: `url(${bg})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        filter: 'blur(0px) brightness(0.55)',
        opacity: 0.35,
        pointerEvents: 'none',
      }} />

      <div style={{
        position: 'relative',
        width: 'min(100%, 400px)',
        aspectRatio: '3 / 4',
        maxHeight: 'min(72vh, 520px)',
        backgroundImage: `url(${bg})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}>
        {/* Vignette + center focus */}
        <div style={{
          position: 'absolute', inset: 0,
          background: 'radial-gradient(ellipse 55% 45% at 50% 42%, transparent 0%, rgba(0,0,0,0.55) 100%)',
          pointerEvents: 'none',
        }} />
        <div style={{
          position: 'absolute', inset: '12% 8% 18%',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {children}
        </div>
      </div>
    </div>
  );
}
