import { useEffect, useState } from 'react';

const EVENT = 'arxon-photo';

function keyFor(index: number) {
  return `arxon.profilePic.${index}`;
}

export function readProfilePhoto(index: number): string | null {
  try {
    return localStorage.getItem(keyFor(index));
  } catch {
    return null;
  }
}

export function writeProfilePhoto(index: number, dataUrl: string | null) {
  try {
    if (!dataUrl) localStorage.removeItem(keyFor(index));
    else localStorage.setItem(keyFor(index), dataUrl);
  } catch {
    /* quota — the picker still ran */
  }
  window.dispatchEvent(new Event(EVENT));
}

export async function photoFromFile(file: File): Promise<string> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error('Could not read that image.'));
      el.src = url;
    });
    const size = 256;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Could not read that image.');
    const scale = Math.max(size / img.width, size / img.height);
    const w = img.width * scale;
    const h = img.height * scale;
    ctx.drawImage(img, (size - w) / 2, (size - h) / 2, w, h);
    return canvas.toDataURL('image/jpeg', 0.85);
  } finally {
    URL.revokeObjectURL(url);
  }
}

export function useProfilePhoto(index: number) {
  const [photo, setPhoto] = useState<string | null>(() => readProfilePhoto(index));
  useEffect(() => {
    const sync = () => setPhoto(readProfilePhoto(index));
    sync();
    window.addEventListener(EVENT, sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener(EVENT, sync);
      window.removeEventListener('storage', sync);
    };
  }, [index]);
  return photo;
}
