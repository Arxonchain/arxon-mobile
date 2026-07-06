import { useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import type { GameState3D } from '../gameState';
import type { ModelKey } from '../models/modelRegistry';
import { MODEL_URLS } from '../models/modelRegistry';
import { CHARACTER_HEIGHT } from '../constants';

export type AnimState = 'idle' | 'walk' | 'run' | 'crouch' | 'climb' | 'jump';

interface GlbCharacterProps {
  modelKey: ModelKey;
  anim?: AnimState;
  facing?: number;
  scale?: number;
  gameRef?: React.MutableRefObject<GameState3D>;
}

function animFromGame(state: GameState3D): AnimState {
  const p = state.player;
  if (p.climbing) return 'climb';
  if (p.mode === 'air') return 'jump';
  if (p.crouching) return 'crouch';
  if (p.running) return 'run';
  if (p.moving) return 'walk';
  return 'idle';
}

/**
 * Static GLB models get procedural locomotion (bob, lean, crouch squash).
 * Models ship without skeletons — full Mixamo rig can replace this later.
 */
export function GlbCharacter({ modelKey, anim = 'idle', facing = 0, scale = 1, gameRef }: GlbCharacterProps) {
  const { scene } = useGLTF(MODEL_URLS[modelKey]);
  const root = useRef<THREE.Group>(null);
  const body = useRef<THREE.Group>(null);
  const phase = useRef(0);
  const fitted = useRef(false);

  const clone = useMemo(() => {
    const c = scene.clone(true);
    c.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });
    return c;
  }, [scene]);

  useLayoutEffect(() => {
    if (fitted.current) return;
    const box = new THREE.Box3().setFromObject(clone);
    const size = new THREE.Vector3();
    box.getSize(size);
    const s = (CHARACTER_HEIGHT / size.y) * scale;
    clone.scale.setScalar(s);
    const box2 = new THREE.Box3().setFromObject(clone);
    clone.position.y = -box2.min.y;
    fitted.current = true;
  }, [clone, scale]);

  useFrame((_, dt) => {
    if (!root.current || !body.current) return;
    const a = gameRef ? animFromGame(gameRef.current) : anim;
    const f = gameRef ? gameRef.current.player.facing : facing;
    root.current.rotation.y = f;

    const moving = a === 'walk' || a === 'run' || a === 'climb';
    if (moving) phase.current += dt * (a === 'run' ? 11 : a === 'climb' ? 7 : 8);
    const bob = moving ? Math.sin(phase.current) * (a === 'run' ? 0.06 : 0.04) : 0;
    const lean = a === 'run' ? 0.12 : a === 'walk' ? 0.06 : a === 'climb' ? 0.28 : 0;

    let sy = 1;
    if (a === 'crouch') sy = 0.72;
    if (a === 'jump') sy = 0.92;

    body.current.position.y = bob;
    body.current.rotation.x = lean;
    body.current.scale.set(1, sy, 1);
  });

  return (
    <group ref={root}>
      <group ref={body}>
        <primitive object={clone} />
      </group>
    </group>
  );
}

useGLTF.preload(MODEL_URLS.adventurer);
useGLTF.preload(MODEL_URLS.agentPirate);
useGLTF.preload(MODEL_URLS.agentMinifig);
