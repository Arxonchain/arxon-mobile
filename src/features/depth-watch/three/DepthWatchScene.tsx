import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { Sky } from '@react-three/drei';
import { World, ExtractionPortal } from './World';
import { RainFX } from './RainFX';
import { PlayerAvatar } from './PlayerAvatar';
import { Agent3D } from './Agent3D';
import { CameraRig } from './CameraRig';
import { paletteForTier } from './worldLayout';
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
  cloakActive: boolean;
  cloakCooldown: number;
  hiding: boolean;
  running: boolean;
}

export function DepthWatchScene({ gameRef, inputRef, onHud, onEnd }: DepthWatchSceneProps) {
  const playerGroup = useRef<THREE.Group>(null);
  const target = useMemo(() => new THREE.Vector3(), []);
  const hudTick = useRef(0);

  useFrame((_, dt) => {
    const state = gameRef.current;
    const result = stepGame(state, inputRef.current, Math.min(dt, 0.05));

    if (playerGroup.current) {
      playerGroup.current.position.set(state.px, 0, state.pz);
      playerGroup.current.rotation.y = state.facingRight ? 0 : Math.PI;
    }
    target.set(state.px, 0, state.pz);

    hudTick.current += dt;
    if (hudTick.current > 0.08) {
      hudTick.current = 0;
      onHud({
        level: state.level,
        elapsed: state.elapsed,
        exposure: state.exposure,
        cloakActive: state.cloakActive,
        cloakCooldown: state.cloakCooldown,
        hiding: state.hiding,
        running: state.running,
      });
    }

    if (result) onEnd(result);
  });

  const layout = gameRef.current.layout;
  const pal = paletteForTier(layout.tier);
  const rain = layout.tier === 'night' || layout.tier === 'dusk';

  return (
    <>
      <color attach="background" args={[pal.sky]} />
      <fog attach="fog" args={[pal.fog, 20, rain ? 70 : 85]} />
      <Sky
        distance={450000}
        sunPosition={layout.tier === 'night' ? [0.2, 0.05, -0.3] : [0.5, 0.35, -0.5]}
        inclination={layout.tier === 'night' ? 0.35 : 0.52}
        azimuth={0.25}
      />
      <ambientLight intensity={layout.tier === 'night' ? 0.18 : layout.tier === 'dusk' ? 0.35 : 0.55} />
      <directionalLight
        castShadow
        position={[12, 22, 8]}
        intensity={layout.tier === 'night' ? 0.25 : layout.tier === 'dusk' ? 0.65 : 1.1}
        shadow-mapSize={[1024, 1024]}
      />
      <hemisphereLight
        args={[layout.tier === 'night' ? '#1a2332' : pal.sky, pal.grass, layout.tier === 'night' ? 0.2 : 0.35]}
      />

      <RainFX active={rain} length={layout.length} />

      <World layout={layout} />
      <ExtractionPortal z={layout.portalZ} />

      {layout.agents.map((a) => (
        <Agent3D key={a.id} agent={a} />
      ))}

      <PlayerAvatar
        groupRef={playerGroup}
        gameRef={gameRef}
        characterId={gameRef.current.characterId}
      />

      <CameraRig target={target} />
    </>
  );
}
