import { useEffect, useRef, useState, type CSSProperties, type FormEvent } from 'react';
import { createPortal } from 'react-dom';
import { Capacitor } from '@capacitor/core';
import { font } from '@/walletFigma/tokens';
import { closeInAppBrowse, hostOfBrowse, subscribeInAppBrowse, usingNativeInAppBrowse } from './inAppBrowse';

/**
 * Fallback in-app browser chrome (USB live / web). Native Android uses
 * InAppBrowserOverlay — the same WebView pattern MetaMask and Phantom use.
 * This overlay is portaled to document.body so cover-scale cannot crop Done.
 */
export function InAppBrowserHost() {
  const [url, setUrl] = useState<string | null>(null);
  const [typed, setTyped] = useState('');
  const [loading, setLoading] = useState(false);
  const frameRef = useRef<HTMLIFrameElement | null>(null);
  const live = typeof document !== 'undefined' && !!document.querySelector('.arxon-app-frame');

  useEffect(() => subscribeInAppBrowse((next) => {
    setUrl(next);
    setTyped(next || '');
    setLoading(!!next);
  }), []);

  useEffect(() => {
    if (!url || !Capacitor.isNativePlatform()) return;
    let handle: { remove: () => Promise<void> } | undefined;
    void import('@capacitor/app').then(({ App }) =>
      App.addListener('backButton', () => {
        closeInAppBrowse();
      }).then((h) => {
        handle = h;
      }),
    );
    return () => {
      void handle?.remove();
    };
  }, [url]);

  if (!url) return null;
  // Native WebView (MetaMask/Phantom style) draws its own chrome on top of the app.
  // Do not also mount an iframe — that is what stretched Explore cards after a visit.
  if (usingNativeInAppBrowse()) return null;

  const goTyped = (e?: FormEvent) => {
    e?.preventDefault();
    const next = typed.trim();
    if (!next) return;
    const href = /^https?:\/\//i.test(next) ? next : `https://${next}`;
    setUrl(href);
    setTyped(href);
    setLoading(true);
    const frame = frameRef.current;
    if (frame) frame.src = href;
  };

  const ui = (
    <div style={live ? fixedShell : shell} role="dialog" aria-label="In-app browser">
      <div style={bar}>
        <button type="button" aria-label="Close" onClick={closeInAppBrowse} style={round}>✕</button>
        <form onSubmit={goTyped} style={urlForm}>
          <input
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            aria-label="Address"
            inputMode="url"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            style={urlField}
          />
        </form>
        <button
          type="button"
          aria-label="Reload"
          onClick={() => {
            const frame = frameRef.current;
            if (frame && url) {
              setLoading(true);
              frame.src = url;
            }
          }}
          style={round}
        >
          ↻
        </button>
      </div>
      <div style={progressTrack}>
        <div style={{ ...progressFill, width: loading ? '70%' : '100%', opacity: loading ? 1 : 0 }} />
      </div>
      <iframe
        ref={frameRef}
        id="arxon-in-app-frame"
        title="Arxon browser"
        src={url}
        sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
        referrerPolicy="no-referrer-when-downgrade"
        style={frame}
        onLoad={() => setLoading(false)}
      />
      <div style={dock}>
        <p style={hint}>{hostOfBrowse(url)}</p>
        <button type="button" aria-label="Done" onClick={closeInAppBrowse} style={done}>
          Done
        </button>
      </div>
    </div>
  );

  if (live && typeof document !== 'undefined') return createPortal(ui, document.body);
  return ui;
}

const shell: CSSProperties = {
  position: 'absolute',
  inset: 0,
  zIndex: 80,
  width: '100%',
  height: '100%',
  maxWidth: '100%',
  maxHeight: '100%',
  overflow: 'hidden',
  background: '#050505',
  display: 'flex',
  flexDirection: 'column',
  fontFamily: font.sans,
  color: '#fff',
};

const fixedShell: CSSProperties = {
  ...shell,
  position: 'fixed',
  zIndex: 2147483000,
  paddingTop: 'env(safe-area-inset-top, 0px)',
  paddingBottom: 'env(safe-area-inset-bottom, 0px)',
};

const bar: CSSProperties = {
  flexShrink: 0,
  minHeight: 52,
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  padding: '8px 10px',
  background: '#11161f',
};

const urlForm: CSSProperties = { flex: 1, minWidth: 0, margin: 0 };

const urlField: CSSProperties = {
  width: '100%',
  height: 36,
  boxSizing: 'border-box',
  border: 'none',
  borderRadius: 10,
  background: '#1c2025',
  color: '#fff',
  fontFamily: font.sans,
  fontSize: 13,
  padding: '0 12px',
  outline: 'none',
};

const progressTrack: CSSProperties = { height: 3, background: '#11161f', flexShrink: 0 };
const progressFill: CSSProperties = { height: 3, background: '#accafe', transition: 'width 0.3s ease, opacity 0.3s ease' };

const round: CSSProperties = {
  width: 40,
  height: 40,
  border: 'none',
  borderRadius: 20,
  background: '#1c2025',
  color: '#accafe',
  fontSize: 16,
  cursor: 'pointer',
  flexShrink: 0,
};

const frame: CSSProperties = {
  flex: 1,
  minHeight: 0,
  width: '100%',
  height: 0,
  border: 'none',
  background: '#fff',
};

const dock: CSSProperties = {
  flexShrink: 0,
  display: 'flex',
  alignItems: 'center',
  gap: 10,
  padding: '10px 12px 12px',
  background: '#11161f',
  borderTop: '1px solid #2a3447',
};

const hint: CSSProperties = {
  flex: 1,
  minWidth: 0,
  margin: 0,
  fontSize: 12,
  color: '#8c8f99',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
};

const done: CSSProperties = {
  minWidth: 96,
  height: 44,
  border: 'none',
  borderRadius: 12,
  background: '#accafe',
  color: '#0c1018',
  fontFamily: font.sans,
  fontSize: 15,
  fontWeight: 700,
  cursor: 'pointer',
  flexShrink: 0,
};
