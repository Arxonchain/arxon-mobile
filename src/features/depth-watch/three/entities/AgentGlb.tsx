import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { ArenaAgent } from '../arena/arenaLayout';
import { AGENT_CLIPS } from '../models/modelRegistry';
import { AnimatedCharacter } from './AnimatedCharacter';

function SpotCone({ danger }: { danger: boolean }) {
  return (
    <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0.05, 0]}>
      <coneGeometry args={[4.5, 11, 20, 1, true]} />
      <meshBasicMaterial
        color={danger ? '#ff6b4a' : '#ffd166'}
        transparent
        opacity={0.2}
        side={THREE.DoubleSide}
        depthWrite={false}
      />
    </mesh>
  );
}

export function AgentGlb({ agent }: { agent: ArenaAgent }) {
  const group = useRef<THREE.Group>(null);
  const agentRef = useRef(agent);
  agentRef.current = agent;

  useFrame(() => {
    if (group.current) {
      group.current.position.set(agent.x, 0, agent.z);
    }
  });

  const danger = agent.state === 'chase';

  return (
    <group ref={group}>
      <group rotation={[0, agent.angle, 0]}>
        <SpotCone danger={danger} />
        <spotLight
          color={danger ? '#ff7b54' : '#ffd166'}
          intensity={danger ? 2.8 : 2}
          angle={0.48}
          penumbra={0.45}
          distance={14}
          castShadow
          position={[0, 2.8, 0]}
          rotation={[-Math.PI / 2, 0, 0]}
        />
      </group>
      <AnimatedCharacter
        clips={AGENT_CLIPS}
        scale={0.95}
        facingOffset={Math.PI}
        resolveAnim={() => (agentRef.current.state === 'chase' ? 'run' : 'walk')}
        resolveFacing={() => agentRef.current.angle}
      />
    </group>
  );
}
