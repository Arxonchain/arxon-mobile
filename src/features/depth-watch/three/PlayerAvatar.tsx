import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

const CHAR_COLORS: Record<string, { body: string; accent: string }> = {
  explorer: { body: '#8B6914', accent: '#2d6a4f' },
  scout: { body: '#991b1b', accent: '#1f2937' },
  skater: { body: '#ea580c', accent: '#f8fafc' },
};

export function PlayerAvatar({
  characterId,
  gameRef,
  groupRef,
}: {
  characterId: string;
  gameRef: React.MutableRefObject<import('./gameState').GameState3D>;
  groupRef: React.RefObject<THREE.Group>;
}) {
  const legL = useRef<THREE.Group>(null);
  const legR = useRef<THREE.Group>(null);
  const armL = useRef<THREE.Group>(null);
  const armR = useRef<THREE.Group>(null);
  const phase = useRef(0);
  const colors = CHAR_COLORS[characterId] ?? CHAR_COLORS.explorer;

  useFrame((_, dt) => {
    const s = gameRef.current;
    const moving = s.moving;
    const running = s.running;
    if (moving) phase.current += dt * (running ? 14 : 9);
    const swing = moving ? Math.sin(phase.current) * (running ? 0.55 : 0.38) : 0;
    if (legL.current) legL.current.rotation.x = swing;
    if (legR.current) legR.current.rotation.x = -swing;
    if (armL.current) armL.current.rotation.x = -swing * 0.6;
    if (armR.current) armR.current.rotation.x = swing * 0.6;
    if (groupRef.current) {
      const scale = s.hiding ? 0.85 : 1;
      groupRef.current.scale.set(scale, scale * (s.hiding ? 0.92 : 1), scale);
    }
  });

  const scale = 1;

  return (
    <group ref={groupRef} scale={[scale, scale, scale]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]} receiveShadow>
        <circleGeometry args={[0.35, 16]} />
        <meshBasicMaterial color="#000" transparent opacity={0.35} />
      </mesh>

      <group ref={legL} position={[-0.18, 0.45, 0]}>
        <mesh castShadow position={[0, -0.22, 0]}>
          <capsuleGeometry args={[0.1, 0.35, 4, 8]} />
          <meshStandardMaterial color="#1e293b" />
        </mesh>
      </group>
      <group ref={legR} position={[0.18, 0.45, 0]}>
        <mesh castShadow position={[0, -0.22, 0]}>
          <capsuleGeometry args={[0.1, 0.35, 4, 8]} />
          <meshStandardMaterial color="#1e293b" />
        </mesh>
      </group>

      <mesh castShadow position={[0, 0.85, 0]}>
        <capsuleGeometry args={[0.28, 0.55, 6, 12]} />
        <meshStandardMaterial color={colors.body} roughness={0.7} />
      </mesh>

      <mesh castShadow position={[0, 1.35, 0]}>
        <sphereGeometry args={[0.22, 16, 16]} />
        <meshStandardMaterial color="#fcd9b6" roughness={0.6} />
      </mesh>

      {characterId === 'explorer' && (
        <mesh position={[0, 1.42, 0.12]}>
          <boxGeometry args={[0.42, 0.12, 0.08]} />
          <meshStandardMaterial color={colors.accent} metalness={0.3} />
        </mesh>
      )}

      <group ref={armL} position={[-0.32, 1.05, 0]}>
        <mesh castShadow position={[0, -0.18, 0]}>
          <capsuleGeometry args={[0.07, 0.28, 4, 8]} />
          <meshStandardMaterial color={colors.body} />
        </mesh>
      </group>
      <group ref={armR} position={[0.32, 1.05, 0]}>
        <mesh castShadow position={[0, -0.18, 0]}>
          <capsuleGeometry args={[0.07, 0.28, 4, 8]} />
          <meshStandardMaterial color={colors.body} />
        </mesh>
      </group>
    </group>
  );
}
