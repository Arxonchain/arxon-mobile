import { useRef, useState, type CSSProperties } from 'react';
import { isValidMnemonic, looksLikePrivateKey } from '@/chainWallet/keys';
import { clipboardEventText, pasteFromUserGesture, readClipboardText } from '@/lib/readClipboard';
import { useLiveFrame } from './liveFrame';
import { useAppHidesFigmaChrome } from './appChrome';
import { font } from '@/walletFigma/tokens';

type Go = (id: string, remember?: boolean) => void;
type Mode = 'phrase' | 'key';

export function ImportWalletScreen({ go, back }: { go: Go; back?: () => void }) {
  const live = useLiveFrame();
  const hideChrome = useAppHidesFigmaChrome();
  const fieldRef = useRef<HTMLTextAreaElement>(null);
  const [mode, setMode] = useState<Mode>('phrase');
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [phrase, setPhrase] = useState('');
  const [keyText, setKeyText] = useState('');
  const words = phrase.trim().split(/\s+/).filter(Boolean);
  const goal = words.length > 12 ? 24 : 12;
  const phraseReady = isValidMnemonic(phrase);
  const keyReady = looksLikePrivateKey(keyText);
  const ready = !busy && (mode === 'phrase' ? phraseReady : keyReady);
  const value = mode === 'phrase' ? phrase : keyText;

  function applyPaste(text: string) {
    const next = text.trim();
    if (!next) return false;
    if (mode === 'phrase') setPhrase(next);
    else setKeyText(next);
    setErr(null);
    return true;
  }

  function paste(event: { preventDefault: () => void; stopPropagation: () => void }) {
    event.preventDefault();
    event.stopPropagation();
    setErr(null);
    const field = fieldRef.current;
    if (field && applyPaste(pasteFromUserGesture(field))) return;
    void readClipboardText().then((text) => {
      if (applyPaste(text)) return;
      fieldRef.current?.focus();
    });
  }

  async function importWallet() {
    if (busy) return;
    setErr(null);
    if (mode === 'phrase' && !isValidMnemonic(phrase)) {
      setErr('Enter a valid 12 or 24-word recovery phrase.');
      return;
    }
    if (mode === 'key' && !looksLikePrivateKey(keyText)) {
      setErr('Enter a 64-character private key.');
      return;
    }
    if (!live?.app) {
      setErr('Open Import in the live app to restore a wallet.');
      return;
    }
    setBusy(true);
    try {
      if (mode === 'key') {
        await live.importKey(keyText);
        go('create');
        return;
      }
      await live.importPhrase(phrase);
      go('phrase-confirm');
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : mode === 'key' ? 'Could not import that key' : 'Could not import that phrase');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ position: 'relative', width: 390, height: 844, background: '#050505', overflow: 'hidden', fontFamily: font.sans, color: '#fff' }}>
      <style>{`textarea::placeholder { color: #5c5f64; }`}</style>
      {hideChrome ? null : (
      <div style={{ position: 'absolute', left: 0, top: 0, width: 390, height: 44 }}>
        <span style={{ position: 'absolute', left: 21, top: 14, width: 54, textAlign: 'center', fontSize: 14, fontWeight: 600, letterSpacing: -0.28 }}>9:41</span>
        <img src="/wallet-figma/welcome/status.svg" alt="" width={66.6} height={11.33} style={{ position: 'absolute', left: 288.67, top: 17.33 }} />
      </div>
      )}
      <button type="button" onClick={() => (back ? back() : go('slide16', false))} aria-label="Back" style={backBtn}>
        <img src="/wallet-figma/create/chev.svg" alt="" width={20} height={20} />
      </button>
      <h1 style={{ position: 'absolute', left: 0, top: 65.5, width: 390, margin: 0, textAlign: 'center', fontSize: 17, fontWeight: 700 }}>Import wallet</h1>
      <div style={{ position: 'absolute', left: 18, top: 124, width: 354, height: 48, boxSizing: 'border-box', background: '#1c2025', borderRadius: 12, padding: 4, display: 'flex', gap: 4 }}>
        <Segment on={mode === 'phrase'} onClick={() => { setMode('phrase'); setErr(null); }}>Recovery phrase</Segment>
        <Segment on={mode === 'key'} onClick={() => { setMode('key'); setErr(null); }}>Private key</Segment>
      </div>
      <p style={{ position: 'absolute', left: 18, top: 192, width: 354, margin: 0, color: '#8b9097', fontSize: 14, fontWeight: 400, lineHeight: 'normal' }}>
        {mode === 'phrase'
          ? 'Enter your 12 or 24-word recovery phrase. Separate each word with a space.'
          : 'Enter your private key. It stays on this device and is never sent to Arxon.'}
      </p>
      <div style={{ position: 'absolute', left: 18, top: 244, width: 354, height: 190, boxSizing: 'border-box', background: '#1c2025', border: '1px solid #2a3447', borderRadius: 14 }}>
        <textarea
          ref={fieldRef}
          value={value}
          onChange={(e) => (mode === 'phrase' ? setPhrase(e.target.value) : setKeyText(e.target.value))}
          onPaste={(e) => {
            const text = clipboardEventText(e.nativeEvent);
            if (!text) return;
            e.preventDefault();
            applyPaste(text);
          }}
          placeholder={mode === 'phrase' ? 'Enter or paste your recovery phrase' : 'Enter or paste your private key'}
          spellCheck={false}
          autoCapitalize="none"
          autoCorrect="off"
          style={field}
        />
        {mode === 'phrase' && <span style={{ position: 'absolute', left: 16, top: 158, color: '#8b9097', fontSize: 13 }}>{words.length} / {goal} words</span>}
        <button type="button" onPointerDown={paste} style={pasteBtn}>
          <img src="/wallet-figma/import/paste.svg" alt="" width={16} height={16} />
          Paste
        </button>
      </div>
      <div style={{ position: 'absolute', left: 22, top: 454, width: 346, display: 'flex', gap: 8, alignItems: 'flex-start' }}>
        <img src="/wallet-figma/import/lock.svg" alt="" width={16} height={16} />
        <p style={{ margin: 0, width: 322, color: '#5c5f64', fontSize: 12, lineHeight: 'normal' }}>
          {mode === 'phrase'
            ? 'Your phrase is encrypted and never leaves this device. Arxon can’t recover it for you.'
            : 'Your key is encrypted and never leaves this device. Arxon can’t recover it for you.'}
        </p>
      </div>
      {err ? <p style={{ position: 'absolute', left: 22, top: 670, width: 346, margin: 0, color: '#f25252', fontSize: 12 }}>{err}</p> : null}
      <button type="button" disabled={!ready} onClick={() => { if (ready) void importWallet(); }} style={{ ...importBtn, background: ready ? '#accafe' : '#1c2025', color: ready ? '#0c1018' : '#5c5f64', cursor: ready ? 'pointer' : 'default' }}>
        {busy ? 'Importing…' : 'Import wallet'}
      </button>
      {hideChrome ? null : (
      <div style={{ position: 'absolute', left: 0, right: 0, bottom: 8, display: 'flex', justifyContent: 'center', opacity: 0.25 }}>
        <div style={{ width: 134, height: 5, borderRadius: 100, background: '#fff' }} />
      </div>
      )}
    </div>
  );
}

function Segment({ on, onClick, children }: { on: boolean; onClick: () => void; children: string }) {
  return (
    <button type="button" onClick={onClick} style={{ flex: 1, height: '100%', border: 'none', borderRadius: 9, background: on ? '#2a3447' : 'transparent', color: on ? '#accafe' : '#8b9097', fontFamily: font.sans, fontWeight: on ? 600 : 500, fontSize: 14, cursor: 'pointer' }}>
      {children}
    </button>
  );
}

const backBtn: CSSProperties = { position: 'absolute', left: 18, top: 56, width: 40, height: 40, borderRadius: 20, border: 'none', background: '#1c2025', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', zIndex: 2 };
const field: CSSProperties = { position: 'absolute', left: 16, top: 16, width: 322, height: 120, resize: 'none', border: 'none', outline: 'none', background: 'transparent', color: '#fff', fontFamily: font.sans, fontWeight: 400, fontSize: 15, lineHeight: 'normal' };
const pasteBtn: CSSProperties = { position: 'absolute', left: 246, top: 140, minHeight: 40, border: 'none', borderRadius: 18, background: '#2a3447', color: '#accafe', display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px 8px 12px', fontFamily: font.sans, fontWeight: 600, fontSize: 13, cursor: 'pointer', zIndex: 3, pointerEvents: 'auto' };
const importBtn: CSSProperties = { position: 'absolute', left: 19, top: 712, width: 353, height: 55, border: 'none', borderRadius: 8, fontFamily: font.sans, fontWeight: 600, fontSize: 16 };
