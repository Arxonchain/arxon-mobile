import { useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

/** CODM-style third-person follow — camera trails behind movement facing. */
export function CameraRig({
  target,
  yawRef,
  smoothness = 0.1,
}: {
  target: THREE.Vector3;
  yawRef: React.MutableRefObject<number>;
  smoothness?: number;
}) {
  const { camera } = useThree();
  const look = useRef(new THREE.Vector3());
  const ideal = useRef(new THREE.Vector3());
  const dist = 8.5;
  const height = 4.2;

  useFrame(() => {
    const yaw = yawRef.current;
    ideal.current.set(
      target.x - Math.sin(yaw) * dist,
      target.y + height,
      target.z - Math.cos(yaw) * dist,
    );
    camera.position.lerp(ideal.current, smoothness);
    look.current.set(target.x, target.y + 1.1, target.z);
    camera.lookAt(look.current);
  });

  return null;
}
