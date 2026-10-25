import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { formatUnits } from 'viem';
import { useChainWallet } from '@/chainWallet/ChainWalletContext';
import { useHideBalance } from '@/chainWallet/hideBalance';
import { ETHEREUM_TOKENS } from '@/chainWallet/networks';
import { noMarketQuote, quoteFor } from '@/chainWallet/prices';
import { loadListedTokens, tokenPublicBalance, type ListedToken } from '@/chainWallet/tokens';
import { walletPage } from '@/chainWallet/ui';
import NetworkSwitcher from '@/components/wallet/NetworkSwitcher';
import { TokenBalanceRow } from '@/components/wallet/TokenBalanceRow';
import { TokenMark, TokenName } from '@/components/wallet/TokenMark';
import { useTokenPrices } from '@/hooks/useTokenPrices';

function fmt(v: string | null, digits: number) {
  if (v == null) return '—';
  const n = Number(v);
  if (!Number.isFinite(n)) return v;
  return n.toLocaleString(undefined, { maximumFractionDigits: digits });
}

export default function WalletMarket() {
  const navigate = useNavigate();
  const { address, balance, rpcUrl, shieldedBalance, network, ethBalances } = useChainWallet();
  const { hidden, show } = useHideBalance();
  const { prices } = useTokenPrices();
  const [tokens, setTokens] = useState<(ListedToken & { bal: string })[]>([]);
  const isEth = network === 'ethereum';

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
            <TokenBalanceRow
              key={t.symbol}
              id={t.symbol}
              name={t.symbol}
              amount={ethBalances[t.symbol]}
              digits={t.symbol === 'ETH' ? 6 : 2}
              quote={quoteFor(t.symbol, prices)}
              hidden={hidden}
              show={show}
              padded
              onClick={() => navigate(`/send?token=${t.symbol}`)}
            />
          ))
        : (
          <>
            <button
              type="button"
              onClick={() => navigate('/testnet')}
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
              <TokenName id="ARX" name="tARX" size={32} />
              <span style={{ float: 'right', fontSize: 15, lineHeight: '32px' }}>{show(native)}</span>
              <span style={{ display: 'block', fontSize: 11, color: 'hsl(215 14% 48%)', marginTop: 6 }}>$0.00</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'hsl(215 14% 48%)', marginTop: 8 }}>
                <TokenMark id="ARX" size={14} />
                Vault {show(vault)}
              </span>
            </button>
            {tokens.map((t) => (
              <TokenBalanceRow
                key={t.address}
                name={t.symbol}
                amount={t.bal === '—' ? null : t.bal}
                digits={4}
                quote={noMarketQuote()}
                hidden={hidden}
                show={show}
                padded
                onClick={() => navigate(`/token/${t.address}`)}
              />
            ))}
          </>
        )}
    </div>
  );
}
