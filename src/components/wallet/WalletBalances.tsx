import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { activityLabel, loadActivity, type ActivityItem } from '@/chainWallet/activity';
import { useChainWallet } from '@/chainWallet/ChainWalletContext';
import { useHideBalance } from '@/chainWallet/hideBalance';
import { ETHEREUM_TOKENS } from '@/chainWallet/networks';
import { shortAddr, shortHash, walletBtn, walletGhost, walletPage } from '@/chainWallet/ui';
import { useLockNetwork } from '@/chainWallet/walletNav';
import { TokenMark, TokenName } from '@/components/wallet/TokenMark';

function fmt(v: string | null, digits: number) {
  if (v == null) return '—';
  const n = Number(v);
  if (!Number.isFinite(n)) return v;
  return n.toLocaleString(undefined, { maximumFractionDigits: digits });
}

export default function WalletBalances() {
  const navigate = useNavigate();
  useLockNetwork('ethereum');
  const { address, ethBalances, refreshBalance, rpcError } = useChainWallet();
  const { hidden, toggle, show } = useHideBalance();
  const [recent, setRecent] = useState<ActivityItem[]>([]);

  const reload = useCallback(async () => {
    setRecent((await loadActivity()).filter((item) => item.network === 'ethereum'));
  }, []);

  useEffect(() => {
    void reload();
    void refreshBalance();
  }, [reload, refreshBalance]);

  const eth = fmt(ethBalances.ETH, 6);

  return (
    <div style={{ ...walletPage, padding: '52px 20px 0' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <p style={{ fontSize: 11, letterSpacing: '0.18em', color: 'hsl(215 35% 62%)', fontWeight: 700 }}>BALANCES</p>
        <div style={{ display: 'flex', gap: 12 }}>
          <button
            type="button"
            onClick={toggle}
            aria-label={hidden ? 'Show' : 'Hide'}
            style={{ background: 'none', border: 'none', color: 'hsl(215 18% 62%)', cursor: 'pointer' }}
          >
            {hidden ? 'Show' : 'Hide'}
          </button>
          <button
            type="button"
            onClick={() => navigate('/wallet-settings')}
            style={{ background: 'none', border: 'none', color: 'hsl(215 18% 62%)', fontSize: 13, cursor: 'pointer' }}
          >
            Settings
          </button>
        </div>
      </div>

      <p style={{ fontSize: 13, color: 'hsl(155 40% 55%)', fontWeight: 700, margin: '12px 0 4px' }}>Ethereum · real</p>
      <p style={{ fontSize: 14, color: 'hsl(215 14% 48%)', margin: '0 0 8px' }}>{address ? shortAddr(address) : '—'}</p>
      <h1 style={{ fontSize: 26, fontWeight: 700, margin: '4px 0 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
        <TokenMark id="ETH" size={32} />
        {show(eth)} ETH
      </h1>
      {rpcError ? (
        <p style={{ fontSize: 12, color: 'hsl(0 70% 62%)', marginBottom: 12, wordBreak: 'break-word' }}>{rpcError}</p>
      ) : null}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 22 }}>
        <button type="button" style={walletBtn} onClick={() => navigate('/send')}>
          Send
        </button>
        <button type="button" style={walletGhost} onClick={() => navigate('/receive')}>
          Receive
        </button>
      </div>

      <p style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>Assets</p>
      {ETHEREUM_TOKENS.map((t) => (
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
      ))}

      <div style={{ display: 'flex', justifyContent: 'space-between', margin: '24px 0 8px' }}>
        <p style={{ fontSize: 13, fontWeight: 700 }}>Activity</p>
        <button
          type="button"
          onClick={() => navigate('/activity')}
          style={{ background: 'none', border: 'none', color: 'hsl(215 35% 72%)', fontSize: 12, cursor: 'pointer' }}
        >
          See all
        </button>
      </div>
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
