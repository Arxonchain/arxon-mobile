import { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { SkeletonUtils } from 'three-stdlib';
import { USE_DRACO } from './dracoSetup';
import type { CharacterClipSet } from '../three/models/modelRegistry';
import type { AnimState } from '../three/entities/AnimatedCharacter';

const PREVIEW_HEIGHT = 2.55;

interface PreviewPlayerProps {
  clips: CharacterClipSet;
  resolveAnim: () => AnimState;
  resolveFacing: () => number;
}

/** Single persistent rig — no remount on anim change (prevents position glitches). */
export function PreviewPlayer({ clips, resolveAnim, resolveFacing }: PreviewPlayerProps) {
  const root = useRef<THREE.Group>(null);
  const mixer = useRef<THREE.AnimationMixer | null>(null);
  const grounded = useRef(false);
  const groundFrames = useRef(0);

  const { scene, animations } = useGLTF(clips.walk, USE_DRACO);

  const rig = useMemo(() => {
    grounded.current = false;
    groundFrames.current = 0;
    const c = SkeletonUtils.clone(scene) as THREE.Group;
    c.traverse((child) => {
      const mesh = child as THREE.Mesh;
      if (!mesh.isMesh || !mesh.material) return;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      mesh.frustumCulled = false;
    });
    return c;
  }, [scene]);

  useLayoutEffect(() => {
    rig.position.set(0, 0, 0);
    rig.scale.setScalar(1);
    rig.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(rig);
    const size = new THREE.Vector3();
    box.getSize(size);
    rig.scale.setScalar((PREVIEW_HEIGHT / Math.max(size.y, 0.05)) * 1.65);
  }, [rig]);

  useEffect(() => {
    if (!animations.length) return;
    mixer.current = new THREE.AnimationMixer(rig);
    const act = mixer.current.clipAction(animations[0]);
    act.reset().setLoop(THREE.LoopRepeat, Infinity).play();
    return () => {
      mixer.current?.stopAllAction();
      mixer.current = null;
    };
  }, [rig, animations]);

  useFrame((_, delta) => {
    const anim = resolveAnim();
    mixer.current?.update(delta * (anim === 'idle' ? 0.35 : anim === 'run' ? 1.2 : 1));

    if (root.current) root.current.rotation.y = resolveFacing() + Math.PI;

    if (!grounded.current) {
      groundFrames.current += 1;
      if (groundFrames.current < 4) return;
      rig.updateMatrixWorld(true);
      let lowest = Infinity;
      rig.traverse((child) => {
        const bone = child as THREE.Bone;
        if (!bone.isBone || !/foot/i.test(bone.name)) return;
        const wp = new THREE.Vector3();
        bone.getWorldPosition(wp);
        lowest = Math.min(lowest, wp.y);
      });
      if (lowest !== Infinity) rig.position.y -= lowest;
      grounded.current = true;
    }
  });

  return (
    <group ref={root}>
      <primitive object={rig} />
    </group>
  );
}
