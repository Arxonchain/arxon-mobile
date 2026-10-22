import { useState, type CSSProperties } from 'react';
import { FigmaImg } from '@/walletFigma/icons';
import { font } from '@/walletFigma/tokens';
import { ARXON, DEFAULT_RPC, SCAN_URL } from '@/chainWallet/chain';
import { sessionStore } from '@/chainWallet/session';
import { useLiveFrame } from './liveFrame';
import { useAppHidesFigmaChrome } from './appChrome';
import { useWalletNetwork } from './WalletTabs';
import { applyNetwork, listNetworks, saveNetwork, selectedNetwork, type HomeNetwork } from './homeNetworks';

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
  const [pub, setPub] = useState(true);
  const [copied, setCopied] = useState(false);
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

  const address = live?.app ? live.receiveAddress || live.address || '' : ADDRESS;
  const qrSrc = live?.app && live.receiveQr ? live.receiveQr : art('qr.svg');

  async function copy() {
    if (!address) return;
    try { await navigator.clipboard?.writeText(address); } catch { /* preview still confirms */ }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1400);
  }

  function share() {
    if (!address) return;
    if (navigator.share) {
      navigator.share({ title: `${current.name} address`, text: address }).catch(() => undefined);
      return;
    }
    void copy();
  }

  return (
    <div style={{ position: 'relative', width: 390, height: 844, background: '#050505', overflow: 'hidden', fontFamily: font.sans, color: '#fff' }}>
      <style>{`.recv-field::placeholder{color:#8b9097}`}</style>
      {id === 'receive' && (
        <Receive current={current} pub={pub} setPub={setPub} copied={copied} onCopy={copy} onShare={share} go={go} leave={leave} address={address} qrSrc={qrSrc} />
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

function Receive({ current, pub, setPub, copied, onCopy, onShare, go, leave, address, qrSrc }: {
  current: Net; pub: boolean; setPub: (v: boolean) => void; copied: boolean; onCopy: () => void; onShare: () => void; go: Go; leave: () => void; address: string; qrSrc: string;
}) {
  const live = useLiveFrame();
  const copy = receiveCopy(current, !!live?.app);
  const warnTop = copy.privacy ? 620 : 534;
  return (
    <>
      <PhoneStatus />
      <Back top={56} onClick={leave} />
      <p style={{ position: 'absolute', left: 70, top: 65.5, width: 250, margin: 0, textAlign: 'center', fontSize: 17, fontWeight: 700 }}>Receive</p>
      <button type="button" onClick={() => go('network')} style={pill}>
        <FigmaImg src={art('dot.svg')} width={18} height={18} />
        <span>{current.pill}</span>
        <FigmaImg src={art('chev-down.svg')} width={16} height={16} />
      </button>
      <div style={{ position: 'absolute', left: 63, top: 180, width: 264, height: 264, borderRadius: 24, background: '#fff', overflow: 'hidden' }}>
        <img src={qrSrc} alt="" width={200} height={200} style={{ position: 'absolute', left: 32, top: 32 }} />
        <div style={{ position: 'absolute', left: 110, top: 110, width: 44, height: 44, boxSizing: 'border-box', borderRadius: 22, background: '#accafe', border: '4px solid #fff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0c1018', fontSize: 20, fontWeight: 700 }}>{copy.letter}</div>
      </div>
      <p style={{ position: 'absolute', left: 18, top: 466, width: 354, margin: 0, textAlign: 'center', fontSize: 13, color: '#8b9097' }}>{copy.caption}</p>
      <p style={{ position: 'absolute', left: 45, top: 488, width: 300, margin: 0, textAlign: 'center', fontSize: 15, fontWeight: 500, wordBreak: 'break-all' }}>{address}</p>
      {copy.privacy ? (
      <div style={{ position: 'absolute', left: 18, top: 534, width: 354, height: 72, boxSizing: 'border-box', background: '#1c2025', borderRadius: 14, display: 'flex', alignItems: 'center', gap: 12, padding: 14 }}>
        <span style={{ width: 36, height: 36, borderRadius: 18, background: '#2a3447', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <FigmaImg src="/wallet-figma/send/shield.svg" width={18} height={18} />
        </span>
        <span style={{ flex: 1, minWidth: 0 }}>
          <span style={{ display: 'block', fontSize: 14, fontWeight: 600 }}>Your public address</span>
          <span style={{ display: 'block', marginTop: 2, fontSize: 12, color: '#8b9097', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Every payment you receive gets a private receipt</span>
        </span>
        <button type="button" aria-label="Your public address" aria-pressed={pub} onClick={() => setPub(!pub)} style={iconBtn}>
          <FigmaImg src={pub ? '/wallet-figma/send/toggle-on.svg' : '/wallet-figma/send/toggle-off.svg'} width={pub ? 46 : 48} height={28} />
        </button>
      </div>
      ) : null}
      <div style={{ position: 'absolute', left: 22, top: warnTop, width: 346, display: 'flex', gap: 8 }}>
        <FigmaImg src={art('info.svg')} width={16} height={16} />
        <p style={{ margin: 0, width: 322, fontSize: 12, color: '#5c5f64', lineHeight: 1.35 }}>{copy.warn}</p>
      </div>
      <button type="button" onClick={onCopy} style={{ ...solid, top: warnTop + 44 }}>
        <FigmaImg src={art('copy.svg')} width={18} height={18} />
        {copied ? 'Copied' : 'Copy address'}
      </button>
      <button type="button" onClick={onShare} style={{ ...outline, top: warnTop + 109 }}>
        <FigmaImg src={art('share.svg')} width={18} height={18} />
        Share
      </button>
      <HomeBar />
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
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', background: '#11161f', border: '1px solid #2a3447', borderRadius: 16, padding: '12px 16px' }}>
          <FigmaImg src={art('info-card.svg')} width={16} height={16} />
          <p style={{ margin: 0, width: 290, fontSize: 13, color: '#8b9097', lineHeight: 1.35 }}>Only add networks you trust. A malicious network can see your activity.</p>
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

const pill: CSSProperties = { position: 'absolute', left: '50%', top: 124, transform: 'translateX(-50%)', height: 40, border: 'none', borderRadius: 22, background: '#1c2025', color: '#fff', display: 'flex', alignItems: 'center', gap: 8, padding: '9px 12px 9px 14px', fontFamily: font.sans, fontSize: 14, fontWeight: 500, cursor: 'pointer' };
const iconBtn: CSSProperties = { border: 'none', background: 'none', padding: 0, cursor: 'pointer', display: 'flex', flexShrink: 0 };
const solid: CSSProperties = { position: 'absolute', left: 19, width: 353, height: 55, borderRadius: 8, border: 'none', background: '#accafe', color: '#0c1018', fontFamily: font.sans, fontSize: 16, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 };
const outline: CSSProperties = { position: 'absolute', left: 19, width: 353, height: 55, borderRadius: 8, border: '1.5px solid #2a3447', background: 'transparent', color: '#accafe', fontFamily: font.sans, fontSize: 16, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 };
const netBtn: CSSProperties = { position: 'absolute', left: 15, width: 358, height: 72, boxSizing: 'border-box', borderRadius: 14, border: '1px solid #2a3447', color: '#fff', fontFamily: font.sans, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12, padding: '0 13px' };
const fieldBox: CSSProperties = { width: '100%', height: 52, boxSizing: 'border-box', background: '#1c2025', borderRadius: 14, padding: '0 16px', color: '#fff', fontFamily: font.sans, fontSize: 15, outline: 'none' };
