import { useLayoutEffect, useMemo, useRef } from 'react';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { SCIFI_NATIVE, SCIFI_URLS, type SciFiAssetId } from './scifiAssets';

const USE_DRACO = true;

interface SciFiPieceProps {
  asset: SciFiAssetId;
  position?: [number, number, number];
  rotation?: [number, number, number];
  /** Target size in world units (width X, height Y, depth Z). */
  size?: [number, number, number];
  castShadow?: boolean;
  receiveShadow?: boolean;
}

function brightenMaterials(root: THREE.Object3D) {
  root.traverse((child) => {
    const mesh = child as THREE.Mesh;
    if (!mesh.isMesh || !mesh.material) return;
    const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    const cloned = mats.map((mat) => {
      const m = mat.clone();
      if (m instanceof THREE.MeshStandardMaterial) {
        m.metalness = Math.min(m.metalness, 0.45);
        m.roughness = Math.max(m.roughness, 0.35);
        m.envMapIntensity = 1.2;
        if (m.color) {
          m.color.multiplyScalar(1.35);
        }
      }
      return m;
    });
    mesh.material = cloned.length === 1 ? cloned[0] : cloned;
  });
}

function fitClone(
  clone: THREE.Object3D,
  asset: SciFiAssetId,
  size: [number, number, number],
) {
  const native = SCIFI_NATIVE[asset];
  const h = Math.max(native.height, 0.2);
  clone.scale.set(
    size[0] / Math.max(native.width, 0.1),
    size[1] / h,
    size[2] / Math.max(native.depth, 0.1),
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
  const { scene } = useGLTF(SCIFI_URLS[asset], USE_DRACO);
  const fitted = useRef(false);
  const targetSize = size ?? [
    SCIFI_NATIVE[asset].width,
    Math.max(SCIFI_NATIVE[asset].height, 0.2),
    SCIFI_NATIVE[asset].depth,
  ];

  const clone = useMemo(() => {
    fitted.current = false;
    const c = scene.clone(true);
    brightenMaterials(c);
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
    useGLTF.preload(url, USE_DRACO);
  }
}
