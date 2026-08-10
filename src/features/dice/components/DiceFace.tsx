/** Neon-glass CSS 3D die — six pip faces, tumbles while rolling, settles on result. Never shows "?". */
import { useEffect, useRef, useState } from 'react';
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

/** Opposite faces sum to 7: 1↔6, 2↔5, 3↔4. Rotations bring that face to the front. */
const FACE_ROTATION: Record<number, { x: number; y: number }> = {
  1: { x: 0, y: 0 },
  2: { x: -90, y: 0 },
  3: { x: 0, y: -90 },
  4: { x: 0, y: 90 },
  5: { x: 90, y: 0 },
  6: { x: 0, y: 180 },
};

const IDLE_ROTATION = { x: -28, y: 36 };

type FaceDef = { value: number; transform: string };

function facesForSize(half: number): FaceDef[] {
  return [
    { value: 1, transform: `rotateY(0deg) translateZ(${half}px)` },
    { value: 6, transform: `rotateY(180deg) translateZ(${half}px)` },
    { value: 3, transform: `rotateY(90deg) translateZ(${half}px)` },
    { value: 4, transform: `rotateY(-90deg) translateZ(${half}px)` },
    { value: 2, transform: `rotateX(90deg) translateZ(${half}px)` },
    { value: 5, transform: `rotateX(-90deg) translateZ(${half}px)` },
  ];
}

function hashKey(key: number | string): number {
  const s = String(key);
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function FacePips({
  value,
  size,
  accent,
}: {
  value: number;
  size: number;
  accent: string;
}) {
  const pips = PIP_LAYOUTS[value] ?? PIP_LAYOUTS[1];
  const pip = Math.max(3, size * 0.15);
  return (
    <>
      {pips.map(([x, y], i) => (
        <span
          key={i}
          style={{
            position: 'absolute',
            left: `${x}%`,
            top: `${y}%`,
            width: pip,
            height: pip,
            marginLeft: -pip / 2,
            marginTop: -pip / 2,
            borderRadius: '50%',
            background: `radial-gradient(circle at 35% 30%, ${accent}, ${accent}cc 55%, ${accent}99)`,
            boxShadow: `0 0 ${size * 0.14}px ${accent}aa, inset 0 1px 1px rgba(255,255,255,0.35)`,
          }}
        />
      ))}
    </>
  );
}

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
  const half = size / 2;
  const radius = Math.max(6, size * 0.18);
  const faces = facesForSize(half);
  const seed = hashKey(rollKey);
  const dir = seed % 2 === 0 ? 1 : -1;
  const spinX = 360 + (seed % 3) * 360;
  const spinY = 360 + ((seed >> 2) % 4) * 360;

  const settled =
    value != null
      ? FACE_ROTATION[Math.min(6, Math.max(1, value))]
      : IDLE_ROTATION;

  // Extra full turns only after a tumble ends so idle/result mounts don't spin.
  const wasRolling = useRef(false);
  const [settleSpins, setSettleSpins] = useState(0);

  useEffect(() => {
    if (wasRolling.current && !rolling) {
      setSettleSpins((n) => n + 1);
    }
    wasRolling.current = rolling;
  }, [rolling]);

  const targetX = settled.x + dir * 360 * settleSpins;
  const targetY = settled.y - dir * 360 * settleSpins;

  return (
    <div
      style={{
        width: size,
        height: size,
        flexShrink: 0,
        perspective: size * 5,
        perspectiveOrigin: '50% 45%',
      }}
    >
      {/* Mild camera tilt so the cube always reads as 3D, even when a face is "front". */}
      <div
        style={{
          width: size,
          height: size,
          transformStyle: 'preserve-3d',
          transform: 'rotateX(-12deg) rotateY(16deg)',
        }}
      >
        <motion.div
          key={rollKey}
          initial={{ rotateX: IDLE_ROTATION.x, rotateY: IDLE_ROTATION.y, scale: rolling ? 0.92 : 1 }}
          animate={
            rolling
              ? {
                  rotateX: [IDLE_ROTATION.x, dir * spinX, dir * (spinX + 360)],
                  rotateY: [IDLE_ROTATION.y, -dir * spinY, -dir * (spinY + 480)],
                  scale: [0.92, 1.06, 1],
                }
              : {
                  rotateX: targetX,
                  rotateY: targetY,
                  scale: 1,
                }
          }
          transition={
            rolling
              ? {
                  rotateX: { duration: 0.85, repeat: Infinity, ease: 'linear' },
                  rotateY: { duration: 1.05, repeat: Infinity, ease: 'linear' },
                  scale: { duration: 0.55, ease: 'easeOut' },
                }
              : {
                  duration: settleSpins > 0 ? 0.75 : 0.35,
                  ease: [0.22, 1, 0.36, 1],
                }
          }
          style={{
            width: size,
            height: size,
            position: 'relative',
            transformStyle: 'preserve-3d',
            transformOrigin: 'center center',
          }}
        >
          {faces.map((face) => (
            <div
              key={face.value}
              style={{
                position: 'absolute',
                inset: 0,
                borderRadius: radius,
                transform: face.transform,
                backfaceVisibility: 'hidden',
                WebkitBackfaceVisibility: 'hidden',
                background:
                  'linear-gradient(155deg, rgba(255,255,255,0.16) 0%, rgba(12,24,42,0.92) 48%, rgba(4,10,20,0.97) 100%)',
                border: `1.5px solid ${accent}60`,
                boxShadow: `inset 0 1px 0 rgba(255,255,255,0.2), inset 0 -1px 0 rgba(0,0,0,0.35), 0 0 ${size * 0.2}px ${accent}28`,
              }}
            >
              <FacePips value={face.value} size={size} accent={accent} />
            </div>
          ))}
        </motion.div>
      </div>
    </div>
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
    <div style={{ display: 'flex', gap, alignItems: 'center', justifyContent: 'center' }}>
      <DiceFace value={die1} size={size} accent={accent} rolling={rolling} rollKey={`${rollKey}-a`} />
      <DiceFace value={die2} size={size} accent={accent} rolling={rolling} rollKey={`${rollKey}-b`} />
    </div>
  );
}
