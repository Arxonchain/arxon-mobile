import { useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

export function CameraRig({ target }: { target: THREE.Vector3 }) {
  const { camera } = useThree();
  const look = useRef(new THREE.Vector3());

  useFrame(() => {
    const ideal = new THREE.Vector3(target.x * 0.25, 6.2, target.z + 9.5);
    camera.position.lerp(ideal, 0.08);
    look.current.set(target.x * 0.15, 1.4, target.z - 14);
    camera.lookAt(look.current);
  });

  return null;
}
