import { useEffect, useLayoutEffect, useMemo, useReducer, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useAnimations, useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import type { GameState3D } from '../gameState';
import { CHARACTER_HEIGHT } from '../constants';
import type { CharacterClipSet } from '../models/modelRegistry';
import { PLAYER_CLIPS } from '../models/modelRegistry';
import { PLAYER_CLIPS } from '../models/modelRegistry';

export type AnimState = 'idle' | 'walk' | 'run' | 'crouch' | 'climb' | 'jump';

function clipUrl(clips: CharacterClipSet, state: AnimState): string {
  if (state === 'run') return clips.run;
  if (state === 'idle') return clips.idle;
  return clips.walk;
}

export function stateFromGame(state: GameState3D): AnimState {
  const p = state.player;
  if (p.climbing) return 'climb';
  if (p.mode === 'air') return 'jump';
  if (p.crouching) return 'crouch';
  if (p.running) return 'run';
  if (p.moving) return 'walk';
  return 'idle';
}

interface AnimatedCharacterProps {
  clips: CharacterClipSet;
  scale?: number;
  facingOffset?: number;
  resolveAnim: () => AnimState;
  resolveFacing: () => number;
}

function RiggedClip({
  url,
  scale,
  timeScale = 1,
}: {
  url: string;
  scale: number;
  timeScale?: number;
}) {
  const root = useRef<THREE.Group>(null);
  const fitted = useRef(false);
  const { scene, animations } = useGLTF(url);
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
  const { actions, names } = useAnimations(animations, root);

  useLayoutEffect(() => {
    if (fitted.current || !root.current) return;
    const box = new THREE.Box3().setFromObject(clone);
    const size = new THREE.Vector3();
    box.getSize(size);
    if (size.y < 0.01) return;
    const s = (CHARACTER_HEIGHT / size.y) * scale;
    clone.scale.setScalar(s);
    const box2 = new THREE.Box3().setFromObject(clone);
    clone.position.y = -box2.min.y;
    fitted.current = true;
  }, [clone, scale]);

  useEffect(() => {
    const name = names[0];
    if (!name || !actions[name]) return;
    const action = actions[name];
    action.reset().setEffectiveTimeScale(timeScale).fadeIn(0.12).play();
    return () => {
      action.fadeOut(0.12);
      action.stop();
    };
  }, [actions, names, timeScale, url]);

  return (
    <group ref={root}>
      <primitive object={clone} />
    </group>
  );
}

export function AnimatedCharacter({
  clips,
  scale = 1,
  facingOffset = Math.PI,
  resolveAnim,
  resolveFacing,
}: AnimatedCharacterProps) {
  const root = useRef<THREE.Group>(null);
  const animState = useRef<AnimState>('idle');
  const urlRef = useRef(clipUrl(clips, 'idle'));
  const [, bump] = useReducer((n: number) => n + 1, 0);

  useFrame(() => {
    const a = resolveAnim();
    const url = clipUrl(clips, a);
    if (a !== animState.current || url !== urlRef.current) {
      animState.current = a;
      urlRef.current = url;
      bump();
    }
    if (!root.current) return;
    root.current.rotation.y = resolveFacing() + facingOffset;
    root.current.scale.y = a === 'crouch' ? 0.82 : a === 'jump' ? 0.94 : 1;
  });

  const a = animState.current;
  const speed = a === 'run' ? 1.1 : a === 'crouch' ? 0.65 : 1;

  return (
    <group ref={root}>
      <RiggedClip key={urlRef.current} url={urlRef.current} scale={scale} timeScale={speed} />
    </group>
  );
}

function ShieldBubble({ gameRef }: { gameRef: React.MutableRefObject<GameState3D> }) {
  const mesh = useRef<THREE.Mesh>(null);
  useFrame(() => {
    if (mesh.current) mesh.current.visible = gameRef.current.shieldActive;
  });
  return (
    <mesh ref={mesh} visible={false} position={[0, 1, 0]}>
      <sphereGeometry args={[1.1, 16, 16]} />
      <meshStandardMaterial color="#4FD8EB" emissive="#4FD8EB" emissiveIntensity={0.7} transparent opacity={0.25} />
    </mesh>
  );
}

export function PlayerAnimated({ gameRef }: { gameRef: React.MutableRefObject<GameState3D> }) {
  return (
    <>
      <AnimatedCharacter
        clips={PLAYER_CLIPS}
        facingOffset={Math.PI}
        resolveAnim={() => stateFromGame(gameRef.current)}
        resolveFacing={() => gameRef.current.player.facing}
      />
      <ShieldBubble gameRef={gameRef} />
    </>
  );
}
