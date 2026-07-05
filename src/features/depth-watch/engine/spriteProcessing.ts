/** Strip near-white backgrounds from RAW sprites at load time. */

export function processTransparentSprite(img: HTMLImageElement): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = img.naturalWidth || img.width;
  canvas.height = img.naturalHeight || img.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;

  ctx.drawImage(img, 0, 0);
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const d = imageData.data;

  for (let i = 0; i < d.length; i += 4) {
    const r = d[i];
    const g = d[i + 1];
    const b = d[i + 2];
    const brightness = (r + g + b) / 3;
    const saturation = Math.max(r, g, b) - Math.min(r, g, b);

    if (brightness > 248 && saturation < 12) {
      d[i + 3] = 0;
    } else if (brightness > 228 && saturation < 18) {
      d[i + 3] = Math.min(d[i + 3], Math.floor((255 - brightness) * 12));
    }
  }

  ctx.putImageData(imageData, 0, 0);
  return canvas;
}

export async function loadProcessedSprite(src: string): Promise<HTMLCanvasElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(processTransparentSprite(img));
    img.onerror = () => resolve(null);
    img.src = src;
  });
}
