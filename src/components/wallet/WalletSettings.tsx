import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DEFAULT_RPC } from '@/chainWallet/chain';
import { useChainWallet } from '@/chainWallet/ChainWalletContext';
import { ETHEREUM_RPC, NETWORKS } from '@/chainWallet/networks';
import { useWc } from '@/chainWallet/wcProvider';
import { walletBtn, walletField, walletGhost, walletPage } from '@/chainWallet/ui';
import { walletHomePath } from '@/chainWallet/walletNav';
import NetworkSwitcher from '@/components/wallet/NetworkSwitcher';

export default function WalletSettings() {
  const navigate = useNavigate();
  const { rpcUrl, setRpcUrl, refreshBalance, logout, mnemonic, network } = useChainWallet();
  const wc = useWc();
  const projectId = wc?.projectId ?? '';
  const setProjectId = wc?.setProjectId;
  const [rpc, setRpc] = useState(rpcUrl);
  const [wcId, setWcId] = useState(projectId);
  const [reveal, setReveal] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    setWcId(projectId);
  }, [projectId]);

  const save = async () => {
    setBusy(true);
    try {
      const next = await setRpcUrl(rpc);
      await refreshBalance(next);
      setNotice('RPC saved');
    } finally {
      setBusy(false);
    }
  };

  const saveWc = async () => {
    if (!setProjectId) {
      setNotice('WalletConnect is still starting. Try again in a moment.');
      return;
    }
    setBusy(true);
    try {
      await setProjectId(wcId);
      setNotice(wcId.trim() ? 'WalletConnect Project ID stored on this device.' : 'WalletConnect id cleared');
    } catch (e) {
      setNotice(e instanceof Error ? e.message : 'Could not save WalletConnect id');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={walletPage}>
      <button
        type="button"
        onClick={() => navigate(walletHomePath(network))}
        style={{ background: 'none', border: 'none', color: 'hsl(215 18% 62%)', fontSize: 13, cursor: 'pointer', padding: 0 }}
      >
        Back
      </button>
      <h1 style={{ fontSize: 26, fontWeight: 700, margin: '12px 0 12px' }}>Wallet settings</h1>
      <NetworkSwitcher />

      {network === 'ethereum' ? (
        <>
          <p style={{ fontSize: 12, color: 'hsl(215 14% 48%)', marginBottom: 8 }}>{NETWORKS.ethereum.label}</p>
          <p
            style={{
              padding: 14,
              borderRadius: 16,
              background: 'hsl(225 26% 8%)',
              border: '1px solid hsl(215 22% 18%)',
              fontSize: 13,
              wordBreak: 'break-all',
              marginBottom: 28,
            }}
          >
            {ETHEREUM_RPC}
          </p>
        </>
      ) : (
        <>
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
        </>
      )}

      <p style={{ fontSize: 12, color: 'hsl(215 14% 48%)', marginBottom: 8 }}>WalletConnect Project ID</p>
      <p style={{ fontSize: 12, color: 'hsl(215 14% 42%)', marginBottom: 8, lineHeight: 1.5 }}>
        Free id from cloud.reown.com. Required to pair a dapp. Not a spending key.
      </p>
      <input value={wcId} onChange={(e) => setWcId(e.target.value)} placeholder="Project ID" style={{ ...walletField, marginBottom: 10 }} />
      <button type="button" style={{ ...walletBtn, width: '100%', marginBottom: 28 }} disabled={busy} onClick={() => void saveWc()}>
        Save WalletConnect id
      </button>
      {notice ? <p style={{ fontSize: 13, color: 'hsl(155 45% 55%)', marginBottom: 16 }}>{notice}</p> : null}

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
            navigate('/balances');
          }
        }}
      >
        Remove wallet from this device
      </button>
    </div>
  );
}
