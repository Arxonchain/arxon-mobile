import type { ArenaFrame } from '../data/boardFrames';
import { TexturePatternDefs } from './LetterBoard';

interface BoardArenaProps {
  arena: ArenaFrame;
  shapeLabel: string;
}

export function BoardArena({ arena, shapeLabel }: BoardArenaProps) {
  return (
    <svg
      viewBox="0 0 100 100"
      style={{
        position: 'absolute',
        width: 'min(95vw, 380px)',
        height: 'min(95vw, 380px)',
        left: '50%',
        top: '50%',
        transform: 'translate(-50%, -50%)',
        pointerEvents: 'none',
        filter: 'drop-shadow(0 12px 28px rgba(0,0,0,0.5))',
      }}
    >
      <TexturePatternDefs />
      <path
        d={arena.path}
        fill={`url(#wf-tex-${arena.textureId})`}
        fillOpacity={arena.fillOpacity}
        stroke="rgba(255,255,255,0.2)"
        strokeWidth="0.8"
        fillRule="evenodd"
      />
      <text
        x="50"
        y="97"
        textAnchor="middle"
        fill="rgba(255,255,255,0.25)"
        fontSize="4"
        fontWeight="700"
        letterSpacing="0.5"
      >
        {arena.label} · {shapeLabel}
      </text>
    </svg>
  );
}
