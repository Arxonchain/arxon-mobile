import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { Pickup } from '../arena/arenaLayout';

function Coin({ pickup }: { pickup: Pickup }) {
  const ref = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (ref.current) {
      ref.current.rotation.y = clock.elapsedTime * 2.5;
      ref.current.position.y = pickup.y + 0.35 + Math.sin(clock.elapsedTime * 3 + pickup.x) * 0.12;
    }
  });
  return (
    <group ref={ref} position={[pickup.x, pickup.y, pickup.z]}>
      <mesh castShadow>
        <cylinderGeometry args={[0.28, 0.28, 0.08, 16]} />
        <meshStandardMaterial color="#ffd93d" emissive="#ffb800" emissiveIntensity={0.55} metalness={0.7} roughness={0.25} />
      </mesh>
      <pointLight color="#ffd93d" intensity={0.35} distance={3} />
    </group>
  );
}

function ShieldOrb({ pickup }: { pickup: Pickup }) {
  const ref = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    if (ref.current) {
      ref.current.rotation.y = clock.elapsedTime;
      ref.current.position.y = pickup.y + 0.6 + Math.sin(clock.elapsedTime * 2) * 0.15;
    }
  });
  return (
    <group position={[pickup.x, pickup.y, pickup.z]}>
      <mesh ref={ref}>
        <icosahedronGeometry args={[0.35, 1]} />
        <meshStandardMaterial color="#4FD8EB" emissive="#4FD8EB" emissiveIntensity={0.9} transparent opacity={0.85} />
      </mesh>
      <pointLight color="#4FD8EB" intensity={1.2} distance={5} />
    </group>
  );
}

export function Pickups3D({ pickups }: { pickups: Pickup[] }) {
  return (
    <group>
      {pickups.filter((p) => !p.collected).map((p) =>
        p.kind === 'coin'
          ? <Coin key={p.id} pickup={p} />
          : <ShieldOrb key={p.id} pickup={p} />,
      )}
    </group>
  );
}

export function VaultGoal({ x, z }: { x: number; z: number }) {
  const ring = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    if (ring.current) ring.current.rotation.z = clock.elapsedTime * 0.8;
  });
  return (
    <group position={[x, 0.05, z]}>
      <mesh ref={ring} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[1.8, 2.4, 32]} />
        <meshStandardMaterial color="#7FE7C4" emissive="#7FE7C4" emissiveIntensity={0.6} transparent opacity={0.7} />
      </mesh>
      <pointLight color="#7FE7C4" intensity={2} distance={10} position={[0, 2, 0]} />
    </group>
  );
}
