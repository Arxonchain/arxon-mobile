import { STREET_ZONES, FLOOR_Y } from './cityLayout';
import { useMemo } from 'react';
import * as THREE from 'three';
import { useTexture } from '@react-three/drei';
import groundTex from '@/assets/depth-watch/subway/ground.png';
import trackTex from '@/assets/depth-watch/subway/track.jpeg';
import wallTex from '@/assets/depth-watch/subway/wall.jpg';

function StreetMesh({
  position,
  size,
  map,
  tint = '#ffffff',
}: {
  position: [number, number];
  size: [number, number];
  map: THREE.Texture;
  tint?: string;
}) {
  const mat = useMemo(
    () => new THREE.MeshStandardMaterial({ map, color: tint, roughness: 0.85, metalness: 0.06 }),
    [map, tint],
  );

  return (
    <mesh
      rotation={[-Math.PI / 2, 0, 0]}
      position={[position[0], FLOOR_Y + 0.015, position[1]]}
      receiveShadow
      material={mat}
    >
      <planeGeometry args={size} />
    </mesh>
  );
}

function SideWall({
  position,
  size,
  map,
}: {
  position: [number, number, number];
  size: [number, number];
  map: THREE.Texture;
}) {
  const mat = useMemo(() => new THREE.MeshStandardMaterial({ map, roughness: 0.92 }), [map]);
  return (
    <mesh position={position} castShadow receiveShadow material={mat}>
      <boxGeometry args={[size[0], 4.5, size[1]]} />
    </mesh>
  );
}

/** Textured street network — each zone is a connected route (not endless runner). */
export function SubwayEnvironment() {
  const [ground, track, wall] = useTexture([groundTex, trackTex, wallTex]);
  ground.wrapS = ground.wrapT = THREE.RepeatWrapping;
  ground.repeat.set(6, 6);
  track.wrapS = track.wrapT = THREE.RepeatWrapping;
  track.repeat.set(1, 4);
  wall.wrapS = wall.wrapT = THREE.RepeatWrapping;
  wall.repeat.set(2, 1);

  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, FLOOR_Y, 0]} receiveShadow>
        <planeGeometry args={[120, 120]} />
        <meshStandardMaterial map={ground} color="#8a9199" roughness={0.95} />
      </mesh>

      {STREET_ZONES.map((zone) => (
        <StreetMesh
          key={zone.key}
          position={zone.position}
          size={zone.size}
          map={track}
          tint={zone.color}
        />
      ))}

      <SideWall position={[-11, 2.4, 0]} size={[0.5, 56]} map={wall} />
      <SideWall position={[11, 2.4, 0]} size={[0.5, 56]} map={wall} />
      <SideWall position={[0, 2.4, -11]} size={[56, 0.5]} map={wall} />
      <SideWall position={[0, 2.4, 11]} size={[56, 0.5]} map={wall} />
      <SideWall position={[-22, 2.4, -10]} size={[0.5, 14]} map={wall} />
      <SideWall position={[22, 2.4, -10]} size={[0.5, 14]} map={wall} />
      <SideWall position={[-22, 2.4, 10]} size={[0.5, 12]} map={wall} />
      <SideWall position={[22, 2.4, 14]} size={[0.5, 12]} map={wall} />
    </group>
  );
}
