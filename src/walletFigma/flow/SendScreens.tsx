import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { FigmaImg } from '@/walletFigma/icons';
import { font } from '@/walletFigma/tokens';
import { getAddress } from 'viem';
import { PendingTxError } from '@/chainWallet/chain';
import { quoteBitcoinFee } from '@/chainWallet/bitcoinSend';
import { quoteEthereumFee } from '@/chainWallet/ethereum';
import type { EthereumToken } from '@/chainWallet/networks';
import type { PrivacyFlags } from '@/chainWallet/privacy';
import { quoteSolanaFee } from '@/chainWallet/solanaSend';
import { isTxCancelled, plainTxError } from '@/chainWallet/txError';
import { etaSecondsLabel } from '@/chainWallet/clocks';
import { recipientCreditedInCopy } from '@/chainWallet/txNotify';
import { warmProver } from '@/chainWallet/prove';
import { useLiveFrame } from './liveFrame';
import { useAppHidesFigmaChrome } from './appChrome';
import { useWalletNetwork } from './WalletTabs';
import { isLiveSendDest, parseTokenQty } from './sendDest';
import { onPasteTap } from '@/lib/readClipboard';

type StableChain = 'ethereum' | 'solana';
import { CenterLine, SwipeConfirm } from './SwipeConfirm';
import { briefAddr } from './briefAddr';
import { FailSheet } from './FailSheet';
import { FROST_PLACEHOLDER_CSS, frostAvail, frostField, frostIcon, frostInput, frostPanel, FrostLine, HintCard, LiveHead, LiveScroll, availableBox, liveGhost, livePrimary, PullHint, sheetGlass } from './LiveScroll';
import { useLiveFee } from './useLiveFee';
import { usePullRefresh } from './pullRefresh';
import { CardLoad } from './useCardLoad';

const art = (name: string) => `/wallet-figma/send/${name}`;
type Go = (id: string, remember?: boolean) => void;

const TOKENS = [
  { id: 'arx', name: 'Arxon', amount: '2,400.00 ARX', fiat: '$1,008.00', symbol: 'ARX', hidden: true, home: 2400, vault: '1,000.00 ARX' },
  { id: 'btc', name: 'Bitcoin', amount: '0.0021 BTC', fiat: '$187.60', symbol: 'BTC', hidden: false, home: 0.0021, vault: '' },
  { id: 'eth', name: 'Ethereum', amount: '0.0185 ETH', fiat: '$53.00', symbol: 'ETH', hidden: false, home: 0.0185, vault: '' },
  { id: 'usdt', name: 'Tether', amount: '120.00 USDT', fiat: '$120.00', symbol: 'USDT', hidden: false, home: 120, vault: '40.00 USDT' },
  { id: 'usdc', name: 'USD Coin', amount: '30.00 USDC', fiat: '$30.00', symbol: 'USDC', hidden: false, home: 30, vault: '30.00 USDC' },
];

const PEOPLE = [
  { name: 'Account 02', sub: 'arx1q3k…9d2a', address: 'arx1q3k…9d2a', letter: 'A', color: '#3b5a8c', group: 'account' },
  { name: 'arx1q8x4…t7c2', sub: 'Sent 25.00 ARX · Today', address: 'arx1q8x4…t7c2n4p', letter: 'A', color: '#5a4a8c', group: 'recent' },
  { name: 'arx1q7…m2d9', sub: 'Received 500.00 ARX · Today', address: 'arx1q7…m2d9', letter: 'A', color: '#2f7a6a', group: 'recent' },
  { name: 'Behta', sub: 'arx1q5p…h8w1 · Oct 2', address: 'arx1q5p…h8w1', letter: 'B', color: '#8c5a3b', group: 'recent' },
];

const SENDS = new Set(['send-token', 'send-who', 'send-amount', 'send-review', 'send-success', 'send-privacy', 'send-failed', 'send-qr', 'send-amount-vault']);

export function isSendScreen(id: string) {
  return SENDS.has(id);
}

export function SendScreens({ id, go, back }: { id: string; go: Go; back?: () => void }) {
  const live = useLiveFrame();
  const net = useWalletNetwork();
  const [tokenId, setTokenId] = useState(() => (live?.app && net !== 'testnet' ? 'eth' : 'arx'));
  const [unavailable, setUnavailable] = useState<string | null>(null);
  const [stableChain, setStableChain] = useState<StableChain>('ethereum');
  const [query, setQuery] = useState('');
  const [who, setWho] = useState('');
  const [picked, setPicked] = useState('');
  const [amount, setAmount] = useState('0');
  const [flags, setFlags] = useState([false, false, false, false]);
  const tokenBase = TOKENS.find((item) => item.id === tokenId)
    ?? (tokenId === 'sol'
      ? { id: 'sol', name: 'Solana', amount: '0.00 SOL', fiat: '$0.00', symbol: 'SOL', hidden: false, home: 0, vault: '' }
      : TOKENS[0]);
  const token = live?.app && tokenBase.id === 'arx' && net === 'testnet'
    ? { ...tokenBase, symbol: 'tARX' }
    : tokenBase;
  const leave = () => {
    if (back) {
      back();
      return;
    }
    go(live?.app && net === 'testnet' ? 'testnet' : 'home-funded', false);
  };
  const vaulted = id === 'send-amount-vault';
  const liveQty = live?.app ? liveTokenQty(live, net, token.id) : null;
  const stableMainnet = !!live?.app && net !== 'testnet' && (token.id === 'usdt' || token.id === 'usdc');
  const available = live?.app && token.id === 'btc'
    ? live.btcBalance
    : live?.app && token.id === 'sol'
      ? live.solBalance
      : stableMainnet && stableChain === 'solana'
        ? (token.id === 'usdt' ? live.solUsdt : live.solUsdc)
        : liveQty != null
          ? liveQty
          : vaulted && token.id === 'arx' ? 1400 : id === 'send-amount' && token.id === 'arx' ? 0 : token.home;
  const paymentFlags: PrivacyFlags = {
    hideSender: flags[0],
    hideReceiver: flags[1],
    hideAmount: flags[2],
    hideBalance: flags[3],
  };
  const networkLabel = !live?.app
    ? 'Arxon'
    : net === 'testnet'
      ? 'Arxon Testnet'
      : token.id === 'btc'
        ? 'Bitcoin'
        : token.id === 'sol' || (stableMainnet && stableChain === 'solana')
          ? 'Solana'
          : 'Ethereum';
  const feeLabel = live?.app ? 'Set by the network' : token.id === 'arx' ? `0.0004 ${token.symbol}` : `0 ${token.symbol}`;
  const privSend = false;
  function chooseChain(next: StableChain) {
    setStableChain(next);
    const dest = (picked || who).trim();
    if (dest && !isLiveSendDest(dest, net === 'testnet', { symbol: token.symbol, chain: next })) {
      setWho('');
      setPicked('');
    }
  }
  const dest = (picked || who).trim();
  const shownTo = live?.app ? dest : picked || 'arx1q8x4…t7c2n4p';
  const numeric = Number(amount);
  const overBalance = Number.isFinite(numeric) && numeric > available + 1e-9;
  const readyAmount = Number.isFinite(numeric) && numeric > 0 && !overBalance;
  const shownAmount = readyAmount ? formatAmount(numeric) : live?.app ? '0.00' : '25.00';
  const stableSend = token.id === 'usdt' || token.id === 'usdc';
  const unitUsd = live?.app ? (live.usdOf(token.symbol) || liveTokenUsd(live, net, token.id)) : rate(token) || (token.id === 'arx' ? 0.42 : 0);
  const fiat = (readyAmount || overBalance ? numeric : live?.app ? 0 : 25) * unitUsd;
  const priceLabel = !stableSend && unitUsd > 0 ? (live?.money(fiat) ?? `$${fiat.toFixed(2)}`) : '';

  return (
    <div style={{ position: 'relative', width: 390, height: 844, background: id === 'send-qr' ? '#0a0f17' : '#050505', overflow: 'hidden', fontFamily: font.sans, color: '#fff' }}>
      <style>{`.send-input::placeholder{color:#8b9097}${live?.app ? FROST_PLACEHOLDER_CSS : ''}`}</style>
      <Status />
      {id === 'send-token' && (
        <PickToken
          query={query}
          setQuery={setQuery}
          tokenId={tokenId}
          note={unavailable}
          onPick={(next) => {
            setUnavailable(null);
            setTokenId(next);
            setStableChain('ethereum');
            setAmount('0');
            go('send-who');
          }}
          leave={leave}
          go={go}
        />
      )}
      {id === 'send-who' && (
        <PickWho
          query={who}
          setQuery={setWho}
          picked={picked}
          symbol={token.symbol}
          chain={stableChain}
          showChain={stableMainnet}
          onChain={chooseChain}
          onPick={(address) => { setPicked(address); setWho(address); }}
          go={go}
          leave={leave}
        />
      )}
      {(id === 'send-amount' || id === 'send-amount-vault') && (
        <Amount
          token={token}
          who={picked || who}
          amount={amount}
          available={available}
          vaulted={vaulted}
          flags={flags}
          onFlag={(index) => setFlags((prev) => prev.map((on, i) => (i === index ? !on : on)))}
          onKey={(key) => setAmount((prev) => punch(prev, key))}
          onMax={() => setAmount(rawNum(Math.max(0, live?.app ? available : available - (token.id === 'arx' ? 0.0004 : 0))))}
          onPaste={(text) => setWho(text)}
          ready={readyAmount}
          priceLabel={priceLabel}
          showChain={stableMainnet}
          chain={stableChain}
          onChain={chooseChain}
          go={go}
          leave={leave}
        />
      )}
      {id === 'send-review' && (
        <Review token={token} to={shownTo} amount={shownAmount} priceLabel={priceLabel} available={available} priv={privSend} flags={paymentFlags} networkLabel={networkLabel} feeLabel={feeLabel} chain={stableChain} go={go} leave={leave} />
      )}
      {id === 'send-success' && <Success amount={shownAmount} symbol={token.symbol} privateSend={privSend} to={shownTo} feeLabel={feeLabel} go={go} />}
      {id === 'send-privacy' && <Privacy flags={flags} setFlags={setFlags} go={go} leave={leave} />}
      {id === 'send-failed' && <Failed to={shownTo} amount={shownAmount} symbol={token.symbol} go={go} />}
      {id === 'send-qr' && <Scan go={go} leave={leave} onRead={(addr) => { setPicked(addr); setWho(addr); go('send-who'); }} />}
      <HomeBar />
    </div>
  );
}

function PickToken({ query, setQuery, tokenId, note, onPick, leave, go }: { query: string; setQuery: (v: string) => void; tokenId: string; note?: string | null; onPick: (id: string) => void; leave: () => void; go: Go }) {
  const live = useLiveFrame();
  const net = useWalletNetwork();
  const q = query.trim().toLowerCase();
  const liveRows = live?.app ? (net === 'testnet' ? live.testnetTokens : live.tokens) : null;
  const mapped = liveRows
    ? liveRows.map((row) => ({
        id: row.icon === 'arx' ? 'arx' : row.icon,
        name: row.name,
        amount: row.amount,
        fiat: row.value,
        symbol: row.symbol || row.name,
        hidden: false,
        home: 0,
        vault: '',
      }))
    : TOKENS;
  const rows = mapped.filter((token) => !q || token.name.toLowerCase().includes(q) || token.symbol.toLowerCase().includes(q));
  const emptyCopy = net === 'testnet' ? 'Add Arxon Testnet first. Tokens stay hidden until chain 7171 is on.' : 'Add an asset, then try send again.';
  const tokenRows = rows.length === 0 ? (
    <div style={{ padding: '28px 18px', textAlign: 'center' }}>
      <p style={{ margin: 0, fontSize: 15, fontWeight: 600 }}>No tokens on this network</p>
      <p style={{ margin: '8px 0 16px', fontSize: 13, color: '#8b9097', lineHeight: 1.4 }}>{emptyCopy}</p>
      <button
        type="button"
        onClick={() => (net === 'testnet' ? go('add-network') : leave())}
        style={{ minHeight: 44, padding: '0 18px', border: 'none', borderRadius: 8, background: '#accafe', color: '#0c1018', fontFamily: font.sans, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}
      >
        {net === 'testnet' ? 'Add Arxon Testnet' : 'Back'}
      </button>
    </div>
  ) : rows.map((token, index) => (
    <button key={token.id} type="button" onClick={() => onPick(token.id)} style={{ ...rowBtn, height: 76, borderTop: index ? '1px solid #2a3447' : 'none' }}>
      <TokenMark id={token.id} />
      <span style={{ flex: 1, textAlign: 'left' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 16, fontWeight: 600 }}>{token.name}</span>
          {token.hidden && <span style={hiddenTag}><FigmaImg src={art('hidden.svg')} width={12} height={12} />Hidden</span>}
        </span>
        <span style={{ display: 'block', marginTop: 2, fontSize: 13, color: '#8b9097' }}>{token.amount}</span>
      </span>
      <span style={{ fontSize: 15, fontWeight: 600 }}>{token.fiat}</span>
      {token.id === tokenId && <span style={checkBubble}><FigmaImg src={art('check.svg')} width={16} height={16} /></span>}
    </button>
  ));
  const privacyNote = (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
      <span style={{ flexShrink: 0, width: 16, height: 16, marginTop: 1 }}>
        <FigmaImg src={art('lock.svg')} width={16} height={16} />
      </span>
      <p style={{ margin: 0, flex: 1, minWidth: 0, fontSize: 12, color: '#8b9097', lineHeight: 1.35 }}>
        {net === 'testnet'
          ? 'Private pay on Testnet uses a shielded key. A normal 0x send stays public.'
          : 'Only Arxon supports private transfers. Other tokens are sent publicly.'}
      </p>
    </div>
  );

  if (live?.app) {
    return (
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', paddingTop: 'env(safe-area-inset-top, 0px)' }}>
        <div style={{ flex: '0 0 auto', padding: '4px 16px 0' }}>
          <LiveHead title="Select token" onBack={leave} />
          <label style={{ ...frostField, height: 52, padding: '0 15px' }}>
            <FigmaImg src={art('search.svg')} width={20} height={20} style={frostIcon} />
            <input className="send-input frost-input" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search tokens" aria-label="Search tokens" style={frostInput} />
          </label>
          <p style={{ margin: '16px 8px 8px', fontSize: 12, fontWeight: 600, color: '#8b9097' }}>YOUR TOKENS</p>
        </div>
        <div className="arxon-token-scroll" style={{ flex: 1, minHeight: 0, overflowY: 'auto', WebkitOverflowScrolling: 'touch', padding: '0 16px 24px' }}>
          <div style={{ overflow: 'hidden', ...sheetGlass, borderRadius: 22 }}>
            <CardLoad kind="rows" n={5} h={76}>{tokenRows}</CardLoad>
          </div>
          <div style={{ marginTop: 12 }}>
            <HintCard
              body={net === 'testnet'
                ? 'Private pay on Testnet uses a shielded key. A normal 0x send stays public.'
                : 'Only Arxon supports private transfers. Other tokens are sent publicly.'}
              icon={<FigmaImg src={art('lock.svg')} width={14} height={14} />}
            />
          </div>
          {note ? <p role="alert" style={{ margin: '10px 0 0', fontSize: 13, color: '#fabf33', lineHeight: 1.35 }}>{note}</p> : null}
        </div>
      </div>
    );
  }

  return (
    <>
      <Back top={52} left={16} icon="back" onClick={leave} />
      <Title top={61.5} size={17} weight={600}>Select token</Title>
      <label style={{ ...search, top: 108 }}>
        <FigmaImg src={art('search.svg')} width={20} height={20} />
        <input className="send-input" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search tokens" aria-label="Search tokens" style={input} />
      </label>
      <p style={kicker(184)}>YOUR TOKENS</p>
      <div style={{ position: 'absolute', left: 16, top: 208, width: 358, overflow: 'hidden', background: '#1c2025', border: '1px solid #2a3447', borderRadius: 14 }}>
        {tokenRows}
      </div>
      <div style={{ position: 'absolute', left: 16, top: 604, width: 358, display: 'flex', alignItems: 'flex-start', gap: 8 }}>
        <span style={{ flexShrink: 0, width: 16, height: 16, marginTop: 1 }}>
          <FigmaImg src={art('lock.svg')} width={16} height={16} />
        </span>
        <p style={{ margin: 0, flex: 1, minWidth: 0, fontSize: 12, color: '#8b9097', lineHeight: 1.35 }}>Only Arxon supports private transfers. Other tokens are sent publicly.</p>
      </div>
      {note ? <p role="alert" style={{ position: 'absolute', left: 16, top: 650, width: 358, margin: 0, fontSize: 13, color: '#fabf33', lineHeight: 1.35 }}>{note}</p> : null}
    </>
  );
}

function PickWho({ query, setQuery, picked, symbol, chain, showChain, onChain, onPick, go, leave }: {
  query: string; setQuery: (v: string) => void; picked: string; symbol: string; chain: StableChain; showChain: boolean; onChain: (chain: StableChain) => void; onPick: (address: string) => void; go: Go; leave: () => void;
}) {
  const live = useLiveFrame();
  const net = useWalletNetwork();
  const fieldRef = useRef<HTMLInputElement>(null);
  const q = query.trim().toLowerCase();
  const sample = !live?.app;
  const accounts = sample ? PEOPLE.filter((person) => person.group === 'account' && (!q || person.name.toLowerCase().includes(q) || person.sub.toLowerCase().includes(q))) : [];
  const recent = sample ? PEOPLE.filter((person) => person.group === 'recent' && (!q || person.name.toLowerCase().includes(q) || person.sub.toLowerCase().includes(q))) : [];
  const dest = (picked || query).trim();
  const ready = live?.app ? isLiveSendDest(dest, net === 'testnet', { symbol, chain }) : dest.length > 0;
  const hint = symbol.toUpperCase() === 'BTC'
    ? 'Paste a Bitcoin address. It usually starts with bc1.'
    : symbol.toUpperCase() === 'SOL' || (showChain && chain === 'solana')
      ? 'Paste a Solana address.'
      : `Paste a 0x address${net === 'testnet' ? ' or shielded key' : ''}.`;

  if (live?.app) {
    return (
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', paddingTop: 'env(safe-area-inset-top, 0px)' }}>
        <div style={{ flex: '0 0 auto', padding: '4px 16px 0' }}>
          <LiveHead title="Send to" onBack={leave} />
          <label style={{ ...frostField, height: 52, padding: '0 15px' }}>
            <FigmaImg src={art('search.svg')} width={20} height={20} style={frostIcon} />
            <input ref={fieldRef} className="send-input frost-input" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Address or name" aria-label="Address or name" style={frostInput} />
            <button type="button" aria-label="Scan" onClick={() => go('send-qr')} style={iconBtn}><FigmaImg src={art('scan.svg')} width={20} height={20} style={frostIcon} /></button>
          </label>
          <button
            type="button"
            onPointerDown={onPasteTap((text) => { setQuery(text.trim()); onPick(text.trim()); }, fieldRef)}
            style={{ ...pasteBtn, position: 'relative', left: 0, top: 0, width: '100%', marginTop: 10 }}
          >
            Paste from clipboard
          </button>
          {showChain ? <ChainPick chain={chain} onChain={onChain} /> : null}
          <div style={{ marginTop: 12 }}>
            <HintCard body={hint} icon={<FigmaImg src={art('lock.svg')} width={14} height={14} />} />
          </div>
        </div>
        <div style={{ flex: 1 }} />
        <div style={{ flex: '0 0 auto', padding: '12px 16px 16px' }}>
          <button type="button" disabled={!ready} onClick={() => go('send-amount')} style={{ ...livePrimary, opacity: ready ? 1 : 0.4 }}>Continue</button>
        </div>
      </div>
    );
  }

  return (
    <>
      <Back top={52} left={16} icon="back" onClick={leave} />
      <Title top={61.5} size={17} weight={600}>Send to</Title>
      <label style={{ ...search, top: 108 }}>
        <FigmaImg src={art('search.svg')} width={20} height={20} />
        <input ref={fieldRef} className="send-input" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Address or name" aria-label="Address or name" style={input} />
        <button type="button" aria-label="Scan" onClick={() => go('send-qr')} style={iconBtn}><FigmaImg src={art('scan.svg')} width={20} height={20} /></button>
      </label>
      <button type="button" onPointerDown={onPasteTap((text) => { setQuery(text.trim()); onPick(text.trim()); }, fieldRef)} style={pasteBtn}>Paste from clipboard</button>
      {accounts.length > 0 && <p style={kicker(240)}>MY ACCOUNTS</p>}
      {accounts.map((person) => (
        <button key={person.name} type="button" onClick={() => onPick(person.address)} style={{ ...cardBtn, top: 264, height: 72 }}>
          <Letter letter={person.letter} color={person.color} />
          <span style={{ flex: 1, textAlign: 'left' }}>
            <span style={{ display: 'block', fontSize: 15, fontWeight: 600 }}>{person.name}</span>
            <span style={{ display: 'block', marginTop: 2, fontSize: 13, color: '#8b9097' }}>{person.sub}</span>
          </span>
          <FigmaImg src={art('chev-right.svg')} width={20} height={20} />
        </button>
      ))}
      {recent.length > 0 && <p style={kicker(360)}>RECENT</p>}
      {recent.length > 0 && (
        <div style={{ position: 'absolute', left: 16, top: 384, width: 358, background: '#1c2025', border: '1px solid #2a3447', borderRadius: 14, overflow: 'hidden' }}>
          {recent.map((person, index) => (
            <button key={person.name} type="button" onClick={() => onPick(person.address)} style={{ ...rowBtn, height: 72, borderTop: index ? '1px solid #2a3447' : 'none' }}>
              <Letter letter={person.letter} color={person.color} />
              <span style={{ textAlign: 'left' }}>
                <span style={{ display: 'block', fontSize: 15, fontWeight: 600 }}>{person.name}</span>
                <span style={{ display: 'block', marginTop: 2, fontSize: 13, color: '#8b9097' }}>{person.sub}</span>
              </span>
            </button>
          ))}
        </div>
      )}
      {showChain ? <ChainPick chain={chain} onChain={onChain} top={228} /> : null}
      <button type="button" disabled={!ready} onClick={() => go('send-amount')} style={{ ...primary, top: 744, opacity: ready ? 1 : 0.4 }}>Continue</button>
    </>
  );
}

function Amount({ token, who, amount, available, vaulted, flags, onFlag, onKey, onMax, onPaste, ready, priceLabel, showChain, chain, onChain, go, leave }: {
  token: (typeof TOKENS)[number]; who: string; amount: string; available: number; vaulted: boolean; flags: boolean[]; onFlag: (index: number) => void;
  onKey: (key: string) => void; onMax: () => void; onPaste: (text: string) => void; ready: boolean; priceLabel: string;
  showChain: boolean; chain: StableChain; onChain: (chain: StableChain) => void; go: Go; leave: () => void;
}) {
  const live = useLiveFrame();
  const net = useWalletNetwork();
  const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0', '⌫'];
  const typed = Number(String(amount).replace(/,/g, ''));
  const over = Number.isFinite(typed) && typed > available + 1e-9;
  const canReview = ready && !over;
  const privacy = false;
  const privacyTop = vaulted ? 412 : 364;
  const keysTop = privacy ? privacyTop + 150 : vaulted ? 486 : 452;
  const choices = [
    ['Sender', 'Hide who pays'],
    ['Receiver', 'Hide who receives'],
    ['Amount', 'Hide how much'],
  ];
  const pull = usePullRefresh(() => live?.refresh?.());
  if (live?.app) {
    return (
      <div data-amount-entry style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden', paddingTop: 'env(safe-area-inset-top, 0px)' }}>
        <div style={{ flex: '0 0 auto', padding: '4px 18px 0' }}>
          <LiveHead title={`Send ${token.symbol}`} onBack={leave} />
        </div>
        <div
          style={{ flex: 1, minHeight: 0, overflowY: 'auto', WebkitOverflowScrolling: 'touch' }}
          onTouchStart={pull.onTouchStart}
          onTouchMove={pull.onTouchMove}
          onTouchEnd={pull.onTouchEnd}
        >
          <div style={{ minHeight: '100%', display: 'flex', flexDirection: 'column', padding: '0 18px 8px', boxSizing: 'border-box' }}>
            <PullHint pull={pull.pull} busy={pull.busy} />
            <div style={{ ...frostField, height: 52, padding: '0 8px 0 14px' }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: '#5c6578' }}>To</span>
              <span style={{ flex: 1, fontSize: 14, fontWeight: 600, color: who ? '#0c1018' : '#7a8294', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{who ? briefAddr(who) : 'Address or Arxon name'}</span>
              <button type="button" aria-label="Paste" onPointerDown={onPasteTap((text) => onPaste(text.trim()))} style={iconBtn}><FigmaImg src={art('paste.svg')} width={20} height={20} style={frostIcon} /></button>
              <button type="button" aria-label="Scan" onClick={() => go('send-qr')} style={iconBtn}><FigmaImg src={art('scan-sm.svg')} width={20} height={20} style={frostIcon} /></button>
            </div>
            {showChain ? <ChainPick chain={chain} onChain={onChain} /> : null}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', minHeight: 148 }}>
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'flex-end', gap: 8 }}>
                <span style={{ fontSize: 44, fontWeight: 700, lineHeight: 1, color: over ? '#f25252' : '#fff' }}>{showAmount(amount)}</span>
                <span style={{ fontSize: 18, fontWeight: 500, color: '#accafe', marginBottom: 4 }}>{token.symbol}</span>
              </div>
              {priceLabel ? <p style={{ margin: '8px 0 0', textAlign: 'center', fontSize: 14, color: '#8b9097' }}>≈ {priceLabel}</p> : null}
              {over ? <p style={{ margin: '8px 0 0', textAlign: 'center', fontSize: 13, color: '#f25252' }}>Not enough {token.symbol}</p> : null}
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 10, marginTop: 12 }}>
                <span style={{ ...frostAvail, color: over ? '#f25252' : '#0c1018' }}>Available {showAvail(available)} {token.symbol}</span>
                <button type="button" onClick={onMax} style={{ ...chip, height: 36, minHeight: 36, padding: '0 14px', background: '#3d6dff', color: '#fff', fontWeight: 700, border: 'none', cursor: 'pointer', fontFamily: font.sans, borderRadius: 12 }}>Max</button>
              </div>
            </div>
            {vaulted && token.vault ? (
              <p style={{ margin: '12px 0 0', textAlign: 'center', fontSize: 12, color: '#8b9097' }}>
                {token.vault} in your Vault is sent from the Vault.{' '}
                <button type="button" onClick={() => go('vault-send-options')} style={{ border: 'none', background: 'none', color: '#accafe', fontFamily: font.sans, fontSize: 12, fontWeight: 600, cursor: 'pointer', padding: 0 }}>Send from Vault</button>
              </p>
            ) : null}
            {privacy ? (
              <div style={{ marginTop: 12, background: '#1c2025', borderRadius: 14, overflow: 'hidden' }}>
                {choices.map(([title, body], index) => (
                  <div key={title} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 14px', borderTop: index ? '1px solid #2a3447' : 'none' }}>
                    <span style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
                      <span style={{ display: 'block', fontSize: 14, fontWeight: 600 }}>{title}</span>
                      <span style={{ display: 'block', marginTop: 1, fontSize: 12, color: '#8b9097' }}>{body}</span>
                    </span>
                    <button type="button" aria-label={title} aria-pressed={flags[index]} onClick={() => onFlag(index)} style={{ ...iconBtn, width: 44, height: 44 }}>
                      <img src={art(flags[index] ? 'toggle-on.svg' : 'toggle-off.svg')} alt="" width={46} height={28} style={{ width: 46, height: 28, objectFit: 'contain', display: 'block' }} />
                    </button>
                  </div>
                ))}
              </div>
            ) : null}
            <div style={{ display: 'flex', flexWrap: 'wrap', marginTop: 4 }}>
              {keys.map((key) => (
                <button key={key} type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => onKey(key)} style={{ ...keyBtn, width: '33.33%', height: 44 }}>
                  {key === '⌫' ? <FigmaImg src={art('backspace.svg')} width={24} height={24} /> : key}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div style={{ flex: '0 0 auto', padding: '8px 18px 16px' }}>
          <button type="button" disabled={!canReview} onClick={() => { if (canReview) go('send-review'); }} style={{ ...livePrimary, background: canReview ? '#accafe' : '#1c2025', color: canReview ? '#0c1018' : '#5c5f64' }}>Review</button>
        </div>
      </div>
    );
  }
  return (
    <>
      <Back top={56} left={18} icon="chev" onClick={leave} />
      <Title top={65.5} size={17} weight={700}>Send {token.symbol}</Title>
      <div style={{ position: 'absolute', left: 18, top: 118, width: 354, height: 56, boxSizing: 'border-box', background: '#1c2025', borderRadius: 14, display: 'flex', alignItems: 'center', gap: 10, padding: '0 14px 0 16px' }}>
        <span style={{ fontSize: 14, fontWeight: 500, color: '#8b9097' }}>To</span>
        <span style={{ flex: 1, fontSize: 15, color: who ? '#fff' : '#5c5f64', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{who ? briefAddr(who) : 'Address or Arxon name'}</span>
        <button type="button" aria-label="Paste" onPointerDown={onPasteTap((text) => onPaste(text.trim()))} style={iconBtn}><FigmaImg src={art('paste.svg')} width={20} height={20} /></button>
        <button type="button" aria-label="Scan" onClick={() => go('send-qr')} style={iconBtn}><FigmaImg src={art('scan-sm.svg')} width={20} height={20} /></button>
      </div>
      <div style={{ position: 'absolute', left: 0, top: 196, width: 390, display: 'flex', justifyContent: 'center', alignItems: 'flex-end', gap: 8 }}>
        <span style={{ fontSize: 64, fontWeight: 700, lineHeight: 1, color: over ? '#f25252' : '#fff' }}>{showAmount(amount)}</span>
        <span style={{ fontSize: 20, fontWeight: 500, color: '#accafe', marginBottom: 8 }}>{token.symbol}</span>
      </div>
      {priceLabel ? <p style={{ position: 'absolute', left: 0, top: 282, width: 390, margin: 0, textAlign: 'center', fontSize: 15, color: '#8b9097' }}>≈ {priceLabel}</p> : null}
      {over ? <p style={{ position: 'absolute', left: 18, top: 304, width: 354, margin: 0, textAlign: 'center', fontSize: 13, color: '#f25252' }}>Not enough {token.symbol}</p> : null}
      <div style={{ position: 'absolute', top: 318, left: 0, width: 390, display: 'flex', justifyContent: 'center', gap: 10 }}>
        <span style={chip}>Available {showAvail(available)} {token.symbol}</span>
        <button type="button" onClick={onMax} style={{ ...chip, background: '#2a3447', color: '#accafe', fontWeight: 600, border: 'none', cursor: 'pointer', fontFamily: font.sans }}>Max</button>
      </div>
      {vaulted && token.vault && (
        <p style={{ position: 'absolute', left: 18, top: 364, width: 354, margin: 0, textAlign: 'center', fontSize: 12, color: '#8b9097' }}>
          {token.vault} in your Vault is sent from the Vault.{' '}
          <button type="button" onClick={() => go('vault-send-options')} style={{ border: 'none', background: 'none', color: '#accafe', fontFamily: font.sans, fontSize: 12, fontWeight: 600, cursor: 'pointer', padding: 0 }}>Send from Vault</button>
        </p>
      )}
      {privacy && (
        <div style={{ position: 'absolute', left: 18, top: privacyTop, width: 354, background: '#1c2025', borderRadius: 14, overflow: 'hidden' }}>
          {choices.map(([title, body], index) => (
            <div key={title} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 14px', borderTop: index ? '1px solid #2a3447' : 'none' }}>
              <span style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
                <span style={{ display: 'block', fontSize: 14, fontWeight: 600 }}>{title}</span>
                <span style={{ display: 'block', marginTop: 1, fontSize: 12, color: '#8b9097' }}>{body}</span>
              </span>
              <button type="button" aria-label={title} aria-pressed={flags[index]} onClick={() => onFlag(index)} style={iconBtn}>
                <img src={art(flags[index] ? 'toggle-on.svg' : 'toggle-off.svg')} alt="" width={46} height={28} style={{ width: 46, height: 28, objectFit: 'contain', display: 'block' }} />
              </button>
            </div>
          ))}
        </div>
      )}
      <div style={{ position: 'absolute', left: 18, top: keysTop, width: 354, display: 'flex', flexWrap: 'wrap' }}>
        {keys.map((key) => (
          <button key={key} type="button" onClick={() => onKey(key)} style={{ ...keyBtn, height: privacy ? 44 : 52 }}>
            {key === '⌫' ? <FigmaImg src={art('backspace.svg')} width={24} height={24} /> : key}
          </button>
        ))}
      </div>
      <button type="button" disabled={!canReview} onClick={() => { if (canReview) go('send-review'); }} style={{ ...reviewBtn, top: 720, background: canReview ? '#accafe' : '#1c2025', color: canReview ? '#0c1018' : '#5c5f64' }}>Review</button>
    </>
  );
}

function Review({ token, to, amount, priceLabel, available, priv, flags, networkLabel, feeLabel, chain, go, leave }: {
  token: (typeof TOKENS)[number]; to: string; amount: string; priceLabel: string; available: number; priv: boolean; flags: PrivacyFlags; networkLabel: string; feeLabel: string; chain: StableChain; go: Go; leave: () => void;
}) {
  const live = useLiveFrame();
  const net = useWalletNetwork();
  const [err, setErr] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState<string | null>(null);
  const alive = useRef(true);
  useEffect(() => () => { alive.current = false; }, []);
  useEffect(() => { void warmProver(); }, []);
  const flightHere = live?.flight;
  const quoted = useLiveFee({ amount, to, symbol: token.symbol, testnet: net === 'testnet', chain });
  const pull = usePullRefresh(async () => {
    await live?.refresh?.();
    quoted.requote();
  });
  const total = live?.app
    ? quoted.totalLabel
    : `${(Number(amount.replace(/,/g, '')) + (token.id === 'arx' ? 0.0004 : 0)).toLocaleString('en-US', { minimumFractionDigits: 4, maximumFractionDigits: 4 })} ${token.symbol}`;
  const showPrivacy = false;
  const privacyRows: [string, string, string?][] = [
    ['Sender', flags.hideSender ? 'Hidden' : 'Visible', flags.hideSender ? '#accafe' : '#fff'],
    ['Receiver', flags.hideReceiver ? 'Hidden' : 'Visible', flags.hideReceiver ? '#accafe' : '#fff'],
    ['Amount', flags.hideAmount ? 'Hidden' : 'Visible', flags.hideAmount ? '#accafe' : '#fff'],
  ];
  const fromLabel = (live?.accountLabel || 'Account 01').replace(/^Account\s+/i, 'Acc ');
  const sendQty = Number(String(amount).replace(/,/g, ''));
  const over = !!live?.app && Number.isFinite(sendQty) && sendQty > available + 1e-9;
  const feeWait = !!live?.app && quoted.busy;
  const shownFee = live?.app ? quoted.feeLabel : feeLabel;
  const [feeWarn, setFeeWarn] = useState<string | null>(over ? `Not enough ${token.symbol}` : null);
  useEffect(() => {
    setFeeWarn(over ? `Not enough ${token.symbol}` : null);
  }, [over, token.symbol]);
  function confirm() {
    if (!live?.app) {
      go('send-success');
      return;
    }
    if (submitted || feeWait) return;
    if (over || feeWarn) {
      setErr(feeWarn || `Not enough ${token.symbol}`);
      return;
    }
    if (live.app && !isLiveSendDest(to, net === 'testnet', { symbol: token.symbol, chain })) {
      const symbol = token.symbol.toUpperCase();
      setErr(symbol === 'BTC' ? 'Enter a Bitcoin address.' : symbol === 'SOL' || chain === 'solana' ? 'Enter a Solana address.' : net === 'testnet' ? 'Enter a 0x address or shielded destination.' : 'Enter a 0x address.');
      return;
    }
    setErr(null);
    const testnet = net === 'testnet';
    go('send-success');
    void live.send(token.symbol, to, amount.replace(/,/g, ''), testnet, 'home', undefined, chain).catch((e) => {
      if (!alive.current) return;
      if (e instanceof PendingTxError) {
        setSubmitted(e.hash);
        return;
      }
      if (isTxCancelled(e)) {
        live?.clearFlight();
        return;
      }
      const msg = plainTxError(e);
      go('send-failed');
      setErr(msg);
    });
  }
  const rawErr = err || feeWarn || (flightHere?.phase === 'error' ? flightHere.detail ?? null : null);
  const shownErr = rawErr && !isTxCancelled(rawErr) ? plainTxError(rawErr) : null;
  return (
    <>
      <Back top={56} left={18} icon="chev" onClick={leave} />
      <Title top={65.5} size={17} weight={700}>Review</Title>
      <div
        className="arxon-token-scroll"
        style={{ position: 'absolute', left: 0, top: 108, bottom: 0, width: 390, overflowY: 'auto', WebkitOverflowScrolling: 'touch', touchAction: 'pan-y', boxSizing: 'border-box', padding: '8px 18px 28px' }}
        onTouchStart={live?.app ? pull.onTouchStart : undefined}
        onTouchMove={live?.app ? pull.onTouchMove : undefined}
        onTouchEnd={live?.app ? pull.onTouchEnd : undefined}
      >
        {live?.app ? <PullHint pull={pull.pull} busy={pull.busy} /> : null}
        <div style={{ textAlign: 'left' }}>
          <p style={{ margin: 0, fontSize: 14, color: '#8b9097' }}>You are sending</p>
          <p style={{ margin: '6px 0 0', fontSize: 40, fontWeight: 700 }}>{amount} {token.symbol}</p>
          {priceLabel ? <p style={{ margin: '6px 0 0', fontSize: 15, color: '#8b9097' }}>≈ {priceLabel}</p> : null}
        </div>
        <CardLoad extra={quoted.busy || pull.busy} kind="frost" h={148}>
        <div style={{ marginTop: 16, boxSizing: 'border-box', padding: live?.app ? '8px 14px' : '8px 16px', ...(live?.app ? frostPanel : { background: '#1c2025', borderRadius: 16, border: '1px solid #2a3447' }) }}>
          {live?.app ? (
            <>
              <FrostLine label="From" value={fromLabel} />
              <FrostLine label="To" value={briefAddr(to)} />
              <FrostLine label="Amount" value={`${amount} ${token.symbol}`} />
              <FrostLine label="Network fee" value={shownFee} />
              <FrostLine label="Total" value={total} />
            </>
          ) : (
            <>
              <CenterLine label="To" value={briefAddr(to)} />
              <CenterLine label="From" value={fromLabel} />
              <CenterLine label="Network" value={networkLabel} />
              {showPrivacy && privacyRows.map(([label, value, color]) => (
                <CenterLine key={label} label={label} value={value} color={color} />
              ))}
              <CenterLine label="Network fee" value={shownFee} />
              <CenterLine label="Total" value={total} />
            </>
          )}
        </div>
        </CardLoad>
        {priv && token.id === 'arx' ? <p style={{ margin: '12px 0 0', fontSize: 12, color: '#8b9097', lineHeight: 1.4, textAlign: 'left' }}>Hidden fields stay off the public record. This can’t be undone once confirmed.</p> : null}
        {shownErr ? <p style={{ margin: '12px 0 0', fontSize: 12, color: submitted || flightHere?.phase === 'done' ? '#accafe' : '#f25252', lineHeight: 1.35 }}>{shownErr}</p> : null}
        <div style={{ marginTop: 16 }}>
          <SwipeConfirm label={submitted ? 'Submitted' : 'Confirm and send'} disabled={!!submitted || feeWait || !!feeWarn || over} onConfirm={() => confirm()} />
        </div>
        <button type="button" onClick={() => { live?.clearFlight(); leave(); }} style={{ ...ghost, position: 'relative', left: 0, top: 0, width: '100%', marginTop: 10 }}>Cancel</button>
      </div>
    </>
  );
}

function Success({ amount, symbol, privateSend, to, feeLabel, go }: { amount: string; symbol: string; privateSend: boolean; to: string; feeLabel: string; go: Go }) {
  const live = useLiveFrame();
  const going = !!live?.app && live.flight?.phase === 'processing';
  const failed = !!live?.app && live.flight?.phase === 'error';
  useEffect(() => {
    if (!failed) return;
    if (isTxCancelled(live?.flight?.detail)) {
      live?.clearFlight();
      go('send-review');
      return;
    }
    go('send-failed');
  }, [failed, go, live]);
  if (live?.app) {
    const title = going ? 'Sending' : privateSend ? 'Sent privately' : 'Sent';
    const status = going ? 'Going through' : 'Sent';
    const statusColor = going ? '#accafe' : '#3ddc84';
    return (
      <LiveScroll>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: 48 }}>
          <div style={{ width: 96, height: 96, borderRadius: 48, background: '#accafe', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <FigmaImg src={art('check-lg.svg')} width={44} height={44} />
          </div>
          <p style={{ margin: '28px 0 0', textAlign: 'center', fontSize: 26, fontWeight: 700 }}>{title}</p>
          <p style={{ margin: '8px 0 0', textAlign: 'center', fontSize: 32, fontWeight: 700, color: '#accafe' }}>{amount} {symbol}</p>
        </div>
        <div style={{ marginTop: 24, boxSizing: 'border-box', background: '#1c2025', borderRadius: 16, padding: '8px 16px' }}>
          <Line label="To" value={briefAddr(to)} />
          <Line label="Network fee" value={feeLabel} />
          <Line label="Status" value={status} valueColor={statusColor} />
          {going ? null : <Line label="Credit" value={recipientCreditedInCopy(etaSecondsLabel())} />}
        </div>
        <button type="button" onClick={() => go('home-funded')} style={{ ...livePrimary, marginTop: 24 }}>Done</button>
        {privateSend && !going ? <button type="button" onClick={() => go('receipt')} style={{ ...liveGhost, marginTop: 10 }}>View private receipt</button> : null}
      </LiveScroll>
    );
  }
  return (
    <>
      <img src={art('glow.svg')} alt="" width={168} height={168} style={{ position: 'absolute', left: 111, top: 130 }} />
      <img src={art('ring.svg')} alt="" width={132} height={132} style={{ position: 'absolute', left: 129, top: 148 }} />
      <div style={{ position: 'absolute', left: 147, top: 166, width: 96, height: 96, borderRadius: 48, background: '#accafe', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <FigmaImg src={art('check-lg.svg')} width={44} height={44} />
      </div>
      <p style={{ position: 'absolute', left: 35, top: 334, width: 320, margin: 0, textAlign: 'center', fontSize: 26, fontWeight: 700 }}>{privateSend ? 'Sent privately' : 'Sent'}</p>
      <p style={{ position: 'absolute', left: 35, top: 376, width: 320, margin: 0, textAlign: 'center', fontSize: 32, fontWeight: 700, color: '#accafe' }}>{amount} {symbol}</p>
      <div style={{ position: 'absolute', left: 18, top: 440, width: 354, boxSizing: 'border-box', background: '#1c2025', borderRadius: 16, padding: 16 }}>
        <Line label="To" value={briefAddr(to)} />
        <Line label="Network fee" value={feeLabel} />
        <Line label="Status" value="Confirmed" valueColor="#3ddc84" />
      </div>
      <button type="button" onClick={() => go('home-funded')} style={{ ...primary, top: 649, borderRadius: 8, height: 55 }}>Done</button>
      <button type="button" onClick={() => go('receipt')} style={{ ...ghost, top: 714 }}>View private receipt</button>
    </>
  );
}

function Privacy({ flags, setFlags, go, leave }: { flags: boolean[]; setFlags: (v: boolean[]) => void; go: Go; leave: () => void }) {
  const rows = [
    ['Hide sender address', 'Don’t show who the payment is from'],
    ['Hide receiver address', 'Don’t show who receives it'],
    ['Hide amount', 'Don’t show how much is sent'],
    ['Hide my balance', 'Keep my wallet balance off public view'],
  ];
  const seen = ['Sender', 'Receiver', 'Amount', 'Balance'];
  return (
    <>
      <Back top={56} left={18} icon="chev" onClick={leave} />
      <p style={{ position: 'absolute', left: 24, top: 106, margin: 0, fontSize: 30, fontWeight: 700 }}>Payment privacy</p>
      <p style={{ position: 'absolute', left: 24, top: 152, width: 336, margin: 0, fontSize: 15, color: '#8b9097', lineHeight: 1.35 }}>Choose what the public can see about this payment. You can change it every time.</p>
      <div style={{ position: 'absolute', left: 18, top: 210, width: 354, background: '#1c2025', border: '1px solid #2a3447', borderRadius: 14, overflow: 'hidden' }}>
        {rows.map(([title, body], index) => (
          <div key={title}>
            {index > 0 && <div style={{ height: 1, background: '#2a3447', margin: '0 16px' }} />}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px' }}>
              <span style={{ flex: 1 }}>
                <span style={{ display: 'block', fontSize: 15, fontWeight: 600 }}>{title}</span>
                <span style={{ display: 'block', marginTop: 2, fontSize: 13, color: '#8b9097' }}>{body}</span>
              </span>
              <button type="button" aria-label={title} onClick={() => setFlags(flags.map((on, i) => i === index ? !on : on))} style={iconBtn}>
                <FigmaImg src={art(flags[index] ? 'toggle-on-lg.svg' : 'toggle-off.svg')} width={48} height={28} />
              </button>
            </div>
          </div>
        ))}
      </div>
      <p style={kicker(479)}>WHAT THE PUBLIC WILL SEE</p>
      <div style={{ position: 'absolute', left: 18, top: 503, width: 354, boxSizing: 'border-box', background: '#1c2025', border: '1px solid #2a3447', borderRadius: 14, padding: '8px 0' }}>
        {seen.map((label, index) => (
          <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 16px', fontSize: 14 }}>
            <span style={{ color: '#8b9097' }}>{label}</span>
            <span style={{ fontWeight: 500, color: flags[index] ? '#accafe' : '#fff' }}>{flags[index] ? 'Hidden' : 'Visible'}</span>
          </div>
        ))}
      </div>
      <button type="button" onClick={() => go('defaults')} style={{ position: 'absolute', left: 18, top: 665, width: 354, border: 'none', background: 'none', color: '#accafe', fontFamily: font.sans, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>Change my defaults</button>
      <button type="button" onClick={() => go('send-review')} style={{ ...primary, top: 714, borderRadius: 8, height: 55 }}>Apply to this payment</button>
    </>
  );
}

function Failed({ to, amount, symbol, go }: { to: string; amount: string; symbol: string; go: Go }) {
  const live = useLiveFrame();
  const why = live?.flight?.detail && !isTxCancelled(live.flight.detail)
    ? live.flight.detail
    : 'The network rejected this send. No fee was charged.';
  return (
    <FailSheet
      kicker="Send"
      title="Payment failed"
      why={why}
      rows={[
        { label: 'Amount', value: `${amount} ${symbol}` },
        { label: 'To', value: briefAddr(to) },
        { label: 'Status', value: 'Not sent', tone: 'bad' },
      ]}
      primary="Try again"
      secondary="Back to Home"
      onPrimary={() => go('send-review')}
      onSecondary={() => go('home-funded')}
    />
  );
}

function Scan({ go, leave, onRead }: { go: Go; leave: () => void; onRead?: (addr: string) => void }) {
  const live = useLiveFrame();
  const [err, setErr] = useState<string | null>(null);
  const corners: [string, number, number][] = [['corner-tl.svg', 73, 248], ['corner-tr.svg', 273, 248], ['corner-bl.svg', 73, 448], ['corner-br.svg', 273, 448]];
  useEffect(() => {
    if (!live?.app) return;
    let cancel = false;
    void live.scanQr().then((addr) => {
      if (!cancel && addr) onRead?.(addr);
    }).catch((e) => {
      if (!cancel) setErr(e instanceof Error ? e.message : 'Could not scan.');
    });
    return () => {
      cancel = true;
    };
  }, [live?.app]);
  return (
    <>
      {corners.map(([name, left, top]) => <img key={name} src={art(name)} alt="" width={44} height={44} style={{ position: 'absolute', left, top }} />)}
      <Back top={56} left={18} icon="chev" onClick={leave} />
      <p style={{ position: 'absolute', left: 0, top: 64, width: 390, margin: 0, textAlign: 'center', fontSize: 20, fontWeight: 700, pointerEvents: 'none' }}>Scan QR code</p>
      <p style={{ position: 'absolute', left: 55, top: 520, width: 280, margin: 0, textAlign: 'center', fontSize: 15, lineHeight: '22px', color: '#8c8f96' }}>Point your camera at an Arxon address QR code.</p>
      {err ? <p style={{ position: 'absolute', left: 40, top: 580, width: 310, margin: 0, textAlign: 'center', fontSize: 12, color: '#f25252' }}>{err}</p> : null}
      <button type="button" onClick={() => go('send-who')} style={{ position: 'absolute', left: 19, top: 714, width: 353, height: 55, borderRadius: 8, border: '1px solid #2a3447', background: 'transparent', color: '#fff', fontFamily: font.sans, fontSize: 16, fontWeight: 600, cursor: 'pointer' }}>Enter address instead</button>
    </>
  );
}

function TokenMark({ id }: { id: string }) {
  if (id === 'arx') {
    return (
      <span style={{ width: 44, height: 44, borderRadius: 22, background: '#90b9ff', position: 'relative', overflow: 'hidden', flexShrink: 0 }}>
        <span style={{ position: 'absolute', left: 9, top: 11, width: 26.985, height: 20.635, background: '#050505', WebkitMaskImage: `url(${art('arx-mask.png')})`, maskImage: `url(${art('arx-mask.png')})`, WebkitMaskSize: '26.985px 20.635px', maskSize: '26.985px 20.635px', WebkitMaskRepeat: 'no-repeat', maskRepeat: 'no-repeat' }} />
      </span>
    );
  }
  if (id === 'sol') {
    return (
      <span style={{ width: 44, height: 44, borderRadius: 22, background: '#9945ff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: '#fff', fontSize: 14, fontWeight: 700 }}>S</span>
    );
  }
  if (id === 'btc') return <img src={art('btc.svg')} alt="" width={46} height={46} style={{ margin: -1 }} />;
  if (id === 'eth') {
    return <span style={{ width: 44, height: 44, borderRadius: 22, background: '#627eeb', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><FigmaImg src={art('eth.svg')} width={17.211} height={27.4999} /></span>;
  }
  if (id === 'usdt') return <img src={art('usdt.png')} alt="" width={44} height={44} style={{ borderRadius: 22, objectFit: 'cover' }} />;
  return <span style={{ width: 44, height: 44, borderRadius: 22, background: '#2775ca', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><FigmaImg src={art('usdc.svg')} width={11.7857} height={22} /></span>;
}

function Letter({ letter, color }: { letter: string; color: string }) {
  return <span style={{ width: 44, height: 44, borderRadius: 22, background: color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 700, flexShrink: 0 }}>{letter}</span>;
}

function Line({ label, value, valueColor = '#fff' }: { label: string; value: string; valueColor?: string }) {
  return (
    <div style={{ height: 36, display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 14 }}>
      <span style={{ color: '#8b9097' }}>{label}</span>
      <span style={{ fontWeight: 500, color: valueColor }}>{value}</span>
    </div>
  );
}

function Back({ top, left, icon, onClick }: { top: number; left: number; icon: 'back' | 'chev'; onClick: () => void }) {
  return (
    <button type="button" aria-label="Back" onClick={onClick} style={{ ...round, top, left }}>
      <FigmaImg src={icon === 'back' ? '/wallet-figma/find/back.svg' : '/wallet-figma/find/chev.svg'} width={20} height={20} />
    </button>
  );
}

function Title({ top, size, weight, children }: { top: number; size: number; weight: number; children: ReactNode }) {
  return <p style={{ position: 'absolute', left: 70, top, width: 250, margin: 0, textAlign: 'center', fontSize: size, fontWeight: weight }}>{children}</p>;
}

function Status() {
  const hide = useAppHidesFigmaChrome();
  if (hide) return null;
  return (
    <>
      <span style={{ position: 'absolute', left: 28, top: 13, fontSize: 15, fontWeight: 600 }}>9:41</span>
      <img src="/wallet-figma/welcome/status.svg" alt="" width={66.6} height={11.33} style={{ position: 'absolute', left: 296, top: 17 }} />
    </>
  );
}

function HomeBar() {
  const hide = useAppHidesFigmaChrome();
  if (hide) return null;
  return (
    <div style={{ position: 'absolute', left: 8, top: 810, width: 375, height: 34, opacity: 0.25, pointerEvents: 'none' }}>
      <div style={{ position: 'absolute', left: '50%', bottom: 8, transform: 'translateX(-50%)', width: 134, height: 5, borderRadius: 100, background: '#fff' }} />
    </div>
  );
}

function punch(prev: string, key: string) {
  if (key === '⌫') return prev.length <= 1 ? '0' : prev.slice(0, -1).replace(/\.$/, '') || '0';
  if (key === '.' && prev.includes('.')) return prev;
  if (prev === '0' && key !== '.') return key;
  return `${prev}${key}`;
}

function rawNum(value: number) {
  const text = value.toFixed(8).replace(/\.?0+$/, '');
  return text === '' ? '0' : text;
}

function showAmount(amount: string) {
  if (amount === '0' || amount === '0.') return amount;
  const [whole, frac] = amount.split('.');
  const grouped = Number(whole || '0').toLocaleString('en-US');
  return frac !== undefined ? `${grouped}.${frac}` : grouped;
}

function showAvail(value: number) {
  const digits = value > 0 && value < 1 ? 4 : 2;
  return value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: digits });
}

function feeAmount(value: number, symbol: string) {
  if (!Number.isFinite(value) || value <= 0) return `0 ${symbol}`;
  const digits = value >= 1 ? 4 : value >= 0.0001 ? 6 : 8;
  return `${value.toLocaleString('en-US', { maximumFractionDigits: digits })} ${symbol}`;
}

function feeCovers(quote: { fee: number; pay: 'eth-value' | 'eth' | 'sol-value' | 'sol' | 'btc-value' }, amount: number, eth: number, sol: number, btc: number) {
  if (quote.pay === 'eth-value' && amount + quote.fee > eth + 1e-12) return 'Not enough ETH for the network fee.';
  if (quote.pay === 'eth' && quote.fee > eth + 1e-12) return 'Not enough ETH for the network fee.';
  if (quote.pay === 'sol-value' && amount + quote.fee > sol + 1e-12) return 'Not enough SOL for the network fee.';
  if (quote.pay === 'sol' && quote.fee > sol + 1e-12) return 'Not enough SOL for the network fee.';
  if (quote.pay === 'btc-value' && amount + quote.fee > btc + 1e-12) return 'Not enough BTC for the network fee.';
  return null;
}

async function quoteLiveFee(live: NonNullable<ReturnType<typeof useLiveFrame>>, symbol: string, chain: StableChain, to: string, amount: string, testnet: boolean) {
  const sym = symbol.toUpperCase();
  if (testnet || sym === 'ARX' || sym === 'ARXT' || sym === 'TARX') return null;
  if (sym === 'BTC' && live.btcAddress) {
    return { fee: await quoteBitcoinFee(live.btcAddress, amount), unit: 'BTC', pay: 'btc-value' as const };
  }
  if (sym === 'SOL' && live.solAddress) {
    return { fee: await quoteSolanaFee(live.solAddress, to, 'SOL'), unit: 'SOL', pay: 'sol-value' as const };
  }
  if ((sym === 'USDT' || sym === 'USDC') && chain === 'solana' && live.solAddress) {
    return { fee: await quoteSolanaFee(live.solAddress, to, sym), unit: 'SOL', pay: 'sol' as const };
  }
  if ((sym === 'ETH' || sym === 'USDT' || sym === 'USDC') && live.address && /^0x[0-9a-fA-F]{40}$/.test(to)) {
    const fee = await quoteEthereumFee(sym as EthereumToken, getAddress(live.address), getAddress(to), amount);
    return { fee, unit: 'ETH', pay: sym === 'ETH' ? 'eth-value' as const : 'eth' as const };
  }
  return null;
}

function liveTokenQty(live: NonNullable<ReturnType<typeof useLiveFrame>>, net: string, id: string) {
  const row = (net === 'testnet' ? live.testnetTokens : live.tokens).find((token) => token.icon === id);
  return row ? parseTokenQty(row.amount) : 0;
}

function liveTokenUsd(live: NonNullable<ReturnType<typeof useLiveFrame>>, net: string, id: string) {
  const row = (net === 'testnet' ? live.testnetTokens : live.tokens).find((token) => token.icon === id);
  if (!row || !/\$\s*\d/.test(row.value)) return 0;
  const qty = parseTokenQty(row.amount);
  return qty > 0 ? parseTokenQty(row.value) / qty : 0;
}

function formatAmount(value: number) {
  return value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 4 });
}

function rate(token: (typeof TOKENS)[number]) {
  if (!token.home) return 0;
  return Number(token.fiat.replace(/[$,]/g, '')) / token.home;
}

function ChainPick({ chain, onChain, top }: { chain: StableChain; onChain: (chain: StableChain) => void; top?: number }) {
  const placed = top != null;
  return (
    <div style={{ position: placed ? 'absolute' : 'relative', left: placed ? 16 : undefined, top, width: placed ? 358 : '100%', marginTop: placed ? 0 : 12 }}>
      <div style={{ display: 'flex', gap: 8 }}>
        {(['ethereum', 'solana'] as const).map((id) => (
          <button
            key={id}
            type="button"
            onClick={() => onChain(id)}
            style={{ height: 40, minWidth: 108, padding: '0 14px', border: 'none', borderRadius: 10, background: chain === id ? '#accafe' : '#1c2025', color: chain === id ? '#0c1018' : '#fff', fontFamily: font.sans, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}
          >
            {id === 'ethereum' ? 'Ethereum' : 'Solana'}
          </button>
        ))}
      </div>
      <p style={{ margin: '8px 0 0', fontSize: 12, color: '#8b9097', lineHeight: 1.35 }}>
        {chain === 'ethereum' ? 'This send uses Ethereum. A Solana address will not receive it.' : 'This send uses Solana. An Ethereum address will not receive it.'}
      </p>
    </div>
  );
}

const round: CSSProperties = { position: 'absolute', width: 40, height: 40, borderRadius: 20, border: 'none', background: '#1c2025', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' };
const search: CSSProperties = { position: 'absolute', left: 16, width: 358, height: 52, boxSizing: 'border-box', background: '#1c2025', border: '1px solid #2a3447', borderRadius: 14, display: 'flex', alignItems: 'center', gap: 12, padding: '0 15px' };
const input: CSSProperties = { flex: 1, minWidth: 0, border: 'none', outline: 'none', background: 'transparent', color: '#fff', fontFamily: font.sans, fontSize: 15 };
const iconBtn: CSSProperties = { width: 40, height: 40, minWidth: 40, minHeight: 40, border: 'none', background: 'none', padding: 0, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 };
const kicker = (top: number): CSSProperties => ({ position: 'absolute', left: 24, top, margin: 0, fontSize: 12, fontWeight: 600, color: '#8b9097' });
const rowBtn: CSSProperties = { width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '0 15px', border: 'none', background: 'none', color: '#fff', fontFamily: font.sans, cursor: 'pointer', boxSizing: 'border-box' };
const cardBtn: CSSProperties = { position: 'absolute', left: 16, width: 358, boxSizing: 'border-box', background: '#1c2025', border: '1px solid #2a3447', borderRadius: 14, display: 'flex', alignItems: 'center', gap: 12, padding: '0 15px', color: '#fff', fontFamily: font.sans, cursor: 'pointer' };
const hiddenTag: CSSProperties = { display: 'inline-flex', alignItems: 'center', gap: 4, height: 18, padding: '0 6px', borderRadius: 9, background: '#1c2a44', color: '#accafe', fontSize: 10, fontWeight: 600 };
const checkBubble: CSSProperties = { display: 'inline-flex', width: 24, height: 24, borderRadius: 12, background: '#accafe', alignItems: 'center', justifyContent: 'center', flexShrink: 0 };
const pasteBtn: CSSProperties = { position: 'absolute', left: 16, top: 172, width: 358, height: 44, borderRadius: 14, border: '1px solid #2a3447', background: 'transparent', color: '#accafe', fontFamily: font.sans, fontSize: 14, fontWeight: 600, cursor: 'pointer' };
const primary: CSSProperties = { position: 'absolute', left: 16, width: 358, height: 52, borderRadius: 14, border: 'none', background: '#accafe', color: '#0c1018', fontFamily: font.sans, fontSize: 16, fontWeight: 600, cursor: 'pointer' };
const ghost: CSSProperties = { position: 'absolute', left: 19, width: 353, height: 55, borderRadius: 8, border: '1.5px solid #2a3447', background: 'transparent', color: '#accafe', fontFamily: font.sans, fontSize: 16, fontWeight: 600, cursor: 'pointer' };
const reviewBtn: CSSProperties = { position: 'absolute', left: 18, width: 354, height: 48, borderRadius: 12, border: 'none', fontFamily: font.sans, fontSize: 15, fontWeight: 600, cursor: 'pointer', padding: 0 };
const chip: CSSProperties = { background: '#1c2025', color: '#8b9097', borderRadius: 18, padding: '8px 14px', fontSize: 13 };
const keyBtn: CSSProperties = { width: 118, height: 52, border: 'none', background: 'none', color: '#fff', fontFamily: font.sans, fontSize: 26, fontWeight: 500, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' };
const lineBtn: CSSProperties = { width: '100%', height: 36, border: 'none', background: 'none', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 0, fontFamily: font.sans, fontSize: 14, cursor: 'pointer' };
