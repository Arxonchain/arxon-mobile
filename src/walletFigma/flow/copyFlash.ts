type Listener = (msg: string) => void;

const listeners = new Set<Listener>();

export function onCopyFlash(fn: Listener) {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

export function flashCopy(msg = 'Address copied') {
  listeners.forEach((fn) => fn(msg));
}

function nativeWrite(text: string): boolean {
  const native = (window as unknown as { ArxonClipboard?: { write?: (value: string) => void } }).ArxonClipboard;
  if (typeof native?.write !== 'function') return false;
  native.write(text);
  return true;
}

/** execCommand copy does not trigger Android’s “pasted from clipboard” toast. */
function gestureWrite(text: string): boolean {
  if (typeof document === 'undefined') return false;
  const field = document.createElement('textarea');
  field.value = text;
  field.setAttribute('readonly', '');
  Object.assign(field.style, { position: 'fixed', left: '0', top: '0', opacity: '0.01', width: '2px', height: '2px' });
  document.body.appendChild(field);
  field.focus();
  field.select();
  let ok = false;
  try {
    ok = document.execCommand('copy');
  } catch {
    ok = false;
  }
  document.body.removeChild(field);
  return ok;
}

export async function copyAddress(value: string, msg = 'Address copied') {
  const text = value.trim();
  if (!text) return;
  if (!nativeWrite(text) && !gestureWrite(text)) {
    await navigator.clipboard.writeText(text);
  }
  flashCopy(msg);
}

type ArxonShare = {
  share?: (headline: string, value: string) => void;
  shareImage?: (headline: string, dataUrl: string) => void;
};

function nativeShare() {
  return (window as unknown as { ArxonShare?: ArxonShare }).ArxonShare;
}

/** Opens the system share sheet. Copies and toasts if share is unavailable. */
export async function shareText(title: string, text: string) {
  const body = text.trim();
  if (!body) return;
  const native = nativeShare();
  if (typeof native?.share === 'function') {
    native.share(title, body);
    return;
  }
  if (typeof navigator.share === 'function') {
    try {
      await navigator.share({ title, text: body });
      return;
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
    }
  }
  await copyAddress(body, 'Copied');
}

async function blobDataUrl(blob: Blob) {
  return await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('Could not read this image.'));
    reader.readAsDataURL(blob);
  });
}

/** Share a PNG (receipt screenshot). Falls back to download, then copy. */
export async function shareImage(title: string, blob: Blob, filename: string) {
  const native = nativeShare();
  if (typeof native?.shareImage === 'function') {
    native.shareImage(title, await blobDataUrl(blob));
    return;
  }
  const file = new File([blob], filename, { type: 'image/png' });
  const nav = navigator as Navigator & { canShare?: (data: ShareData) => boolean };
  if (typeof nav.share === 'function' && nav.canShare?.({ files: [file] })) {
    try {
      await nav.share({ title, files: [file] });
      return;
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
    }
  }
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.rel = 'noopener';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.setTimeout(() => URL.revokeObjectURL(url), 4_000);
  flashCopy('Receipt image ready');
}
