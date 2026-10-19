import { useNavigate } from 'react-router-dom';
import { useChainWallet } from '@/chainWallet/ChainWalletContext';
import { shortAddr } from '@/chainWallet/ui';
import { font, ink, page } from './tokens';

const ROWS = [
  { title: 'Default privacy', body: 'What each new payment hides', to: '/privacy-defaults' },
  { title: 'Face ID & password', body: 'Unlock, and the lock on the Vault', to: '/wallet-settings' },
  { title: 'Arxon Mining', body: 'Not set up until you open it', to: '/mine' },
  { title: 'Help & support', body: 'Report a problem. Never send keys or balances.', to: '/settings' },
  { title: 'Currency', body: 'USD', to: '/wallet-settings' },
];

export default function AccountScreen() {
  const navigate = useNavigate();
  const { address } = useChainWallet();
  return (
    <div style={page}>
      <h1 style={{ margin: '8px 0 0', fontSize: 26, fontWeight: 700 }}>Account</h1>
      <p style={{ margin: '8px 0 18px', color: '#8b9097', fontSize: 14 }}>
        {address ? shortAddr(address) : 'No wallet on this phone yet'} · keys stay on this phone
      </p>
      <div style={{ background: ink.card, borderRadius: 16, overflow: 'hidden' }}>
        {ROWS.map((row) => (
          <button
            key={row.title}
            type="button"
            onClick={() => navigate(row.to)}
            style={{
              width: '100%',
              textAlign: 'left',
              background: 'none',
              border: 'none',
              borderBottom: `1px solid ${ink.page}`,
              color: ink.text,
              fontFamily: font.sans,
              padding: 16,
              cursor: 'pointer',
            }}
          >
            <span style={{ display: 'block', fontSize: 16, fontWeight: 600 }}>{row.title}</span>
            <span style={{ display: 'block', marginTop: 4, fontSize: 12, color: '#8b9097' }}>{row.body}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
