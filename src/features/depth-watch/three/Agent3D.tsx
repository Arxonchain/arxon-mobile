import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { WorldAgent } from './worldLayout';

function LightCone({ angle, range, danger }: { angle: number; range: number; danger: boolean }) {
  const geo = useRef<THREE.ConeGeometry>(null);
  return (
    <mesh rotation={[Math.PI / 2, 0, angle]} position={[0, 0.05, 0]}>
      <coneGeometry ref={geo} args={[range * 0.35, range, 16, 1, true]} />
      <meshBasicMaterial
        color={danger ? '#ff6b4a' : '#ffd166'}
        transparent
        opacity={0.22}
        side={THREE.DoubleSide}
        depthWrite={false}
      />
    </mesh>
  );
}

export function Agent3D({ agent }: { agent: WorldAgent }) {
  const group = useRef<THREE.Group>(null);
  const legL = useRef<THREE.Group>(null);
  const legR = useRef<THREE.Group>(null);
  const phase = useRef(0);
  const danger = agent.state === 'chase';

  useFrame((_, dt) => {
    phase.current += dt * 6;
    const swing = Math.sin(phase.current) * 0.25;
    if (legL.current) legL.current.rotation.x = swing;
    if (legR.current) legR.current.rotation.x = -swing;
    if (group.current) {
      group.current.position.set(agent.x, 0, agent.z);
      group.current.rotation.y = agent.angle + Math.PI / 2;
    }
  });

  return (
    <group ref={group}>
      <LightCone angle={0} range={11} danger={danger} />
      <spotLight
        color={danger ? '#ff7b54' : '#ffd166'}
        intensity={danger ? 2.5 : 1.8}
        angle={0.45}
        penumbra={0.4}
        distance={14}
        castShadow
        position={[0, 3, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
      />

      <group ref={legL} position={[-0.16, 0.45, 0]}>
        <mesh castShadow position={[0, -0.2, 0]}>
          <capsuleGeometry args={[0.09, 0.32, 4, 8]} />
          <meshStandardMaterial color="#1e3a5f" />
        </mesh>
      </group>
      <group ref={legR} position={[0.16, 0.45, 0]}>
        <mesh castShadow position={[0, -0.2, 0]}>
          <capsuleGeometry args={[0.09, 0.32, 4, 8]} />
          <meshStandardMaterial color="#1e3a5f" />
        </mesh>
      </group>
      <mesh castShadow position={[0, 0.82, 0]}>
        <capsuleGeometry args={[0.26, 0.5, 6, 12]} />
        <meshStandardMaterial color={danger ? '#7f1d1d' : '#1e3a5f'} />
      </mesh>
      <mesh castShadow position={[0, 1.28, 0]}>
        <sphereGeometry args={[0.2, 12, 12]} />
        <meshStandardMaterial color="#fcd9b6" />
      </mesh>
      <mesh position={[0.15, 1.1, 0.2]} rotation={[0.3, 0, -0.4]}>
        <boxGeometry args={[0.08, 0.5, 0.08]} />
        <meshStandardMaterial color="#94a3b8" metalness={0.6} />
      </mesh>
    </group>
  );
}
