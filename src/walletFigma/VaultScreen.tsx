import type { CSSProperties, ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { useChainWallet } from '@/chainWallet/ChainWalletContext';
import { useHideBalance } from '@/chainWallet/hideBalance';
import { FigmaImg } from './icons';
import { font, ink, page } from './tokens';

export default function VaultScreen() {
  const navigate = useNavigate();
  const { shieldedBalance } = useChainWallet();
  const { show } = useHideBalance();
  const empty = Number(shieldedBalance) === 0;

  if (!empty) {
    return (
      <div style={page}>
        <h1 style={title}>Vault</h1>
        <p style={{ margin: '8px 0 0', fontSize: 48, fontWeight: 700 }}>{show(`${trim(shieldedBalance)} tARX`)}</p>
        <p style={{ margin: '6px 0 0', color: ink.secondary, fontSize: 14 }}>Hidden · no price on Vault funds</p>
        <p style={{ margin: '18px 0 0', color: '#8b9097', fontSize: 14, lineHeight: 1.45 }}>
          These funds are off your Home balance. Send them from the Vault, or move them back to Home before a swap.
        </p>
        <div style={{ display: 'flex', gap: 10, marginTop: 22 }}>
          <button type="button" style={primary} onClick={() => navigate('/send?mode=shield&net=arxon')}>To Vault</button>
          <button type="button" style={ghost} onClick={() => navigate('/send?net=arxon')}>Send</button>
          <button type="button" style={ghost} onClick={() => navigate('/send?mode=unshield&net=arxon')}>To Home</button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ ...page, display: 'flex', flexDirection: 'column' }}>
      <h1 style={title}>Vault</h1>
      <div style={intro}>
        <span style={mark}>
          <FigmaImg src="/wallet-figma/vault-mark.svg" width={36} height={36} alt="" />
        </span>
        <p style={{ margin: 0, fontSize: 22, fontWeight: 700, textAlign: 'center' }}>Keep funds private</p>
        <p style={{ margin: 0, color: '#8b9097', fontSize: 14, textAlign: 'center', lineHeight: 1.45 }}>
          Move funds into your Vault to hide them from your Home balance. Move them back any time.
        </p>
      </div>
      <p style={{ margin: '22px 4px 8px', color: ink.muted, fontSize: 12, fontWeight: 600, letterSpacing: 0.4 }}>HOW IT WORKS</p>
      <div style={list}>
        <Row
          icon={<FigmaImg src="/wallet-figma/eye-off.svg" width={16} height={16} alt="" />}
          title="Hidden from Home"
          body="Not counted in your Home balance"
        />
        <Row
          icon={<FigmaImg src="/wallet-figma/shield-row.svg" width={16.2} height={16.2} alt="" />}
          title="Same recovery phrase"
          body="Nothing extra to back up"
        />
        <Row
          icon={<FigmaImg src="/wallet-figma/swap-row.svg" width={18} height={18} alt="" />}
          title="Move back any time"
          body="Return funds to Home to send or swap"
        />
      </div>
      <div style={{ flex: 1 }} />
      <button type="button" style={cta} onClick={() => navigate('/send?mode=shield&net=arxon')}>
        Move funds to Vault
      </button>
    </div>
  );
}

function trim(v: string) {
  const n = Number(v);
  if (!Number.isFinite(n)) return '0';
  return n.toLocaleString(undefined, { maximumFractionDigits: 4 });
}

function Row({ icon, title, body }: { icon: ReactNode; title: string; body: string }) {
  return (
    <div style={{ display: 'flex', gap: 12, alignItems: 'center', padding: 14 }}>
      <span style={{ width: 36, height: 36, borderRadius: 18, background: ink.raised, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{icon}</span>
      <span>
        <span style={{ display: 'block', fontSize: 15, fontWeight: 500 }}>{title}</span>
        <span style={{ display: 'block', marginTop: 2, fontSize: 12, color: '#8b9097' }}>{body}</span>
      </span>
    </div>
  );
}

const title: CSSProperties = { margin: '8px 0 0', fontSize: 26, fontWeight: 700 };
const intro: CSSProperties = {
  marginTop: 18,
  background: ink.card,
  borderRadius: 16,
  padding: 24,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: 12,
};
const mark: CSSProperties = {
  width: 64,
  height: 64,
  borderRadius: 32,
  background: ink.raised,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
};
const list: CSSProperties = { background: ink.card, borderRadius: 16, overflow: 'hidden' };
const cta: CSSProperties = {
  marginTop: 24,
  height: 55,
  border: 'none',
  borderRadius: 8,
  background: ink.accent,
  color: ink.accentText,
  fontFamily: font.sans,
  fontSize: 16,
  fontWeight: 600,
  cursor: 'pointer',
};
const primary: CSSProperties = { ...cta, flex: 1, marginTop: 0 };
const ghost: CSSProperties = {
  ...cta,
  flex: 1,
  marginTop: 0,
  background: ink.card,
  color: ink.text,
};
