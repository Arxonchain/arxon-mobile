import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Text } from '@react-three/drei';
import * as THREE from 'three';
import type { WorldLayout, WorldBuilding, WorldDecoration, SegmentFeature } from './worldLayout';
import { paletteForTier } from './worldLayout';
import { ROAD_WIDTH, SEGMENT_LEN } from './constants';

function BuildingMesh({ x, z, w, h, d, color, roofColor, windowColor, style }: WorldBuilding) {
  const roofH = style === 'block' ? 0.4 : style === 'warehouse' ? 0.6 : 1.2;
  return (
    <group position={[x, 0, z]}>
      <mesh castShadow receiveShadow position={[0, h / 2, 0]}>
        <boxGeometry args={[w, h, d]} />
        <meshStandardMaterial color={color} roughness={0.88} />
      </mesh>
      <mesh castShadow position={[0, h + roofH / 2, 0]}>
        {style === 'house' ? (
          <coneGeometry args={[Math.max(w, d) * 0.72, roofH * 2, 4]} />
        ) : (
          <boxGeometry args={[w + 0.2, roofH, d + 0.2]} />
        )}
        <meshStandardMaterial color={roofColor} roughness={0.9} />
      </mesh>
      {style === 'warehouse' && (
        <mesh position={[0, h * 0.55, d / 2 + 0.04]}>
          <planeGeometry args={[w * 0.75, h * 0.45]} />
          <meshStandardMaterial color="#475569" roughness={0.95} />
        </mesh>
      )}
      {style === 'shop' && (
        <>
          <mesh position={[0, 1.2, d / 2 + 0.03]}>
            <planeGeometry args={[w * 0.85, 1.8]} />
            <meshStandardMaterial color="#4FD8EB" emissive="#4FD8EB" emissiveIntensity={0.35} transparent opacity={0.85} />
          </mesh>
          <mesh position={[0, 2.6, d / 2 + 0.05]}>
            <boxGeometry args={[w * 0.9, 0.25, 0.15]} />
            <meshStandardMaterial color="#334155" />
          </mesh>
        </>
      )}
      {Array.from({ length: Math.max(1, Math.floor(h / 2.2)) }).map((_, row) =>
        Array.from({ length: Math.max(1, Math.floor(w / 1.4)) }).map((__, col) => (
          <mesh
            key={`${row}-${col}`}
            position={[-w / 2 + 0.65 + col * 1.35, 1.1 + row * 2.1, d / 2 + 0.02]}
          >
            <planeGeometry args={[0.55, 0.75]} />
            <meshStandardMaterial
              color={windowColor}
              emissive={windowColor}
              emissiveIntensity={style === 'block' && row > 2 ? 0.55 : 0.32}
            />
          </mesh>
        )),
      )}
    </group>
  );
}

function NeonSign({ x, z, w, h, color, label, night }: {
  x: number; z: number; w: number; h: number; color: string; label?: string; night: boolean;
}) {
  const glow = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    if (glow.current && night) {
      const m = glow.current.material as THREE.MeshStandardMaterial;
      m.emissiveIntensity = 0.6 + Math.sin(clock.elapsedTime * 3) * 0.25;
    }
  });
  return (
    <group position={[x, h / 2 + 2.5, z]}>
      <mesh ref={glow}>
        <boxGeometry args={[w, h, 0.12]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={night ? 0.85 : 0.35} />
      </mesh>
      {label && (
        <Text
          position={[0, 0, 0.08]}
          fontSize={0.22}
          color="#fff"
          anchorX="center"
          anchorY="middle"
          outlineWidth={0.02}
          outlineColor="#000"
        >
          {label}
        </Text>
      )}
      {night && <pointLight color={color} intensity={0.6} distance={5} />}
    </group>
  );
}

function StreetLamp({ x, z, h, night }: { x: number; z: number; h: number; night: boolean }) {
  return (
    <group position={[x, 0, z]}>
      <mesh castShadow position={[0, h / 2, 0]}>
        <cylinderGeometry args={[0.06, 0.08, h, 8]} />
        <meshStandardMaterial color="#374151" metalness={0.5} />
      </mesh>
      <mesh position={[0, h + 0.15, 0]}>
        <sphereGeometry args={[0.18, 8, 8]} />
        <meshStandardMaterial color="#fef3c7" emissive="#ffd166" emissiveIntensity={night ? 1.4 : 0.65} />
      </mesh>
      <pointLight color="#ffd166" intensity={night ? 2.2 : 1} distance={11} position={[0, h, 0]} />
    </group>
  );
}

function Tree({ x, z, h }: { x: number; z: number; h: number }) {
  return (
    <group position={[x, 0, z]}>
      <mesh castShadow position={[0, h * 0.25, 0]}>
        <cylinderGeometry args={[0.12, 0.18, h * 0.5, 6]} />
        <meshStandardMaterial color="#5c4033" roughness={0.95} />
      </mesh>
      <mesh castShadow position={[0, h * 0.75, 0]}>
        <coneGeometry args={[h * 0.45, h * 0.7, 8]} />
        <meshStandardMaterial color="#2d6a4f" roughness={0.85} />
      </mesh>
      <mesh castShadow position={[0, h * 1.05, 0]}>
        <coneGeometry args={[h * 0.35, h * 0.55, 8]} />
        <meshStandardMaterial color="#40916c" roughness={0.85} />
      </mesh>
    </group>
  );
}

function Fence({ x, z, d }: { x: number; z: number; d: number }) {
  const posts = Math.floor(d / 1.2);
  return (
    <group position={[x, 0, z]}>
      {Array.from({ length: posts }).map((_, i) => (
        <mesh key={i} castShadow position={[0, 0.55, -d / 2 + i * 1.2]}>
          <boxGeometry args={[0.08, 1.1, 0.08]} />
          <meshStandardMaterial color="#78716c" roughness={0.9} />
        </mesh>
      ))}
      <mesh position={[0, 0.85, 0]}><boxGeometry args={[0.06, 0.06, d]} /><meshStandardMaterial color="#57534e" /></mesh>
      <mesh position={[0, 0.45, 0]}><boxGeometry args={[0.06, 0.06, d]} /><meshStandardMaterial color="#57534e" /></mesh>
    </group>
  );
}

function Hydrant({ x, z }: { x: number; z: number }) {
  return (
    <group position={[x, 0, z]}>
      <mesh castShadow position={[0, 0.35, 0]}>
        <cylinderGeometry args={[0.14, 0.16, 0.7, 8]} />
        <meshStandardMaterial color="#dc2626" roughness={0.7} />
      </mesh>
      <mesh position={[0, 0.55, 0]}>
        <sphereGeometry args={[0.16, 8, 8]} />
        <meshStandardMaterial color="#ef4444" />
      </mesh>
    </group>
  );
}

function TrashBin({ x, z, h }: { x: number; z: number; h: number }) {
  return (
    <group position={[x, 0, z]}>
      <mesh castShadow position={[0, h / 2, 0]}>
        <cylinderGeometry args={[0.22, 0.26, h, 8]} />
        <meshStandardMaterial color="#374151" roughness={0.85} />
      </mesh>
    </group>
  );
}

function Dumpster({ x, z, w, h, d }: { x: number; z: number; w: number; h: number; d: number }) {
  return (
    <group position={[x, 0, z]}>
      <mesh castShadow position={[0, h / 2, 0]}>
        <boxGeometry args={[w, h, d]} />
        <meshStandardMaterial color="#1f2937" roughness={0.9} metalness={0.2} />
      </mesh>
      <mesh position={[0, h + 0.05, 0]}>
        <boxGeometry args={[w + 0.05, 0.1, d + 0.05]} />
        <meshStandardMaterial color="#111827" />
      </mesh>
    </group>
  );
}

function Bench({ x, z, w }: { x: number; z: number; w: number }) {
  return (
    <group position={[x, 0, z]}>
      <mesh castShadow position={[0, 0.35, 0]}>
        <boxGeometry args={[w, 0.08, 0.4]} />
        <meshStandardMaterial color="#78716c" />
      </mesh>
      {[-0.35, 0.35].map((ox) => (
        <mesh key={ox} position={[ox * w, 0.18, 0]}>
          <boxGeometry args={[0.08, 0.36, 0.35]} />
          <meshStandardMaterial color="#57534e" />
        </mesh>
      ))}
    </group>
  );
}

function DecorationMesh({ deco, night }: { deco: WorldDecoration; night: boolean }) {
  const { kind, x, z, w, h, d, color, label } = deco;
  switch (kind) {
    case 'neon':
      return <NeonSign x={x} z={z} w={w} h={h} color={color} label={label} night={night} />;
    case 'puddle':
      return (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[x, 0.015, z]}>
          <planeGeometry args={[w, d]} />
          <meshStandardMaterial color={color} roughness={0.15} metalness={0.65} transparent opacity={0.75} />
        </mesh>
      );
    case 'alley_wall':
      return (
        <mesh castShadow receiveShadow position={[x, h / 2, z]}>
          <boxGeometry args={[w, h, d]} />
          <meshStandardMaterial color={color} roughness={0.95} />
        </mesh>
      );
    case 'bridge_rail':
      return (
        <group position={[x, 0, z]}>
          <mesh castShadow position={[0, h / 2, 0]}>
            <boxGeometry args={[w, h, d]} />
            <meshStandardMaterial color={color} metalness={0.4} roughness={0.5} />
          </mesh>
          {Array.from({ length: Math.floor(d / 2) }).map((_, i) => (
            <mesh key={i} position={[0, h * 0.65, -d / 2 + i * 2 + 1]}>
              <boxGeometry args={[w * 3, 0.06, 0.06]} />
              <meshStandardMaterial color="#cbd5e1" metalness={0.5} />
            </mesh>
          ))}
        </group>
      );
    case 'pole':
      return (
        <group position={[x, 0, z]}>
          <mesh castShadow position={[0, h / 2, 0]}>
            <cylinderGeometry args={[0.05, 0.07, h, 6]} />
            <meshStandardMaterial color={color} />
          </mesh>
          <mesh position={[0, h - 0.3, 0.4]}>
            <boxGeometry args={[0.04, 0.04, 0.8]} />
            <meshStandardMaterial color="#1f2937" />
          </mesh>
        </group>
      );
    case 'billboard':
      return (
        <group position={[x, h / 2 + 1, z]}>
          <mesh castShadow position={[0, 0, 0]}>
            <boxGeometry args={[0.12, h, 0.12]} />
            <meshStandardMaterial color="#475569" />
          </mesh>
          <mesh position={[0, h * 0.15, 0.25]}>
            <boxGeometry args={[w, h * 0.7, 0.12]} />
            <meshStandardMaterial color={color} emissive={color} emissiveIntensity={night ? 0.4 : 0.15} />
          </mesh>
          {label && (
            <Text position={[0, h * 0.15, 0.32]} fontSize={0.35} color="#fff" anchorX="center" anchorY="middle">
              {label}
            </Text>
          )}
        </group>
      );
    case 'bus_stop':
      return (
        <group position={[x, 0, z]}>
          <mesh castShadow position={[0, h / 2, 0]}>
            <boxGeometry args={[w, h, d]} />
            <meshStandardMaterial color={color} roughness={0.85} transparent opacity={0.75} />
          </mesh>
          <mesh position={[0, 0.08, d / 2 + 0.02]}>
            <boxGeometry args={[w, 0.12, 0.08]} />
            <meshStandardMaterial color="#94a3b8" />
          </mesh>
          <mesh position={[0, h / 2, d / 2 + 0.05]}>
            <planeGeometry args={[w * 0.8, h * 0.5]} />
            <meshStandardMaterial color="#1e293b" transparent opacity={0.5} />
          </mesh>
        </group>
      );
    case 'scaffold':
      return (
        <group position={[x, h / 2, z]}>
          {[[-1, -1], [-1, 1], [1, -1], [1, 1]].map(([sx, sz], i) => (
            <mesh key={i} position={[sx * w / 2, 0, sz * d / 2]}>
              <boxGeometry args={[0.08, h, 0.08]} />
              <meshStandardMaterial color={color} />
            </mesh>
          ))}
          {[0.25, 0.5, 0.75].map((ty, i) => (
            <mesh key={`h-${i}`} position={[0, -h / 2 + h * ty, 0]}>
              <boxGeometry args={[w, 0.06, d]} />
              <meshStandardMaterial color={color} />
            </mesh>
          ))}
        </group>
      );
    default:
      return null;
  }
}

function PropMesh({ kind, x, z, w, h, d, night }: {
  kind: string; x: number; z: number; w: number; h: number; d: number; night: boolean;
}) {
  if (kind === 'lamp') return <StreetLamp x={x} z={z} h={h} night={night} />;
  if (kind === 'tree') return <Tree x={x} z={z} h={h} />;
  if (kind === 'fence') return <Fence x={x} z={z} d={d} />;
  if (kind === 'hydrant') return <Hydrant x={x} z={z} />;
  if (kind === 'trash') return <TrashBin x={x} z={z} h={h} />;
  if (kind === 'dumpster') return <Dumpster x={x} z={z} w={w} h={h} d={d} />;
  if (kind === 'bench') return <Bench x={x} z={z} w={w} />;

  const color = kind === 'rock' ? '#64748b'
    : kind === 'crate' ? '#92400e'
    : kind === 'barrel' ? '#374151'
    : kind === 'car' ? '#1e3a5f'
    : '#57534e';

  return (
    <group position={[x, 0, z]}>
      {kind === 'rock' ? (
        <group>
          <mesh castShadow position={[0, h * 0.35, 0]}>
            <dodecahedronGeometry args={[h * 0.45, 0]} />
            <meshStandardMaterial color={color} roughness={0.95} />
          </mesh>
          <mesh castShadow position={[0.3, h * 0.2, 0.2]}>
            <dodecahedronGeometry args={[h * 0.25, 0]} />
            <meshStandardMaterial color="#475569" roughness={0.95} />
          </mesh>
        </group>
      ) : kind === 'car' ? (
        <group position={[0, h * 0.35, 0]}>
          <mesh castShadow>
            <boxGeometry args={[w * 1.8, h * 0.45, d * 0.9]} />
            <meshStandardMaterial color={color} metalness={0.45} roughness={0.45} />
          </mesh>
          <mesh position={[0, h * 0.38, d * 0.15]}>
            <boxGeometry args={[w * 1.35, h * 0.32, d * 0.45]} />
            <meshStandardMaterial color="#334155" metalness={0.3} />
          </mesh>
          {[-0.55, 0.55].map((wx) =>
            [-0.35, 0.35].map((wz) => (
              <mesh key={`${wx}-${wz}`} position={[wx * w, -h * 0.1, wz * d]} rotation={[0, 0, Math.PI / 2]}>
                <cylinderGeometry args={[0.18, 0.18, 0.12, 10]} />
                <meshStandardMaterial color="#111" />
              </mesh>
            )),
          )}
        </group>
      ) : kind === 'wall' ? (
        <group>
          <mesh castShadow position={[0, h / 2, 0]}>
            <boxGeometry args={[w, h, d]} />
            <meshStandardMaterial color={color} roughness={0.92} />
          </mesh>
          <mesh position={[0, h + 0.08, 0]}>
            <boxGeometry args={[w + 0.1, 0.12, d + 0.1]} />
            <meshStandardMaterial color="#44403c" />
          </mesh>
        </group>
      ) : (
        <mesh castShadow position={[0, h / 2, 0]}>
          <boxGeometry args={[w, h, d]} />
          <meshStandardMaterial color={color} roughness={0.82} />
        </mesh>
      )}
    </group>
  );
}

function RoadSegment({ z, pal, index, feature }: {
  z: number;
  pal: ReturnType<typeof paletteForTier>;
  index: number;
  feature: SegmentFeature;
}) {
  const elevated = feature === 'bridge';
  const roadY = elevated ? 1.2 : 0.01;
  const dashCount = 8;

  return (
    <group position={[0, 0, z]}>
      {elevated && (
        <>
          <mesh position={[-ROAD_WIDTH / 2 - 1.2, roadY / 2, 0]} castShadow>
            <boxGeometry args={[0.5, roadY, SEGMENT_LEN]} />
            <meshStandardMaterial color="#64748b" roughness={0.85} />
          </mesh>
          <mesh position={[ROAD_WIDTH / 2 + 1.2, roadY / 2, 0]} castShadow>
            <boxGeometry args={[0.5, roadY, SEGMENT_LEN]} />
            <meshStandardMaterial color="#64748b" roughness={0.85} />
          </mesh>
        </>
      )}

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, roadY, 0]} receiveShadow>
        <planeGeometry args={[ROAD_WIDTH, SEGMENT_LEN]} />
        <meshStandardMaterial
          color={feature === 'alley' ? '#2d3436' : pal.road}
          roughness={feature === 'plaza' ? 0.75 : 0.92}
        />
      </mesh>

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[-ROAD_WIDTH / 2 - 1.4, roadY + 0.01, 0]} receiveShadow>
        <planeGeometry args={[2.8, SEGMENT_LEN]} />
        <meshStandardMaterial color={pal.sidewalk} roughness={0.95} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[ROAD_WIDTH / 2 + 1.4, roadY + 0.01, 0]} receiveShadow>
        <planeGeometry args={[2.8, SEGMENT_LEN]} />
        <meshStandardMaterial color={pal.sidewalk} roughness={0.95} />
      </mesh>

      {[-ROAD_WIDTH / 2 - 0.2, ROAD_WIDTH / 2 + 0.2].map((lx, idx) => (
        <mesh key={`curb-${idx}`} position={[lx, roadY + 0.05, 0]}>
          <boxGeometry args={[0.18, 0.12, SEGMENT_LEN]} />
          <meshStandardMaterial color={pal.curb} />
        </mesh>
      ))}

      {[-ROAD_WIDTH / 2 + 0.08, ROAD_WIDTH / 2 - 0.08].map((lx, idx) => (
        <mesh key={`edge-${idx}`} position={[lx, roadY + 0.08, 0]}>
          <boxGeometry args={[0.1, 0.14, SEGMENT_LEN]} />
          <meshStandardMaterial color="#f8fafc" emissive="#fff" emissiveIntensity={0.12} />
        </mesh>
      ))}

      {Array.from({ length: dashCount }).map((_, i) => (
        <mesh key={`dash-${i}`} rotation={[-Math.PI / 2, 0, 0]} position={[0, roadY + 0.02, -SEGMENT_LEN / 2 + 1.5 + i * 2.5]}>
          <planeGeometry args={[0.12, 1.1]} />
          <meshStandardMaterial color="#fbbf24" emissive="#fbbf24" emissiveIntensity={0.2} />
        </mesh>
      ))}

      {index % 3 === 0 && (
        <group rotation={[-Math.PI / 2, 0, 0]} position={[0, roadY + 0.015, -SEGMENT_LEN / 2]}>
          {Array.from({ length: 5 }).map((_, i) => (
            <mesh key={i} position={[-2 + i * 1, 0, 0]}>
              <planeGeometry args={[0.7, 2.2]} />
              <meshStandardMaterial color="#e2e8f0" roughness={0.9} />
            </mesh>
          ))}
        </group>
      )}

      {feature === 'plaza' && (
        <group rotation={[-Math.PI / 2, 0, 0]} position={[0, roadY + 0.018, 0]}>
          {Array.from({ length: 12 }).map((_, i) => (
            <mesh key={i} position={[(i % 4 - 1.5) * 1.8, Math.floor(i / 4) * 2.5 - 2.5, 0]}>
              <planeGeometry args={[1.4, 1.4]} />
              <meshStandardMaterial color="#94a3b8" roughness={0.8} />
            </mesh>
          ))}
        </group>
      )}
    </group>
  );
}

export function World({ layout }: { layout: WorldLayout }) {
  const pal = paletteForTier(layout.tier);
  const night = layout.tier === 'night' || layout.tier === 'dusk';

  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, -layout.length / 2]} receiveShadow>
        <planeGeometry args={[ROAD_WIDTH + 32, layout.length + 80]} />
        <meshStandardMaterial color={pal.grass} roughness={1} />
      </mesh>

      {layout.segmentMeta.map((seg) => (
        <RoadSegment
          key={`seg-${seg.index}`}
          index={seg.index}
          z={seg.z}
          pal={pal}
          feature={seg.feature}
        />
      ))}

      {layout.buildings.map((b) => (
        <BuildingMesh key={b.id} {...b} />
      ))}
      {layout.decorations.map((d) => (
        <DecorationMesh key={d.id} deco={d} night={night} />
      ))}
      {layout.props.map((p) => (
        <PropMesh
          key={p.id}
          kind={p.kind}
          x={p.x}
          z={p.z}
          w={p.w}
          h={p.h}
          d={p.d}
          night={night}
        />
      ))}
    </group>
  );
}

export function ExtractionPortal({ z }: { z: number }) {
  const ref = useRef<THREE.Mesh>(null);
  const ring2 = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    if (ref.current) {
      ref.current.rotation.y = t * 1.2;
      ref.current.position.y = 1.4 + Math.sin(t * 2) * 0.15;
    }
    if (ring2.current) {
      ring2.current.rotation.y = -t * 0.8;
      ring2.current.position.y = 1.4 + Math.sin(t * 2 + 1) * 0.1;
    }
  });
  return (
    <group position={[0, 0, z]}>
      <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[1.5, 2.2, 32]} />
        <meshStandardMaterial color="#7FE7C4" emissive="#7FE7C4" emissiveIntensity={0.4} transparent opacity={0.5} />
      </mesh>
      <mesh ref={ref}>
        <torusGeometry args={[1.2, 0.18, 12, 32]} />
        <meshStandardMaterial color="#7FE7C4" emissive="#7FE7C4" emissiveIntensity={0.9} />
      </mesh>
      <mesh ref={ring2}>
        <torusGeometry args={[0.85, 0.1, 8, 24]} />
        <meshStandardMaterial color="#4FD8EB" emissive="#4FD8EB" emissiveIntensity={0.7} />
      </mesh>
      <pointLight color="#7FE7C4" intensity={3} distance={12} position={[0, 2, 0]} />
    </group>
  );
}
