import { useCallback, useEffect, useState, type CSSProperties, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { activityLabel, loadActivity, type ActivityItem } from '@/chainWallet/activity';
import { useChainWallet } from '@/chainWallet/ChainWalletContext';
import { useHideBalance } from '@/chainWallet/hideBalance';
import { ETHEREUM_TOKENS } from '@/chainWallet/networks';
import { quoteFor, usdFromAmount } from '@/chainWallet/prices';
import { shortAddr, shortHash, walletPage } from '@/chainWallet/ui';
import { useLockNetwork } from '@/chainWallet/walletNav';
import { TokenBalanceRow } from '@/components/wallet/TokenBalanceRow';
import WalletOnboarding from '@/components/wallet/WalletOnboarding';
import { useTokenPrices } from '@/hooks/useTokenPrices';
import { FigmaImg } from '@/walletFigma/icons';
import { font, ink } from '@/walletFigma/tokens';

function fmt(v: string | null, digits: number) {
  if (v == null) return '—';
  const n = Number(v);
  if (!Number.isFinite(n)) return v;
  return n.toLocaleString(undefined, { maximumFractionDigits: digits });
}

export default function WalletBalances() {
  const navigate = useNavigate();
  useLockNetwork('ethereum');
  const { address, ready, ethBalances, refreshBalance, rpcError } = useChainWallet();
  const { hidden, toggle, show } = useHideBalance();
  const [swapNote, setSwapNote] = useState(false);
  const { prices } = useTokenPrices();
  const [recent, setRecent] = useState<ActivityItem[]>([]);

  const reload = useCallback(async () => {
    setRecent((await loadActivity()).filter((item) => item.network === 'ethereum'));
  }, []);

  useEffect(() => {
    void reload();
    void refreshBalance();
  }, [reload, refreshBalance]);

  const eth = fmt(ethBalances.ETH, 6);
  const totalUsd = ETHEREUM_TOKENS.reduce((sum, t) => {
    const part = usdFromAmount(ethBalances[t.symbol], quoteFor(t.symbol, prices).usd);
    return part == null ? sum : (sum ?? 0) + part;
  }, null as number | null);

  if (ready && !address) return <WalletOnboarding />;

  const totalLabel = totalUsd == null ? '—' : totalUsd.toLocaleString(undefined, { style: 'currency', currency: 'USD' });

  return (
    <div style={walletPage}>
      <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', minHeight: 44 }}>
        <button type="button" onClick={() => navigate('/account')} style={headBtn}>
          <span style={{ fontSize: 16, fontWeight: 600 }}>{address ? shortAddr(address) : 'Wallet'}</span>
        </button>
        <button type="button" aria-label="Settings" onClick={() => navigate('/wallet-settings')} style={roundBtn}>
          <FigmaImg src="/wallet-figma/search.svg" width={18} height={18} alt="" />
        </button>
      </header>

      <p style={{ margin: '18px 0 0', color: ink.accent, fontSize: 13, fontWeight: 600 }}>Ethereum</p>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 8 }}>
        <p style={{ margin: 0, fontSize: 40, fontWeight: 700, letterSpacing: -1 }}>{show(totalLabel)}</p>
        <button type="button" aria-label={hidden ? 'Show balance' : 'Hide balance'} onClick={toggle} style={headBtn}>
          <FigmaImg src={hidden ? '/wallet-figma/eye-off.svg' : '/wallet-figma/eye.svg'} width={22} height={22} alt="" />
        </button>
      </div>
      <p style={{ margin: '6px 0 0', color: ink.secondary, fontSize: 14 }}>{show(`${eth} ETH`)} on Ethereum mainnet</p>
      {rpcError ? (
        <p style={{ fontSize: 13, color: ink.danger, margin: '12px 0 0', wordBreak: 'break-word' }}>{rpcError}</p>
      ) : null}

      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 28 }}>
        <Round label="Send" onClick={() => navigate('/send')}>
          <FigmaImg src="/wallet-figma/send.svg" width={22} height={22} alt="" />
        </Round>
        <Round label="Receive" onClick={() => navigate('/receive')}>
          <FigmaImg src="/wallet-figma/receive.svg" width={22} height={22} alt="" />
        </Round>
        <Round label="Swap" onClick={() => setSwapNote(true)}>
          <FigmaImg src="/wallet-figma/swap.svg" width={22} height={22} alt="" />
        </Round>
        <Round label="Buy" onClick={() => setSwapNote(true)}>
          <FigmaImg src="/wallet-figma/home/buy.svg" width={22} height={22} alt="" />
        </Round>
      </div>
      {swapNote ? (
        <p style={{ margin: '14px 0 0', color: ink.secondary, fontSize: 13, lineHeight: 1.45 }}>
          Swap and Buy are not available in this wallet yet. Send and Receive use the funds already on Ethereum.
        </p>
      ) : null}

      <h2 style={{ margin: '28px 0 4px', fontSize: 18 }}>Tokens</h2>
      {ETHEREUM_TOKENS.map((t) => (
        <TokenBalanceRow
          key={t.symbol}
          id={t.symbol}
          name={t.symbol}
          amount={ethBalances[t.symbol]}
          digits={t.symbol === 'ETH' ? 6 : 2}
          quote={quoteFor(t.symbol, prices)}
          hidden={hidden}
          show={show}
          onClick={() => navigate(`/send?token=${t.symbol}`)}
        />
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
            <span style={{ float: 'right', fontSize: 12, color: ink.secondary }}>{shortHash(item.hash)}</span>
          </button>
        ))
      )}
    </div>
  );
}

function Round({ label, onClick, children }: { label: string; onClick: () => void; children: ReactNode }) {
  return (
    <button type="button" onClick={onClick} style={{ width: 72, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, background: 'none', border: 'none', color: '#fff', fontFamily: font.sans, padding: 0, cursor: 'pointer' }}>
      <span style={roundBtn}>{children}</span>
      <span style={{ fontSize: 13 }}>{label}</span>
    </button>
  );
}

const headBtn: CSSProperties = {
  background: 'none',
  border: 'none',
  color: '#fff',
  fontFamily: font.sans,
  cursor: 'pointer',
  padding: 0,
};

const roundBtn: CSSProperties = {
  width: 52,
  height: 52,
  borderRadius: 26,
  background: ink.card,
  border: `1px solid ${ink.border}`,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  cursor: 'pointer',
  padding: 0,
};
