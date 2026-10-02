import { useState } from 'react';
import { useChainWallet } from '@/chainWallet/ChainWalletContext';
import { newMnemonic } from '@/chainWallet/keys';
import { walletBtn, walletField, walletFont, walletGhost, walletPage } from '@/chainWallet/ui';

export default function WalletOnboarding() {
  const { importWallet } = useChainWallet();
  const [mode, setMode] = useState<'pick' | 'created' | 'import'>('pick');
  const [phrase, setPhrase] = useState('');
  const [importText, setImportText] = useState('');
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const onCreate = () => {
    setError(null);
    setSaved(false);
    setPhrase(newMnemonic());
    setMode('created');
  };

  const onConfirmCreated = async () => {
    setBusy(true);
    setError(null);
    try {
      await importWallet(phrase);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save wallet');
    } finally {
      setBusy(false);
    }
  };

  const onImport = async () => {
    setBusy(true);
    setError(null);
    try {
      await importWallet(importText);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Invalid recovery phrase');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ ...walletPage, padding: '56px 22px 32px' }}>
      <p style={{ fontSize: 11, letterSpacing: '0.18em', color: 'hsl(215 35% 62%)', fontWeight: 700 }}>ARXON</p>
      <h1 style={{ fontSize: 28, fontWeight: 700, letterSpacing: '-0.5px', margin: '10px 0 8px' }}>Your wallet</h1>
      <p style={{ fontSize: 14, color: 'hsl(215 14% 48%)', lineHeight: 1.6, maxWidth: 340 }}>
        Create or import an Arxon chain wallet first. Mining stays in its own section after this.
      </p>

      {mode === 'pick' && (
        <div style={{ marginTop: 36, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <button type="button" style={walletBtn} disabled={busy} onClick={onCreate}>
            Create wallet
          </button>
          <button type="button" style={walletGhost} disabled={busy} onClick={() => setMode('import')}>
            I already have a phrase
          </button>
        </div>
      )}

      {mode === 'created' && (
        <div style={{ marginTop: 28 }}>
          <p style={{ fontSize: 13, color: 'hsl(38 70% 62%)', marginBottom: 12, lineHeight: 1.5 }}>
            Write these 12 words down. They are the only way back into this wallet.
          </p>
          <div
            style={{
              padding: 16,
              borderRadius: 18,
              background: 'hsl(225 26% 8%)',
              border: '1px solid hsl(215 22% 18%)',
              fontSize: 16,
              lineHeight: 1.7,
              fontFamily: walletFont,
            }}
          >
            {phrase}
          </div>
          <label style={{ display: 'flex', gap: 10, marginTop: 18, fontSize: 13, color: 'hsl(215 18% 72%)' }}>
            <input type="checkbox" checked={saved} onChange={(e) => setSaved(e.target.checked)} />
            I saved this phrase somewhere safe
          </label>
          <button
            type="button"
            style={{ ...walletBtn, width: '100%', marginTop: 18, opacity: saved ? 1 : 0.45 }}
            disabled={!saved || busy}
            onClick={() => void onConfirmCreated()}
          >
            Enter wallet
          </button>
        </div>
      )}

      {mode === 'import' && (
        <div style={{ marginTop: 28 }}>
          <textarea
            value={importText}
            onChange={(e) => setImportText(e.target.value)}
            placeholder="twelve word recovery phrase"
            rows={4}
            style={{ ...walletField, resize: 'vertical' }}
          />
          <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
            <button type="button" style={walletGhost} onClick={() => setMode('pick')}>
              Back
            </button>
            <button type="button" style={walletBtn} disabled={busy || !importText.trim()} onClick={() => void onImport()}>
              Import
            </button>
          </div>
        </div>
      )}

      {error ? (
        <p style={{ marginTop: 16, fontSize: 13, color: 'hsl(0 70% 62%)' }}>{error}</p>
      ) : null}
    </div>
  );
}
