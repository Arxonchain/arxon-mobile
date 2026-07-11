import { getTileTexture, TILE_SHAPES, type TileTextureId } from '../data/tileTextures';
import type { LetterTile } from '../engine/poolGenerator';
import type { ThemeSkin } from '../data/themes';

interface LetterBoardProps {
  tiles: LetterTile[];
  selection: number[];
  theme: ThemeSkin;
  onToggle: (index: number) => void;
}

export function LetterBoard({ tiles, selection, theme, onToggle }: LetterBoardProps) {
  const selectedSet = new Set(selection);
  const orderMap = new Map(selection.map((idx, i) => [idx, i + 1]));

  return (
    <div
      style={{
        position: 'relative',
        width: 'min(92vw, 360px)',
        height: 'min(78vw, 320px)',
        margin: '0 auto',
      }}
    >
      {tiles.map((tile, index) => {
        const selected = selectedSet.has(index);
        const order = orderMap.get(index);
        const tex = getTileTexture(tile.textureId);
        const clipPath = TILE_SHAPES[tile.shapeId];
        const isPoly = clipPath.includes('polygon');

        return (
          <button
            key={tile.id}
            type="button"
            onClick={() => onToggle(index)}
            className={tex.animated ? 'wf-tile-animated' : undefined}
            style={{
              position: 'absolute',
              left: `calc(50% + ${tile.x * 40}% - 30px)`,
              top: `calc(50% + ${tile.y * 40}% - 30px)`,
              width: 60,
              height: 60,
              border: `2.5px solid ${selected ? theme.accent : tex.border}`,
              background: tex.background,
              backgroundSize: 'cover',
              color: theme.tileText,
              fontSize: 24,
              fontWeight: 900,
              fontFamily: theme.fontFamily,
              textShadow: tex.letterShadow,
              boxShadow: selected
                ? `${tex.innerGlow}, ${theme.tileGlow}, 0 8px 20px rgba(0,0,0,0.45)`
                : `${tex.innerGlow}, 0 6px 16px rgba(0,0,0,0.4)`,
              transform: selected ? 'scale(1.12) translateY(-3px)' : 'scale(1)',
              transition: 'transform 0.14s cubic-bezier(0.34,1.4,0.64,1), border-color 0.12s ease, box-shadow 0.12s ease',
              cursor: 'pointer',
              touchAction: 'manipulation',
              clipPath: isPoly ? clipPath : undefined,
              borderRadius: isPoly ? undefined : clipPath,
              zIndex: selected ? 10 : 1,
            }}
          >
            <span style={{
              position: 'relative', zIndex: 2,
              filter: selected ? `drop-shadow(0 0 6px ${theme.accent})` : undefined,
            }}>
              {tile.letter}
            </span>
            {order != null && (
              <span style={{
                position: 'absolute', top: 3, right: 5, zIndex: 3,
                fontSize: 10, fontWeight: 900, color: theme.accent,
                background: 'rgba(0,0,0,0.55)', borderRadius: 6,
                width: 16, height: 16, display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {order}
              </span>
            )}
            {selected && (
              <span style={{
                position: 'absolute', inset: -4, borderRadius: 'inherit',
                border: `2px solid ${theme.accent}`,
                opacity: 0.5, animation: 'wf-pulse 0.8s ease infinite',
                pointerEvents: 'none',
              }} />
            )}
          </button>
        );
      })}
      <style>{`
        @keyframes wf-pulse {
          0%,100% { opacity: 0.35; transform: scale(1); }
          50% { opacity: 0.7; transform: scale(1.04); }
        }
        .wf-tile-animated {
          animation: wf-shimmer 2.5s ease-in-out infinite;
        }
        @keyframes wf-shimmer {
          0%,100% { filter: brightness(1); }
          50% { filter: brightness(1.15); }
        }
      `}</style>
    </div>
  );
}

/** SVG pattern defs for arena textures */
export function TexturePatternDefs() {
  const patterns: { id: TileTextureId; stops: string[] }[] = [
    { id: 'wood', stops: ['#6b4423', '#8b5a2b', '#5c3d1e'] },
    { id: 'ice', stops: ['#e8f8ff', '#9dd4f0', '#5eb8e8'] },
    { id: 'water', stops: ['#1e6fa8', '#2d8fc4', '#0e4d7a'] },
    { id: 'stone', stops: ['#6a6a6a', '#4a4a4a', '#333'] },
    { id: 'metal', stops: ['#d0d5db', '#8a939e', '#4a5259'] },
    { id: 'lava', stops: ['#ff6b20', '#e83a10', '#8a1a00'] },
    { id: 'crystal', stops: ['#e9d5ff', '#a855f7', '#6b21a8'] },
    { id: 'moss', stops: ['#4a7c3f', '#2d5a28', '#1a3a18'] },
    { id: 'sand', stops: ['#f5deb3', '#d4a76a', '#a67c3a'] },
  ];

  return (
    <defs>
      {patterns.map((p) => (
        <pattern key={p.id} id={`wf-tex-${p.id}`} patternUnits="userSpaceOnUse" width="12" height="12">
          <rect width="12" height="12" fill={p.stops[0]} />
          <rect width="6" height="6" fill={p.stops[1]} opacity="0.6" />
          <rect x="6" y="6" width="6" height="6" fill={p.stops[2]} opacity="0.5" />
        </pattern>
      ))}
    </defs>
  );
}
