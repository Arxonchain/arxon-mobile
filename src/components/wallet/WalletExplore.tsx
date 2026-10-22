import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { START_URL } from '@/chainWallet/chain';
import { openExternal } from '@/walletFigma/flow/openExternal';
import { useChainWallet } from '@/chainWallet/ChainWalletContext';
import { NETWORKS } from '@/chainWallet/networks';
import { walletBtn, walletField, walletGhost, walletPage } from '@/chainWallet/ui';
import NetworkSwitcher from '@/components/wallet/NetworkSwitcher';

async function openUrl(url: string) {
  await openExternal(url);
}

function looksLikeTx(value: string) {
  return /^0x[0-9a-fA-F]{64}$/.test(value.trim());
}

function looksLikeAddress(value: string) {
  return /^0x[0-9a-fA-F]{40}$/.test(value.trim());
}

export default function WalletExplore() {
  const navigate = useNavigate();
  const { address, network } = useChainWallet();
  const [q, setQ] = useState('');
  const [notice, setNotice] = useState<string | null>(null);
  const explorer = NETWORKS[network].explorer;
  const isEth = network === 'ethereum';

  const lookup = async () => {
    const value = q.trim();
    setNotice(null);
    if (!value) {
      setNotice('Enter hash or address');
      return;
    }
    if (looksLikeTx(value)) {
      navigate(`/tx/${value}`);
      return;
    }
    if (looksLikeAddress(value)) {
      await openUrl(`${explorer}/address/${value}`);
      return;
    }
    setNotice('Invalid');
  };

  return (
    <div style={walletPage}>
      <p style={{ fontSize: 11, letterSpacing: '0.18em', color: 'hsl(215 35% 62%)', fontWeight: 700 }}>EXPLORE</p>
      <NetworkSwitcher />
      <h1 style={{ fontSize: 26, fontWeight: 700, margin: '4px 0 16px' }}>Explore</h1>

      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="0x hash or address"
        style={{ ...walletField, marginBottom: 10 }}
      />
      <button type="button" style={{ ...walletBtn, width: '100%', marginBottom: 12 }} onClick={() => void lookup()}>
        Search
      </button>
      {notice ? <p style={{ fontSize: 13, color: 'hsl(38 70% 62%)', marginBottom: 16 }}>{notice}</p> : null}

      <button type="button" style={{ ...walletGhost, width: '100%', marginBottom: 10 }} onClick={() => void openUrl(explorer)}>
        Explorer
      </button>
      {address ? (
        <button
          type="button"
          style={{ ...walletGhost, width: '100%', marginBottom: 10 }}
          onClick={() => void openUrl(`${explorer}/address/${address}`)}
        >
          My address
        </button>
      ) : null}
      {isEth ? null : (
        <button type="button" style={{ ...walletGhost, width: '100%', marginBottom: 10 }} onClick={() => void openUrl(START_URL)}>
          Faucet
        </button>
      )}
      <button type="button" style={{ ...walletGhost, width: '100%', marginBottom: 10 }} onClick={() => navigate('/connect')}>
        Connect
      </button>
    </div>
  );
}
