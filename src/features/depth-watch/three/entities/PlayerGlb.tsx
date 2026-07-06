import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { GameState3D } from '../gameState';
import { playerModelKey } from '../models/modelRegistry';
import { GlbCharacter } from './GlbCharacter';

export function PlayerGlb({ gameRef }: { gameRef: React.MutableRefObject<GameState3D> }) {
  const shield = useRef<THREE.Mesh>(null);

  useFrame(() => {
    if (shield.current) {
      shield.current.visible = gameRef.current.shieldActive;
    }
  });

  return (
    <>
      <GlbCharacter modelKey={playerModelKey(gameRef.current.characterId)} gameRef={gameRef} />
      <mesh ref={shield} visible={false} position={[0, 1, 0]}>
        <sphereGeometry args={[1.1, 16, 16]} />
        <meshStandardMaterial color="#4FD8EB" emissive="#4FD8EB" emissiveIntensity={0.7} transparent opacity={0.25} />
      </mesh>
    </>
  );
}
