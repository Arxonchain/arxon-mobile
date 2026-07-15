// One-off asset prep: removes near-black backgrounds (edge flood fill so
// interior dark pixels survive), feathers the cutout edge, crops to content.
import sharp from 'sharp';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ui = path.join(root, 'src', 'assets', 'word-forge', 'ui');

async function removeBackground(input, output, tolerance = 34) {
  const { data, info } = await sharp(input)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const { width: w, height: h } = info;

  const isBg = (i) => {
    const m = Math.max(data[i * 4], data[i * 4 + 1], data[i * 4 + 2]);
    return m <= tolerance;
  };

  // Flood fill from every border pixel
  const visited = new Uint8Array(w * h);
  const queue = [];
  for (let x = 0; x < w; x++) { queue.push(x, (h - 1) * w + x); }
  for (let y = 0; y < h; y++) { queue.push(y * w, y * w + (w - 1)); }
  while (queue.length) {
    const p = queue.pop();
    if (visited[p] || !isBg(p)) continue;
    visited[p] = 1;
    data[p * 4 + 3] = 0;
    const x = p % w, y = (p / w) | 0;
    if (x > 0) queue.push(p - 1);
    if (x < w - 1) queue.push(p + 1);
    if (y > 0) queue.push(p - w);
    if (y < h - 1) queue.push(p + w);
  }

  // Feather: soften opaque pixels touching transparency (2 passes)
  for (let pass = 0; pass < 2; pass++) {
    const snapshot = Buffer.from(data);
    for (let y = 1; y < h - 1; y++) {
      for (let x = 1; x < w - 1; x++) {
        const p = y * w + x;
        if (snapshot[p * 4 + 3] === 0) continue;
        const n = [p - 1, p + 1, p - w, p + w];
        let transparent = 0;
        for (const q of n) if (snapshot[q * 4 + 3] === 0) transparent++;
        if (transparent > 0) data[p * 4 + 3] = Math.round(snapshot[p * 4 + 3] * (1 - transparent * 0.22));
      }
    }
  }

  // Crop to content
  let minX = w, minY = h, maxX = 0, maxY = 0;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (data[(y * w + x) * 4 + 3] > 8) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  const pad = 6;
  minX = Math.max(0, minX - pad); minY = Math.max(0, minY - pad);
  maxX = Math.min(w - 1, maxX + pad); maxY = Math.min(h - 1, maxY + pad);

  await sharp(data, { raw: { width: w, height: h, channels: 4 } })
    .extract({ left: minX, top: minY, width: maxX - minX + 1, height: maxY - minY + 1 })
    .png({ compressionLevel: 9 })
    .toFile(output);
  console.log(`done: ${path.basename(output)} (${maxX - minX + 1}x${maxY - minY + 1})`);
}

await removeBackground(path.join(ui, 'forge-logo-raw.png'), path.join(ui, 'forge-logo.png'), 34);
await removeBackground(path.join(ui, 'arx-coin.png'), path.join(ui, 'arx-coin-3d.png'), 16);
