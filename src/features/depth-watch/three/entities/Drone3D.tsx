import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { ArenaDrone } from '../arena/arenaLayout';

function DroneMesh() {
  return (
    <group>
      <mesh castShadow>
        <boxGeometry args={[0.9, 0.25, 0.9]} />
        <meshStandardMaterial color="#1e293b" metalness={0.6} roughness={0.35} />
      </mesh>
      <mesh position={[0, 0.15, 0]}>
        <sphereGeometry args={[0.18, 8, 8]} />
        <meshStandardMaterial color="#ef4444" emissive="#ef4444" emissiveIntensity={1.2} />
      </mesh>
      {[[-0.55, -0.55], [0.55, -0.55], [-0.55, 0.55], [0.55, 0.55]].map(([x, z], i) => (
        <mesh key={i} position={[x, 0.08, z]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.22, 0.22, 0.04, 8]} />
          <meshStandardMaterial color="#334155" />
        </mesh>
      ))}
    </group>
  );
}

export function Drone3D({ drone }: { drone: ArenaDrone }) {
  const group = useRef<THREE.Group>(null);
  const beam = useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    if (!group.current) return;
    group.current.position.set(drone.x, drone.y, drone.z);
    group.current.rotation.y = drone.angle + Math.sin(clock.elapsedTime * 2 + drone.hover) * 0.08;
    if (beam.current) {
      beam.current.rotation.x = Math.PI / 2;
    }
  });

  return (
    <group ref={group}>
      <DroneMesh />
      <group rotation={[0, drone.angle, 0]}>
        <mesh ref={beam} position={[0, -4, 0]}>
          <coneGeometry args={[3.2, 8, 16, 1, true]} />
          <meshBasicMaterial color="#ffd166" transparent opacity={0.14} side={THREE.DoubleSide} depthWrite={false} />
        </mesh>
        <spotLight
          color="#ffd166"
          intensity={2.5}
          angle={0.38}
          penumbra={0.5}
          distance={18}
          position={[0, 0, 0]}
          rotation={[-Math.PI / 2, 0, 0]}
        />
      </group>
      <pointLight color="#4FD8EB" intensity={0.4} distance={4} />
    </group>
  );
}
