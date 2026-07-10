import type { Solid } from '../arena/arenaLayout';
import type { ArenaLayout } from '../arena/arenaLayout';
import { ARENA_HALF } from '../constants';
import { SciFiPiece } from '../environment/SciFiPiece';
import { SCIFI_NATIVE } from '../environment/scifiAssets';

const PERIMETER_IDS = new Set(['w-n', 'w-s', 'w-w', 'w-e']);
const WALL_H = 4;
const WALL_THICK = 1.2;
const TILE = SCIFI_NATIVE.WallAstra_Straight.depth;
const GROUND_SIZE = ARENA_HALF * 2 + 8;

function tileCount(span: number, segment = TILE) {
  return Math.max(1, Math.ceil(span / segment));
}

/** Lightweight ground — one plane instead of hundreds of GLB tiles. */
function SciFiGround() {
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]} receiveShadow>
        <planeGeometry args={[GROUND_SIZE, GROUND_SIZE]} />
        <meshStandardMaterial color="#4a5568" roughness={0.82} metalness={0.2} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]} receiveShadow>
        <planeGeometry args={[GROUND_SIZE - 6, GROUND_SIZE - 6]} />
        <meshStandardMaterial color="#2d3748" roughness={0.88} metalness={0.15} />
      </mesh>
      <SciFiPiece
        asset="Platform_Metal"
        position={[0, 0.02, 0]}
        size={[24, 0.25, 24]}
        castShadow={false}
      />
      {[-8, 0, 8].map((x) =>
        [-8, 0, 8].map((z) => (
          <SciFiPiece
            key={`mark-${x}-${z}`}
            asset="Platform_3Plates"
            position={[x, 0.03, z]}
            size={[1.8, 0.12, 1.8]}
            castShadow={false}
          />
        )),
      )}
    </group>
  );
}

function PerimeterWalls() {
  const span = ARENA_HALF * 2;
  const segment = TILE * 2;
  const count = tileCount(span, segment);
  const start = -ARENA_HALF + segment / 2;
  const pieces: {
    key: string;
    pos: [number, number, number];
    rot: number;
    size: [number, number, number];
    asset: 'WallAstra_Straight' | 'WallAstra_Straight_Window';
  }[] = [];

  for (let i = 0; i < count; i++) {
    const x = start + i * segment;
    const asset = i % 3 === 1 ? 'WallAstra_Straight_Window' : 'WallAstra_Straight';
    pieces.push(
      { key: `pn-${i}`, pos: [x, 0, -ARENA_HALF], rot: Math.PI / 2, size: [WALL_THICK, WALL_H, segment], asset },
      { key: `ps-${i}`, pos: [x, 0, ARENA_HALF], rot: -Math.PI / 2, size: [WALL_THICK, WALL_H, segment], asset },
    );
  }
  for (let i = 0; i < count; i++) {
    const z = start + i * segment;
    const asset = i % 3 === 2 ? 'WallAstra_Straight_Window' : 'WallAstra_Straight';
    pieces.push(
      { key: `pw-${i}`, pos: [-ARENA_HALF, 0, z], rot: 0, size: [WALL_THICK, WALL_H, segment], asset },
      { key: `pe-${i}`, pos: [ARENA_HALF, 0, z], rot: Math.PI, size: [WALL_THICK, WALL_H, segment], asset },
    );
  }

  return (
    <group>
      {pieces.map((p) => (
        <SciFiPiece
          key={p.key}
          asset={p.asset}
          position={p.pos}
          rotation={[0, p.rot, 0]}
          size={p.size}
          castShadow={false}
        />
      ))}
    </group>
  );
}

function BuildingShell({ s, night }: { s: Solid; night: boolean }) {
  const halfW = s.w / 2;
  const halfD = s.d / 2;
  const wallAsset = s.h > 8 ? 'WallAstra_Straight_Window' : 'WallAstra_Straight_Flat';
  const lightCount = Math.max(1, Math.floor(s.w / 3));

  return (
    <group position={[s.x, s.y - s.h / 2, s.z]}>
      <SciFiPiece asset={wallAsset} position={[0, 0, halfD]} size={[WALL_THICK, s.h, s.w]} rotation={[0, Math.PI / 2, 0]} castShadow={false} />
      <SciFiPiece asset={wallAsset} position={[0, 0, -halfD]} size={[WALL_THICK, s.h, s.w]} rotation={[0, -Math.PI / 2, 0]} castShadow={false} />
      <SciFiPiece asset={wallAsset} position={[-halfW, 0, 0]} size={[WALL_THICK, s.h, s.d]} castShadow={false} />
      <SciFiPiece asset={wallAsset} position={[halfW, 0, 0]} size={[WALL_THICK, s.h, s.d]} rotation={[0, Math.PI, 0]} castShadow={false} />
      <SciFiPiece
        asset="Platform_DarkPlates"
        position={[0, s.h, 0]}
        size={[s.w + 0.2, 0.25, s.d + 0.2]}
        castShadow={false}
      />
      {night &&
        Array.from({ length: lightCount }).map((_, i) => (
          <SciFiPiece
            key={`light-${i}`}
            asset="Prop_Light_Floor"
            position={[-halfW + 1.2 + i * 2.8, s.h + 0.05, halfD + 0.35]}
            size={[0.7, 0.15, 0.7]}
            castShadow={false}
          />
        ))}
      <SciFiPiece
        asset="Prop_Vent_Small"
        position={[halfW * 0.5, s.h + 0.1, -halfD - 0.2]}
        size={[1.1, 0.35, 1.1]}
        castShadow={false}
      />
    </group>
  );
}

function SolidMesh({ s, night }: { s: Solid; night: boolean }) {
  if (PERIMETER_IDS.has(s.id)) return null;

  if (s.kind === 'building') {
    return <BuildingShell s={s} night={night} />;
  }

  if (s.kind === 'rock') {
    return (
      <group position={[s.x, s.y - s.h / 2, s.z]}>
        <mesh castShadow receiveShadow position={[0, s.h / 2, 0]}>
          <dodecahedronGeometry args={[Math.max(s.w, s.h, s.d) * 0.45, 1]} />
          <meshStandardMaterial color={s.color} roughness={0.95} />
        </mesh>
      </group>
    );
  }

  if (s.kind === 'crate') {
    const asset = s.id.includes('2') ? 'Prop_Crate4' : 'Prop_Crate3';
    return (
      <SciFiPiece
        asset={asset}
        position={[s.x, s.y - s.h / 2, s.z]}
        size={[s.w, s.h, s.d]}
      />
    );
  }

  if (s.kind === 'container') {
    return (
      <SciFiPiece
        asset="Prop_Barrel_Large"
        position={[s.x, s.y - s.h / 2, s.z]}
        size={[s.w, s.h, s.d]}
      />
    );
  }

  if (s.id === 'vault-door') {
    return (
      <SciFiPiece
        asset="Door_Metal"
        position={[s.x, s.y - s.h / 2, s.z]}
        size={[s.w, s.h, s.d]}
      />
    );
  }

  if (s.kind === 'wall') {
    return (
      <SciFiPiece
        asset="WallAstra_Straight"
        position={[s.x, s.y - s.h / 2, s.z]}
        size={[s.w, s.h, s.d]}
        castShadow={false}
      />
    );
  }

  return (
    <SciFiPiece
      asset="Platform_DarkPlates"
      position={[s.x, s.y - s.h / 2, s.z]}
      size={[s.w, s.h, s.d]}
      castShadow={false}
    />
  );
}

export function ArenaWorld({ layout }: { layout: ArenaLayout }) {
  const night = layout.tier !== 'day';
  return (
    <group>
      <SciFiGround />
      <PerimeterWalls />
      {layout.solids.map((s) => (
        <SolidMesh key={s.id} s={s} night={night} />
      ))}
    </group>
  );
}
