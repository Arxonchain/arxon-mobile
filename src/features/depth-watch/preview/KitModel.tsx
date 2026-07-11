import { useLayoutEffect, useMemo, useRef } from 'react';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { SCIFI_NATIVE, SCIFI_URLS, type SciFiAssetId } from '../three/environment/scifiAssets';

function brighten(root: THREE.Object3D) {
  root.traverse((child) => {
    const mesh = child as THREE.Mesh;
    if (!mesh.isMesh || !mesh.material) return;
    const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    mesh.material = mats.map((mat) => {
      const m = mat.clone();
      if (m instanceof THREE.MeshStandardMaterial) {
        m.metalness = Math.min(m.metalness, 0.4);
        m.roughness = Math.max(m.roughness, 0.4);
        m.envMapIntensity = 1.4;
        m.color.multiplyScalar(1.25);
      }
      return m;
    });
    if (!Array.isArray(mesh.material) && mats.length === 1) {
      mesh.material = (mesh.material as THREE.Material[])[0] ?? mesh.material;
    }
  });
}

function fitToSize(root: THREE.Object3D, asset: SciFiAssetId, size: [number, number, number]) {
  const n = SCIFI_NATIVE[asset];
  const h = Math.max(n.height, 0.2);
  root.scale.set(
    size[0] / Math.max(n.width, 0.1),
    size[1] / h,
    size[2] / Math.max(n.depth, 0.1),
  );
  const box = new THREE.Box3().setFromObject(root);
  root.position.y -= box.min.y;
}

interface KitModelProps {
  asset: SciFiAssetId;
  position?: [number, number, number];
  rotation?: [number, number, number];
  size?: [number, number, number];
}

export function KitModel({
  asset,
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  size,
}: KitModelProps) {
  const { scene } = useGLTF(SCIFI_URLS[asset]);
  const fitted = useRef(false);
  const target: [number, number, number] = size ?? [
    SCIFI_NATIVE[asset].width,
    Math.max(SCIFI_NATIVE[asset].height, 0.2),
    SCIFI_NATIVE[asset].depth,
  ];

  const clone = useMemo(() => {
    fitted.current = false;
    const c = scene.clone(true);
    brighten(c);
    return c;
  }, [scene]);

  useLayoutEffect(() => {
    if (fitted.current) return;
    fitToSize(clone, asset, target);
    fitted.current = true;
  }, [clone, asset, target]);

  return (
    <group position={position} rotation={rotation}>
      <primitive object={clone} />
    </group>
  );
}

export function preloadPreviewKitAssets(ids: readonly SciFiAssetId[]): void {
  for (const id of ids) useGLTF.preload(SCIFI_URLS[id]);
}
