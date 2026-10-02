import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { activityLabel, loadActivity, mergeHashes, type ActivityItem } from '@/chainWallet/activity';
import { useChainWallet } from '@/chainWallet/ChainWalletContext';
import { scanRecentFrom } from '@/chainWallet/scan';
import { shortHash, walletGhost, walletPage } from '@/chainWallet/ui';

export default function WalletActivity() {
  const navigate = useNavigate();
  const { address, rpcUrl, refreshBalance } = useChainWallet();
  const [items, setItems] = useState<ActivityItem[]>([]);
  const [status, setStatus] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setItems(await loadActivity());
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  const scan = async () => {
    if (!address) return;
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
        onClick={() => navigate('/')}
        style={{ background: 'none', border: 'none', color: 'hsl(215 18% 62%)', fontSize: 13, cursor: 'pointer', padding: 0 }}
      >
        Back
      </button>
      <h1 style={{ fontSize: 26, fontWeight: 700, margin: '12px 0 8px' }}>Activity</h1>
      <button type="button" style={{ ...walletGhost, width: '100%', marginBottom: 16 }} onClick={() => void scan()}>
        Scan incoming
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
              <span style={{ fontSize: 13, color: 'hsl(215 14% 52%)' }}>{item.amount ? `${item.amount} ARX` : ''}</span>
            </div>
            <p style={{ fontSize: 12, color: 'hsl(215 14% 42%)', marginTop: 4 }}>{shortHash(item.hash)}</p>
          </button>
        ))
      )}
    </div>
  );
}
