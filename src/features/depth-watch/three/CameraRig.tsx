import { useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

/** CODM-style third-person follow — camera trails behind movement facing. */
export function CameraRig({
  target,
  yawRef,
}: {
  target: THREE.Vector3;
  yawRef: React.MutableRefObject<number>;
}) {
  const { camera } = useThree();
  const look = useRef(new THREE.Vector3());
  const dist = 8.5;
  const height = 4.2;

  useFrame(() => {
    const yaw = yawRef.current;
    const idealX = target.x - Math.sin(yaw) * dist;
    const idealZ = target.z - Math.cos(yaw) * dist;
    const ideal = new THREE.Vector3(idealX, target.y + height, idealZ);
    camera.position.lerp(ideal, 0.12);
    look.current.set(target.x, target.y + 1.1, target.z);
    camera.lookAt(look.current);
  });

  return null;
}
