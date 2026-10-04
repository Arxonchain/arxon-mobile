import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { activityLabel, loadActivity, mergeHashes, type ActivityItem } from '@/chainWallet/activity';
import { useChainWallet } from '@/chainWallet/ChainWalletContext';
import { NETWORKS } from '@/chainWallet/networks';
import { scanRecentFrom } from '@/chainWallet/scan';
import { shortHash, walletGhost, walletPage } from '@/chainWallet/ui';
import { useLockNetwork, walletHomePath } from '@/chainWallet/walletNav';

export default function WalletActivity() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const wantArxon = params.get('net') === 'arxon';
  useLockNetwork(wantArxon ? 'arxon' : 'ethereum');
  const { address, rpcUrl, refreshBalance } = useChainWallet();
  const home = walletHomePath(wantArxon ? 'arxon' : 'ethereum');
  const [items, setItems] = useState<ActivityItem[]>([]);
  const [status, setStatus] = useState<string | null>(null);

  const reload = useCallback(async () => {
    const all = await loadActivity();
    setItems(all.filter((item) => (wantArxon ? item.network !== 'ethereum' : item.network === 'ethereum')));
  }, [wantArxon]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const scan = async () => {
    if (!address) return;
    if (!wantArxon) {
      window.open(`${NETWORKS.ethereum.explorer}/address/${address}`, '_blank', 'noopener,noreferrer');
      return;
    }
    setStatus('Scanning recent blocks…');
    try {
      const hashes = await scanRecentFrom(rpcUrl, address);
      await mergeHashes(hashes, address);
      await reload();
      await refreshBalance();
      setStatus(hashes.length ? `Found ${hashes.length} related txs` : 'No matching txs in the last 256 blocks');
    } catch (e) {
      setStatus(e instanceof Error ? e.message : 'Scan failed');
    }
  };

  return (
    <div style={{ ...walletPage, padding: '52px 20px 0' }}>
      <button
        type="button"
        onClick={() => navigate(home)}
        style={{ background: 'none', border: 'none', color: 'hsl(215 18% 62%)', fontSize: 13, cursor: 'pointer', padding: 0 }}
      >
        Back
      </button>
      <h1 style={{ fontSize: 26, fontWeight: 700, margin: '12px 0 8px' }}>Activity</h1>
      <p style={{ fontSize: 13, fontWeight: 800, color: wantArxon ? 'hsl(215 40% 72%)' : 'hsl(155 40% 55%)', marginBottom: 12 }}>
        {wantArxon ? NETWORKS.arxon.label : NETWORKS.ethereum.label}
      </p>
      <button
        type="button"
        style={{ ...walletGhost, width: '100%', marginBottom: 16 }}
        onClick={() => void scan()}
      >
        {wantArxon ? 'Scan incoming' : 'Explorer'}
      </button>
      {status ? <p style={{ fontSize: 12, color: 'hsl(215 14% 48%)', marginBottom: 12 }}>{status}</p> : null}
      {items.length === 0 ? (
        <p style={{ fontSize: 14, color: 'hsl(215 14% 42%)', lineHeight: 1.6 }}>
          Sends from this phone show here. Scan to pick up faucet and incoming transfers.
        </p>
      ) : (
        items.map((item) => (
          <button
            key={item.hash}
            type="button"
            onClick={() => navigate(`/tx/${item.hash}`)}
            style={{
              display: 'block',
              width: '100%',
              textAlign: 'left',
              background: 'none',
              border: 'none',
              color: 'inherit',
              padding: '14px 0',
              borderBottom: '1px solid hsl(215 22% 14%)',
              cursor: 'pointer',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 14, fontWeight: 600 }}>{activityLabel(item.kind)}</span>
              <span style={{ fontSize: 13, color: 'hsl(215 14% 52%)' }}>
                {item.amount ? `${item.amount} ${item.token ?? 'ARX'}` : ''}
              </span>
            </div>
            <p style={{ fontSize: 12, color: 'hsl(215 14% 42%)', marginTop: 4 }}>
              {shortHash(item.hash)}
              {item.network === 'ethereum' ? ' · Ethereum' : item.network === 'arxon' ? ' · Arxon Testnet' : ''}
            </p>
          </button>
        ))
      )}
    </div>
  );
}
