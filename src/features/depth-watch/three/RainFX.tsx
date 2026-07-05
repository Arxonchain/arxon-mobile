import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

const DROP_COUNT = 320;

export function RainFX({ active, length }: { active: boolean; length: number }) {
  const mesh = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const speeds = useMemo(() => new Float32Array(DROP_COUNT), []);
  const offsets = useMemo(() => {
    const arr = new Float32Array(DROP_COUNT * 3);
    for (let i = 0; i < DROP_COUNT; i++) {
      arr[i * 3] = (Math.random() - 0.5) * 14;
      arr[i * 3 + 1] = Math.random() * 12 + 2;
      arr[i * 3 + 2] = -Math.random() * (length + 40);
      speeds[i] = 14 + Math.random() * 10;
    }
    return arr;
  }, [length]);

  useFrame((_, dt) => {
    if (!active || !mesh.current) return;
    for (let i = 0; i < DROP_COUNT; i++) {
      offsets[i * 3 + 1] -= speeds[i] * dt;
      offsets[i * 3 + 2] += 6 * dt;
      if (offsets[i * 3 + 1] < 0) {
        offsets[i * 3 + 1] = 10 + Math.random() * 6;
        offsets[i * 3] = (Math.random() - 0.5) * 14;
        offsets[i * 3 + 2] = -Math.random() * 20;
      }
      dummy.position.set(offsets[i * 3], offsets[i * 3 + 1], offsets[i * 3 + 2]);
      dummy.scale.set(0.02, 0.18 + Math.random() * 0.06, 0.02);
      dummy.updateMatrix();
      mesh.current.setMatrixAt(i, dummy.matrix);
    }
    mesh.current.instanceMatrix.needsUpdate = true;
  });

  if (!active) return null;

  return (
    <instancedMesh ref={mesh} args={[undefined, undefined, DROP_COUNT]}>
      <boxGeometry args={[1, 1, 1]} />
      <meshBasicMaterial color="#a8c8e8" transparent opacity={0.35} depthWrite={false} />
    </instancedMesh>
  );
}
