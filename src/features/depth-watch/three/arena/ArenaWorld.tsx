import type { Solid } from '../arena/arenaLayout';
import type { ArenaLayout } from '../arena/arenaLayout';
import { ARENA_HALF } from '../constants';

const TIER_PAL = {
  day: { ground: '#3d5c3a', asphalt: '#2d3436', fog: '#87CEEB' },
  dusk: { ground: '#2d4a32', asphalt: '#1e2528', fog: '#c97b5a' },
  night: { ground: '#1a2e1a', asphalt: '#141a22', fog: '#0f1419' },
};

function SolidMesh({ s, night }: { s: Solid; night: boolean }) {
  const rough = s.kind === 'rock' ? 0.95 : s.kind === 'building' ? 0.88 : 0.82;
  const metal = s.kind === 'container' ? 0.35 : 0;

  return (
    <group position={[s.x, s.y - s.h / 2, s.z]}>
      <mesh castShadow receiveShadow position={[0, s.h / 2, 0]}>
        {s.kind === 'rock' ? (
          <dodecahedronGeometry args={[Math.max(s.w, s.h, s.d) * 0.45, 1]} />
        ) : (
          <boxGeometry args={[s.w, s.h, s.d]} />
        )}
        <meshStandardMaterial color={s.color} roughness={rough} metalness={metal} />
      </mesh>
      {s.kind === 'building' && (
        <>
          {Array.from({ length: Math.max(1, Math.floor(s.h / 2.2)) }).map((_, row) =>
            Array.from({ length: Math.max(1, Math.floor(s.w / 1.6)) }).map((__, col) => (
              <mesh
                key={`${row}-${col}`}
                position={[
                  -s.w / 2 + 0.55 + col * 1.5,
                  1 + row * 2,
                  s.d / 2 + 0.03,
                ]}
              >
                <planeGeometry args={[0.6, 0.8]} />
                <meshStandardMaterial
                  color={night ? '#fbbf24' : '#fef9c3'}
                  emissive={night ? '#fbbf24' : '#fef3c7'}
                  emissiveIntensity={night ? 0.45 : 0.2}
                />
              </mesh>
            )),
          )}
          <mesh position={[0, s.h + 0.15, 0]}>
            <boxGeometry args={[s.w + 0.15, 0.25, s.d + 0.15]} />
            <meshStandardMaterial color="#374151" roughness={0.9} />
          </mesh>
        </>
      )}
      {s.hideUnder && s.h < 2.5 && (
        <mesh position={[0, s.h + 0.02, 0]}>
          <boxGeometry args={[s.w * 1.05, 0.08, s.d * 1.05]} />
          <meshStandardMaterial color="#292524" roughness={0.95} />
        </mesh>
      )}
    </group>
  );
}

function Ground({ tier }: { tier: ArenaLayout['tier'] }) {
  const pal = TIER_PAL[tier];
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]} receiveShadow>
        <planeGeometry args={[ARENA_HALF * 2 + 8, ARENA_HALF * 2 + 8]} />
        <meshStandardMaterial color={pal.ground} roughness={1} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]} receiveShadow>
        <planeGeometry args={[ARENA_HALF * 2 - 4, ARENA_HALF * 2 - 4]} />
        <meshStandardMaterial color={pal.asphalt} roughness={0.92} />
      </mesh>
      {/* Courtyard markings */}
      {[-8, 0, 8].map((x) =>
        [-8, 0, 8].map((z) => (
          <mesh key={`${x}-${z}`} rotation={[-Math.PI / 2, 0, 0]} position={[x, 0.02, z]}>
            <planeGeometry args={[1.8, 1.8]} />
            <meshStandardMaterial color="#4b5563" roughness={0.85} />
          </mesh>
        )),
      )}
    </group>
  );
}

export function ArenaWorld({ layout }: { layout: ArenaLayout }) {
  const night = layout.tier !== 'day';
  return (
    <group>
      <Ground tier={layout.tier} />
      {layout.solids.map((s) => (
        <SolidMesh key={s.id} s={s} night={night} />
      ))}
    </group>
  );
}
