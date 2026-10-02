import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { isAddress, type Address } from 'viem';
import { useChainWallet } from '@/chainWallet/ChainWalletContext';
import { walletBtn, walletField, walletGhost, walletPage } from '@/chainWallet/ui';

export default function WalletSend() {
  const navigate = useNavigate();
  const { sendArx, refreshBalance } = useChainWallet();
  const [to, setTo] = useState('');
  const [amount, setAmount] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hash, setHash] = useState<string | null>(null);

  const submit = async () => {
    setError(null);
    setHash(null);
    if (!isAddress(to.trim())) {
      setError('Need a valid 0x address');
      return;
    }
    setBusy(true);
    try {
      const tx = await sendArx(to.trim() as Address, amount.trim());
      setHash(tx);
      await refreshBalance();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Send failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ ...walletPage, padding: '52px 20px 0' }}>
      <button
        type="button"
        onClick={() => navigate('/')}
        style={{ background: 'none', border: 'none', color: 'hsl(215 18% 62%)', fontSize: 13, cursor: 'pointer', padding: 0 }}
      >
        Back
      </button>
      <h1 style={{ fontSize: 26, fontWeight: 700, margin: '12px 0 20px' }}>Send ARX</h1>
      <input value={to} onChange={(e) => setTo(e.target.value)} placeholder="0x…" style={{ ...walletField, marginBottom: 10 }} />
      <input value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Amount" style={{ ...walletField, marginBottom: 16 }} />
      <div style={{ display: 'flex', gap: 10 }}>
        <button type="button" style={walletGhost} onClick={() => navigate('/')}>
          Cancel
        </button>
        <button type="button" style={walletBtn} disabled={busy} onClick={() => void submit()}>
          {busy ? 'Sending…' : 'Send'}
        </button>
      </div>
      {error ? <p style={{ marginTop: 14, color: 'hsl(0 70% 62%)', fontSize: 13 }}>{error}</p> : null}
      {hash ? <p style={{ marginTop: 14, color: 'hsl(155 45% 55%)', fontSize: 12, wordBreak: 'break-all' }}>{hash}</p> : null}
    </div>
  );
}
