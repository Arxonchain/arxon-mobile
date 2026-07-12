import { useCallback, useRef } from 'react';
import { tileImageForBiome } from '../data/biomeTiles';
import { TILE_SHAPES } from '../data/tileTextures';
import type { LetterTile } from '../engine/poolGenerator';
import type { ThemeSkin } from '../data/themes';

const TILE = 60;

interface LetterBoardProps {
  tiles: LetterTile[];
  selection: number[];
  theme: ThemeSkin;
  onToggle: (index: number) => void;
  onAppend: (index: number) => void;
}

function tileCenterPct(tile: LetterTile): { x: number; y: number } {
  return { x: 50 + tile.x * 40, y: 50 + tile.y * 40 };
}

export function LetterBoard({ tiles, selection, theme, onToggle, onAppend }: LetterBoardProps) {
  const selectedSet = new Set(selection);
  const orderMap = new Map(selection.map((idx, i) => [idx, i + 1]));
  const boardRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef(false);
  const tileImg = tileImageForBiome(theme.biome);

  const hitTest = useCallback((clientX: number, clientY: number): number | null => {
    const board = boardRef.current;
    if (!board) return null;
    const rect = board.getBoundingClientRect();
    for (let i = 0; i < tiles.length; i++) {
      const tile = tiles[i];
      const cx = rect.left + rect.width * (0.5 + tile.x * 0.4);
      const cy = rect.top + rect.height * (0.5 + tile.y * 0.4);
      if (Math.abs(clientX - cx) <= TILE / 2 && Math.abs(clientY - cy) <= TILE / 2) {
        return i;
      }
    }
    return null;
  }, [tiles]);

  const onPointerDown = useCallback((index: number, e: React.PointerEvent) => {
    e.preventDefault();
    dragRef.current = true;
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    onToggle(index);
  }, [onToggle]);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragRef.current) return;
    const hit = hitTest(e.clientX, e.clientY);
    if (hit != null) onAppend(hit);
  }, [hitTest, onAppend]);

  const onPointerUp = useCallback(() => {
    dragRef.current = false;
  }, []);

  const linePoints = selection.map((idx) => {
    const t = tiles[idx];
    if (!t) return null;
    const c = tileCenterPct(t);
    return `${c.x},${c.y}`;
  }).filter(Boolean).join(' ');

  return (
    <div
      ref={boardRef}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerLeave={onPointerUp}
      style={{
        position: 'relative',
        width: 'min(92vw, 360px)',
        height: 'min(78vw, 320px)',
        margin: '0 auto',
        touchAction: 'none',
      }}
    >
      {linePoints && selection.length > 1 && (
        <svg
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          style={{
            position: 'absolute', inset: 0, width: '100%', height: '100%',
            pointerEvents: 'none', zIndex: 5,
          }}
        >
          <polyline
            points={linePoints}
            fill="none"
            stroke={theme.accent}
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity="0.85"
            vectorEffect="non-scaling-stroke"
          />
          {selection.map((idx, i) => {
            if (i === 0) return null;
            const c = tileCenterPct(tiles[idx]);
            const prev = tileCenterPct(tiles[selection[i - 1]]);
            const mx = (c.x + prev.x) / 2;
            const my = (c.y + prev.y) / 2;
            return (
              <polygon
                key={`arr-${idx}-${i}`}
                points={`${mx},${my - 1.2} ${mx + 1.4},${my} ${mx},${my + 1.2}`}
                fill={theme.accent}
                opacity="0.9"
              />
            );
          })}
        </svg>
      )}

      {tiles.map((tile, index) => {
        const selected = selectedSet.has(index);
        const order = orderMap.get(index);
        const clipPath = TILE_SHAPES[tile.shapeId];
        const isPoly = clipPath.includes('polygon');
        const depth = selected ? 4 : 7;

        return (
          <button
            key={tile.id}
            type="button"
            data-tile-index={index}
            onPointerDown={(e) => onPointerDown(index, e)}
            style={{
              position: 'absolute',
              left: `calc(50% + ${tile.x * 40}% - ${TILE / 2}px)`,
              top: `calc(50% + ${tile.y * 40}% - ${TILE / 2}px)`,
              width: TILE,
              height: TILE,
              border: 'none',
              backgroundImage: `url(${tileImg})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              color: theme.tileText,
              fontSize: 24,
              fontWeight: 900,
              fontFamily: theme.fontFamily,
              textShadow: '0 1px 0 rgba(255,255,255,0.35), 0 2px 4px rgba(0,0,0,0.55)',
              boxShadow: selected
                ? `0 ${depth}px 0 rgba(0,0,0,0.35), inset 0 3px 0 rgba(255,255,255,0.55), inset 0 -4px 8px rgba(0,0,0,0.15), ${theme.tileGlow}`
                : `0 ${depth}px 0 rgba(0,0,0,0.42), inset 0 3px 0 rgba(255,255,255,0.45), inset 0 -5px 10px rgba(0,0,0,0.22), 0 6px 16px rgba(0,0,0,0.35)`,
              transform: selected ? 'translateY(-5px) scale(1.08)' : 'translateY(0) scale(1)',
              transition: 'transform 0.14s cubic-bezier(0.34,1.4,0.64,1), box-shadow 0.12s ease',
              cursor: 'pointer',
              touchAction: 'none',
              clipPath: isPoly ? clipPath : undefined,
              borderRadius: isPoly ? undefined : '22%',
              zIndex: selected ? 10 : 2,
              outline: selected ? `2px solid ${theme.accent}` : '1.5px solid rgba(255,255,255,0.25)',
              outlineOffset: -2,
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
          </button>
        );
      })}
    </div>
  );
}

/** SVG pattern defs for arena textures */
export function TexturePatternDefs() {
  const patterns: { id: string; stops: string[] }[] = [
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
