import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { formatUnits } from 'viem';
import { useChainWallet } from '@/chainWallet/ChainWalletContext';
import { useHideBalance } from '@/chainWallet/hideBalance';
import { ETHEREUM_TOKENS, NETWORKS } from '@/chainWallet/networks';
import { loadListedTokens, tokenPublicBalance, type ListedToken } from '@/chainWallet/tokens';
import { walletPage } from '@/chainWallet/ui';
import NetworkSwitcher from '@/components/wallet/NetworkSwitcher';
import { TokenMark, TokenName } from '@/components/wallet/TokenMark';

function fmt(v: string | null, digits: number) {
  if (v == null) return '—';
  const n = Number(v);
  if (!Number.isFinite(n)) return v;
  return n.toLocaleString(undefined, { maximumFractionDigits: digits });
}

export default function WalletMarket() {
  const navigate = useNavigate();
  const { address, balance, rpcUrl, shieldedBalance, network, ethBalances } = useChainWallet();
  const { show } = useHideBalance();
  const [tokens, setTokens] = useState<(ListedToken & { bal: string })[]>([]);
  const isEth = network === 'ethereum';
  const net = NETWORKS[network];

  const reload = useCallback(async () => {
    if (isEth) {
      setTokens([]);
      return;
    }
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
  }, [address, rpcUrl, isEth]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const native = fmt(balance, isEth ? 6 : 4);
  const vault = Number(shieldedBalance).toLocaleString(undefined, { maximumFractionDigits: 4 });

  return (
    <div style={{ ...walletPage, padding: '52px 20px 0' }}>
      <p style={{ fontSize: 11, letterSpacing: '0.18em', color: 'hsl(215 35% 62%)', fontWeight: 700 }}>MARKET</p>
      <NetworkSwitcher />
      <h1 style={{ fontSize: 26, fontWeight: 700, margin: '4px 0 16px' }}>Market</h1>

      {isEth
        ? ETHEREUM_TOKENS.map((t) => (
            <button
              key={t.symbol}
              type="button"
              onClick={() => navigate(`/send?token=${t.symbol}`)}
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
              <TokenName id={t.symbol} name={t.symbol} size={32} />
              <span style={{ float: 'right', fontSize: 15, lineHeight: '32px' }}>
                {show(fmt(ethBalances[t.symbol], t.symbol === 'ETH' ? 6 : 2))}
              </span>
              <span style={{ display: 'block', fontSize: 12, color: 'hsl(155 40% 55%)', marginTop: 4, fontWeight: 700 }}>
                {net.label}
              </span>
            </button>
          ))
        : (
          <>
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
              <TokenName id="ARX" name="ARX" size={32} />
              <span style={{ float: 'right', fontSize: 15, lineHeight: '32px' }}>{show(native)}</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'hsl(215 14% 48%)', marginTop: 8 }}>
                <TokenMark id="ARX" size={14} />
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
          </>
        )}
    </div>
  );
}
