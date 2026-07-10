import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { Environment, Sky } from '@react-three/drei';
import { ArenaWorld } from './arena/ArenaWorld';
import { RainFX } from './RainFX';
import { AgentGlb } from './entities/AgentGlb';
import { Drone3D } from './entities/Drone3D';
import { Pickups3D, VaultGoal } from './entities/Pickups3D';
import { PlayerGlb } from './entities/PlayerGlb';
import { CameraRig } from './CameraRig';
import { stepGame, type GameState3D, type Input3D } from './gameState';

interface DepthWatchSceneProps {
  gameRef: React.MutableRefObject<GameState3D>;
  inputRef: React.MutableRefObject<Input3D>;
  onHud: (hud: HudSnapshot) => void;
  onEnd: (result: 'caught' | 'won') => void;
}

export interface HudSnapshot {
  level: number;
  elapsed: number;
  exposure: number;
  shieldActive: boolean;
  shieldCharges: number;
  coins: number;
  coinsRequired: number;
  hiding: boolean;
  running: boolean;
  climbing: boolean;
}

const SKY = {
  day: { bg: '#87CEEB', fog: '#b8d4e8', ambient: 0.85, sun: 1.35, hemi: 0.65 },
  dusk: { bg: '#e8956d', fog: '#c97b5a', ambient: 0.62, sun: 1.05, hemi: 0.5 },
  night: { bg: '#1a2332', fog: '#2a3548', ambient: 0.48, sun: 0.75, hemi: 0.38 },
};

export function DepthWatchScene({ gameRef, inputRef, onHud, onEnd }: DepthWatchSceneProps) {
  const playerRoot = useRef<THREE.Group>(null);
  const playerLight = useRef<THREE.PointLight>(null);
  const target = useMemo(() => new THREE.Vector3(), []);
  const cameraYaw = useRef(Math.PI);
  const hudTick = useRef(0);

  useFrame((_, dt) => {
    const state = gameRef.current;
    const input = { ...inputRef.current, cameraYaw: cameraYaw.current };
    const result = stepGame(state, input, Math.min(dt, 0.05));
    const p = state.player;

    if (playerRoot.current) {
      playerRoot.current.position.set(p.px, p.py, p.pz);
    }
    if (playerLight.current) {
      playerLight.current.position.set(p.px, p.py + 2.2, p.pz);
    }
    target.set(p.px, p.py + 1.2, p.pz);
    cameraYaw.current = p.facing;

    hudTick.current += dt;
    if (hudTick.current > 0.08) {
      hudTick.current = 0;
      onHud({
        level: state.level,
        elapsed: state.elapsed,
        exposure: state.exposure,
        shieldActive: state.shieldActive,
        shieldCharges: state.shieldCharges,
        coins: state.coins,
        coinsRequired: state.layout.coinsRequired,
        hiding: p.hiding,
        running: p.running,
        climbing: p.climbing,
      });
    }

    if (result) onEnd(result);
  });

  const layout = gameRef.current.layout;
  const sky = SKY[layout.tier];
  const rain = layout.tier !== 'day';

  return (
    <>
      <color attach="background" args={[sky.bg]} />
      <fog attach="fog" args={[sky.fog, 55, 150]} />
      <Environment preset="warehouse" />
      <Sky
        distance={450000}
        sunPosition={layout.tier === 'night' ? [0.15, 0.04, -0.2] : [0.5, 0.4, -0.4]}
        inclination={layout.tier === 'night' ? 0.3 : 0.52}
        azimuth={0.22}
      />
      <ambientLight intensity={sky.ambient} />
      <directionalLight
        position={[18, 28, 12]}
        intensity={sky.sun}
        castShadow={false}
      />
      <directionalLight position={[-12, 18, -8]} intensity={sky.sun * 0.45} />
      <hemisphereLight args={[sky.bg, '#3d4f3d', sky.hemi]} />
      <pointLight ref={playerLight} color="#fff8e7" intensity={2.4} distance={18} decay={2} />

      <RainFX active={rain} length={layout.half * 2} />

      <ArenaWorld layout={layout} />
      <Pickups3D pickups={layout.pickups} />
      <VaultGoal x={layout.vault.x} z={layout.vault.z} />

      {layout.agents.map((a) => (
        <AgentGlb key={a.id} agent={a} />
      ))}
      {layout.drones.map((d) => (
        <Drone3D key={d.id} drone={d} />
      ))}

      <group ref={playerRoot}>
        <PlayerGlb gameRef={gameRef} />
      </group>

      <CameraRig target={target} yawRef={cameraYaw} />
    </>
  );
}
