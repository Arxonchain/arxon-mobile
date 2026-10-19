import { useState, type CSSProperties, type ReactNode } from 'react';
import { FigmaImg } from '@/walletFigma/icons';
import { font } from '@/walletFigma/tokens';

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
  const [tokenId, setTokenId] = useState('arx');
  const [query, setQuery] = useState('');
  const [who, setWho] = useState('');
  const [picked, setPicked] = useState('');
  const [amount, setAmount] = useState('0');
  const [priv, setPriv] = useState(true);
  const [flags, setFlags] = useState([false, false, true, true]);
  const token = TOKENS.find((item) => item.id === tokenId) ?? TOKENS[0];
  const leave = () => (back ? back() : go('home-funded', false));
  const vaulted = id === 'send-amount-vault';
  const available = vaulted && token.id === 'arx' ? 1400 : id === 'send-amount' && token.id === 'arx' ? 0 : token.home;
  const numeric = Number(amount);
  const readyAmount = Number.isFinite(numeric) && numeric > 0;
  const shownAmount = readyAmount ? formatAmount(numeric) : '25.00';
  const fiat = (readyAmount ? numeric : 25) * (token.id === 'arx' ? 0.42 : token.home ? Number(token.fiat.replace(/[$,]/g, '')) / token.home : 0);

  return (
    <div style={{ position: 'relative', width: 390, height: 844, background: id === 'send-qr' ? '#0a0f17' : '#050505', overflow: 'hidden', fontFamily: font.sans, color: '#fff' }}>
      <style>{`.send-input::placeholder{color:#8b9097}`}</style>
      <Status />
      {id === 'send-token' && (
        <PickToken query={query} setQuery={setQuery} tokenId={tokenId} onPick={(next) => { setTokenId(next); setAmount('0'); go('send-who'); }} leave={leave} />
      )}
      {id === 'send-who' && (
        <PickWho query={who} setQuery={setWho} picked={picked} onPick={(address) => { setPicked(address); setWho(address); }} go={go} leave={leave} />
      )}
      {(id === 'send-amount' || id === 'send-amount-vault') && (
        <Amount
          token={token}
          who={picked || who}
          amount={amount}
          available={available}
          vaulted={vaulted}
          priv={priv}
          setPriv={setPriv}
          onKey={(key) => setAmount((prev) => punch(prev, key))}
          onMax={() => setAmount(rawNum(Math.max(0, available - (token.id === 'arx' ? 0.0004 : 0))))}
          onPaste={(text) => setWho(text)}
          ready={readyAmount}
          fiat={readyAmount ? numeric * rate(token) : 0}
          go={go}
          leave={leave}
        />
      )}
      {id === 'send-review' && (
        <Review token={token} to={picked || 'arx1q8x4…t7c2n4p'} amount={shownAmount} fiat={fiat} priv={priv} go={go} leave={leave} />
      )}
      {id === 'send-success' && <Success amount={shownAmount} symbol={token.symbol} privateSend={priv && token.id === 'arx'} to={picked || 'arx1q8x4…t7c2n4p'} go={go} />}
      {id === 'send-privacy' && <Privacy flags={flags} setFlags={setFlags} go={go} leave={leave} />}
      {id === 'send-failed' && <Failed to={picked || 'arx1q8x4…t7c2n4p'} amount={shownAmount} symbol={token.symbol} go={go} />}
      {id === 'send-qr' && <Scan go={go} leave={leave} />}
      <HomeBar />
    </div>
  );
}

function PickToken({ query, setQuery, tokenId, onPick, leave }: { query: string; setQuery: (v: string) => void; tokenId: string; onPick: (id: string) => void; leave: () => void }) {
  const q = query.trim().toLowerCase();
  const rows = TOKENS.filter((token) => !q || token.name.toLowerCase().includes(q) || token.symbol.toLowerCase().includes(q));
  return (
    <>
      <Back top={52} left={16} icon="back" onClick={leave} />
      <Title top={61.5} size={17} weight={600}>Select token</Title>
      <label style={{ ...search, top: 108 }}>
        <FigmaImg src={art('search.svg')} width={20} height={20} />
        <input className="send-input" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search tokens" aria-label="Search tokens" style={input} />
      </label>
      <p style={kicker(184)}>YOUR TOKENS</p>
      <div style={{ position: 'absolute', left: 16, top: 208, width: 358, background: '#1c2025', border: '1px solid #2a3447', borderRadius: 14, overflow: 'hidden' }}>
        {rows.map((token, index) => (
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
        ))}
      </div>
      <div style={{ position: 'absolute', left: 16, top: 604, width: 358, display: 'flex', gap: 10 }}>
        <FigmaImg src={art('lock.svg')} width={18} height={18} />
        <p style={{ margin: 0, width: 330, fontSize: 12, color: '#8b9097', lineHeight: 1.35 }}>Only Arxon supports private transfers. Other tokens are sent publicly.</p>
      </div>
    </>
  );
}

function PickWho({ query, setQuery, picked, onPick, go, leave }: { query: string; setQuery: (v: string) => void; picked: string; onPick: (address: string) => void; go: Go; leave: () => void }) {
  const q = query.trim().toLowerCase();
  const accounts = PEOPLE.filter((person) => person.group === 'account' && (!q || person.name.toLowerCase().includes(q) || person.sub.toLowerCase().includes(q)));
  const recent = PEOPLE.filter((person) => person.group === 'recent' && (!q || person.name.toLowerCase().includes(q) || person.sub.toLowerCase().includes(q)));
  const ready = picked.trim().length > 0 || query.trim().length > 0;
  return (
    <>
      <Back top={52} left={16} icon="back" onClick={leave} />
      <Title top={61.5} size={17} weight={600}>Send to</Title>
      <label style={{ ...search, top: 108 }}>
        <FigmaImg src={art('search.svg')} width={20} height={20} />
        <input className="send-input" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Address or name" aria-label="Address or name" style={input} />
        <button type="button" aria-label="Scan" onClick={() => go('send-qr')} style={iconBtn}><FigmaImg src={art('scan.svg')} width={20} height={20} /></button>
      </label>
      <button type="button" onClick={() => navigator.clipboard?.readText().then((text) => { if (text.trim()) { setQuery(text.trim()); onPick(text.trim()); } }).catch(() => undefined)} style={pasteBtn}>Paste from clipboard</button>
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
      <button type="button" disabled={!ready} onClick={() => go('send-amount')} style={{ ...primary, top: 744, opacity: ready ? 1 : 0.4 }}>Continue</button>
    </>
  );
}

function Amount({ token, who, amount, available, vaulted, priv, setPriv, onKey, onMax, onPaste, ready, fiat, go, leave }: {
  token: (typeof TOKENS)[number]; who: string; amount: string; available: number; vaulted: boolean; priv: boolean; setPriv: (v: boolean) => void;
  onKey: (key: string) => void; onMax: () => void; onPaste: (text: string) => void; ready: boolean; fiat: number; go: Go; leave: () => void;
}) {
  const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0', '⌫'];
  return (
    <>
      <Back top={56} left={18} icon="chev" onClick={leave} />
      <Title top={65.5} size={17} weight={700}>Send {token.symbol}</Title>
      <div style={{ position: 'absolute', left: 18, top: 118, width: 354, height: 56, boxSizing: 'border-box', background: '#1c2025', borderRadius: 14, display: 'flex', alignItems: 'center', gap: 10, padding: '0 14px 0 16px' }}>
        <span style={{ fontSize: 14, fontWeight: 500, color: '#8b9097' }}>To</span>
        <span style={{ flex: 1, fontSize: 15, color: who ? '#fff' : '#5c5f64', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{who || 'Address or Arxon name'}</span>
        <button type="button" aria-label="Paste" onClick={() => navigator.clipboard?.readText().then((text) => { if (text.trim()) onPaste(text.trim()); }).catch(() => undefined)} style={iconBtn}><FigmaImg src={art('paste.svg')} width={20} height={20} /></button>
        <button type="button" aria-label="Scan" onClick={() => go('send-qr')} style={iconBtn}><FigmaImg src={art('scan-sm.svg')} width={20} height={20} /></button>
      </div>
      <div style={{ position: 'absolute', left: 0, top: 196, width: 390, display: 'flex', justifyContent: 'center', alignItems: 'flex-end', gap: 8 }}>
        <span style={{ fontSize: 64, fontWeight: 700, lineHeight: 1 }}>{showAmount(amount)}</span>
        <span style={{ fontSize: 20, fontWeight: 500, color: '#accafe', marginBottom: 8 }}>{token.symbol}</span>
      </div>
      <p style={{ position: 'absolute', left: 0, top: 282, width: 390, margin: 0, textAlign: 'center', fontSize: 15, color: '#8b9097' }}>≈ ${fiat.toFixed(2)}</p>
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
      {token.id === 'arx' && (
        <div style={{ position: 'absolute', left: 18, top: vaulted ? 412 : 372, width: 354, height: 64, boxSizing: 'border-box', background: '#1c2025', borderRadius: 14, display: 'flex', alignItems: 'center', gap: 12, padding: 12 }}>
          <span style={{ width: 36, height: 36, borderRadius: 18, background: '#2a3447', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><FigmaImg src={art('shield.svg')} width={18} height={18} /></span>
          <span style={{ flex: 1 }}>
            <span style={{ display: 'block', fontSize: 14, fontWeight: 600 }}>Private transaction</span>
            <span style={{ display: 'block', fontSize: 12, color: '#8b9097' }}>Hides amount and sender</span>
          </span>
          <button type="button" aria-label="Private transaction" onClick={() => setPriv(!priv)} style={iconBtn}>
            <FigmaImg src={art(priv ? 'toggle-on.svg' : 'toggle-off.svg')} width={priv ? 46 : 48} height={28} />
          </button>
        </div>
      )}
      <div style={{ position: 'absolute', left: 18, top: vaulted ? 486 : 452, width: 354, display: 'flex', flexWrap: 'wrap' }}>
        {keys.map((key) => (
          <button key={key} type="button" onClick={() => onKey(key)} style={keyBtn}>
            {key === '⌫' ? <FigmaImg src={art('backspace.svg')} width={24} height={24} /> : key}
          </button>
        ))}
      </div>
      <button type="button" disabled={!ready} onClick={() => go('send-review')} style={{ ...reviewBtn, top: 712, background: ready ? '#accafe' : '#1c2025', color: ready ? '#0c1018' : '#5c5f64' }}>Review</button>
    </>
  );
}

function Review({ token, to, amount, fiat, priv, go, leave }: { token: (typeof TOKENS)[number]; to: string; amount: string; fiat: number; priv: boolean; go: Go; leave: () => void }) {
  const fee = token.id === 'arx' ? 0.0004 : 0;
  const total = `${(Number(amount) + fee).toLocaleString('en-US', { minimumFractionDigits: 4, maximumFractionDigits: 4 })} ${token.symbol}`;
  return (
    <>
      <Back top={56} left={18} icon="chev" onClick={leave} />
      <Title top={65.5} size={17} weight={700}>Review</Title>
      <div style={{ position: 'absolute', left: 18, top: 118, width: 354, textAlign: 'center' }}>
        <p style={{ margin: 0, fontSize: 14, color: '#8b9097' }}>You are sending</p>
        <p style={{ margin: '6px 0 0', fontSize: 40, fontWeight: 700 }}>{amount} {token.symbol}</p>
        <p style={{ margin: '6px 0 0', fontSize: 15, color: '#8b9097' }}>≈ ${fiat.toFixed(2)}</p>
      </div>
      <div style={{ position: 'absolute', left: 18, top: 262, width: 354, boxSizing: 'border-box', background: '#1c2025', borderRadius: 16, padding: 16 }}>
        <Line label="To" value={to} />
        <Line label="From" value="Account 01" />
        <Line label="Network" value="Arxon" />
        <button type="button" onClick={() => go('send-privacy')} style={{ ...lineBtn }}>
          <span style={{ color: '#8b9097' }}>Privacy</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#accafe', fontWeight: 500 }}>
            {priv && token.id === 'arx' && <FigmaImg src={art('shield-sm.svg')} width={16} height={16} />}
            {priv && token.id === 'arx' ? 'Private' : 'Public'}
          </span>
        </button>
        <Line label="Network fee" value={fee ? `${fee} ${token.symbol}` : `0 ${token.symbol}`} />
        <div style={{ height: 1, background: '#2a3447' }} />
        <Line label="Total" value={total} />
      </div>
      {priv && token.id === 'arx' && <p style={{ position: 'absolute', left: 30, top: 527, width: 330, margin: 0, fontSize: 12, color: '#5c5f64', lineHeight: 1.4 }}>Private transactions hide the amount and sender on-chain. This can’t be undone once confirmed.</p>}
      <button type="button" onClick={() => go('send-success')} style={{ ...primary, top: 649, borderRadius: 8, height: 55 }}>Confirm and send</button>
      <button type="button" onClick={leave} style={{ ...ghost, top: 714 }}>Cancel</button>
    </>
  );
}

function Success({ amount, symbol, privateSend, to, go }: { amount: string; symbol: string; privateSend: boolean; to: string; go: Go }) {
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
        <Line label="To" value={to} />
        <Line label="Network fee" value="0.0004 ARX" />
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
  return (
    <>
      <img src={art('fail-glow.svg')} alt="" width={168} height={168} style={{ position: 'absolute', left: 111, top: 130 }} />
      <img src={art('fail-ring.svg')} alt="" width={132} height={132} style={{ position: 'absolute', left: 129, top: 148 }} />
      <img src={art('fail-core.svg')} alt="" width={96} height={96} style={{ position: 'absolute', left: 147, top: 166 }} />
      <p style={{ position: 'absolute', left: 35, top: 334, width: 320, margin: 0, textAlign: 'center', fontSize: 26, fontWeight: 700 }}>Payment failed</p>
      <p style={{ position: 'absolute', left: 35, top: 376, width: 320, margin: 0, textAlign: 'center', fontSize: 32, fontWeight: 700 }}>{amount} {symbol}</p>
      <div style={{ position: 'absolute', left: 18, top: 440, width: 354, boxSizing: 'border-box', background: '#1c2025', borderRadius: 16, padding: 16 }}>
        <Line label="To" value={to} />
        <Line label="Network fee" value="No fee charged" />
        <Line label="Status" value="Not sent" valueColor="#f55c5c" />
      </div>
      <button type="button" onClick={() => go('send-review')} style={{ ...primary, top: 649, borderRadius: 8, height: 55 }}>Try again</button>
      <button type="button" onClick={() => go('home-funded')} style={{ ...ghost, top: 714 }}>Back to Home</button>
    </>
  );
}

function Scan({ go, leave }: { go: Go; leave: () => void }) {
  const corners: [string, number, number][] = [['corner-tl.svg', 73, 248], ['corner-tr.svg', 273, 248], ['corner-bl.svg', 73, 448], ['corner-br.svg', 273, 448]];
  return (
    <>
      {corners.map(([name, left, top]) => <img key={name} src={art(name)} alt="" width={44} height={44} style={{ position: 'absolute', left, top }} />)}
      <Back top={56} left={18} icon="chev" onClick={leave} />
      <p style={{ position: 'absolute', left: 0, top: 64, width: 390, margin: 0, textAlign: 'center', fontSize: 20, fontWeight: 700 }}>Scan QR code</p>
      <p style={{ position: 'absolute', left: 55, top: 520, width: 280, margin: 0, textAlign: 'center', fontSize: 15, lineHeight: '22px', color: '#8c8f96' }}>Point your camera at an Arxon address QR code.</p>
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
  return (
    <>
      <span style={{ position: 'absolute', left: 28, top: 13, fontSize: 15, fontWeight: 600 }}>9:41</span>
      <img src="/wallet-figma/welcome/status.svg" alt="" width={66.6} height={11.33} style={{ position: 'absolute', left: 296, top: 17 }} />
    </>
  );
}

function HomeBar() {
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

function formatAmount(value: number) {
  return value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 4 });
}

function rate(token: (typeof TOKENS)[number]) {
  if (!token.home) return 0;
  return Number(token.fiat.replace(/[$,]/g, '')) / token.home;
}

const round: CSSProperties = { position: 'absolute', width: 40, height: 40, borderRadius: 20, border: 'none', background: '#1c2025', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' };
const search: CSSProperties = { position: 'absolute', left: 16, width: 358, height: 52, boxSizing: 'border-box', background: '#1c2025', border: '1px solid #2a3447', borderRadius: 14, display: 'flex', alignItems: 'center', gap: 12, padding: '0 15px' };
const input: CSSProperties = { flex: 1, minWidth: 0, border: 'none', outline: 'none', background: 'transparent', color: '#fff', fontFamily: font.sans, fontSize: 15 };
const iconBtn: CSSProperties = { border: 'none', background: 'none', padding: 0, cursor: 'pointer', display: 'flex' };
const kicker = (top: number): CSSProperties => ({ position: 'absolute', left: 24, top, margin: 0, fontSize: 12, fontWeight: 600, color: '#8b9097' });
const rowBtn: CSSProperties = { width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '0 15px', border: 'none', background: 'none', color: '#fff', fontFamily: font.sans, cursor: 'pointer', boxSizing: 'border-box' };
const cardBtn: CSSProperties = { position: 'absolute', left: 16, width: 358, boxSizing: 'border-box', background: '#1c2025', border: '1px solid #2a3447', borderRadius: 14, display: 'flex', alignItems: 'center', gap: 12, padding: '0 15px', color: '#fff', fontFamily: font.sans, cursor: 'pointer' };
const hiddenTag: CSSProperties = { display: 'inline-flex', alignItems: 'center', gap: 4, height: 18, padding: '0 6px', borderRadius: 9, background: '#1c2a44', color: '#accafe', fontSize: 10, fontWeight: 600 };
const checkBubble: CSSProperties = { display: 'inline-flex', width: 24, height: 24, borderRadius: 12, background: '#accafe', alignItems: 'center', justifyContent: 'center', flexShrink: 0 };
const pasteBtn: CSSProperties = { position: 'absolute', left: 16, top: 172, width: 358, height: 44, borderRadius: 14, border: '1px solid #2a3447', background: 'transparent', color: '#accafe', fontFamily: font.sans, fontSize: 14, fontWeight: 600, cursor: 'pointer' };
const primary: CSSProperties = { position: 'absolute', left: 16, width: 358, height: 52, borderRadius: 14, border: 'none', background: '#accafe', color: '#0c1018', fontFamily: font.sans, fontSize: 16, fontWeight: 600, cursor: 'pointer' };
const ghost: CSSProperties = { position: 'absolute', left: 19, width: 353, height: 55, borderRadius: 8, border: '1.5px solid #2a3447', background: 'transparent', color: '#accafe', fontFamily: font.sans, fontSize: 16, fontWeight: 600, cursor: 'pointer' };
const reviewBtn: CSSProperties = { position: 'absolute', left: 19, width: 353, height: 55, borderRadius: 8, border: 'none', fontFamily: font.sans, fontSize: 16, fontWeight: 600, cursor: 'pointer' };
const chip: CSSProperties = { background: '#1c2025', color: '#8b9097', borderRadius: 18, padding: '8px 14px', fontSize: 13 };
const keyBtn: CSSProperties = { width: 118, height: 52, border: 'none', background: 'none', color: '#fff', fontFamily: font.sans, fontSize: 26, fontWeight: 500, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' };
const lineBtn: CSSProperties = { width: '100%', height: 36, border: 'none', background: 'none', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 0, fontFamily: font.sans, fontSize: 14, cursor: 'pointer' };
