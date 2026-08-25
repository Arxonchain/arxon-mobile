declare global {
  interface Window {
    __ARXON_BOOT_OK__?: boolean;
    __ARXON_DISMISS_BOOT__?: () => void;
    __ARXON_MARK_BOOT_FAILED__?: (reason?: string) => void;
  }
}

const BOOT_OK_EVENT = 'arxon:boot-ok';
const BOOT_FAILED_EVENT = 'arxon:boot-failed';

/** App shell mounted successfully — dismiss pre-React boot overlay. */
export function markBootOk(): void {
  window.__ARXON_BOOT_OK__ = true;
  window.__ARXON_DISMISS_BOOT__?.();
  window.dispatchEvent(new Event(BOOT_OK_EVENT));
}

export function isBootOk(): boolean {
  return window.__ARXON_BOOT_OK__ === true;
}

export function onBootOk(listener: () => void): () => void {
  if (isBootOk()) {
    listener();
    return () => {};
  }
  window.addEventListener(BOOT_OK_EVENT, listener);
  return () => window.removeEventListener(BOOT_OK_EVENT, listener);
}

export function markBootFailed(reason?: string): void {
  window.dispatchEvent(new CustomEvent(BOOT_FAILED_EVENT, { detail: reason }));
}

export function onBootFailed(listener: (reason?: string) => void): () => void {
  const handler = (e: Event) => listener((e as CustomEvent<string>).detail);
  window.addEventListener(BOOT_FAILED_EVENT, handler);
  return () => window.removeEventListener(BOOT_FAILED_EVENT, handler);
}
