import { playfieldBgForLevel } from '../data/uiAssets';

interface ForgePlayfieldProps {
  level: number;
  tiles: React.ReactNode;
  forgeField?: React.ReactNode;
}

/** Sci-fi frame — tiles in upper void, forge console at bottom */
export function ForgePlayfield({ level, tiles, forgeField }: ForgePlayfieldProps) {
  const bg = playfieldBgForLevel(level);

  return (
    <div style={{
      position: 'relative',
      flex: 1,
      minHeight: 0,
      display: 'flex',
      alignItems: 'stretch',
      justifyContent: 'center',
      margin: '0 -4px',
    }}>
      <div style={{
        position: 'relative',
        width: 'min(100%, 420px)',
        flex: 1,
        maxHeight: '100%',
        aspectRatio: '3 / 4',
        backgroundImage: `url(${bg})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center top',
        overflow: 'hidden',
      }}>
        <div style={{
          position: 'absolute', inset: 0,
          background: 'radial-gradient(ellipse 70% 55% at 50% 38%, transparent 0%, rgba(0,0,0,0.45) 100%)',
          pointerEvents: 'none',
        }} />

        {/* Upper void — circled tile zone */}
        <div style={{
          position: 'absolute',
          top: '7%',
          left: '11%',
          width: '78%',
          height: '40%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 2,
        }}>
          {tiles}
        </div>

        {/* Forge console strip */}
        {forgeField && (
          <div style={{
            position: 'absolute',
            bottom: '8%',
            left: '7%',
            width: '86%',
            zIndex: 3,
          }}>
            <div style={{
              position: 'relative',
              padding: '10px 12px 12px',
              borderRadius: 6,
              background: 'linear-gradient(180deg, rgba(4,18,32,0.88) 0%, rgba(2,10,20,0.94) 100%)',
              border: '1px solid rgba(79,216,235,0.28)',
              boxShadow: '0 0 24px rgba(79,216,235,0.12), inset 0 1px 0 rgba(255,255,255,0.06)',
            }}>
              <div style={{
                position: 'absolute', top: 0, left: '8%', right: '8%', height: 2,
                background: 'linear-gradient(90deg, transparent, rgba(79,216,235,0.7), transparent)',
              }} />
              {forgeField}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
