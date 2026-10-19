import { useEffect, useMemo, useState, type CSSProperties, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { formatEther } from 'viem';
import { publicClient } from '@/chainWallet/chain';
import { useChainWallet } from '@/chainWallet/ChainWalletContext';
import { fetchEthereumBalances, type EthereumBalances } from '@/chainWallet/ethereum';
import { useHideBalance } from '@/chainWallet/hideBalance';
import { useFourTxClaim } from '@/hooks/useFourTxClaim';
import { useTokenPrices } from '@/hooks/useTokenPrices';
import { TokenMark } from '@/components/wallet/TokenMark';
import { FigmaImg } from './icons';
import { privacyDefaultsTouched, privacyPill, readDefaultPrivacy } from './privacyPrefs';
import { font, ink, page } from './tokens';

function usd(n: number) {
  return n.toLocaleString(undefined, { style: 'currency', currency: 'USD' });
}

function amount(v: string | null, digits = 4) {
  if (v == null) return '0.00';
  const n = Number(v);
  if (!Number.isFinite(n)) return '0.00';
  return n.toLocaleString(undefined, { maximumFractionDigits: digits });
}

export default function HomeScreen() {
  const navigate = useNavigate();
  const { address, rpcUrl, balance, network, shieldedBalance, refreshNotes } = useChainWallet();
  const { hidden, toggle, show } = useHideBalance();
  const { prices } = useTokenPrices();
  const claim = useFourTxClaim(true);
  const [arx, setArx] = useState<string | null>(network === 'arxon' ? balance : null);
  const [eth, setEth] = useState<EthereumBalances>({ ETH: null, USDC: null, USDT: null });
  const [more, setMore] = useState(false);
  const [flags, setFlags] = useState(readDefaultPrivacy);
  const [privacySeen, setPrivacySeen] = useState(privacyDefaultsTouched);

  useEffect(() => {
    setFlags(readDefaultPrivacy());
    setPrivacySeen(privacyDefaultsTouched());
  }, []);

  useEffect(() => {
    void refreshNotes();
  }, [refreshNotes]);

  useEffect(() => {
    if (!address) return;
    let cancel = false;
    if (network === 'arxon' && balance != null) setArx(balance);
    void publicClient(rpcUrl)
      .getBalance({ address })
      .then((wei) => {
        if (!cancel) setArx(formatEther(wei));
      })
      .catch(() => {
        if (!cancel && network === 'arxon') setArx(balance);
      });
    void fetchEthereumBalances(address).then(({ balances }) => {
      if (!cancel) setEth(balances);
    });
    return () => {
      cancel = true;
    };
  }, [address, balance, network, rpcUrl]);

  const rows = useMemo(() => {
    const ethUsd = prices.ETH.usd;
    const usdcUsd = prices.USDC.usd;
    const usdtUsd = prices.USDT.usd;
    const ethAmt = Number(eth.ETH ?? 0);
    const usdcAmt = Number(eth.USDC ?? 0);
    const usdtAmt = Number(eth.USDT ?? 0);
    const parts = [
      ethUsd != null ? ethAmt * ethUsd : 0,
      usdcUsd != null ? usdcAmt * usdcUsd : 0,
      usdtUsd != null ? usdtAmt * usdtUsd : 0,
    ];
    const total = parts.reduce((a, b) => a + b, 0);
    const change = [
      ethUsd != null && prices.ETH.change24h != null ? ethAmt * ethUsd * (prices.ETH.change24h / 100) : 0,
      usdcUsd != null && prices.USDC.change24h != null ? usdcAmt * usdcUsd * (prices.USDC.change24h / 100) : 0,
      usdtUsd != null && prices.USDT.change24h != null ? usdtAmt * usdtUsd * (prices.USDT.change24h / 100) : 0,
    ].reduce((a, b) => a + b, 0);
    const pct = total > 0 ? (change / total) * 100 : 0;
    return { total, change, pct, ethAmt, usdcAmt, usdtAmt };
  }, [eth, prices]);

  const homeEmpty = Number(arx ?? 0) === 0 && rows.total === 0 && Number(eth.ETH ?? 0) === 0;
  const vaultEmpty = Number(shieldedBalance) === 0;

  const cards: Array<{
    key: string;
    title: string;
    body: string;
    icon: ReactNode;
    onClick: () => void;
  } | null> = [
    {
      key: 'mine',
      title: 'Mine ARX',
      body: 'Earn ARX from your wallet',
      icon: <span style={{ fontWeight: 700, fontSize: 16, color: '#abc9ff' }}>M</span>,
      onClick: () => navigate('/mine'),
    },
    homeEmpty
      ? {
          key: 'fund',
          title: 'Fund your wallet',
          body: 'Add ARX to get started',
          icon: <FigmaImg src="/wallet-figma/plus.svg" width={18} height={18} alt="" />,
          onClick: () => navigate('/receive'),
        }
      : null,
    !privacySeen
      ? {
          key: 'privacy',
          title: 'Privacy controls',
          body: 'Choose what each payment hides',
          icon: <FigmaImg src="/wallet-figma/shield-card.svg" width={18} height={18} alt="" />,
          onClick: () => navigate('/privacy-defaults'),
        }
      : null,
    {
      key: 'face',
      title: 'Turn on Face ID',
      body: 'Unlock faster, stay secure',
      icon: <FigmaImg src="/wallet-figma/face.svg" width={18} height={18} alt="" />,
      onClick: () => navigate('/account'),
    },
    claim.progress?.complete && !claim.claimedToday
      ? {
          key: 'claim',
          title: 'Claim your ARX',
          body: 'Convert your mining points',
          icon: <FigmaImg src="/wallet-figma/claim.svg" width={18.9} height={18.9} alt="" />,
          onClick: () => navigate('/mine'),
        }
      : null,
  ].filter((card) => card != null);

  return (
    <div style={page}>
      <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 44 }}>
        <button
          type="button"
          onClick={() => navigate('/account')}
          style={iconBtn}
        >
          <img src="/wallet-figma/avatar.png" alt="" width={36} height={36} style={{ width: 36, height: 36, borderRadius: 18 }} />
          <span style={{ fontSize: 16, fontWeight: 500 }}>Account 01</span>
          <FigmaImg src="/wallet-figma/chev-down.svg" width={16} height={16} alt="" />
        </button>
        <div style={{ display: 'flex', gap: 10 }}>
          <button type="button" aria-label="Search" style={roundBtn} onClick={() => navigate('/explore')}>
            <FigmaImg src="/wallet-figma/search.svg" width={20} height={20} alt="" />
          </button>
          <button type="button" aria-label="Notifications" style={roundBtn} onClick={() => navigate('/notifications')}>
            <FigmaImg src="/wallet-figma/bell.svg" width={20} height={20} alt="" />
          </button>
        </div>
      </header>

      <div style={{ marginTop: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <p style={{ margin: 0, fontSize: 48, fontWeight: 700, letterSpacing: -1 }}>
            {show(usd(rows.total))}
          </p>
          <button type="button" aria-label={hidden ? 'Show balance' : 'Hide balance'} onClick={toggle} style={bare}>
            <FigmaImg src="/wallet-figma/eye.svg" width={22} height={22} alt="" />
          </button>
        </div>
        <p style={{ margin: '6px 0 0', color: ink.muted, fontSize: 14 }}>
          {hidden ? '••••' : `${rows.change >= 0 ? '+' : ''}${usd(rows.change)} (${rows.pct.toFixed(2)}%) Today`}
        </p>
      </div>

      <button
        type="button"
        onClick={() => navigate('/privacy-defaults')}
        style={{
          marginTop: 16,
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          background: '#11161f',
          border: `1px solid ${ink.border}`,
          color: ink.accent,
          borderRadius: 20,
          padding: '7px 14px 7px 12px',
          fontFamily: font.sans,
          fontSize: 13,
          fontWeight: 500,
        }}
      >
        <FigmaImg src="/wallet-figma/shield.svg" width={16} height={16} alt="" />
        {privacyPill(flags)}
      </button>

      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 28 }}>
        <Action label="Send" onClick={() => navigate('/send')}>
          <FigmaImg src="/wallet-figma/send.svg" width={24} height={24} alt="" />
        </Action>
        <Action label="Receive" onClick={() => navigate('/receive')}>
          <FigmaImg src="/wallet-figma/receive.svg" width={24} height={24} alt="" />
        </Action>
        <Action label="Swap" onClick={() => navigate('/market')}>
          <FigmaImg src="/wallet-figma/swap.svg" width={24} height={24} alt="" />
        </Action>
        <Action label="More" onClick={() => setMore(true)} bareIcon>
          <FigmaImg src="/wallet-figma/more.svg" width={58} height={58} alt="" />
        </Action>
      </div>

      {cards.length > 0 && (
        <div style={{ display: 'flex', gap: 12, overflowX: 'auto', marginTop: 22, paddingBottom: 4 }}>
          {cards.map((card) => (
            <button key={card.key} type="button" onClick={card.onClick} style={startCard}>
              <span style={cardIcon}>{card.icon}</span>
              <span style={{ display: 'flex', flexDirection: 'column', gap: 4, textAlign: 'left' }}>
                <span style={{ fontSize: 15, fontWeight: 600 }}>{card.title}</span>
                <span style={{ fontSize: 12, color: '#8b9097', width: 138 }}>{card.body}</span>
              </span>
            </button>
          ))}
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 22 }}>
        <h2 style={{ margin: 0, fontSize: 18 }}>Tokens</h2>
        <button type="button" onClick={() => navigate('/testnet')} style={{ ...bare, color: ink.accent, fontSize: 14, fontWeight: 500 }}>
          Manage
        </button>
      </div>

      <div style={{ marginTop: 8 }}>
        <TokenRow
          name="Arxon"
          sub={`${show(amount(arx))} tARX`}
          value={show('$0.00')}
          change="No market"
          changeColor={ink.secondary}
          mark={<TokenMark id="ARX" size={40} />}
          onClick={() => navigate('/testnet')}
        />
        {!vaultEmpty && (
          <p style={{ margin: '0 0 8px 52px', color: ink.accent, fontSize: 12 }}>
            In Vault · {show(amount(shieldedBalance))} tARX
          </p>
        )}
        <TokenRow
          name="Bitcoin"
          sub={`${show('0.00')} BTC`}
          value={show('$0.00')}
          change="Not on this wallet yet"
          changeColor={ink.secondary}
          mark={<FigmaImg src="/wallet-figma/btc.svg" width={40} height={40} alt="" />}
          onClick={() => navigate('/receive')}
        />
        <TokenRow
          name="Ethereum"
          sub={`${show(amount(eth.ETH))} ETH`}
          value={show(prices.ETH.usd != null ? usd(rows.ethAmt * prices.ETH.usd) : '$0.00')}
          change={pctLabel(prices.ETH.change24h)}
          changeColor={changeColor(prices.ETH.change24h)}
          mark={
            <span style={{ width: 40, height: 40, borderRadius: 20, background: ink.eth, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <FigmaImg src="/wallet-figma/eth.svg" width={15.6465} height={25} alt="" />
            </span>
          }
          onClick={() => navigate('/balances')}
        />
        <TokenRow
          name="Tether"
          sub={`${show(amount(eth.USDT, 2))} USDT`}
          value={show(prices.USDT.usd != null ? usd(rows.usdtAmt * prices.USDT.usd) : '$0.00')}
          change={pctLabel(prices.USDT.change24h)}
          changeColor={changeColor(prices.USDT.change24h)}
          mark={<TokenMark id="USDT" size={40} />}
          onClick={() => navigate('/balances')}
        />
        <TokenRow
          name="USD Coin"
          sub={`${show(amount(eth.USDC, 2))} USDC`}
          value={show(prices.USDC.usd != null ? usd(rows.usdcAmt * prices.USDC.usd) : '$0.00')}
          change={pctLabel(prices.USDC.change24h)}
          changeColor={changeColor(prices.USDC.change24h)}
          mark={<TokenMark id="USDC" size={40} />}
          onClick={() => navigate('/balances')}
        />
      </div>

      {more && (
        <button type="button" aria-label="Close" onClick={() => setMore(false)} style={scrim}>
          <div
            role="dialog"
            onClick={(e) => e.stopPropagation()}
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              bottom: 0,
              background: ink.card,
              borderRadius: '16px 16px 0 0',
              padding: '18px 18px 36px',
            }}
          >
            <p style={{ margin: '0 0 12px', fontWeight: 700, fontSize: 18 }}>More</p>
            <SheetRow title="Buy" body="Buying isn’t open on testnet. Receive tARX, or use funds already on Home." onClick={() => navigate('/receive')} />
            <SheetRow title="Mine" body="Open Arxon Mining. Rewards stay in the mining section." onClick={() => navigate('/mine')} />
          </div>
        </button>
      )}
    </div>
  );
}

function pctLabel(n: number | null) {
  if (n == null) return '—';
  const sign = n > 0 ? '+' : '';
  return `${sign}${n.toFixed(2)}%`;
}

function changeColor(n: number | null) {
  if (n == null || n === 0) return ink.secondary;
  return n > 0 ? ink.success : ink.danger;
}

function Action({
  label,
  onClick,
  children,
  bareIcon,
}: {
  label: string;
  onClick: () => void;
  children: ReactNode;
  bareIcon?: boolean;
}) {
  return (
    <button type="button" onClick={onClick} style={{ width: 78, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, background: 'none', border: 'none', color: ink.text, fontFamily: font.sans, padding: 0, cursor: 'pointer' }}>
      {bareIcon ? children : <span style={{ width: 58, height: 58, borderRadius: 29, background: ink.card, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{children}</span>}
      <span style={{ fontSize: 14 }}>{label}</span>
    </button>
  );
}

function TokenRow({
  name,
  sub,
  value,
  change,
  changeColor: color,
  mark,
  onClick,
}: {
  name: string;
  sub: string;
  value: string;
  change: string;
  changeColor: string;
  mark: ReactNode;
  onClick: () => void;
}) {
  return (
    <button type="button" onClick={onClick} style={{ width: '100%', height: 64, display: 'flex', alignItems: 'center', gap: 12, background: 'none', border: 'none', color: ink.text, fontFamily: font.sans, padding: 0, cursor: 'pointer', textAlign: 'left' }}>
      {mark}
      <span style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
        <span style={{ fontSize: 16, fontWeight: 600 }}>{name}</span>
        <span style={{ fontSize: 12, color: ink.secondary }}>{sub}</span>
      </span>
      <span style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'flex-end' }}>
        <span style={{ fontSize: 16, fontWeight: 600 }}>{value}</span>
        <span style={{ fontSize: 12, color }}>{change}</span>
      </span>
    </button>
  );
}

function SheetRow({ title, body, onClick }: { title: string; body: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} style={{ width: '100%', textAlign: 'left', background: ink.raised, border: 'none', borderRadius: 16, padding: 16, color: ink.text, fontFamily: font.sans, marginBottom: 10, cursor: 'pointer' }}>
      <span style={{ display: 'block', fontWeight: 600, fontSize: 16 }}>{title}</span>
      <span style={{ display: 'block', marginTop: 4, color: '#8b9097', fontSize: 13 }}>{body}</span>
    </button>
  );
}

const bare: CSSProperties = {
  background: 'none',
  border: 'none',
  padding: 0,
  color: ink.text,
  fontFamily: font.sans,
  cursor: 'pointer',
};

const iconBtn: CSSProperties = {
  ...bare,
  display: 'flex',
  alignItems: 'center',
  gap: 10,
};

const roundBtn: CSSProperties = {
  width: 40,
  height: 40,
  borderRadius: 20,
  background: ink.card,
  border: 'none',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  cursor: 'pointer',
  padding: 0,
};

const startCard: CSSProperties = {
  width: 172,
  height: 132,
  flex: '0 0 172px',
  background: ink.card,
  border: 'none',
  borderRadius: 16,
  padding: 16,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'flex-start',
  gap: 12,
  color: ink.text,
  fontFamily: font.sans,
  cursor: 'pointer',
};

const cardIcon: CSSProperties = {
  width: 36,
  height: 36,
  borderRadius: 18,
  background: ink.raised,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
};

const scrim: CSSProperties = {
  position: 'fixed',
  inset: 0,
  background: 'rgba(0,0,0,0.55)',
  border: 'none',
  padding: 0,
  zIndex: 50,
  cursor: 'pointer',
};
