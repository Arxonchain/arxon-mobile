import { useEffect, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { ArenaAgent } from '../three/arena/arenaLayout';
import { AGENT_CLIPS } from '../three/models/modelRegistry';
import { AnimatedCharacter } from '../three/entities/AnimatedCharacter';
import { AGENT_CONE, AGENT_RANGE } from '../three/constants';
import { PREVIEW_FLOOR_Y } from './previewCollision';

function TorchBeam({ danger }: { danger: boolean }) {
  const light = useRef<THREE.SpotLight>(null);
  const target = useRef<THREE.Object3D>(null);
  const color = danger ? '#ff5533' : '#ffcc55';

  useEffect(() => {
    if (light.current && target.current) {
      light.current.target = target.current;
    }
  }, []);

  return (
    <group position={[0, 1.25, 0.55]}>
      <mesh position={[0, 0, AGENT_RANGE * 0.5]} rotation={[Math.PI / 2, 0, 0]}>
        <coneGeometry args={[AGENT_CONE * AGENT_RANGE * 0.85, AGENT_RANGE, 28, 1, true]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={danger ? 0.32 : 0.22}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>
      <spotLight
        ref={light}
        color={color}
        intensity={danger ? 4.5 : 3.2}
        angle={AGENT_CONE * 0.85}
        penumbra={0.62}
        distance={AGENT_RANGE + 4}
        decay={1.8}
        castShadow
      />
      <object3D ref={target} position={[0, -0.15, AGENT_RANGE]} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.2, AGENT_RANGE * 0.45]}>
        <circleGeometry args={[2.8, 32]} />
        <meshBasicMaterial color={color} transparent opacity={0.14} depthWrite={false} />
      </mesh>
      <pointLight color={color} intensity={2.5} distance={5} decay={2} position={[0, 0, 0.3]} />
    </group>
  );
}

export function PreviewTorchAgent({ agent }: { agent: ArenaAgent }) {
  const body = useRef<THREE.Group>(null);
  const beam = useRef<THREE.Group>(null);
  const agentRef = useRef(agent);
  agentRef.current = agent;

  useFrame(() => {
    const a = agentRef.current;
    if (body.current) {
      body.current.position.set(a.x, PREVIEW_FLOOR_Y, a.z);
    }
    if (beam.current) {
      beam.current.rotation.y = a.angle;
    }
  });

  return (
    <group ref={body}>
      <group ref={beam}>
        <TorchBeam danger={agent.state === 'chase'} />
        <AnimatedCharacter
          clips={AGENT_CLIPS}
          scale={1.45}
          facingOffset={Math.PI}
          resolveAnim={() => (agentRef.current.state === 'chase' ? 'run' : 'walk')}
          resolveFacing={() => agentRef.current.angle}
        />
      </group>
    </group>
  );
}
