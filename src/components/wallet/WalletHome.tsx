import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { formatUnits } from 'viem';
import { activityLabel, loadActivity, type ActivityItem } from '@/chainWallet/activity';
import { START_URL } from '@/chainWallet/chain';
import { useChainWallet } from '@/chainWallet/ChainWalletContext';
import { useHideBalance } from '@/chainWallet/hideBalance';
import {
  addListedToken,
  loadListedTokens,
  tokenPublicBalance,
  type ListedToken,
} from '@/chainWallet/tokens';
import { shortAddr, shortHash, walletBtn, walletField, walletGhost, walletPage } from '@/chainWallet/ui';
import { useLockNetwork } from '@/chainWallet/walletNav';
import { noMarketQuote } from '@/chainWallet/prices';
import { ClockLabels } from '@/components/wallet/ClockLabels';
import { TokenBalanceRow } from '@/components/wallet/TokenBalanceRow';
import { TokenMark } from '@/components/wallet/TokenMark';
import WalletOnboarding from '@/components/wallet/WalletOnboarding';
import { FigmaImg } from '@/walletFigma/icons';
import { ink } from '@/walletFigma/tokens';

function fmt(v: string | null, digits: number) {
  if (v == null) return '—';
  const n = Number(v);
  if (!Number.isFinite(n)) return v;
  return n.toLocaleString(undefined, { maximumFractionDigits: digits });
}

export default function WalletHome() {
  const navigate = useNavigate();
  useLockNetwork('arxon');
  const {
    address,
    ready,
    balance,
    rpcError,
    rpcUrl,
    refreshBalance,
    shieldedBalance,
    notesError,
    notesStatus,
    keysError,
    refreshNotes,
  } = useChainWallet();
  const { hidden, toggle, show } = useHideBalance();
  const [recent, setRecent] = useState<ActivityItem[]>([]);
  const [tokens, setTokens] = useState<(ListedToken & { bal: string })[]>([]);
  const [tokenAddr, setTokenAddr] = useState('');
  const [tokenBusy, setTokenBusy] = useState(false);
  const [tokenErr, setTokenErr] = useState<string | null>(null);

  const reload = useCallback(async () => {
    const rows = (await loadActivity()).filter((item) => item.network !== 'ethereum').slice(0, 4);
    setRecent(rows);
    const listed = await loadListedTokens();
    const next = await Promise.all(
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
    setTokens(next);
  }, [address, rpcUrl]);

  useEffect(() => {
    void reload();
    void refreshBalance();
    void refreshNotes();
  }, [reload, refreshBalance, refreshNotes]);

  async function onAddToken() {
    setTokenErr(null);
    setTokenBusy(true);
    try {
      const added = await addListedToken(rpcUrl, tokenAddr);
      setTokenAddr('');
      await reload();
      navigate(`/token/${added.address}`);
    } catch (e) {
      setTokenErr(e instanceof Error ? e.message : 'Failed');
    } finally {
      setTokenBusy(false);
    }
  }

  const publicAmt = fmt(balance, 4);
  const vaultAmt = Number(shieldedBalance).toLocaleString(undefined, { maximumFractionDigits: 4 });

  if (ready && !address) return <WalletOnboarding />;

  return (
    <div style={walletPage}>
      <p style={{ margin: '8px 0 0', color: ink.accent, fontSize: 13, fontWeight: 600 }}>Arxon Testnet</p>
      <p style={{ margin: '4px 0 0', color: ink.secondary, fontSize: 13 }}>{address ? shortAddr(address) : '—'}</p>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 12 }}>
        <TokenMark id="ARX" size={36} />
        <p style={{ fontSize: 40, fontWeight: 700, letterSpacing: '-1px', margin: 0 }}>{show(publicAmt)}</p>
        <button type="button" onClick={toggle} aria-label={hidden ? 'Show balance' : 'Hide balance'} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}>
          <FigmaImg src={hidden ? '/wallet-figma/eye-off.svg' : '/wallet-figma/eye.svg'} width={22} height={22} alt="" />
        </button>
      </div>
      <p style={{ margin: '6px 0 0', color: ink.secondary, fontSize: 14 }}>
        {show(`${publicAmt} tARX`)} · Vault {show(vaultAmt)} tARX · $0.00
      </p>

      {rpcError ? (
        <p style={{ fontSize: 12, color: 'hsl(0 70% 62%)', marginBottom: 12, wordBreak: 'break-word' }}>{rpcError}</p>
      ) : null}
      {keysError ? (
        <p style={{ fontSize: 12, color: 'hsl(38 70% 62%)', marginBottom: 12 }}>{keysError}</p>
      ) : null}
      {notesStatus ? (
        <p style={{ fontSize: 12, color: 'hsl(215 14% 48%)', marginBottom: 12 }}>{notesStatus}</p>
      ) : null}
      {notesError ? (
        <p style={{ fontSize: 12, color: 'hsl(0 70% 62%)', marginBottom: 12 }}>{notesError}</p>
      ) : null}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 22 }}>
        <button type="button" style={walletBtn} onClick={() => navigate('/send?net=arxon')}>Send</button>
        <button type="button" style={walletGhost} onClick={() => navigate('/receive?net=arxon')}>Receive</button>
        <button type="button" style={walletGhost} onClick={() => navigate('/send?mode=shield&net=arxon')}>To Vault</button>
        <button type="button" style={walletGhost} onClick={() => navigate('/send?mode=unshield&net=arxon')}>To Home</button>
        <button type="button" style={walletGhost} onClick={() => navigate('/send?mode=private&net=arxon')}>Private</button>
      </div>

      <button
        type="button"
        style={{ ...walletGhost, width: '100%', marginTop: 10 }}
        onClick={() => window.open(START_URL, '_blank')}
      >
        Faucet · tARX
      </button>

      <div
        style={{
          marginTop: 28,
          padding: 16,
          borderRadius: 20,
          background: ink.card,
          border: `1px solid ${ink.border}`,
        }}
      >
        <p style={{ fontSize: 13, fontWeight: 700, marginBottom: 12 }}>Tokens</p>
        <input
          value={tokenAddr}
          onChange={(e) => setTokenAddr(e.target.value)}
          placeholder="Token 0x…"
          style={{ ...walletField, marginBottom: 10 }}
        />
        <button
          type="button"
          style={{ ...walletGhost, width: '100%' }}
          disabled={tokenBusy || !tokenAddr.trim()}
          onClick={() => void onAddToken()}
        >
          {tokenBusy ? 'Processing' : 'Add token'}
        </button>
        {tokenErr ? (
          <p style={{ fontSize: 12, color: 'hsl(0 70% 62%)', marginTop: 10 }}>{tokenErr}</p>
        ) : null}
        {tokens.length === 0 ? (
          <p style={{ fontSize: 13, color: 'hsl(215 14% 42%)', marginTop: 14 }}>No extra tokens</p>
        ) : (
          tokens.map((t) => (
            <TokenBalanceRow
              key={t.address}
              name={t.symbol}
              amount={t.bal === '—' ? null : t.bal}
              digits={4}
              quote={noMarketQuote()}
              hidden={hidden}
              show={show}
              onClick={() => navigate(`/token/${t.address}`)}
            />
          ))
        )}
      </div>

      <div
        style={{
          marginTop: 28,
          padding: 16,
          borderRadius: 20,
          background: ink.card,
          border: `1px solid ${ink.border}`,
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
          <p style={{ fontSize: 13, fontWeight: 700 }}>Activity</p>
          <button
            type="button"
            onClick={() => navigate('/activity?net=arxon')}
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
              <ClockLabels clocks={item.clocks} />
            </button>
          ))
        )}
      </div>
    </div>
  );
}
