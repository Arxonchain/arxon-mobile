/** Single 3D-ish glass die face with pip layout and tumble-on-roll animation. */
import { motion } from 'framer-motion';
import { neon } from '@/features/arxon-v2/design/neonTokens';

const PIP_LAYOUTS: Record<number, [number, number][]> = {
  1: [[50, 50]],
  2: [[28, 28], [72, 72]],
  3: [[28, 28], [50, 50], [72, 72]],
  4: [[28, 28], [72, 28], [28, 72], [72, 72]],
  5: [[28, 28], [72, 28], [50, 50], [28, 72], [72, 72]],
  6: [[28, 24], [72, 24], [28, 50], [72, 50], [28, 76], [72, 76]],
};

export function DiceFace({
  value,
  size = 52,
  accent = neon.cyan,
  rolling = false,
  rollKey = 0,
}: {
  value: number | null;
  size?: number;
  accent?: string;
  rolling?: boolean;
  rollKey?: number | string;
}) {
  const pips = value != null ? PIP_LAYOUTS[Math.min(6, Math.max(1, value))] : [];

  return (
    <motion.div
      key={rollKey}
      initial={rolling ? { rotate: -25, scale: 0.85 } : false}
      animate={rolling ? { rotate: [0, 360, 720], scale: [0.85, 1.08, 1] } : { rotate: 0, scale: 1 }}
      transition={rolling ? { duration: 0.62, ease: [0.22, 1, 0.36, 1] } : { duration: 0.18 }}
      style={{
        width: size,
        height: size,
        borderRadius: size * 0.24,
        position: 'relative',
        flexShrink: 0,
        background: 'linear-gradient(155deg, rgba(255,255,255,0.14) 0%, rgba(10,20,36,0.9) 55%, rgba(4,10,20,0.95) 100%)',
        border: `1.5px solid ${accent}55`,
        boxShadow: `0 6px 18px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.18), 0 0 ${size * 0.4}px ${accent}30`,
      }}
    >
      {pips.map(([x, y], i) => (
        <span
          key={i}
          style={{
            position: 'absolute',
            left: `${x}%`,
            top: `${y}%`,
            width: size * 0.15,
            height: size * 0.15,
            marginLeft: -(size * 0.075),
            marginTop: -(size * 0.075),
            borderRadius: '50%',
            background: accent,
            boxShadow: `0 0 ${size * 0.12}px ${accent}90`,
          }}
        />
      ))}
      {value == null && !rolling && (
        <span style={{
          position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: size * 0.32, fontWeight: 800, color: `${accent}55`,
        }}>
          ?
        </span>
      )}
    </motion.div>
  );
}

export function DicePair({
  die1,
  die2,
  size = 52,
  accent = neon.cyan,
  rolling = false,
  rollKey = 0,
  gap = 10,
}: {
  die1: number | null;
  die2: number | null;
  size?: number;
  accent?: string;
  rolling?: boolean;
  rollKey?: number | string;
  gap?: number;
}) {
  return (
    <div style={{ display: 'flex', gap, alignItems: 'center' }}>
      <DiceFace value={die1} size={size} accent={accent} rolling={rolling} rollKey={`${rollKey}-a`} />
      <DiceFace value={die2} size={size} accent={accent} rolling={rolling} rollKey={`${rollKey}-b`} />
    </div>
  );
}
