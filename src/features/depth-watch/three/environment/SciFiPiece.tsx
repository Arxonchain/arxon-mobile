import { useLayoutEffect, useMemo, useRef } from 'react';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { SCIFI_NATIVE, SCIFI_URLS, type SciFiAssetId } from './scifiAssets';

interface SciFiPieceProps {
  asset: SciFiAssetId;
  position?: [number, number, number];
  rotation?: [number, number, number];
  /** Target size in world units (width X, height Y, depth Z). */
  size?: [number, number, number];
  castShadow?: boolean;
  receiveShadow?: boolean;
}

function fitClone(
  clone: THREE.Object3D,
  asset: SciFiAssetId,
  size: [number, number, number],
) {
  const native = SCIFI_NATIVE[asset];
  clone.scale.set(
    size[0] / native.width,
    size[1] / native.height,
    size[2] / native.depth,
  );
  const box = new THREE.Box3().setFromObject(clone);
  clone.position.y -= box.min.y;
}

export function SciFiPiece({
  asset,
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  size,
  castShadow = true,
  receiveShadow = true,
}: SciFiPieceProps) {
  const { scene } = useGLTF(SCIFI_URLS[asset]);
  const fitted = useRef(false);
  const targetSize = size ?? [
    SCIFI_NATIVE[asset].width,
    SCIFI_NATIVE[asset].height,
    SCIFI_NATIVE[asset].depth,
  ];

  const clone = useMemo(() => {
    fitted.current = false;
    const c = scene.clone(true);
    c.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        child.castShadow = castShadow;
        child.receiveShadow = receiveShadow;
      }
    });
    return c;
  }, [scene, castShadow, receiveShadow]);

  useLayoutEffect(() => {
    if (fitted.current) return;
    fitClone(clone, asset, targetSize);
    fitted.current = true;
  }, [clone, asset, targetSize]);

  return (
    <group position={position} rotation={rotation}>
      <primitive object={clone} />
    </group>
  );
}

export function preloadSciFiEnvironment(): void {
  for (const url of Object.values(SCIFI_URLS)) {
    useGLTF.preload(url);
  }
}
