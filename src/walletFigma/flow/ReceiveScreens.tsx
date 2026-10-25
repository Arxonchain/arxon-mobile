import { useEffect, useState, type CSSProperties } from 'react';
import { FigmaImg } from '@/walletFigma/icons';
import { font } from '@/walletFigma/tokens';
import { ARXON, DEFAULT_RPC, SCAN_URL } from '@/chainWallet/chain';
import { sessionStore } from '@/chainWallet/session';
import { useLiveFrame } from './liveFrame';
import { useAppHidesFigmaChrome } from './appChrome';
import { useWalletNetwork } from './WalletTabs';
import { applyNetwork, listNetworks, saveNetwork, selectedNetwork, type HomeNetwork } from './homeNetworks';
import { qrDataUrl } from '@/chainWallet/receiveQr';

const art = (name: string) => `/wallet-figma/receive/${name}`;
type Go = (id: string, remember?: boolean) => void;

const ADDRESS = 'arx1q8x4m2k7f9v3d6h0w5z...t7c2n4p';

type Net = HomeNetwork;

const SCREENS = new Set(['receive', 'network', 'add-network']);

export function isReceiveScreen(id: string) {
  return SCREENS.has(id);
}

export function ReceiveScreens({ id, go, back }: { id: string; go: Go; back?: () => void }) {
  const live = useLiveFrame();
  const net = useWalletNetwork();
  const [nets, setNets] = useState<Net[]>(() => listNetworks(net));
  const [selected, setSelected] = useState(() => selectedNetwork(net).id);
  const [shielded, setShielded] = useState(false);
  const [focus, setFocus] = useState('name');
  const [form, setForm] = useState(() =>
    net === 'testnet' && !(live?.app ? live.testnetAdded : sessionStore.testnetAdded())
      ? { name: 'Arxon Testnet', rpc: DEFAULT_RPC, chain: String(ARXON.id), symbol: 'tARX', explorer: SCAN_URL }
      : { name: '', rpc: '', chain: '', symbol: '', explorer: '' },
  );
  const forAsset = live?.app ? nets.find((row) => row.asset === live.receiveAsset && !row.custom) : undefined;
  const current = forAsset ?? nets.find((row) => row.id === selected) ?? nets[0];
  const leave = () => (back ? back() : go(id === 'receive' ? 'home-funded' : 'receive', false));

  function pick(netId: string) {
    const row = nets.find((item) => item.id === netId);
    if (!row) return;
    setSelected(netId);
    void applyNetwork(live, row);
    if (back) back();
    else go('receive', false);
  }

  function save() {
    const row = saveNetwork(form, net);
    setForm({ name: '', rpc: '', chain: '', symbol: '', explorer: '' });
    if (!row) {
      if (back) back();
      else go('network', false);
      return;
    }
    if (row.scope === 'testnet' && !live?.app) sessionStore.setTestnetAdded(true);
    setNets(listNetworks(net));
    setSelected(row.id);
    const done = applyNetwork(live, row);
    if (row.scope === 'testnet' && net !== 'testnet') {
      void done.then(() => go('testnet', false));
      return;
    }
    if (back) back();
    else go('network', false);
  }

  const stable = (live?.receiveAsset || '').toUpperCase();
  const stablecoin = stable === 'USDT' || stable === 'USDC';
  const [stableChain, setStableChain] = useState<'ethereum' | 'solana'>('ethereum');
  const address = !live?.app
    ? ADDRESS
    : stablecoin && stableChain === 'solana'
      ? live.solAddress || ''
      : live.receiveAddress || live.address || '';
  const qrSrc = live?.app && !(stablecoin && stableChain === 'solana') && live.receiveQr ? live.receiveQr : art('qr.svg');

  return (
    <div style={{ position: 'relative', width: 390, height: 844, background: '#050505', overflow: 'hidden', fontFamily: font.sans, color: '#fff' }}>
      <style>{`.recv-field::placeholder{color:#8b9097}`}</style>
      {id === 'receive' && (
        <Receive current={current} shielded={shielded} setShielded={setShielded} go={go} leave={leave} address={address} qrSrc={qrSrc} stablecoin={stablecoin ? stable : null} stableChain={stableChain} setStableChain={setStableChain} />
      )}
      {id === 'network' && (
        <Networks nets={nets} selected={selected} onPick={pick} onAdd={() => go('add-network')} onClose={leave} />
      )}
      {id === 'add-network' && (
        <AddNetwork form={form} setForm={setForm} focus={focus} setFocus={setFocus} onSave={save} leave={leave} />
      )}
    </div>
  );
}

function receiveCopy(current: Net, liveApp: boolean) {
  const arxon = !liveApp || current.scope === 'testnet' || current.asset === 'ARX' || current.asset === 'ARXt';
  const letter = arxon ? 'A' : (current.asset.replace(/t$/i, '').slice(0, 1) || 'A');
  const caption = arxon ? 'Your Arxon address' : `Your ${current.name} address`;
  const warn = arxon
    ? 'Only send ARX and Arxon-network assets to this address. Other assets may be lost.'
    : `Only send ${current.asset} on ${current.name} to this address. Other assets may be lost.`;
  return { letter, caption, warn, privacy: arxon };
}

function Receive({ current, shielded, setShielded, go, leave, address, qrSrc, stablecoin, stableChain, setStableChain }: {
  current: Net; shielded: boolean; setShielded: (v: boolean) => void; go: Go; leave: () => void; address: string; qrSrc: string;
  stablecoin: 'USDT' | 'USDC' | null; stableChain: 'ethereum' | 'solana'; setStableChain: (chain: 'ethereum' | 'solana') => void;
}) {
  const live = useLiveFrame();
  const copy = receiveCopy(current, !!live?.app);
  const chainName = stableChain === 'solana' ? 'Solana' : 'Ethereum';
  const testnet = stablecoin ? false : copy.privacy;
  const shieldedKey = live?.app ? live.shieldedPk || '' : `0x${'11'.repeat(32)}`;
  const showingKey = testnet && shielded;
  const shown = showingKey ? shieldedKey : address;
  const [copied, setCopied] = useState(false);
  const [shieldQr, setShieldQr] = useState<string | null>(null);
  const about = !testnet
    ? null
    : showingKey
      ? 'Shielded key. Private pay into this vault uses it, and the amount stays hidden.'
      : 'Public address. Anyone can send ARX here, and that payment is visible.';
  const warn = showingKey
    ? 'Only send a private payment to this shielded key. A normal transfer will not arrive here.'
    : stablecoin
      ? `Only send ${stablecoin} on ${chainName} to this address. ${stablecoin} on another chain will not arrive.`
      : copy.warn;
  const [chainQr, setChainQr] = useState<string | null>(null);

  useEffect(() => {
    if (!showingKey || !shieldedKey) {
      setShieldQr(null);
      return;
    }
    let cancel = false;
    void qrDataUrl(shieldedKey).then((url) => {
      if (!cancel) setShieldQr(url);
    }).catch(() => {
      if (!cancel) setShieldQr(null);
    });
    return () => {
      cancel = true;
    };
  }, [showingKey, shieldedKey]);

  useEffect(() => {
    if (!stablecoin || stableChain !== 'solana' || !address) {
      setChainQr(null);
      return;
    }
    let cancel = false;
    void qrDataUrl(address).then((url) => {
      if (!cancel) setChainQr(url);
    }).catch(() => {
      if (!cancel) setChainQr(null);
    });
    return () => {
      cancel = true;
    };
  }, [stablecoin, stableChain, address]);

  async function copyShown() {
    if (!shown) return;
    try { await navigator.clipboard?.writeText(shown); } catch { /* preview still confirms */ }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1400);
  }

  function share() {
    if (!shown) return;
    const title = showingKey ? 'Shielded key' : `${current.name} address`;
    if (navigator.share) {
      navigator.share({ title, text: shown }).catch(() => undefined);
      return;
    }
    void copyShown();
  }

  return (
    <>
      <PhoneStatus />
      <Back top={56} onClick={leave} />
      <p style={{ position: 'absolute', left: 70, top: 65.5, width: 250, margin: 0, textAlign: 'center', fontSize: 17, fontWeight: 700 }}>Receive</p>
      <div className="arxon-token-scroll" style={{ position: 'absolute', left: 0, top: 112, bottom: 0, width: 390, overflowY: 'auto', WebkitOverflowScrolling: 'touch', touchAction: 'pan-y', boxSizing: 'border-box', padding: '0 18px 28px' }}>
        {stablecoin ? (
          <div style={{ display: 'flex', justifyContent: 'center', gap: 8 }}>
            <button type="button" onClick={() => setStableChain('ethereum')} style={chainChip(stableChain === 'ethereum')}>Ethereum</button>
            <button type="button" onClick={() => setStableChain('solana')} style={chainChip(stableChain === 'solana')}>Solana</button>
          </div>
        ) : (
          <button type="button" onClick={() => go('network')} style={pillFlow}>
            <FigmaImg src={art('dot.svg')} width={18} height={18} />
            <span>{current.pill}</span>
            <FigmaImg src={art('chev-down.svg')} width={16} height={16} />
          </button>
        )}
        <div style={{ position: 'relative', width: 264, height: 264, margin: '22px auto 0', borderRadius: 24, background: '#fff', overflow: 'hidden' }}>
          <img src={showingKey && shieldQr ? shieldQr : chainQr || qrSrc} alt="" width={200} height={200} style={{ position: 'absolute', left: 32, top: 32, width: 200, height: 200, objectFit: 'contain' }} />
          <div style={{ position: 'absolute', left: 110, top: 110, width: 44, height: 44, boxSizing: 'border-box', borderRadius: 22, background: '#accafe', border: '4px solid #fff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0c1018', fontSize: 20, fontWeight: 700 }}>{copy.letter}</div>
        </div>
        <p style={{ margin: '18px 0 0', textAlign: 'center', fontSize: 13, color: '#8b9097' }}>{showingKey ? 'Shielded key' : stablecoin ? `Your ${chainName} address` : copy.caption}</p>
        <p style={{ margin: '8px 12px 0', textAlign: 'center', fontSize: 15, fontWeight: 500, wordBreak: 'break-all' }}>{shown || (showingKey ? 'Your shielded key is not ready yet.' : stablecoin && stableChain === 'solana' ? 'Your Solana address is not ready yet.' : '')}</p>
        {about ? <p style={{ margin: '8px 8px 0', textAlign: 'left', fontSize: 13, color: '#8b9097', lineHeight: 1.4 }}>{about}</p> : null}
        {testnet ? (
          <div style={{ marginTop: 14, background: '#1c2025', borderRadius: 14, display: 'flex', alignItems: 'center', gap: 12, padding: 14 }}>
            <span style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
              <span style={{ display: 'block', fontSize: 14, fontWeight: 600 }}>Shielded key</span>
              <span style={{ display: 'block', marginTop: 2, fontSize: 12, color: '#8b9097', lineHeight: 1.35 }}>Off is your public address. On is the vault key.</span>
            </span>
            <button type="button" aria-label="Shielded key" aria-pressed={shielded} onClick={() => setShielded(!shielded)} style={iconBtn}>
              <img src={shielded ? '/wallet-figma/send/toggle-on.svg' : '/wallet-figma/send/toggle-off.svg'} alt="" width={48} height={28} style={{ width: 48, height: 28, objectFit: 'contain', display: 'block' }} />
            </button>
          </div>
        ) : null}
        <div style={{ marginTop: 16, display: 'flex', alignItems: 'flex-start', gap: 8 }}>
          <img src={art('info.svg')} alt="" width={16} height={16} style={{ width: 16, height: 16, flex: '0 0 16px', objectFit: 'contain', display: 'block' }} />
          <p style={{ margin: 0, flex: 1, fontSize: 12, color: '#5c5f64', lineHeight: 1.35, textAlign: 'left' }}>{warn}</p>
        </div>
        <button type="button" onClick={() => void copyShown()} style={solidFlow}>
          <FigmaImg src={art('copy.svg')} width={18} height={18} />
          {copied ? 'Copied' : showingKey ? 'Copy key' : 'Copy address'}
        </button>
        <button type="button" onClick={share} style={outlineFlow}>
          <FigmaImg src={art('share.svg')} width={18} height={18} />
          Share
        </button>
      </div>
    </>
  );
}

function Networks({ nets, selected, onPick, onAdd, onClose }: { nets: Net[]; selected: string; onPick: (id: string) => void; onAdd: () => void; onClose: () => void }) {
  return (
    <>
      <NoteStatus />
      <div style={{ position: 'absolute', left: 16, top: 64, width: 358, height: 48, borderRadius: 24, background: '#11161f' }} />
      <div style={{ position: 'absolute', left: 16, top: 140, width: 358, height: 220, borderRadius: 20, background: '#0b0f16' }} />
      <NetworkSheet nets={nets} selected={selected} onPick={onPick} onAdd={onAdd} onClose={onClose} />
    </>
  );
}

/** 12.02 Select network as a bottom sheet. `fixed` pins it to the app frame so it covers the tab bar. */
export function NetworkSheet({ nets, selected, onPick, onAdd, onClose, fixed = false }: { nets: Net[]; selected: string; onPick: (id: string) => void; onAdd: () => void; onClose: () => void; fixed?: boolean }) {
  const height = Math.max(524, 83 + (nets.length + 1) * 84 + 100 + 52 + 24);
  return (
    <div style={{ position: fixed ? 'fixed' : 'absolute', inset: 0, zIndex: fixed ? 9 : 'auto' }}>
      <button type="button" aria-label="Close" onClick={onClose} style={{ position: 'absolute', inset: 0, border: 'none', background: 'rgba(0,0,0,0.55)', padding: 0, cursor: 'pointer' }} />
      <NoteStatus />
      <div style={{ position: 'absolute', left: 0, ...(fixed ? { bottom: 0, maxHeight: '100%', overflowY: 'auto' as const } : { top: 844 - height }), width: 390, height, boxSizing: 'border-box', background: '#11161f', border: '1px solid #2a3447', borderBottom: 'none', borderRadius: '28px 28px 0 0' }}>
        <div style={{ position: 'absolute', left: 170, top: 9, width: 48, height: 4, borderRadius: 2, background: '#2a3447' }} />
        <p style={{ position: 'absolute', left: 23, top: 31, margin: 0, fontSize: 20, fontWeight: 700 }}>Select network</p>
        {nets.map((net, index) => (
          <button key={net.id} type="button" onClick={() => onPick(net.id)} style={{ ...netBtn, top: 83 + index * 84, borderColor: net.id === selected ? '#accafe' : '#2a3447', background: net.id === selected ? '#11161f' : '#1c2025' }}>
            <span style={{ width: 44, height: 44, borderRadius: 22, background: net.scope === 'mainnet' && !net.custom ? '#1c2a44' : '#11161f', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <FigmaImg src={art(net.icon)} width={20} height={20} />
            </span>
            <span style={{ flex: 1, textAlign: 'left' }}>
              <span style={{ display: 'block', fontSize: 16, fontWeight: 600 }}>{net.name}</span>
              <span style={{ display: 'block', marginTop: 3, fontSize: 13, color: '#8b9097' }}>{net.sub}</span>
            </span>
            {net.id === selected && (
              <span style={{ width: 24, height: 24, borderRadius: 12, background: '#accafe', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <FigmaImg src="/wallet-figma/send/check.svg" width={16} height={16} />
              </span>
            )}
          </button>
        ))}
        <button type="button" onClick={onAdd} style={{ ...netBtn, top: 83 + nets.length * 84, background: '#1c2025' }}>
          <span style={{ width: 44, height: 44, borderRadius: 22, background: '#11161f', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <FigmaImg src={art('plus.svg')} width={20} height={20} />
          </span>
          <span style={{ flex: 1, textAlign: 'left' }}>
            <span style={{ display: 'block', fontSize: 16, fontWeight: 600 }}>Custom RPC</span>
            <span style={{ display: 'block', marginTop: 3, fontSize: 13, color: '#8b9097' }}>Add your own node</span>
          </span>
        </button>
        <button type="button" onClick={onAdd} style={{ position: 'absolute', left: 15, top: 83 + nets.length * 84 + 100, width: 358, height: 52, borderRadius: 14, border: '1px solid #2a3447', background: 'transparent', color: '#fff', fontFamily: font.sans, fontSize: 16, fontWeight: 600, cursor: 'pointer' }}>Add network</button>
      </div>
    </div>
  );
}

function AddNetwork({ form, setForm, focus, setFocus, onSave, leave }: {
  form: { name: string; rpc: string; chain: string; symbol: string; explorer: string };
  setForm: (v: { name: string; rpc: string; chain: string; symbol: string; explorer: string }) => void;
  focus: string;
  setFocus: (v: string) => void;
  onSave: () => void;
  leave: () => void;
}) {
  const hideChrome = useAppHidesFigmaChrome();
  const fields: { key: keyof typeof form; label: string; placeholder: string }[] = [
    { key: 'name', label: 'Network name', placeholder: 'e.g. My Arxon node' },
    { key: 'rpc', label: 'RPC URL', placeholder: 'https://' },
    { key: 'chain', label: 'Chain ID', placeholder: 'e.g. 1337' },
    { key: 'symbol', label: 'Currency symbol', placeholder: 'ARX' },
    { key: 'explorer', label: 'Block explorer URL (optional)', placeholder: 'https://' },
  ];
  return (
    <>
      <PhoneStatus />
      <Back top={56} onClick={leave} />
      <p style={{ position: 'absolute', left: 70, top: 65.5, width: 250, margin: 0, textAlign: 'center', fontSize: 17, fontWeight: 700 }}>Add network</p>
      <div style={{ position: 'absolute', left: 18, top: 124, width: 354, display: 'flex', flexDirection: 'column', gap: 14 }}>
        {fields.map((field) => (
          <label key={field.key} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <span style={{ fontSize: 13, fontWeight: 500, color: '#8b9097' }}>{field.label}</span>
            <input
              className="recv-field"
              value={form[field.key]}
              placeholder={field.placeholder}
              aria-label={field.label}
              onFocus={() => setFocus(field.key)}
              onChange={(e) => setForm({ ...form, [field.key]: e.target.value })}
              style={{ ...fieldBox, border: focus === field.key ? '1px solid #accafe' : '1px solid transparent' }}
            />
          </label>
        ))}
        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', background: '#11161f', border: '1px solid #2a3447', borderRadius: 16, padding: '12px 16px' }}>
          <img src={art('info-card.svg')} alt="" width={16} height={16} style={{ width: 16, height: 16, flex: '0 0 16px', objectFit: 'contain', display: 'block' }} />
          <p style={{ margin: 0, flex: 1, fontSize: 13, color: '#8b9097', lineHeight: 1.35, textAlign: 'left' }}>Only add networks you trust. A malicious network can see your activity.</p>
        </div>
      </div>
      <button type="button" onClick={onSave} style={{ position: hideChrome ? 'fixed' : 'absolute', left: 16, ...(hideChrome ? { bottom: 16, zIndex: 9 } : { top: 744 }), width: 358, height: 52, borderRadius: 14, border: 'none', background: '#accafe', color: '#0c1018', fontFamily: font.sans, fontSize: 16, fontWeight: 600, cursor: 'pointer' }}>Save network</button>
      <HomeBar />
    </>
  );
}

function Back({ top, onClick }: { top: number; onClick: () => void }) {
  return (
    <button type="button" aria-label="Back" onClick={onClick} style={{ position: 'absolute', left: 18, top, width: 40, height: 40, borderRadius: 20, border: 'none', background: '#1c2025', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', padding: 0 }}>
      <FigmaImg src="/wallet-figma/find/chev.svg" width={20} height={20} />
    </button>
  );
}

function PhoneStatus() {
  const hide = useAppHidesFigmaChrome();
  if (hide) return null;
  return (
    <>
      <span style={{ position: 'absolute', left: 21, top: 14, width: 54, textAlign: 'center', fontSize: 14, fontWeight: 600, letterSpacing: -0.28, zIndex: 2 }}>9:41</span>
      <img src="/wallet-figma/welcome/status.svg" alt="" width={66.6} height={11.33} style={{ position: 'absolute', left: 288.67, top: 17.33, zIndex: 2 }} />
    </>
  );
}

function NoteStatus() {
  const hide = useAppHidesFigmaChrome();
  if (hide) return null;
  return (
    <>
      <span style={{ position: 'absolute', left: 28, top: 13, fontSize: 15, fontWeight: 600, zIndex: 3 }}>9:41</span>
      <img src="/wallet-figma/welcome/status.svg" alt="" width={66.6} height={11.33} style={{ position: 'absolute', left: 296, top: 17, zIndex: 3 }} />
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

const pillFlow: CSSProperties = { height: 40, margin: '8px auto 0', border: 'none', borderRadius: 22, background: '#1c2025', color: '#fff', display: 'flex', alignItems: 'center', gap: 8, padding: '9px 12px 9px 14px', fontFamily: font.sans, fontSize: 14, fontWeight: 500, cursor: 'pointer' };
function chainChip(on: boolean): CSSProperties {
  return { height: 40, minWidth: 108, border: 'none', borderRadius: 20, background: on ? '#accafe' : '#1c2025', color: on ? '#0c1018' : '#fff', fontFamily: font.sans, fontSize: 14, fontWeight: 600, cursor: 'pointer' };
}
const solidFlow: CSSProperties = { width: '100%', height: 55, marginTop: 16, borderRadius: 8, border: 'none', background: '#accafe', color: '#0c1018', fontFamily: font.sans, fontSize: 16, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 };
const outlineFlow: CSSProperties = { width: '100%', height: 55, marginTop: 10, borderRadius: 8, border: '1.5px solid #2a3447', background: 'transparent', color: '#accafe', fontFamily: font.sans, fontSize: 16, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 };
const iconBtn: CSSProperties = { border: 'none', background: 'none', padding: 0, cursor: 'pointer', display: 'flex', flexShrink: 0 };
const netBtn: CSSProperties = { position: 'absolute', left: 15, width: 358, height: 72, boxSizing: 'border-box', borderRadius: 14, border: '1px solid #2a3447', color: '#fff', fontFamily: font.sans, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12, padding: '0 13px' };
const fieldBox: CSSProperties = { width: '100%', height: 52, boxSizing: 'border-box', background: '#1c2025', borderRadius: 14, padding: '0 16px', color: '#fff', fontFamily: font.sans, fontSize: 15, outline: 'none' };
