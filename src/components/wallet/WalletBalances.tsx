import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { formatUnits } from 'viem';
import { activityLabel, loadActivity, type ActivityItem } from '@/chainWallet/activity';
import { useChainWallet } from '@/chainWallet/ChainWalletContext';
import { useHideBalance } from '@/chainWallet/hideBalance';
import { ETHEREUM_TOKENS, NETWORKS } from '@/chainWallet/networks';
import { loadListedTokens, tokenPublicBalance, type ListedToken } from '@/chainWallet/tokens';
import { shortHash, walletPage } from '@/chainWallet/ui';
import NetworkSwitcher from '@/components/wallet/NetworkSwitcher';
import { TokenMark, TokenName } from '@/components/wallet/TokenMark';

function fmt(v: string | null, digits: number) {
  if (v == null) return '—';
  const n = Number(v);
  if (!Number.isFinite(n)) return v;
  return n.toLocaleString(undefined, { maximumFractionDigits: digits });
}

export default function WalletBalances() {
  const navigate = useNavigate();
  const { address, balance, rpcUrl, shieldedBalance, refreshBalance, network, ethBalances, rpcError } =
    useChainWallet();
  const { hidden, toggle, show } = useHideBalance();
  const [tokens, setTokens] = useState<(ListedToken & { bal: string })[]>([]);
  const [recent, setRecent] = useState<ActivityItem[]>([]);
  const isEth = network === 'ethereum';
  const net = NETWORKS[network];

  const reload = useCallback(async () => {
    setRecent(await loadActivity());
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
    void refreshBalance();
  }, [reload, refreshBalance]);

  const native = fmt(balance, isEth ? 6 : 4);
  const vault = Number(shieldedBalance).toLocaleString(undefined, { maximumFractionDigits: 4 });

  return (
    <div style={{ ...walletPage, padding: '52px 20px 0' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <p style={{ fontSize: 11, letterSpacing: '0.18em', color: 'hsl(215 35% 62%)', fontWeight: 700 }}>BALANCES</p>
        <button
          type="button"
          onClick={toggle}
          aria-label={hidden ? 'Show' : 'Hide'}
          style={{ background: 'none', border: 'none', color: 'hsl(215 18% 62%)', cursor: 'pointer' }}
        >
          {hidden ? 'Show' : 'Hide'}
        </button>
      </div>
      <NetworkSwitcher />
      <h1 style={{ fontSize: 26, fontWeight: 700, margin: '4px 0 8px', display: 'flex', alignItems: 'center', gap: 10 }}>
        <TokenMark id={isEth ? 'ETH' : 'ARX'} size={32} />
        {show(native)} {net.nativeSymbol}
      </h1>
      {isEth ? (
        <p style={{ fontSize: 13, color: 'hsl(155 40% 55%)', marginBottom: 16, fontWeight: 700 }}>Ethereum · real</p>
      ) : (
        <p style={{ fontSize: 13, color: 'hsl(215 14% 42%)', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
          <TokenMark id="ARX" size={16} />
          Vault {show(vault)}
        </p>
      )}
      {rpcError ? (
        <p style={{ fontSize: 12, color: 'hsl(0 70% 62%)', marginBottom: 12, wordBreak: 'break-word' }}>{rpcError}</p>
      ) : null}

      <p style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>Assets</p>
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
                background: 'none',
                border: 'none',
                color: 'inherit',
                padding: '10px 0',
                borderTop: '1px solid hsl(215 22% 14%)',
                cursor: 'pointer',
              }}
            >
              <TokenName id={t.symbol} name={t.symbol} />
              <span style={{ float: 'right', fontSize: 13, lineHeight: '28px' }}>
                {show(fmt(ethBalances[t.symbol], t.symbol === 'ETH' ? 6 : 2))}
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
                background: 'none',
                border: 'none',
                color: 'inherit',
                padding: '10px 0',
                borderTop: '1px solid hsl(215 22% 14%)',
                cursor: 'pointer',
              }}
            >
              <TokenName id="ARX" name="ARX" />
              <span style={{ float: 'right', fontSize: 13, lineHeight: '28px' }}>{show(native)}</span>
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
          </>
        )}

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
