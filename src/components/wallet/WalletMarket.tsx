import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { formatUnits } from 'viem';
import { useChainWallet } from '@/chainWallet/ChainWalletContext';
import { useHideBalance } from '@/chainWallet/hideBalance';
import { loadListedTokens, tokenPublicBalance, type ListedToken } from '@/chainWallet/tokens';
import { walletPage } from '@/chainWallet/ui';

export default function WalletMarket() {
  const navigate = useNavigate();
  const { address, balance, rpcUrl, shieldedBalance } = useChainWallet();
  const { show } = useHideBalance();
  const [tokens, setTokens] = useState<(ListedToken & { bal: string })[]>([]);

  const reload = useCallback(async () => {
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
  }, [reload]);

  const arx = balance == null ? '—' : Number(balance).toLocaleString(undefined, { maximumFractionDigits: 4 });
  const vault = Number(shieldedBalance).toLocaleString(undefined, { maximumFractionDigits: 4 });

  return (
    <div style={{ ...walletPage, padding: '52px 20px 0' }}>
      <p style={{ fontSize: 11, letterSpacing: '0.18em', color: 'hsl(215 35% 62%)', fontWeight: 700 }}>MARKET</p>
      <h1 style={{ fontSize: 26, fontWeight: 700, margin: '12px 0 16px' }}>Market</h1>

      <button
        type="button"
        onClick={() => navigate('/')}
        style={{
          display: 'block',
          width: '100%',
          textAlign: 'left',
          background: 'hsl(225 26% 8%)',
          border: '1px solid hsl(215 22% 17%/0.55)',
          color: 'inherit',
          borderRadius: 16,
          padding: 16,
          cursor: 'pointer',
          marginBottom: 10,
        }}
      >
        <span style={{ fontSize: 16, fontWeight: 700 }}>ARX</span>
        <span style={{ float: 'right', fontSize: 15 }}>{show(arx)}</span>
        <span style={{ display: 'block', fontSize: 12, color: 'hsl(215 14% 48%)', marginTop: 4 }}>
          Vault {show(vault)}
        </span>
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
            background: 'hsl(225 26% 8%)',
            border: '1px solid hsl(215 22% 17%/0.55)',
            color: 'inherit',
            borderRadius: 16,
            padding: 16,
            cursor: 'pointer',
            marginBottom: 10,
          }}
        >
          <span style={{ fontSize: 16, fontWeight: 700 }}>{t.symbol}</span>
          <span style={{ float: 'right', fontSize: 15 }}>{show(t.bal)}</span>
        </button>
      ))}
    </div>
  );
}
