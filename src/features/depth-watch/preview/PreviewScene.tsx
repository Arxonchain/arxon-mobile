import './dracoSetup';
import { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { ContactShadows, Loader, OrbitControls } from '@react-three/drei';
import { PLAYER_CLIPS, AGENT_CLIPS } from '../three/models/modelRegistry';
import { preloadSciFiEnvironment } from '../three/environment/SciFiPiece';
import { PreviewCharacter } from './PreviewCharacter';
import { PreviewCity } from './PreviewCity';
import { CHARACTER_SPAWNS, FLOOR_Y } from './cityLayout';
import { USE_DRACO } from './dracoSetup';
import { useGLTF } from '@react-three/drei';

useGLTF.preload(PLAYER_CLIPS.idle, USE_DRACO);
useGLTF.preload(PLAYER_CLIPS.walk, USE_DRACO);
useGLTF.preload(PLAYER_CLIPS.run, USE_DRACO);
useGLTF.preload(AGENT_CLIPS.walk, USE_DRACO);
useGLTF.preload(AGENT_CLIPS.idle, USE_DRACO);
preloadSciFiEnvironment();

const URL_MAP = {
  playerWalk: PLAYER_CLIPS.walk,
  agentWalk: AGENT_CLIPS.walk,
  agentIdle: AGENT_CLIPS.idle,
} as const;

function Scene() {
  return (
    <>
      <color attach="background" args={['#141e28']} />
      <fog attach="fog" args={['#243444', 40, 130]} />
      <ambientLight intensity={0.65} />
      <directionalLight position={[22, 32, 14]} intensity={1.5} castShadow shadow-mapSize={[1024, 1024]} color="#ffe8d0" />
      <directionalLight position={[-16, 14, -14]} intensity={0.4} color="#88aacc" />

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.05, 0]} receiveShadow>
        <planeGeometry args={[120, 120]} />
        <meshStandardMaterial color="#1e2830" roughness={0.96} metalness={0.04} />
      </mesh>

      <PreviewCity />
      <ContactShadows position={[0, FLOOR_Y + 0.01, 0]} opacity={0.42} scale={80} blur={2.5} far={20} />

      {CHARACTER_SPAWNS.map((spawn) => (
        <PreviewCharacter
          key={spawn.key}
          url={URL_MAP[spawn.urlKey]}
          position={spawn.position}
          rotationY={spawn.rotationY}
          label={spawn.key === 'player' ? 'YOU — player' : undefined}
          scale={spawn.key === 'player' ? 1.65 : 1.5}
        />
      ))}

      <pointLight position={[-14, 3, -10]} intensity={4} color="#ffaa44" distance={12} decay={2} />
      <pointLight position={[16, 3, 16]} intensity={3.5} color="#7ec8ff" distance={12} decay={2} />
      <pointLight position={[0, 4, 0]} intensity={2} color="#ffffff" distance={18} decay={2} />

      <OrbitControls
        makeDefault
        target={[0, 1.6, 0]}
        minDistance={5}
        maxDistance={55}
        maxPolarAngle={Math.PI / 2.05}
        enablePan
      />
    </>
  );
}

export function PreviewScene() {
  return (
    <>
      <Canvas
        shadows
        dpr={[1, 1.5]}
        camera={{ position: [0, 3.2, 5.5], fov: 48 }}
        gl={{ antialias: true, toneMappingExposure: 1.1 }}
        style={{ width: '100%', height: '100%' }}
      >
        <Suspense fallback={null}>
          <Scene />
        </Suspense>
      </Canvas>
      <Loader />
    </>
  );
}
