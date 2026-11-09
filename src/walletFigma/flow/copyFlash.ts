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

/** Opens the system share sheet. Copies and toasts if share is unavailable. */
export async function shareText(title: string, text: string) {
  const body = text.trim();
  if (!body) return;
  const native = (window as unknown as { ArxonShare?: { share?: (headline: string, value: string) => void } }).ArxonShare;
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
