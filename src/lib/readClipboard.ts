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

/** Read plain text from the system clipboard. Empty if the WebView blocks it. */
export async function readClipboardText(): Promise<string> {
  try {
    const text = (await fromNavigator()).trim();
    if (text) return text;
  } catch {
    /* Android WebView often blocks the Clipboard API; try native next. */
  }
  const native = nativeClipboard();
  if (native?.read) {
    const text = (await unwrap(native.read())).trim();
    if (text) return text;
  }
  if (native?.readText) {
    const text = (await unwrap(native.readText())).trim();
    if (text) return text;
  }
  return '';
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
export function pasteFromUserGesture(field: HTMLTextAreaElement): string {
  let captured = '';
  const onPaste = (event: ClipboardEvent) => {
    captured = clipboardEventText(event);
    if (captured) event.preventDefault();
  };
  field.addEventListener('paste', onPaste);
  field.focus();
  try {
    document.execCommand('paste');
  } catch {
    /* execCommand is best-effort on Android WebView */
  }
  field.removeEventListener('paste', onPaste);
  if (captured) return captured;
  const value = field.value.trim();
  return value;
}

export { clipboardEventText };
