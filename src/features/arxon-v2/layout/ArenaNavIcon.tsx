import { neon } from '@/features/arxon-v2/design/neonTokens';
import arenaKnightNav from '@/assets/arxon-v2/arena-knight-nav.png';

const INACTIVE = 'rgba(232,252,255,0.38)';

/** Knight silhouette — tinted to match nav accent. */
export function ArenaNavIcon({ active, accent = neon.purple }: { active: boolean; accent?: string }) {
  const color = active ? accent : INACTIVE;

  return (
    <div
      aria-hidden
      style={{
        width: 20,
        height: 20,
        flexShrink: 0,
        backgroundColor: color,
        WebkitMaskImage: `url(${arenaKnightNav})`,
        maskImage: `url(${arenaKnightNav})`,
        WebkitMaskSize: 'contain',
        maskSize: 'contain',
        WebkitMaskRepeat: 'no-repeat',
        maskRepeat: 'no-repeat',
        WebkitMaskPosition: 'center',
        maskPosition: 'center',
      }}
    />
  );
}
