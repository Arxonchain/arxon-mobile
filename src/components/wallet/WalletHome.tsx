import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { loadActivity, type ActivityItem } from '@/chainWallet/activity';
import { SCAN_URL, START_URL } from '@/chainWallet/chain';
import { useChainWallet } from '@/chainWallet/ChainWalletContext';
import { shortAddr, shortHash, walletBtn, walletGhost, walletPage } from '@/chainWallet/ui';

export default function WalletHome() {
  const navigate = useNavigate();
  const { address, balance, rpcError, rpcUrl, refreshBalance } = useChainWallet();
  const [recent, setRecent] = useState<ActivityItem[]>([]);

  const reload = useCallback(async () => {
    setRecent((await loadActivity()).slice(0, 4));
  }, []);

  useEffect(() => {
    void reload();
    void refreshBalance();
  }, [reload, refreshBalance]);

  return (
    <div style={{ ...walletPage, padding: '52px 20px 0' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <p style={{ fontSize: 11, letterSpacing: '0.18em', color: 'hsl(215 35% 62%)', fontWeight: 700 }}>ARXON WALLET</p>
        <button
          type="button"
          onClick={() => navigate('/wallet-settings')}
          style={{ background: 'none', border: 'none', color: 'hsl(215 18% 62%)', fontSize: 13, cursor: 'pointer' }}
        >
          Settings
        </button>
      </div>

      <p style={{ fontSize: 14, color: 'hsl(215 14% 48%)', marginTop: 18 }}>{address ? shortAddr(address) : '—'}</p>
      <p style={{ fontSize: 40, fontWeight: 700, letterSpacing: '-1px', margin: '6px 0 0' }}>
        {balance == null ? '—' : Number(balance).toLocaleString(undefined, { maximumFractionDigits: 4 })}
      </p>
      <p style={{ fontSize: 13, color: 'hsl(215 14% 42%)', marginBottom: 22 }}>ARX · chain 7171</p>

      {rpcError ? (
        <p style={{ fontSize: 12, color: 'hsl(0 70% 62%)', marginBottom: 16, lineHeight: 1.5 }}>
          Cannot reach {rpcUrl}. {rpcError}
        </p>
      ) : null}

      <div style={{ display: 'flex', gap: 10 }}>
        <button type="button" style={walletBtn} onClick={() => navigate('/send')}>
          Send
        </button>
        <button type="button" style={walletGhost} onClick={() => navigate('/receive')}>
          Receive
        </button>
      </div>

      <button
        type="button"
        style={{ ...walletGhost, width: '100%', marginTop: 10 }}
        onClick={() => window.open(START_URL, '_blank')}
      >
        Testnet faucet
      </button>
      <button
        type="button"
        style={{ ...walletGhost, width: '100%', marginTop: 10 }}
        onClick={() => navigate('/mine')}
      >
        Open mining
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
          <p style={{ fontSize: 13, color: 'hsl(215 14% 42%)', lineHeight: 1.5 }}>
            No txs on this device yet. Send, or open Activity and scan incoming.
          </p>
        ) : (
          recent.map((item) => (
            <a
              key={item.hash}
              href={`${SCAN_URL}/#/tx/${item.hash}`}
              target="_blank"
              rel="noreferrer"
              style={{ display: 'block', textDecoration: 'none', color: 'inherit', padding: '8px 0', borderTop: '1px solid hsl(215 22% 14%)' }}
            >
              <span style={{ fontSize: 13 }}>{item.kind === 'transfer' ? 'Sent' : 'On-chain'}</span>
              <span style={{ float: 'right', fontSize: 12, color: 'hsl(215 14% 48%)' }}>{shortHash(item.hash)}</span>
            </a>
          ))
        )}
      </div>
    </div>
  );
}
