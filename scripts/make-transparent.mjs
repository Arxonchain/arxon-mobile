import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Jimp } from 'jimp';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UI = path.join(__dirname, '../src/assets/word-forge/ui');

const FILES = [
  'tile-hex.png',
  'tile-diamond.png',
  'tile-banner.png',
  'tile-scallop.png',
  'tile-splash.png',
  'arx-coin.png',
];

async function knockOutBackground(file) {
  const input = path.join(UI, file);
  if (!fs.existsSync(input)) {
    console.warn('Skip missing', file);
    return;
  }

  const img = await Jimp.read(input);
  img.scan(0, 0, img.bitmap.width, img.bitmap.height, function process(x, y, idx) {
    const r = this.bitmap.data[idx];
    const g = this.bitmap.data[idx + 1];
    const b = this.bitmap.data[idx + 2];
    const avg = (r + g + b) / 3;
    const maxDiff = Math.max(Math.abs(r - g), Math.abs(g - b), Math.abs(r - b));
    if (avg > 210 && maxDiff < 28) {
      this.bitmap.data[idx + 3] = 0;
    } else if (avg > 185 && maxDiff < 18) {
      this.bitmap.data[idx + 3] = Math.min(this.bitmap.data[idx + 3], 100);
    }
  });

  await img.write(input);
  console.log('Processed', file);
}

for (const f of FILES) {
  await knockOutBackground(f);
}

console.log('Done — transparent tiles + coin');
