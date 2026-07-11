import { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { SkeletonUtils } from 'three-stdlib';
import { USE_DRACO } from './dracoSetup';
import { FLOOR_Y } from './cityLayout';

const PREVIEW_HEIGHT = 2.55;

interface PreviewCharacterProps {
  url: string;
  position?: [number, number, number];
  rotationY?: number;
  scale?: number;
  floorY?: number;
  label?: string;
}

function lowestFootY(root: THREE.Object3D): number | null {
  let lowest = Infinity;
  root.traverse((child) => {
    const bone = child as THREE.Bone;
    if (!bone.isBone || !/foot/i.test(bone.name)) return;
    const wp = new THREE.Vector3();
    bone.getWorldPosition(wp);
    lowest = Math.min(lowest, wp.y);
  });
  return lowest === Infinity ? null : lowest;
}

function updateSkeletons(root: THREE.Object3D) {
  root.traverse((child) => {
    const skinned = child as THREE.SkinnedMesh;
    if (skinned.isSkinnedMesh) skinned.skeleton.update();
  });
}

function groundToFloor(clone: THREE.Object3D, floorY: number) {
  updateSkeletons(clone);
  const footY = lowestFootY(clone);
  if (footY !== null) {
    clone.position.y += floorY - footY;
    return;
  }
  const box = new THREE.Box3().setFromObject(clone);
  clone.position.y += floorY - box.min.y;
}

export function PreviewCharacter({
  url,
  position = [0, 0, 0],
  rotationY = 0,
  scale = 1.5,
  floorY = FLOOR_Y,
  label,
}: PreviewCharacterProps) {
  const mixer = useRef<THREE.AnimationMixer | null>(null);
  const scaled = useRef(false);
  const grounded = useRef(false);
  const groundFrames = useRef(0);
  const baseY = useRef(0);
  const { scene, animations } = useGLTF(url, USE_DRACO);

  const clone = useMemo(() => {
    scaled.current = false;
    grounded.current = false;
    groundFrames.current = 0;
    const c = SkeletonUtils.clone(scene) as THREE.Group;
    c.traverse((child) => {
      const mesh = child as THREE.Mesh;
      if (!mesh.isMesh || !mesh.material) return;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      mesh.frustumCulled = false;
      const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      const cloned = mats.map((mat) => {
        const m = mat.clone();
        if (m instanceof THREE.MeshStandardMaterial) {
          m.envMapIntensity = 1.4;
          m.color.multiplyScalar(1.2);
        }
        return m;
      });
      mesh.material = cloned.length === 1 ? cloned[0] : cloned;
    });
    return c;
  }, [scene]);

  useLayoutEffect(() => {
    if (scaled.current) return;
    clone.position.set(0, 0, 0);
    clone.scale.setScalar(1);
    clone.updateMatrixWorld(true);

    const box = new THREE.Box3().setFromObject(clone);
    const size = new THREE.Vector3();
    box.getSize(size);
    clone.scale.setScalar((PREVIEW_HEIGHT / Math.max(size.y, 0.05)) * scale);
    baseY.current = clone.position.y;
    scaled.current = true;
  }, [clone, scale]);

  useEffect(() => {
    if (!animations.length) return;
    mixer.current = new THREE.AnimationMixer(clone);
    const action = mixer.current.clipAction(animations[0]);
    action.reset();
    action.setLoop(THREE.LoopRepeat, Infinity);
    action.time = 0.4;
    action.play();
    mixer.current.update(0);

    return () => {
      mixer.current?.stopAllAction();
      mixer.current = null;
    };
  }, [clone, animations, url]);

  useFrame((_, delta) => {
    mixer.current?.update(delta);

    if (!grounded.current) {
      groundFrames.current += 1;
      if (groundFrames.current < 5) return;
      clone.position.y = baseY.current;
      clone.updateMatrixWorld(true);
      groundToFloor(clone, floorY);
      grounded.current = true;
    }
  });

  return (
    <group position={[position[0], 0, position[2]]} rotation={[0, rotationY, 0]}>
      <primitive object={clone} />
      {label && (
        <mesh position={[0, PREVIEW_HEIGHT + 0.4, 0]}>
          <planeGeometry args={[2.4, 0.5]} />
          <meshBasicMaterial color="#0a1018" transparent opacity={0.8} />
        </mesh>
      )}
    </group>
  );
}
