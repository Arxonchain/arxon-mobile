import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { Sky } from '@react-three/drei';
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
  day: { bg: '#87CEEB', fog: '#b8d4e8' },
  dusk: { bg: '#e8956d', fog: '#c97b5a' },
  night: { bg: '#0f1419', fog: '#1a2332' },
};

export function DepthWatchScene({ gameRef, inputRef, onHud, onEnd }: DepthWatchSceneProps) {
  const playerRoot = useRef<THREE.Group>(null);
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
      <fog attach="fog" args={[sky.fog, 38, 110]} />
      <Sky
        distance={450000}
        sunPosition={layout.tier === 'night' ? [0.15, 0.04, -0.2] : [0.5, 0.4, -0.4]}
        inclination={layout.tier === 'night' ? 0.3 : 0.52}
        azimuth={0.22}
      />
      <ambientLight intensity={layout.tier === 'night' ? 0.22 : layout.tier === 'dusk' ? 0.38 : 0.55} />
      <directionalLight
        castShadow
        position={[18, 28, 12]}
        intensity={layout.tier === 'night' ? 0.3 : 0.95}
        shadow-mapSize={[1024, 1024]}
        shadow-camera-far={80}
        shadow-camera-left={-40}
        shadow-camera-right={40}
        shadow-camera-top={40}
        shadow-camera-bottom={-40}
      />
      <hemisphereLight args={[sky.bg, '#2d4a32', layout.tier === 'night' ? 0.25 : 0.4]} />

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
