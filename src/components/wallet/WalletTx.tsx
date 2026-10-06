import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { formatEther, type Hex } from 'viem';
import { loadActivity } from '@/chainWallet/activity';
import type { TxClocks } from '@/chainWallet/clocks';
import { inspectTx, type InspectedTx } from '@/chainWallet/inspect';
import { ethereumPublicClient } from '@/chainWallet/ethereum';
import { useChainWallet } from '@/chainWallet/ChainWalletContext';
import { NETWORKS } from '@/chainWallet/networks';
import { walletGhost, walletPage } from '@/chainWallet/ui';
import { walletHomePath } from '@/chainWallet/walletNav';
import { ClockLabels } from '@/components/wallet/ClockLabels';

function badgeColor(state: InspectedTx['rows'][number]['state']) {
  if (state === 'hidden') return 'hsl(155 45% 55%)';
  if (state === 'public') return 'hsl(0 70% 62%)';
  return 'hsl(215 14% 48%)';
}

export default function WalletTx() {
  const navigate = useNavigate();
  const { rpcUrl, network } = useChainWallet();
  const { hash } = useParams<{ hash: string }>();
  const [data, setData] = useState<InspectedTx | null>(null);
  const [clocks, setClocks] = useState<TxClocks | undefined>(undefined);
  const [err, setErr] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!hash || !hash.startsWith('0x')) {
      setErr('Missing transaction hash');
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const rows = await loadActivity();
        const saved = rows.find((row) => row.hash.toLowerCase() === hash.toLowerCase());
        if (!cancelled) setClocks(saved?.clocks);
        if (network === 'ethereum') {
          const client = ethereumPublicClient();
          const tx = await client.getTransaction({ hash: hash as Hex });
          let status: InspectedTx['status'] = 'pending';
          let blockNumber: string | null = tx.blockNumber != null ? tx.blockNumber.toString() : null;
          try {
            const receipt = await client.getTransactionReceipt({ hash: hash as Hex });
            status = receipt.status === 'success' ? 'success' : 'reverted';
            blockNumber = receipt.blockNumber.toString();
          } catch {
            /* mempool */
          }
          const next: InspectedTx = {
            hash: hash as Hex,
            status,
            blockNumber,
            from: tx.from,
            to: tx.to,
            valueArx: formatEther(tx.value),
            kind: 'transfer',
            rows: [
              { label: 'Network', value: NETWORKS.ethereum.label, state: 'public' },
              { label: 'From', value: tx.from, state: 'public' },
              { label: 'To', value: tx.to ?? '—', state: 'public' },
              { label: 'ETH', value: formatEther(tx.value), state: 'public' },
            ],
          };
          if (!cancelled) setData(next);
          return;
        }
        const next = await inspectTx(rpcUrl, hash as Hex);
        if (!cancelled) setData(next);
      } catch (e) {
        if (!cancelled) setErr(e instanceof Error ? e.message : 'Could not load tx');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [hash, rpcUrl, network]);

  return (
    <div style={{ ...walletPage, padding: '52px 20px 0' }}>
      <button type="button" onClick={() => navigate(walletHomePath(network))} style={{ background: 'none', border: 'none', color: 'hsl(215 18% 62%)', fontSize: 13, cursor: 'pointer', padding: 0 }}>
        Back
      </button>
      <h1 style={{ fontSize: 26, fontWeight: 700, margin: '12px 0 12px' }}>Tx</h1>
      <div style={{ padding: 16, borderRadius: 18, background: 'hsl(225 26% 8%)', border: '1px solid hsl(215 22% 18%)', wordBreak: 'break-all', fontSize: 12, lineHeight: 1.6, marginBottom: 10 }}>
        {hash}
      </div>
      <button
        type="button"
        style={{ ...walletGhost, width: '100%', marginBottom: 16 }}
        onClick={() => {
          if (!hash) return;
          void navigator.clipboard.writeText(hash).then(() => setCopied(true));
        }}
      >
        {copied ? 'Copied' : 'Copy hash'}
      </button>
      {err ? <p style={{ color: 'hsl(0 70% 62%)', fontSize: 13 }}>{err}</p> : null}
      {!data && !err ? <p style={{ fontSize: 13, color: 'hsl(215 14% 48%)' }}>Loading from RPC…</p> : null}
      {data ? (
        <>
          <p style={{ fontSize: 18, fontWeight: 700, color: 'hsl(215 35% 72%)' }}>
            {data.status === 'success' ? 'Included' : data.status === 'reverted' ? 'Reverted — not applied' : 'Pending'}
          </p>
          <p style={{ fontSize: 13, color: 'hsl(215 14% 48%)', marginBottom: 12 }}>
            {data.kind === 'shield' ? 'Shield' : data.kind === 'private' ? 'Private' : data.kind === 'unshield' ? 'Unshield' : data.kind === 'transfer' ? 'Transfer' : 'Call'}
            {data.blockNumber ? ` · #${data.blockNumber}` : ''}
          </p>
          <div style={{ marginBottom: clocks ? 12 : 0 }}>
            <ClockLabels clocks={clocks} />
          </div>
          {data.rows.map((row) => (
            <div key={row.label} style={{ padding: 14, borderRadius: 16, background: 'hsl(225 26% 8%)', border: '1px solid hsl(215 22% 18%)', marginBottom: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                <span style={{ fontSize: 14, fontWeight: 600 }}>{row.label}</span>
                <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: 0.6, color: badgeColor(row.state) }}>
                  {row.state === 'hidden' ? 'HIDDEN' : row.state === 'public' ? 'PUBLIC' : ''}
                </span>
              </div>
              <p style={{ fontSize: 12, color: 'hsl(215 14% 52%)', marginTop: 6, wordBreak: 'break-all' }}>{row.value}</p>
            </div>
          ))}
        </>
      ) : null}
    </div>
  );
}
