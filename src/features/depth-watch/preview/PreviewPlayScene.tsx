import './dracoSetup';
import { Suspense, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { ContactShadows, Loader } from '@react-three/drei';
import { Canvas } from '@react-three/fiber';
import * as THREE from 'three';
import { useGLTF } from '@react-three/drei';
import { PLAYER_CLIPS, AGENT_CLIPS, preloadDepthWatchModels } from '../three/models/modelRegistry';
import { preloadSciFiEnvironment } from '../three/environment/SciFiPiece';
import { Pickups3D, VaultGoal } from '../three/entities/Pickups3D';
import { Drone3D } from '../three/entities/Drone3D';
import { CameraRig } from '../three/CameraRig';
import { AnimatedCharacter, stateFromGame } from '../three/entities/AnimatedCharacter';
import type { GameState3D, Input3D } from '../three/gameState';
import { FLOOR_Y } from './cityLayout';
import { stepPreviewGame } from './previewGame';
import { PREVIEW_SECTOR_SECONDS } from './previewSliceLayout';
import { playCoinTick, playVaultChime } from './previewSounds';
import { USE_DRACO } from './dracoSetup';
import { PreviewCity } from './PreviewCity';
import { SubwayEnvironment } from './SubwayEnvironment';
import { PreviewTorchAgent } from './PreviewTorchAgent';

preloadDepthWatchModels();
preloadSciFiEnvironment();
useGLTF.preload(PLAYER_CLIPS.idle, USE_DRACO);
useGLTF.preload(PLAYER_CLIPS.walk, USE_DRACO);
useGLTF.preload(PLAYER_CLIPS.run, USE_DRACO);
useGLTF.preload(AGENT_CLIPS.walk, USE_DRACO);
useGLTF.preload(AGENT_CLIPS.run, USE_DRACO);

export interface PreviewHudState {
  coins: number;
  coinsRequired: number;
  exposure: number;
  elapsed: number;
  sectorLeft: number;
  running: boolean;
  hiding: boolean;
  phase: 'playing' | 'caught' | 'won';
}

interface PlaySceneProps {
  gameRef: React.MutableRefObject<GameState3D>;
  inputRef: React.MutableRefObject<Input3D>;
  onHud: (hud: PreviewHudState) => void;
  onEnd: (result: 'caught' | 'won') => void;
}

function PlayScene({ gameRef, inputRef, onHud, onEnd }: PlaySceneProps) {
  const playerRoot = useRef<THREE.Group>(null);
  const target = useMemo(() => new THREE.Vector3(), []);
  const cameraYaw = useRef(Math.PI);
  const hudTick = useRef(0);
  const prevCoins = useRef(0);

  useFrame((_, dt) => {
    const state = gameRef.current;
    const input = { ...inputRef.current };
    const result = stepPreviewGame(state, input, Math.min(dt, 0.05));
    const p = state.player;

    if (state.coins > prevCoins.current) {
      playCoinTick();
      prevCoins.current = state.coins;
    }

    if (playerRoot.current) {
      playerRoot.current.position.set(p.px, p.py, p.pz);
    }
    target.set(p.px, p.py + 1.2, p.pz);

    hudTick.current += dt;
    if (hudTick.current > 0.06) {
      hudTick.current = 0;
      onHud({
        coins: state.coins,
        coinsRequired: state.layout.coinsRequired,
        exposure: state.exposure,
        elapsed: state.elapsed,
        sectorLeft: Math.max(0, PREVIEW_SECTOR_SECONDS - state.elapsed),
        running: p.running,
        hiding: p.hiding,
        phase: state.phase,
      });
    }

    if (result === 'won') playVaultChime();
    if (result) onEnd(result);
  });

  const layout = gameRef.current.layout;

  return (
    <>
      <color attach="background" args={['#0f1620']} />
      <fog attach="fog" args={['#1a2838', 28, 95]} />
      <ambientLight intensity={0.35} />
      <directionalLight position={[18, 28, 10]} intensity={0.9} color="#ffe8d0" castShadow shadow-mapSize={[1024, 1024]} />
      <directionalLight position={[-14, 12, -12]} intensity={0.25} color="#6688aa" />
      <hemisphereLight args={['#2a3548', '#0a1018', 0.4]} />

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]} receiveShadow>
        <planeGeometry args={[120, 120]} />
        <meshStandardMaterial color="#121a22" roughness={0.98} metalness={0.02} />
      </mesh>

      <SubwayEnvironment />
      <PreviewCity />
      <ContactShadows position={[0, FLOOR_Y + 0.01, 0]} opacity={0.5} scale={70} blur={2.8} far={18} />

      <Pickups3D pickups={layout.pickups} />
      <VaultGoal x={layout.vault.x} z={layout.vault.z} />

      {layout.agents.map((a) => (
        <PreviewTorchAgent key={a.id} agent={a} />
      ))}
      {layout.drones.map((d) => (
        <Drone3D key={d.id} drone={d} />
      ))}

      <group ref={playerRoot}>
        <AnimatedCharacter
          clips={PLAYER_CLIPS}
          scale={1.65}
          facingOffset={Math.PI}
          resolveAnim={() => stateFromGame(gameRef.current)}
          resolveFacing={() => gameRef.current.player.facing}
        />
      </group>

      <pointLight position={[0, 3, 0]} intensity={1.2} color="#ffffff" distance={22} decay={2} />
      <CameraRig target={target} yawRef={cameraYaw} smoothness={0.08} />
    </>
  );
}

interface PreviewPlaySceneProps {
  gameRef: React.MutableRefObject<GameState3D>;
  inputRef: React.MutableRefObject<Input3D>;
  onHud: (hud: PreviewHudState) => void;
  onEnd: (result: 'caught' | 'won') => void;
}

export function PreviewPlayScene({ gameRef, inputRef, onHud, onEnd }: PreviewPlaySceneProps) {
  return (
    <>
      <Canvas
        shadows
        dpr={[1, 1.5]}
        camera={{ position: [0, 5, 12], fov: 52 }}
        gl={{ antialias: true, toneMappingExposure: 1.15 }}
        style={{ width: '100%', height: '100%', touchAction: 'none', pointerEvents: 'none' }}
      >
        <Suspense fallback={null}>
          <PlayScene gameRef={gameRef} inputRef={inputRef} onHud={onHud} onEnd={onEnd} />
        </Suspense>
      </Canvas>
      <Loader />
    </>
  );
}
