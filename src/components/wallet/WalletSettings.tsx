import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DEFAULT_RPC } from '@/chainWallet/chain';
import { useChainWallet } from '@/chainWallet/ChainWalletContext';
import { walletBtn, walletField, walletGhost, walletPage } from '@/chainWallet/ui';

export default function WalletSettings() {
  const navigate = useNavigate();
  const { rpcUrl, setRpcUrl, refreshBalance, logout, mnemonic } = useChainWallet();
  const [rpc, setRpc] = useState(rpcUrl);
  const [reveal, setReveal] = useState(false);
  const [busy, setBusy] = useState(false);

  const save = async () => {
    setBusy(true);
    try {
      const next = await setRpcUrl(rpc);
      await refreshBalance(next);
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
      <h1 style={{ fontSize: 26, fontWeight: 700, margin: '12px 0 20px' }}>Wallet settings</h1>

      <p style={{ fontSize: 12, color: 'hsl(215 14% 48%)', marginBottom: 8 }}>RPC</p>
      <input value={rpc} onChange={(e) => setRpc(e.target.value)} style={{ ...walletField, marginBottom: 10 }} />
      <div style={{ display: 'flex', gap: 10, marginBottom: 28 }}>
        <button type="button" style={walletGhost} onClick={() => setRpc(DEFAULT_RPC)}>
          Testnet
        </button>
        <button type="button" style={walletBtn} disabled={busy} onClick={() => void save()}>
          Save
        </button>
      </div>

      <p style={{ fontSize: 12, color: 'hsl(215 14% 48%)', marginBottom: 8 }}>Recovery phrase</p>
      <button type="button" style={{ ...walletGhost, width: '100%', marginBottom: 10 }} onClick={() => setReveal((v) => !v)}>
        {reveal ? 'Hide phrase' : 'Show phrase'}
      </button>
      {reveal ? (
        <p
          style={{
            padding: 16,
            borderRadius: 16,
            background: 'hsl(225 26% 8%)',
            border: '1px solid hsl(38 55% 40%/0.45)',
            fontSize: 15,
            lineHeight: 1.6,
            marginBottom: 28,
          }}
        >
          {mnemonic}
        </p>
      ) : null}

      <button
        type="button"
        style={{ ...walletGhost, width: '100%', color: 'hsl(0 70% 62%)', borderColor: 'hsl(0 50% 28%)' }}
        onClick={() => {
          if (window.confirm('Remove this wallet from the phone? The phrase is the only way back.')) {
            void logout();
            navigate('/');
          }
        }}
      >
        Remove wallet from this device
      </button>
    </div>
  );
}
