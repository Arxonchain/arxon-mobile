import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { formatUnits } from 'viem';
import { activityLabel, loadActivity, type ActivityItem } from '@/chainWallet/activity';
import { START_URL } from '@/chainWallet/chain';
import { useChainWallet } from '@/chainWallet/ChainWalletContext';
import { useHideBalance } from '@/chainWallet/hideBalance';
import { ETHEREUM_TOKENS, NETWORKS } from '@/chainWallet/networks';
import {
  addListedToken,
  loadListedTokens,
  tokenPublicBalance,
  type ListedToken,
} from '@/chainWallet/tokens';
import { shortAddr, shortHash, walletBtn, walletField, walletGhost, walletPage } from '@/chainWallet/ui';
import NetworkSwitcher from '@/components/wallet/NetworkSwitcher';

function fmt(v: string | null, digits: number) {
  if (v == null) return '—';
  const n = Number(v);
  if (!Number.isFinite(n)) return v;
  return n.toLocaleString(undefined, { maximumFractionDigits: digits });
}

export default function WalletHome() {
  const navigate = useNavigate();
  const {
    address,
    balance,
    rpcError,
    rpcUrl,
    refreshBalance,
    shieldedBalance,
    notesError,
    notesStatus,
    keysError,
    network,
    ethBalances,
    refreshNotes,
  } = useChainWallet();
  const { hidden, toggle, show } = useHideBalance();
  const [recent, setRecent] = useState<ActivityItem[]>([]);
  const [tokens, setTokens] = useState<(ListedToken & { bal: string })[]>([]);
  const [tokenAddr, setTokenAddr] = useState('');
  const [tokenBusy, setTokenBusy] = useState(false);
  const [tokenErr, setTokenErr] = useState<string | null>(null);
  const isEth = network === 'ethereum';
  const net = NETWORKS[network];

  const reload = useCallback(async () => {
    setRecent((await loadActivity()).slice(0, 4));
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
    if (!isEth) void refreshNotes();
  }, [reload, refreshBalance, refreshNotes, isEth]);

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

  const publicAmt = fmt(balance, isEth ? 6 : 4);
  const vaultAmt = Number(shieldedBalance).toLocaleString(undefined, { maximumFractionDigits: 4 });

  return (
    <div style={{ ...walletPage, padding: '52px 20px 0' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <p style={{ fontSize: 11, letterSpacing: '0.18em', color: 'hsl(215 35% 62%)', fontWeight: 700 }}>HOME</p>
        <button
          type="button"
          onClick={() => navigate('/wallet-settings')}
          style={{ background: 'none', border: 'none', color: 'hsl(215 18% 62%)', fontSize: 13, cursor: 'pointer' }}
        >
          Settings
        </button>
      </div>

      <NetworkSwitcher />

      <p style={{ fontSize: 14, color: 'hsl(215 14% 48%)', marginTop: 4 }}>{address ? shortAddr(address) : '—'}</p>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '6px 0 0' }}>
        <p style={{ fontSize: 40, fontWeight: 700, letterSpacing: '-1px', margin: 0 }}>{show(publicAmt)}</p>
        <button
          type="button"
          onClick={toggle}
          aria-label={hidden ? 'Show' : 'Hide'}
          style={{ background: 'none', border: 'none', color: 'hsl(215 18% 62%)', cursor: 'pointer', padding: 4 }}
        >
          {hidden ? 'Show' : 'Hide'}
        </button>
      </div>
      <p style={{ fontSize: 13, color: 'hsl(215 14% 42%)', marginBottom: 22 }}>
        {net.nativeSymbol}
        {!isEth && shieldedBalance !== '0' ? ` · Vault ${show(vaultAmt)}` : ''}
      </p>

      {rpcError ? (
        <p style={{ fontSize: 12, color: 'hsl(0 70% 62%)', marginBottom: 12, wordBreak: 'break-word' }}>{rpcError}</p>
      ) : null}
      {!isEth && keysError ? (
        <p style={{ fontSize: 12, color: 'hsl(38 70% 62%)', marginBottom: 12 }}>{keysError}</p>
      ) : null}
      {!isEth && notesStatus ? (
        <p style={{ fontSize: 12, color: 'hsl(215 14% 48%)', marginBottom: 12 }}>{notesStatus}</p>
      ) : null}
      {!isEth && notesError ? (
        <p style={{ fontSize: 12, color: 'hsl(0 70% 62%)', marginBottom: 12 }}>{notesError}</p>
      ) : null}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <button type="button" style={walletBtn} onClick={() => navigate('/send')}>
          Send
        </button>
        <button type="button" style={walletGhost} onClick={() => navigate('/receive')}>
          Receive
        </button>
        {isEth ? null : (
          <>
            <button type="button" style={walletGhost} onClick={() => navigate('/send?mode=shield')}>
              Shield
            </button>
            <button type="button" style={walletGhost} onClick={() => navigate('/send?mode=unshield')}>
              Unshield
            </button>
          </>
        )}
      </div>

      <button type="button" style={{ ...walletGhost, width: '100%', marginTop: 10 }} onClick={() => navigate('/connect')}>
        Connect
      </button>
      {isEth ? null : (
        <button
          type="button"
          style={{ ...walletGhost, width: '100%', marginTop: 10 }}
          onClick={() => window.open(START_URL, '_blank')}
        >
          Faucet
        </button>
      )}
      <button type="button" style={{ ...walletGhost, width: '100%', marginTop: 10 }} onClick={() => navigate('/mine')}>
        Mine
      </button>

      <div
        style={{
          marginTop: 28,
          padding: 16,
          borderRadius: 20,
          background: 'hsl(225 26% 8%)',
          border: '1px solid hsl(215 22% 17%/0.55)',
        }}
      >
        <p style={{ fontSize: 13, fontWeight: 700, marginBottom: 12 }}>{isEth ? 'ETH USDC USDT' : 'Tokens'}</p>
        {isEth ? (
          ETHEREUM_TOKENS.map((t) => (
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
              <span style={{ fontSize: 14, fontWeight: 600 }}>{t.symbol}</span>
              <span style={{ float: 'right', fontSize: 13 }}>
                {show(fmt(ethBalances[t.symbol], t.symbol === 'ETH' ? 6 : 2))}
              </span>
            </button>
          ))
        ) : (
          <>
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
              <p style={{ fontSize: 13, color: 'hsl(215 14% 42%)', marginTop: 14 }}>No tokens</p>
            ) : (
              tokens.map((t) => (
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
                    marginTop: 4,
                  }}
                >
                  <span style={{ fontSize: 14, fontWeight: 600 }}>{t.symbol}</span>
                  <span style={{ float: 'right', fontSize: 13 }}>{show(t.bal)}</span>
                </button>
              ))
            )}
          </>
        )}
      </div>

      <div
        style={{
          marginTop: 28,
          padding: 16,
          borderRadius: 20,
          background: 'hsl(225 26% 8%)',
          border: '1px solid hsl(215 22% 17%/0.55)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
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
    </div>
  );
}
