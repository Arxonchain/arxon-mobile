import { useCallback, useRef } from 'react';
import { tileSkinForLevel, type LevelTileSkin } from '../data/uiAssets';
import type { LetterTile } from '../engine/poolGenerator';

const TILE = 64;

interface LetterBoardProps {
  tiles: LetterTile[];
  selection: number[];
  level: number;
  onToggle: (index: number) => void;
  onAppend: (index: number) => void;
}

function tileCenterPct(tile: LetterTile): { x: number; y: number } {
  return { x: 50 + tile.x * 40, y: 50 + tile.y * 40 };
}

export function LetterBoard({ tiles, selection, level, onToggle, onAppend }: LetterBoardProps) {
  const skin = tileSkinForLevel(level);
  const selectedSet = new Set(selection);
  const orderMap = new Map(selection.map((idx, i) => [idx, i + 1]));
  const boardRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef(false);

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
        width: '100%',
        height: '100%',
        touchAction: 'none',
      }}
    >
      {linePoints && selection.length > 1 && (
        <svg
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 5 }}
        >
          <polyline
            points={linePoints}
            fill="none"
            stroke="rgba(79,216,235,0.9)"
            strokeWidth="1.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            filter="drop-shadow(0 0 4px rgba(79,216,235,0.8))"
          />
        </svg>
      )}

      {tiles.map((tile, index) => (
        <TileButton
          key={tile.id}
          tile={tile}
          index={index}
          selected={selectedSet.has(index)}
          order={orderMap.get(index)}
          skin={skin}
          onPointerDown={onPointerDown}
        />
      ))}
    </div>
  );
}

function TileButton({
  tile, index, selected, order, skin, onPointerDown,
}: {
  tile: LetterTile;
  index: number;
  selected: boolean;
  order?: number;
  skin: LevelTileSkin;
  onPointerDown: (i: number, e: React.PointerEvent) => void;
}) {
  return (
    <button
      type="button"
      onPointerDown={(e) => onPointerDown(index, e)}
      style={{
        position: 'absolute',
        left: `calc(50% + ${tile.x * 40}% - ${TILE / 2}px)`,
        top: `calc(50% + ${tile.y * 40}% - ${TILE / 2}px)`,
        width: TILE,
        height: TILE,
        border: 'none',
        background: 'transparent',
        padding: 0,
        cursor: 'pointer',
        touchAction: 'none',
        transform: selected ? 'translateY(-4px) scale(1.06)' : 'scale(1)',
        transition: 'transform 0.12s cubic-bezier(0.34,1.4,0.64,1)',
        zIndex: selected ? 10 : 2,
        filter: selected ? `drop-shadow(0 0 12px ${skin.glow})` : undefined,
      }}
    >
      <img
        src={skin.image}
        alt=""
        draggable={false}
        style={{
          position: 'absolute', inset: 0, width: '100%', height: '100%',
          objectFit: 'contain', pointerEvents: 'none',
        }}
      />
      <span style={{
        position: 'relative', zIndex: 2,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        width: '100%', height: '100%',
        fontSize: 26, fontWeight: 900,
        color: skin.letterColor,
        fontFamily: "'Creato Display', system-ui, sans-serif",
        textShadow: '0 1px 0 rgba(255,255,255,0.35), 0 2px 6px rgba(0,0,0,0.45)',
      }}>
        {tile.letter}
      </span>
      {order != null && (
        <span style={{
          position: 'absolute', top: 4, right: 6, zIndex: 3,
          fontSize: 9, fontWeight: 900, color: '#4FD8EB',
          background: 'rgba(0,0,0,0.65)', borderRadius: 4,
          width: 14, height: 14, display: 'flex', alignItems: 'center', justifyContent: 'center',
          border: '1px solid rgba(79,216,235,0.4)',
        }}>
          {order}
        </span>
      )}
    </button>
  );
}

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
