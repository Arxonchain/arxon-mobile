import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { formatUnits } from 'viem';
import { activityLabel, loadActivity, type ActivityItem } from '@/chainWallet/activity';
import { useChainWallet } from '@/chainWallet/ChainWalletContext';
import { useHideBalance } from '@/chainWallet/hideBalance';
import { loadListedTokens, tokenPublicBalance, type ListedToken } from '@/chainWallet/tokens';
import { shortHash, walletPage } from '@/chainWallet/ui';

export default function WalletPortfolio() {
  const navigate = useNavigate();
  const { address, balance, rpcUrl, shieldedBalance, refreshBalance } = useChainWallet();
  const { hidden, toggle, show } = useHideBalance();
  const [tokens, setTokens] = useState<(ListedToken & { bal: string })[]>([]);
  const [recent, setRecent] = useState<ActivityItem[]>([]);

  const reload = useCallback(async () => {
    setRecent(await loadActivity());
    const listed = await loadListedTokens();
    const rows = await Promise.all(
      listed.map(async (t) => {
        let bal = '—';
        if (address) {
          try {
            bal = formatUnits(await tokenPublicBalance(rpcUrl, t.address, address), t.decimals);
          } catch {
            bal = '—';
          }
        }
        return { ...t, bal };
      })
    );
    setTokens(rows);
  }, [address, rpcUrl]);

  useEffect(() => {
    void reload();
    void refreshBalance();
  }, [reload, refreshBalance]);

  const arx = balance == null ? '—' : Number(balance).toLocaleString(undefined, { maximumFractionDigits: 4 });
  const vault = Number(shieldedBalance).toLocaleString(undefined, { maximumFractionDigits: 4 });

  return (
    <div style={{ ...walletPage, padding: '52px 20px 0' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <p style={{ fontSize: 11, letterSpacing: '0.18em', color: 'hsl(215 35% 62%)', fontWeight: 700 }}>PORTFOLIO</p>
        <button
          type="button"
          onClick={toggle}
          aria-label={hidden ? 'Show balance' : 'Hide balance'}
          style={{ background: 'none', border: 'none', color: 'hsl(215 18% 62%)', cursor: 'pointer' }}
        >
          {hidden ? 'Show' : 'Hide'}
        </button>
      </div>
      <h1 style={{ fontSize: 26, fontWeight: 700, margin: '12px 0 8px' }}>{show(arx)} ARX</h1>
      <p style={{ fontSize: 13, color: 'hsl(215 14% 42%)', marginBottom: 20 }}>Vault {show(vault)}</p>

      <p style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>Assets</p>
      <button
        type="button"
        onClick={() => navigate('/')}
        style={{
          display: 'block',
          width: '100%',
          textAlign: 'left',
          background: 'none',
          border: 'none',
          color: 'inherit',
          padding: '10px 0',
          borderTop: '1px solid hsl(215 22% 14%)',
          cursor: 'pointer',
        }}
      >
        <span style={{ fontSize: 14, fontWeight: 600 }}>ARX</span>
        <span style={{ float: 'right', fontSize: 13 }}>{show(arx)}</span>
      </button>
      {tokens.map((t) => (
        <button
          key={t.address}
          type="button"
          onClick={() => navigate(`/token/${t.address}`)}
          style={{
            display: 'block',
            width: '100%',
            textAlign: 'left',
            background: 'none',
            border: 'none',
            color: 'inherit',
            padding: '10px 0',
            borderTop: '1px solid hsl(215 22% 14%)',
            cursor: 'pointer',
          }}
        >
          <span style={{ fontSize: 14, fontWeight: 600 }}>{t.symbol}</span>
          <span style={{ float: 'right', fontSize: 13 }}>{show(t.bal)}</span>
        </button>
      ))}

      <p style={{ fontSize: 13, fontWeight: 700, margin: '24px 0 8px' }}>Activity</p>
      {recent.length === 0 ? (
        <p style={{ fontSize: 13, color: 'hsl(215 14% 42%)' }}>No activity</p>
      ) : (
        recent.map((item) => (
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
              padding: '8px 0',
              borderTop: '1px solid hsl(215 22% 14%)',
              cursor: 'pointer',
            }}
          >
            <span style={{ fontSize: 13 }}>{activityLabel(item.kind)}</span>
            <span style={{ float: 'right', fontSize: 12, color: 'hsl(215 14% 48%)' }}>{shortHash(item.hash)}</span>
          </button>
        ))
      )}
    </div>
  );
}
