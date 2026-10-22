type Listener = (url: string | null) => void;

const listeners = new Set<Listener>();
let current: string | null = null;
let nativeOpen = false;

type NativeBrowser = {
  open: (url: string) => void;
  close: () => void;
  back: () => void;
  forward?: () => void;
  reload: () => void;
};

function bridgeObject(): NativeBrowser | null {
  try {
    const bridge = (window as unknown as { ArxonInAppBrowser?: NativeBrowser }).ArxonInAppBrowser;
    return bridge || null;
  } catch {
    return null;
  }
}

/**
 * Android JavascriptInterface methods are not `typeof === 'function'`.
 * If the object exists, call it — that is the MetaMask/Phantom-style WebView.
 */
function nativeBrowser(): NativeBrowser | null {
  const bridge = bridgeObject();
  if (!bridge) return null;
  try {
    return {
      open: (url) => {
        bridge.open(url);
      },
      close: () => {
        bridge.close();
      },
      back: () => {
        bridge.back();
      },
      forward: () => {
        bridge.forward?.();
      },
      reload: () => {
        bridge.reload();
      },
    };
  } catch {
    return null;
  }
}

function emit(url: string | null) {
  current = url;
  listeners.forEach((fn) => fn(url));
}

function attachNativeHooks() {
  try {
    const w = window as unknown as {
      __arxonBrowseClosed?: () => void;
      __arxonBrowseUrl?: (url: string) => void;
    };
    w.__arxonBrowseClosed = () => {
      nativeOpen = false;
      emit(null);
    };
    w.__arxonBrowseUrl = (url) => {
      if (url) current = url;
    };
  } catch {
    /* SSR */
  }
}

if (typeof window !== 'undefined') attachNativeHooks();

export function hasNativeInAppBrowse() {
  return nativeBrowser() !== null;
}

export function subscribeInAppBrowse(listener: Listener) {
  listeners.add(listener);
  listener(current);
  return () => {
    listeners.delete(listener);
  };
}

export function closeInAppBrowse() {
  try {
    nativeBrowser()?.close();
  } catch {
    /* overlay only */
  }
  nativeOpen = false;
  emit(null);
}

export function backInAppBrowse() {
  try {
    nativeBrowser()?.back();
  } catch {
    /* overlay only */
  }
}

export function forwardInAppBrowse() {
  try {
    nativeBrowser()?.forward?.();
  } catch {
    /* overlay only */
  }
}

export function reloadInAppBrowse() {
  try {
    nativeBrowser()?.reload();
  } catch {
    /* overlay only */
  }
}

export function usingNativeInAppBrowse() {
  return nativeOpen;
}

export function openInAppBrowse(url: string) {
  const href = url.trim();
  if (!href) return;
  if (href.startsWith('mailto:')) {
    window.location.href = href;
    return;
  }
  attachNativeHooks();
  const native = nativeBrowser();
  if (native) {
    nativeOpen = true;
    emit(href);
    try {
      native.open(href);
      return;
    } catch {
      nativeOpen = false;
    }
  }
  nativeOpen = false;
  emit(href);
}

export function hostOfBrowse(url: string) {
  try {
    return new URL(url).host.replace(/^www\./, '');
  } catch {
    return url.replace(/^https?:\/\//, '').split('/')[0] || url;
  }
}
