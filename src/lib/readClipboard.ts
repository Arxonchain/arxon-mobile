type NativeClipboard = {
  read?: () => string | Promise<string>;
  readText?: () => string | Promise<string>;
};

async function unwrap(value: string | Promise<string> | undefined): Promise<string> {
  if (value == null) return '';
  return typeof value === 'object' && typeof (value as Promise<string>).then === 'function'
    ? await value
    : String(value);
}

function nativeClipboard(): NativeClipboard | null {
  const w = window as unknown as {
    ArxonClipboard?: NativeClipboard;
    Capacitor?: { Plugins?: { Clipboard?: { read: () => Promise<{ value?: string }> } } };
  };
  if (w.ArxonClipboard) return w.ArxonClipboard;
  const plugin = w.Capacitor?.Plugins?.Clipboard;
  if (!plugin?.read) return null;
  return {
    read: async () => {
      const result = await plugin.read();
      return result?.value ?? '';
    },
  };
}

function asText(value: unknown): string {
  if (typeof value !== 'string') return '';
  return value.trim();
}

/** Sync native read so Android WebView paste stays inside the tap gesture. */
function fromNativeSync(): string {
  const native = nativeClipboard();
  if (!native) return '';
  try {
    if (typeof native.read === 'function') {
      const text = asText(native.read());
      if (text) return text;
    }
    if (typeof native.readText === 'function') {
      const text = asText(native.readText());
      if (text) return text;
    }
  } catch {
    /* fall through */
  }
  return '';
}

async function fromNavigator(): Promise<string> {
  if (!navigator.clipboard) return '';
  if (typeof navigator.clipboard.readText === 'function') {
    return (await navigator.clipboard.readText()) ?? '';
  }
  if (typeof navigator.clipboard.read === 'function') {
    const items = await navigator.clipboard.read();
    for (const item of items) {
      if (item.types.includes('text/plain')) {
        const blob = await item.getType('text/plain');
        return await blob.text();
      }
    }
  }
  return '';
}

async function fromNative(): Promise<string> {
  const native = nativeClipboard();
  if (!native) return '';
  if (native.read) {
    const text = (await unwrap(native.read())).trim();
    if (text) return text;
  }
  if (native.readText) {
    const text = (await unwrap(native.readText())).trim();
    if (text) return text;
  }
  return '';
}

/** Read plain text from the system clipboard. Empty if the WebView blocks it. */
export async function readClipboardText(): Promise<string> {
  // Native first: Android WebView often exposes clipboard.readText and then rejects it.
  try {
    const sync = fromNativeSync();
    if (sync) return sync;
    const text = await fromNative();
    if (text) return text;
  } catch {
    /* fall through to the browser clipboard */
  }
  try {
    const text = (await fromNavigator()).trim();
    if (text) return text;
  } catch {
    /* Android WebView blocks the Clipboard API */
  }
  try {
    return await fromNative();
  } catch {
    return '';
  }
}

function clipboardEventText(event: ClipboardEvent) {
  const data = event.clipboardData;
  if (!data) return '';
  return (data.getData('text/plain') || data.getData('text') || '').trim();
}

/**
 * Must run in the same user-gesture turn as the tap. execCommand paste
 * can fill the field (and fire a paste event) when readText is blocked.
 */
export function pasteFromUserGesture(field: HTMLInputElement | HTMLTextAreaElement | null | undefined): string {
  if (!field) return '';
  let captured = '';
  const onPaste = (event: ClipboardEvent) => {
    captured = clipboardEventText(event);
    if (captured) event.preventDefault();
  };
  field.addEventListener('paste', onPaste);
  field.focus();
  field.select?.();
  try {
    document.execCommand('paste');
  } catch {
    /* execCommand is best-effort on Android WebView */
  }
  field.removeEventListener('paste', onPaste);
  if (captured) return captured;
  return field.value.trim();
}

function pasteViaHiddenField(): string {
  if (typeof document === 'undefined') return '';
  const field = document.createElement('textarea');
  field.setAttribute('autocomplete', 'off');
  field.setAttribute('autocorrect', 'off');
  field.setAttribute('spellcheck', 'false');
  field.value = '';
  Object.assign(field.style, {
    position: 'fixed',
    left: '0px',
    top: '0px',
    width: '2px',
    height: '2px',
    opacity: '0.01',
    border: '0',
    padding: '0',
    margin: '0',
    zIndex: '-1',
  });
  document.body.appendChild(field);
  try {
    return pasteFromUserGesture(field);
  } finally {
    document.body.removeChild(field);
  }
}

type PasteField =
  | HTMLInputElement
  | HTMLTextAreaElement
  | null
  | undefined
  | { current: HTMLInputElement | HTMLTextAreaElement | null };

function resolveField(field?: PasteField): HTMLInputElement | HTMLTextAreaElement | null {
  if (!field) return null;
  if (typeof field === 'object' && 'current' in field) return field.current;
  return field;
}

/** Paste button handler. execCommand first so Android does not toast “pasted from clipboard”. */
export function onPasteTap(apply: (text: string) => void, field?: PasteField) {
  return (event?: { stopPropagation?: () => void }) => {
    event?.stopPropagation?.();
    const target = resolveField(field);
    const immediate = pasteFromUserGesture(target) || pasteViaHiddenField();
    if (immediate) {
      apply(immediate);
      return;
    }
    void readClipboardText().then((text) => {
      if (text) apply(text);
    });
  };
}

export { clipboardEventText };
