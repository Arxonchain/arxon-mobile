import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useChainWallet } from '@/chainWallet/ChainWalletContext';
import { NETWORKS } from '@/chainWallet/networks';
import { walletGhost, walletPage } from '@/chainWallet/ui';
import NetworkSwitcher from '@/components/wallet/NetworkSwitcher';

export default function WalletReceive() {
  const navigate = useNavigate();
  const { address, shieldedPk, keysError, refreshKeys, network } = useChainWallet();
  const [copied, setCopied] = useState<string | null>(null);
  const isEth = network === 'ethereum';
  const net = NETWORKS[network];

  useEffect(() => {
    if (!isEth) void refreshKeys();
  }, [refreshKeys, isEth]);

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
      <NetworkSwitcher />
      <p
        style={{
          fontSize: 16,
          fontWeight: 800,
          color: isEth ? 'hsl(155 50% 62%)' : 'hsl(215 40% 72%)',
          marginBottom: 16,
        }}
      >
        {net.label}
      </p>
      <p style={{ fontSize: 12, color: 'hsl(215 14% 48%)', marginBottom: 8 }}>
        {isEth ? 'ETH USDC USDT' : 'Public ARX'}
      </p>
      <div style={{ padding: 16, borderRadius: 18, background: 'hsl(225 26% 8%)', border: '1px solid hsl(215 22% 18%)', wordBreak: 'break-all', fontSize: 14, lineHeight: 1.5 }}>
        {address}
      </div>
      <button type="button" style={{ ...walletGhost, width: '100%', marginTop: 10 }} onClick={() => address && void copy(address, 'public')}>
        {copied === 'public' ? 'Copied' : 'Copy'}
      </button>
      {isEth ? (
        <p style={{ fontSize: 13, color: 'hsl(215 14% 48%)', marginTop: 18 }}>Send ETH, USDC, or USDT to this 0x. No faucet.</p>
      ) : (
        <>
          <p style={{ fontSize: 12, color: 'hsl(215 14% 48%)', margin: '22px 0 8px' }}>Shielded public key</p>
          <div style={{ padding: 16, borderRadius: 18, background: 'hsl(225 26% 8%)', border: '1px solid hsl(215 22% 18%)', wordBreak: 'break-all', fontSize: 13, lineHeight: 1.5 }}>
            {shieldedPk ?? (keysError || 'Processing')}
          </div>
          <button type="button" style={{ ...walletGhost, width: '100%', marginTop: 10 }} disabled={!shieldedPk} onClick={() => shieldedPk && void copy(shieldedPk, 'pk')}>
            {copied === 'pk' ? 'Copied' : 'Copy'}
          </button>
        </>
      )}
    </div>
  );
}
