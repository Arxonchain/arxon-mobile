import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { dappLabel, requestLabel } from '@/chainWallet/wc';
import { useWc } from '@/chainWallet/wcProvider';
import { walletBtn, walletField, walletGhost, walletPage } from '@/chainWallet/ui';

export default function WalletConnect() {
  const navigate = useNavigate();
  const {
    ready,
    error,
    sessions,
    proposal,
    request,
    busy,
    pair,
    approveProposal,
    rejectProposal,
    approveRequest,
    rejectRequest,
    disconnect,
  } = useWc();
  const [uri, setUri] = useState('');
  const [localErr, setLocalErr] = useState<string | null>(null);
  const pairedLink = useRef(false);

  async function onPair(value?: string) {
    setLocalErr(null);
    try {
      await pair(value ?? uri);
      setUri('');
    } catch (e) {
      setLocalErr(e instanceof Error ? e.message : String(e));
    }
  }

  useEffect(() => {
    const q = new URLSearchParams(window.location.hash.split('?')[1] || window.location.search);
    const raw = q.get('uri');
    if (pairedLink.current || !raw?.startsWith('wc:')) return;
    pairedLink.current = true;
    setUri(raw);
    void onPair(raw);
  }, []);

  const reqInfo = request ? requestLabel(request) : null;
  const propInfo = proposal ? dappLabel(proposal) : null;

  return (
    <div style={{ ...walletPage, padding: '52px 20px 0' }}>
      <button type="button" onClick={() => navigate('/')} style={{ background: 'none', border: 'none', color: 'hsl(215 18% 62%)', fontSize: 13, cursor: 'pointer', padding: 0 }}>
        Back
      </button>
      <h1 style={{ fontSize: 26, fontWeight: 700, margin: '12px 0 8px' }}>Connect</h1>
      <p style={{ fontSize: 13, color: 'hsl(215 14% 48%)', lineHeight: 1.5, marginBottom: 16 }}>
        Paste the wc: URI from a dapp (try https://app.arxon.io). Chain 7171. Project ID lives in Wallet settings.
      </p>
      {error || localErr ? <p style={{ color: 'hsl(0 70% 62%)', fontSize: 13, marginBottom: 12 }}>{localErr || error}</p> : null}

      {reqInfo ? (
        <div style={{ padding: 16, borderRadius: 18, background: 'hsl(225 26% 8%)', border: '1px solid hsl(215 22% 18%)', marginBottom: 12 }}>
          <p style={{ fontSize: 12, color: 'hsl(215 14% 48%)' }}>Sign / send</p>
          <p style={{ fontSize: 16, fontWeight: 700 }}>{reqInfo.name}</p>
          {reqInfo.url ? <p style={{ fontSize: 12, color: 'hsl(215 14% 48%)' }}>{reqInfo.url}</p> : null}
          <p style={{ fontSize: 13, color: 'hsl(215 35% 72%)', margin: '6px 0' }}>{reqInfo.method}</p>
          {reqInfo.detail ? <p style={{ fontSize: 12, color: 'hsl(215 14% 48%)' }}>{reqInfo.detail}</p> : null}
          <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
            <button type="button" style={walletGhost} disabled={busy} onClick={() => void rejectRequest()}>Reject</button>
            <button type="button" style={walletBtn} disabled={busy} onClick={() => void approveRequest()}>{busy ? 'Working…' : 'Approve'}</button>
          </div>
        </div>
      ) : null}

      {propInfo && !request ? (
        <div style={{ padding: 16, borderRadius: 18, background: 'hsl(225 26% 8%)', border: '1px solid hsl(215 22% 18%)', marginBottom: 12 }}>
          <p style={{ fontSize: 12, color: 'hsl(215 14% 48%)' }}>Session</p>
          <p style={{ fontSize: 16, fontWeight: 700 }}>{propInfo.name}</p>
          {propInfo.url ? <p style={{ fontSize: 12, color: 'hsl(215 14% 48%)' }}>{propInfo.url}</p> : null}
          <p style={{ fontSize: 12, color: 'hsl(215 14% 48%)', marginTop: 6 }}>eip155:7171 · this account</p>
          <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
            <button type="button" style={walletGhost} disabled={busy} onClick={() => void rejectProposal()}>Reject</button>
            <button type="button" style={walletBtn} disabled={busy} onClick={() => void approveProposal()}>{busy ? 'Working…' : 'Connect'}</button>
          </div>
        </div>
      ) : null}

      <p style={{ fontSize: 12, color: 'hsl(215 14% 48%)', marginBottom: 8 }}>Pair</p>
      {!ready ? (
        <p style={{ fontSize: 13, color: 'hsl(215 14% 48%)', marginBottom: 16 }}>Save a WalletConnect Project ID in Settings first.</p>
      ) : (
        <>
          <textarea value={uri} onChange={(e) => setUri(e.target.value)} placeholder="wc:…" rows={3} style={{ ...walletField, resize: 'vertical', marginBottom: 10 }} />
          <button type="button" style={{ ...walletBtn, width: '100%', marginBottom: 18 }} disabled={busy || !uri.trim()} onClick={() => void onPair()}>
            {busy ? 'Pairing…' : 'Pair'}
          </button>
        </>
      )}

      <p style={{ fontSize: 12, color: 'hsl(215 14% 48%)', marginBottom: 8 }}>Sessions</p>
      {sessions.length === 0 ? (
        <p style={{ fontSize: 13, color: 'hsl(215 14% 42%)' }}>No dapp connected.</p>
      ) : (
        sessions.map((row) => (
          <div key={row.topic} style={{ padding: '12px 0', borderBottom: '1px solid hsl(215 22% 14%)' }}>
            <p style={{ fontSize: 14, fontWeight: 600 }}>{row.name}</p>
            {row.url ? <p style={{ fontSize: 12, color: 'hsl(215 14% 48%)' }}>{row.url}</p> : null}
            <button type="button" style={{ ...walletGhost, width: '100%', marginTop: 8 }} onClick={() => void disconnect(row.topic)}>Disconnect</button>
          </div>
        ))
      )}
    </div>
  );
}
