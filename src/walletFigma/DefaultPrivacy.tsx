import { useState, type CSSProperties } from 'react';
import { useNavigate } from 'react-router-dom';
import { FLAG_COPY, type PrivacyFlags } from '@/chainWallet/privacy';
import { hiddenCount, privacyPill, readDefaultPrivacy, writeDefaultPrivacy } from './privacyPrefs';
import { font, ink, page } from './tokens';

export default function DefaultPrivacy() {
  const navigate = useNavigate();
  const [flags, setFlags] = useState<PrivacyFlags>(readDefaultPrivacy);

  function toggle(key: keyof PrivacyFlags) {
    setFlags((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  return (
    <div style={page}>
      <button type="button" onClick={() => navigate(-1)} style={back}>Back</button>
      <h1 style={{ margin: '18px 0 0', fontSize: 26, fontWeight: 700 }}>Default privacy</h1>
      <p style={{ color: '#8b9097', fontSize: 14, lineHeight: 1.45 }}>
        Privacy is a toggle. These four choices are the starting point for each payment. You can still change them on a single send.
      </p>
      <p style={{ color: ink.accent, fontWeight: 600, fontSize: 13 }}>{privacyPill(flags).replace('hidden', 'details hidden')}</p>
      <div style={{ background: ink.card, borderRadius: 16, overflow: 'hidden' }}>
        {FLAG_COPY.map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => toggle(item.key)}
            style={row}
          >
            <span>
              <span style={{ display: 'block', fontSize: 15, fontWeight: 500 }}>{item.label}</span>
              <span style={{ display: 'block', marginTop: 2, fontSize: 12, color: '#8b9097' }}>
                {flags[item.key] ? 'Hidden on new payments' : 'Visible on new payments'}
              </span>
            </span>
            <span style={{ ...pill, background: flags[item.key] ? ink.accent : ink.raised, color: flags[item.key] ? ink.accentText : ink.secondary }}>
              {flags[item.key] ? 'On' : 'Off'}
            </span>
          </button>
        ))}
      </div>
      <p style={{ color: ink.muted, fontSize: 12 }}>
        {hiddenCount(flags) === 0 ? 'Your current mode leaves every detail public.' : 'Your current mode is saved on this phone and applied to the next payment.'}
      </p>
      <button
        type="button"
        style={cta}
        onClick={() => {
          writeDefaultPrivacy(flags);
          navigate(-1);
        }}
      >
        Save defaults
      </button>
    </div>
  );
}

const back: CSSProperties = {
  background: 'none',
  border: 'none',
  color: ink.accent,
  fontFamily: font.sans,
  fontSize: 14,
  fontWeight: 600,
  padding: 0,
  cursor: 'pointer',
};
const row: CSSProperties = {
  width: '100%',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 12,
  padding: 14,
  background: 'none',
  border: 'none',
  borderBottom: `1px solid ${ink.page}`,
  color: ink.text,
  fontFamily: font.sans,
  textAlign: 'left',
  cursor: 'pointer',
};
const pill: CSSProperties = {
  borderRadius: 20,
  padding: '6px 12px',
  fontSize: 13,
  fontWeight: 600,
};
const cta: CSSProperties = {
  marginTop: 8,
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
