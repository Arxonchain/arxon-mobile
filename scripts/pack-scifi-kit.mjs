/**
 * Pack curated Modular SciFi MegaKit glTF pieces into single-file GLBs.
 *
 * Default kit path (override with SCIFI_KIT env):
 *   ~/Downloads/Telegram Desktop/Modular SciFi MegaKit[Standard].zip (extracted)
 *
 * Usage: npm run pack:scifi-kit
 */
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { NodeIO } from '@gltf-transform/core';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..');

const DEFAULT_KIT = path.join(
  os.homedir(),
  'Projects',
  'arxon-audit',
  'scifi-kit-extract',
  'Modular SciFi MegaKit[Standard]',
);

const KIT_ROOT = process.env.SCIFI_KIT ?? DEFAULT_KIT;
const GLTF_ROOT = path.join(KIT_ROOT, 'glTF');
const TEX_ROOT = path.join(KIT_ROOT, 'Textures');
const OUT_DIR = path.join(REPO_ROOT, 'src', 'assets', 'depth-watch', 'environment', 'scifi');
const MANIFEST_PATH = path.join(OUT_DIR, 'manifest.json');

/** @type {{ id: string; file: string; folder: 'Walls' | 'Platforms' | 'Props' }[]} */
const CURATED = [
  { id: 'WallAstra_Straight', file: 'WallAstra_Straight', folder: 'Walls' },
  { id: 'WallAstra_Straight_Window', file: 'WallAstra_Straight_Window', folder: 'Walls' },
  { id: 'WallAstra_Straight_Flat', file: 'WallAstra_Straight_Flat', folder: 'Walls' },
  { id: 'Platform_Metal', file: 'Platform_Metal', folder: 'Platforms' },
  { id: 'Platform_3Plates', file: 'Platform_3Plates', folder: 'Platforms' },
  { id: 'Platform_DarkPlates', file: 'Platform_DarkPlates', folder: 'Platforms' },
  { id: 'Door_Metal', file: 'Door_Metal', folder: 'Platforms' },
  { id: 'Prop_Crate3', file: 'Prop_Crate3', folder: 'Props' },
  { id: 'Prop_Crate4', file: 'Prop_Crate4', folder: 'Props' },
  { id: 'Prop_Barrel_Large', file: 'Prop_Barrel_Large', folder: 'Props' },
  { id: 'Prop_Light_Floor', file: 'Prop_Light_Floor', folder: 'Props' },
  { id: 'Prop_Vent_Small', file: 'Prop_Vent_Small', folder: 'Props' },
];

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function copyReferencedAssets(srcDir, destDir, gltfName) {
  const gltfPath = path.join(srcDir, `${gltfName}.gltf`);
  const gltf = JSON.parse(fs.readFileSync(gltfPath, 'utf8'));

  ensureDir(destDir);
  fs.copyFileSync(gltfPath, path.join(destDir, `${gltfName}.gltf`));

  const binUri = gltf.buffers?.[0]?.uri;
  if (binUri) {
    fs.copyFileSync(path.join(srcDir, binUri), path.join(destDir, binUri));
  }

  for (const img of gltf.images ?? []) {
    if (!img.uri || img.uri.startsWith('data:')) continue;
    const fromTex = path.join(TEX_ROOT, img.uri);
    const fromLocal = path.join(srcDir, img.uri);
    const src = fs.existsSync(fromTex) ? fromTex : fromLocal;
    if (!fs.existsSync(src)) {
      throw new Error(`Missing texture for ${gltfName}: ${img.uri}`);
    }
    fs.copyFileSync(src, path.join(destDir, img.uri));
  }
}

function bboxFromDoc(doc) {
  const root = doc.getRoot();
  let minX = Infinity;
  let minY = Infinity;
  let minZ = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  let maxZ = -Infinity;

  for (const mesh of root.listMeshes()) {
    for (const prim of mesh.listPrimitives()) {
      const pos = prim.getAttribute('POSITION');
      if (!pos) continue;
      const arr = pos.getArray();
      for (let i = 0; i < arr.length; i += 3) {
        minX = Math.min(minX, arr[i]);
        minY = Math.min(minY, arr[i + 1]);
        minZ = Math.min(minZ, arr[i + 2]);
        maxX = Math.max(maxX, arr[i]);
        maxY = Math.max(maxY, arr[i + 1]);
        maxZ = Math.max(maxZ, arr[i + 2]);
      }
    }
  }

  return {
    width: maxX - minX,
    height: maxY - minY,
    depth: maxZ - minZ,
  };
}

async function packOne(io, piece, tmpRoot) {
  const srcDir = path.join(GLTF_ROOT, piece.folder);
  const staging = path.join(tmpRoot, piece.id);
  copyReferencedAssets(srcDir, staging, piece.file);

  const doc = await io.read(path.join(staging, `${piece.file}.gltf`));
  const bbox = bboxFromDoc(doc);
  const outPath = path.join(OUT_DIR, `${piece.id}.glb`);
  await io.write(outPath, doc);

  const stat = fs.statSync(outPath);
  return { id: piece.id, file: `${piece.id}.glb`, bytes: stat.size, bbox };
}

async function main() {
  if (!fs.existsSync(GLTF_ROOT)) {
    console.error(`SciFi kit not found at: ${KIT_ROOT}`);
    console.error('Extract Modular SciFi MegaKit[Standard].zip and set SCIFI_KIT if needed.');
    process.exit(1);
  }

  ensureDir(OUT_DIR);
  const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'scifi-pack-'));
  const io = new NodeIO();

  console.log(`Kit: ${KIT_ROOT}`);
  console.log(`Output: ${OUT_DIR}`);

  /** @type {Record<string, unknown>} */
  const manifest = { generatedAt: new Date().toISOString(), pieces: {} };

  for (const piece of CURATED) {
    process.stdout.write(`Packing ${piece.id}… `);
    const info = await packOne(io, piece, tmpRoot);
    manifest.pieces[piece.id] = info;
    console.log(`${(info.bytes / 1024 / 1024).toFixed(2)} MB`);
  }

  fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2));
  fs.rmSync(tmpRoot, { recursive: true, force: true });

  const totalMb =
    Object.values(manifest.pieces).reduce((sum, p) => sum + p.bytes, 0) / 1024 / 1024;
  console.log(`Done — ${CURATED.length} GLBs, ${totalMb.toFixed(1)} MB total`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
