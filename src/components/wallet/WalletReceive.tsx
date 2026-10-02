import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useChainWallet } from '@/chainWallet/ChainWalletContext';
import { walletGhost, walletPage } from '@/chainWallet/ui';

export default function WalletReceive() {
  const navigate = useNavigate();
  const { address, shieldedPk, keysError, refreshKeys } = useChainWallet();
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    void refreshKeys();
  }, [refreshKeys]);

  const copy = async (value: string, label: string) => {
    await navigator.clipboard.writeText(value);
    setCopied(label);
    setTimeout(() => setCopied(null), 1600);
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
      <h1 style={{ fontSize: 26, fontWeight: 700, margin: '12px 0 8px' }}>Receive</h1>
      <p style={{ fontSize: 13, color: 'hsl(215 14% 48%)', marginBottom: 18 }}>
        Public 0x for transparent ARX. Shielded pk for private pay. Chain 7171.
      </p>
      <p style={{ fontSize: 12, color: 'hsl(215 14% 48%)', marginBottom: 8 }}>Public address</p>
      <div style={{ padding: 16, borderRadius: 18, background: 'hsl(225 26% 8%)', border: '1px solid hsl(215 22% 18%)', wordBreak: 'break-all', fontSize: 14, lineHeight: 1.5 }}>
        {address}
      </div>
      <button type="button" style={{ ...walletGhost, width: '100%', marginTop: 10 }} onClick={() => address && void copy(address, 'public')}>
        {copied === 'public' ? 'Copied' : 'Copy public address'}
      </button>
      <p style={{ fontSize: 12, color: 'hsl(215 14% 48%)', margin: '22px 0 8px' }}>Shielded public key</p>
      <div style={{ padding: 16, borderRadius: 18, background: 'hsl(225 26% 8%)', border: '1px solid hsl(215 22% 18%)', wordBreak: 'break-all', fontSize: 13, lineHeight: 1.5 }}>
        {shieldedPk ?? (keysError || 'Waiting for the in-app prover (first load can take a few seconds).')}
      </div>
      <button type="button" style={{ ...walletGhost, width: '100%', marginTop: 10 }} disabled={!shieldedPk} onClick={() => shieldedPk && void copy(shieldedPk, 'pk')}>
        {copied === 'pk' ? 'Copied' : 'Copy shielded pk'}
      </button>
    </div>
  );
}
