import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useChainWallet } from '@/chainWallet/ChainWalletContext';
import { walletGhost, walletPage } from '@/chainWallet/ui';

export default function WalletReceive() {
  const navigate = useNavigate();
  const { address } = useChainWallet();
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    if (!address) return;
    await navigator.clipboard.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
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
      <p style={{ fontSize: 13, color: 'hsl(215 14% 48%)', marginBottom: 18 }}>Share this Arxon address. Chain 7171.</p>
      <div
        style={{
          padding: 16,
          borderRadius: 18,
          background: 'hsl(225 26% 8%)',
          border: '1px solid hsl(215 22% 18%)',
          wordBreak: 'break-all',
          fontSize: 14,
          lineHeight: 1.5,
        }}
      >
        {address}
      </div>
      <button type="button" style={{ ...walletGhost, width: '100%', marginTop: 14 }} onClick={() => void copy()}>
        {copied ? 'Copied' : 'Copy address'}
      </button>
    </div>
  );
}
