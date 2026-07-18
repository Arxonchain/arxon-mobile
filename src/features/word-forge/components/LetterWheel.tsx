import { useCallback, useMemo, useRef } from 'react';
import type { LevelTileSkin } from '../data/uiAssets';
import type { LetterTile } from '../engine/poolGenerator';
import type { HintReveal } from '../hooks/useWordForgeGame';

interface LetterWheelProps {
  tiles: LetterTile[];
  selection: number[];
  skin: LevelTileSkin;
  size: number;
  hintReveal?: HintReveal | null;
  shuffleAnim?: boolean;
  /** New gesture pressed down on a letter — starts a fresh selection */
  onStart: (index: number) => void;
  /** Pointer dragged onto another letter mid-gesture */
  onAppend: (index: number) => void;
  /** Gesture released — receives the full swipe path synchronously (avoids stale React state) */
  onRelease: (path: number[]) => void;
}

/**
 * Word-wheel input (image-2 pattern): letters around a glass disc, swipe
 * through them to connect a word, release to forge it.
 */
export function LetterWheel({
  tiles, selection, skin, size, hintReveal, shuffleAnim, onStart, onAppend, onRelease,
}: LetterWheelProps) {
  const n = tiles.length;
  const tileSize = n <= 8 ? size * 0.225 : n <= 12 ? size * 0.185 : size * 0.16;
  const radius = size / 2 - tileSize / 2 - 3;
  const center = size / 2;

  const positions = useMemo(() => tiles.map((_, i) => {
    const angle = (i / n) * Math.PI * 2 - Math.PI / 2;
    return {
      x: center + radius * Math.cos(angle),
      y: center + radius * Math.sin(angle),
    };
  }), [tiles, n, center, radius]);

  const containerRef = useRef<HTMLDivElement>(null);
  const draggingRef = useRef(false);
  const pathRef = useRef<number[]>([]);
  const lastPointerRef = useRef<{ x: number; y: number } | null>(null);

  const hitTest = useCallback((clientX: number, clientY: number): number | null => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return null;
    const px = clientX - rect.left;
    const py = clientY - rect.top;
    let best: number | null = null;
    let bestDist = tileSize * 0.72;
    for (let i = 0; i < positions.length; i++) {
      const d = Math.hypot(px - positions[i].x, py - positions[i].y);
      if (d < bestDist) { bestDist = d; best = i; }
    }
    return best;
  }, [positions, tileSize]);

  const appendHit = useCallback((hit: number) => {
    if (pathRef.current.includes(hit)) return;
    pathRef.current = [...pathRef.current, hit];
    onAppend(hit);
  }, [onAppend]);

  const samplePointer = useCallback((clientX: number, clientY: number) => {
    const prev = lastPointerRef.current;
    if (!prev) {
      const hit = hitTest(clientX, clientY);
      if (hit != null) appendHit(hit);
      lastPointerRef.current = { x: clientX, y: clientY };
      return;
    }
    const dx = clientX - prev.x;
    const dy = clientY - prev.y;
    const dist = Math.hypot(dx, dy);
    const steps = Math.max(1, Math.ceil(dist / (tileSize * 0.35)));
    for (let s = 1; s <= steps; s++) {
      const t = s / steps;
      const hit = hitTest(prev.x + dx * t, prev.y + dy * t);
      if (hit != null) appendHit(hit);
    }
    lastPointerRef.current = { x: clientX, y: clientY };
  }, [appendHit, hitTest, tileSize]);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    const hit = hitTest(e.clientX, e.clientY);
    if (hit == null) return;
    e.preventDefault();
    containerRef.current?.setPointerCapture?.(e.pointerId);
    draggingRef.current = true;
    pathRef.current = [hit];
    lastPointerRef.current = { x: e.clientX, y: e.clientY };
    onStart(hit);
  }, [hitTest, onStart]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!draggingRef.current) return;
    e.preventDefault();
    samplePointer(e.clientX, e.clientY);
  }, [samplePointer]);

  const handlePointerUp = useCallback(() => {
    if (!draggingRef.current) return;
    draggingRef.current = false;
    lastPointerRef.current = null;
    const path = [...pathRef.current];
    pathRef.current = [];
    onRelease(path);
  }, [onRelease]);

  const selectedSet = new Set(selection);
  const hintFirst = hintReveal?.word[0]?.toUpperCase();
  const hintLast = hintReveal?.word[hintReveal.word.length - 1]?.toUpperCase();

  const linePath = selection
    .map((idx) => positions[idx])
    .filter(Boolean)
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`)
    .join(' ');

  return (
    <div
      ref={containerRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      style={{
        position: 'relative', width: size, height: size, touchAction: 'none',
        animation: shuffleAnim ? 'wf-shuffle 0.5s ease' : undefined,
        flexShrink: 0,
      }}
    >
      {/* Glass disc */}
      <div style={{
        position: 'absolute', inset: 0, borderRadius: '50%',
        background: 'radial-gradient(circle at 50% 34%, rgba(30,66,104,0.85) 0%, rgba(8,22,42,0.92) 62%, rgba(4,12,26,0.96) 100%)',
        border: '2.5px solid rgba(79,216,235,0.35)',
        boxShadow: 'inset 0 4px 20px rgba(120,200,255,0.12), inset 0 -8px 24px rgba(0,0,0,0.55), 0 10px 34px rgba(0,0,0,0.6), 0 0 42px rgba(79,216,235,0.14)',
      }} />
      {/* Rim gloss */}
      <div style={{
        position: 'absolute', top: '4%', left: '16%', right: '16%', height: '20%',
        borderRadius: '50%', pointerEvents: 'none',
        background: 'linear-gradient(180deg, rgba(255,255,255,0.14), transparent)',
        filter: 'blur(2px)',
      }} />

      {/* Connection trace */}
      {selection.length > 0 && (
        <svg width={size} height={size} style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 3 }}>
          {selection.length > 1 && (
            <path d={linePath} fill="none" stroke={skin.accent} strokeWidth={7} strokeOpacity={0.35}
              strokeLinecap="round" strokeLinejoin="round" />
          )}
          {selection.length > 1 && (
            <path d={linePath} fill="none" stroke={skin.accent} strokeWidth={3} strokeLinecap="round"
              strokeLinejoin="round" style={{ filter: `drop-shadow(0 0 6px ${skin.glow})` }} />
          )}
        </svg>
      )}

      {tiles.map((tile, i) => {
        const selected = selectedSet.has(i);
        const L = tile.letter.toUpperCase();
        const isHint = !selected && hintReveal != null && (L === hintFirst || L === hintLast);
        const p = positions[i];
        return (
          <div
            key={tile.id}
            aria-label={`Letter ${tile.letter}${selected ? ', selected' : ''}`}
            style={{
              position: 'absolute',
              left: p.x - tileSize / 2,
              top: p.y - tileSize / 2,
              width: tileSize, height: tileSize,
              borderRadius: '50%',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: tileSize * 0.5, fontWeight: 900,
              fontFamily: "'Creato Display', system-ui, sans-serif",
              zIndex: selected ? 5 : 4,
              cursor: 'pointer',
              userSelect: 'none',
              transition: 'transform 0.1s cubic-bezier(0.34,1.5,0.64,1), background 0.12s, box-shadow 0.12s',
              transform: selected ? 'scale(1.14)' : 'scale(1)',
              ...(selected ? {
                color: '#fff',
                background: `linear-gradient(180deg, ${skin.accent}, ${skin.accent}99)`,
                border: '2px solid rgba(255,255,255,0.55)',
                boxShadow: `0 0 18px ${skin.glow}, 0 4px 10px rgba(0,0,0,0.5), inset 0 2px 0 rgba(255,255,255,0.45)`,
                textShadow: '0 2px 3px rgba(0,0,0,0.5)',
              } : {
                color: skin.letterColor,
                background: 'linear-gradient(180deg, rgba(46,88,132,0.9) 0%, rgba(14,34,60,0.96) 100%)',
                border: isHint ? '2px solid #ffd93d' : '2px solid rgba(120,200,240,0.35)',
                boxShadow: isHint
                  ? '0 0 14px rgba(255,217,61,0.5), 0 3px 8px rgba(0,0,0,0.5), inset 0 2px 0 rgba(255,255,255,0.25)'
                  : '0 3px 8px rgba(0,0,0,0.55), inset 0 2px 0 rgba(255,255,255,0.22), inset 0 -3px 8px rgba(0,0,0,0.4)',
                textShadow: `0 0 10px ${skin.glow}, 0 2px 3px rgba(0,0,0,0.7)`,
              }),
            }}
          >
            {tile.letter}
          </div>
        );
      })}
    </div>
  );
}
