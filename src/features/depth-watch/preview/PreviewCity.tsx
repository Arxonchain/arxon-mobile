import { SciFiPiece } from '../three/environment/SciFiPiece';
import { CITY_PIECES, FLOOR_Y, STREET_ZONES } from './cityLayout';

export function PreviewCity() {
  return (
    <group>
      {STREET_ZONES.map((zone) => (
        <mesh
          key={zone.key}
          rotation={[-Math.PI / 2, 0, 0]}
          position={[zone.position[0], FLOOR_Y, zone.position[1]]}
          receiveShadow
        >
          <planeGeometry args={zone.size} />
          <meshStandardMaterial color={zone.color} roughness={0.88} metalness={0.18} />
        </mesh>
      ))}

      {CITY_PIECES.map((p) => (
        <SciFiPiece
          key={p.key}
          asset={p.asset}
          position={p.position}
          rotation={p.rotation}
          size={p.size}
          castShadow={false}
        />
      ))}
    </group>
  );
}
