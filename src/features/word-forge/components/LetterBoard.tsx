import { forwardRef, useCallback, useRef } from 'react';
import { tileSkinForLevel, type LevelTileSkin } from '../data/uiAssets';
import type { GridLayout } from '../engine/gridLayout';
import type { LetterTile } from '../engine/poolGenerator';

interface LetterBoardProps {
  tiles: LetterTile[];
  selection: number[];
  level: number;
  grid: GridLayout;
  onToggle: (index: number) => void;
  onAppend: (index: number) => void;
}

export function LetterBoard({
  tiles, selection, level, grid, onToggle, onAppend,
}: LetterBoardProps) {
  const skin = tileSkinForLevel(level);
  const selectedSet = new Set(selection);
  const orderMap = new Map(selection.map((idx, i) => [idx, i + 1]));
  const boardRef = useRef<HTMLDivElement>(null);
  const tileRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const dragRef = useRef(false);

  const hitTest = useCallback((clientX: number, clientY: number): number | null => {
    for (let i = 0; i < tiles.length; i++) {
      const el = tileRefs.current[i];
      if (!el) continue;
      const rect = el.getBoundingClientRect();
      if (
        clientX >= rect.left && clientX <= rect.right
        && clientY >= rect.top && clientY <= rect.bottom
      ) {
        return i;
      }
    }
    return null;
  }, [tiles.length]);

  const onPointerDown = useCallback((index: number, e: React.PointerEvent) => {
    e.preventDefault();
    dragRef.current = true;
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
    onToggle(index);
  }, [onToggle]);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragRef.current) return;
    const hit = hitTest(e.clientX, e.clientY);
    if (hit != null) onAppend(hit);
  }, [hitTest, onAppend]);

  const onPointerUp = useCallback(() => { dragRef.current = false; }, []);

  const linePoints = selection.map((idx) => {
    const el = tileRefs.current[idx];
    const board = boardRef.current;
    if (!el || !board) return null;
    const br = board.getBoundingClientRect();
    const tr = el.getBoundingClientRect();
    const x = ((tr.left + tr.width / 2 - br.left) / br.width) * 100;
    const y = ((tr.top + tr.height / 2 - br.top) / br.height) * 100;
    return `${x},${y}`;
  }).filter(Boolean).join(' ');

  const fontSize = grid.cols >= 4 ? 18 : grid.cols >= 3 ? 22 : 24;

  return (
    <div
      ref={boardRef}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerLeave={onPointerUp}
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        touchAction: 'none',
        display: 'grid',
        gridTemplateColumns: `repeat(${grid.cols}, 1fr)`,
        gridTemplateRows: `repeat(${grid.rows}, 1fr)`,
        gap: grid.cols >= 4 ? 4 : 6,
        placeItems: 'center',
        padding: '2px',
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
            stroke="rgba(79,216,235,0.92)"
            strokeWidth="1.4"
            strokeLinecap="round"
            strokeLinejoin="round"
            filter="drop-shadow(0 0 6px rgba(79,216,235,0.85))"
          />
        </svg>
      )}

      {tiles.map((tile, index) => (
        <TileButton
          key={tile.id}
          ref={(el) => { tileRefs.current[index] = el; }}
          tile={tile}
          index={index}
          selected={selectedSet.has(index)}
          order={orderMap.get(index)}
          skin={skin}
          fontSize={fontSize}
          onPointerDown={onPointerDown}
        />
      ))}
    </div>
  );
}

const TileButton = forwardRef(function TileButton({
  tile, index, selected, order, skin, fontSize, onPointerDown,
}: {
  tile: LetterTile;
  index: number;
  selected: boolean;
  order?: number;
  skin: LevelTileSkin;
  fontSize: number;
  onPointerDown: (i: number, e: React.PointerEvent) => void;
}, ref: React.Ref<HTMLButtonElement>) {
  return (
    <button
      ref={ref}
      type="button"
      onPointerDown={(e) => onPointerDown(index, e)}
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        maxWidth: '100%',
        maxHeight: '100%',
        aspectRatio: '1',
        border: 'none',
        background: 'transparent',
        padding: 0,
        cursor: 'pointer',
        touchAction: 'none',
        transform: selected ? 'translateY(-2px) scale(1.06)' : 'scale(1)',
        transition: 'transform 0.12s cubic-bezier(0.34,1.4,0.64,1)',
        zIndex: selected ? 10 : 2,
        filter: selected ? `drop-shadow(0 0 16px ${skin.glow})` : undefined,
      }}
    >
      {/* Sci-fi tile face */}
      <div style={{
        position: 'absolute', inset: 0,
        borderRadius: 5,
        background: selected
          ? `linear-gradient(155deg, ${skin.accent}44 0%, rgba(4,16,28,0.96) 55%, rgba(2,8,16,0.98) 100%)`
          : 'linear-gradient(155deg, rgba(20,40,58,0.82) 0%, rgba(4,12,22,0.96) 55%, rgba(2,6,12,0.98) 100%)',
        border: `1.5px solid ${selected ? skin.accent : 'rgba(79,216,235,0.32)'}`,
        boxShadow: selected
          ? `0 0 18px ${skin.glow}, inset 0 1px 0 rgba(255,255,255,0.18), inset 0 -2px 6px rgba(0,0,0,0.4)`
          : '0 2px 8px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.1), inset 0 -1px 4px rgba(0,0,0,0.35)',
        pointerEvents: 'none',
      }}>
        {/* Corner brackets */}
        <span style={{
          position: 'absolute', top: 3, left: 3, width: 7, height: 7,
          borderTop: `1.5px solid ${selected ? skin.accent : 'rgba(79,216,235,0.5)'}`,
          borderLeft: `1.5px solid ${selected ? skin.accent : 'rgba(79,216,235,0.5)'}`,
        }} />
        <span style={{
          position: 'absolute', top: 3, right: 3, width: 7, height: 7,
          borderTop: `1.5px solid ${selected ? skin.accent : 'rgba(79,216,235,0.5)'}`,
          borderRight: `1.5px solid ${selected ? skin.accent : 'rgba(79,216,235,0.5)'}`,
        }} />
        <span style={{
          position: 'absolute', bottom: 3, left: 3, width: 7, height: 7,
          borderBottom: `1.5px solid ${selected ? skin.accent : 'rgba(79,216,235,0.5)'}`,
          borderLeft: `1.5px solid ${selected ? skin.accent : 'rgba(79,216,235,0.5)'}`,
        }} />
        <span style={{
          position: 'absolute', bottom: 3, right: 3, width: 7, height: 7,
          borderBottom: `1.5px solid ${selected ? skin.accent : 'rgba(79,216,235,0.5)'}`,
          borderRight: `1.5px solid ${selected ? skin.accent : 'rgba(79,216,235,0.5)'}`,
        }} />
        {/* Inner glow strip */}
        <div style={{
          position: 'absolute', top: 0, left: '15%', right: '15%', height: 1,
          background: `linear-gradient(90deg, transparent, ${selected ? skin.accent : 'rgba(79,216,235,0.45)'}, transparent)`,
        }} />
      </div>

      <span style={{
        position: 'relative', zIndex: 2,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        width: '100%', height: '100%',
        fontSize, fontWeight: 900,
        color: skin.letterColor,
        fontFamily: "'Creato Display', system-ui, sans-serif",
        textShadow: `0 0 12px ${skin.glow}, 0 2px 4px rgba(0,0,0,0.8)`,
        letterSpacing: '-0.02em',
      }}>
        {tile.letter}
      </span>

      {order != null && (
        <span style={{
          position: 'absolute', top: 2, right: 3, zIndex: 3,
          fontSize: 8, fontWeight: 900, color: skin.accent,
          background: 'rgba(0,0,0,0.75)', borderRadius: 3,
          width: 13, height: 13, display: 'flex', alignItems: 'center', justifyContent: 'center',
          border: `1px solid ${skin.accent}66`,
        }}>
          {order}
        </span>
      )}
    </button>
  );
});

export function TimerRing({
  timeLeft, total, urgent,
}: {
  timeLeft: number;
  total: number;
  urgent: boolean;
}) {
  const pct = total > 0 ? timeLeft / total : 0;
  const r = 20;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - pct);
  const stroke = urgent ? '#ff6b4a' : '#4FD8EB';

  return (
    <svg width={48} height={48} style={{ display: 'block', margin: '0 auto' }}>
      <circle cx={24} cy={24} r={r} fill="none" stroke="rgba(79,216,235,0.12)" strokeWidth={3} />
      <circle
        cx={24} cy={24} r={r} fill="none" stroke={stroke} strokeWidth={3}
        strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="butt"
        transform="rotate(-90 24 24)"
        style={{ transition: 'stroke-dashoffset 0.9s linear', filter: `drop-shadow(0 0 6px ${stroke})` }}
      />
    </svg>
  );
}
