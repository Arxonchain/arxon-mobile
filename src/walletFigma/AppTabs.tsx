import { useLocation, useNavigate } from 'react-router-dom';
import { useChainWallet } from '@/chainWallet/ChainWalletContext';
import { FigmaImg } from './icons';
import { font, ink } from './tokens';

type TabId = 'home' | 'vault' | 'explore' | 'history' | 'account' | 'testnet';

const TABS: { id: TabId; label: string; icon: string; w: number; h: number }[] = [
  { id: 'home', label: 'Home', icon: '/wallet-figma/tab-home.svg', w: 22, h: 22 },
  { id: 'vault', label: 'Vault', icon: '/wallet-figma/tab-vault.svg', w: 22, h: 23 },
  { id: 'explore', label: 'Explore', icon: '/wallet-figma/tab-explore.svg', w: 22, h: 22 },
  { id: 'history', label: 'History', icon: '/wallet-figma/tab-history.svg', w: 20, h: 20 },
  { id: 'account', label: 'Account', icon: '/wallet-figma/tab-account.svg', w: 22, h: 22 },
  { id: 'testnet', label: 'Testnet', icon: '/wallet-figma/receive/globe-test.svg', w: 20, h: 20 },
];

function activeTab(path: string): TabId | null {
  if (path === '/' || path === '/balances' || path === '/portfolio') return 'home';
  if (path.startsWith('/vault')) return 'vault';
  if (path.startsWith('/explore') || path.startsWith('/market')) return 'explore';
  if (path.startsWith('/activity') || path.startsWith('/tx')) return 'history';
  if (path.startsWith('/account') || path.startsWith('/privacy-defaults') || path.startsWith('/wallet-settings')) return 'account';
  if (path.startsWith('/testnet') || path.startsWith('/token')) return 'testnet';
  return null;
}

/** Real-app tab bar. No status clock and no home-indicator artwork. */
export default function AppTabs() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { network } = useChainWallet();
  const current = activeTab(pathname);

  function go(id: TabId) {
    if (id === 'home') navigate('/');
    else if (id === 'vault') navigate('/vault');
    else if (id === 'explore') navigate('/explore');
    else if (id === 'history') navigate(network === 'arxon' ? '/activity?net=arxon' : '/activity');
    else if (id === 'account') navigate('/account');
    else navigate('/testnet');
  }

  return (
    <nav
      style={{
        position: 'fixed',
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 40,
        background: ink.page,
        borderTop: `1px solid ${ink.border}`,
        display: 'flex',
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}
    >
      {TABS.map((tab) => {
        const on = tab.id === current;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => go(tab.id)}
            style={{
              flex: 1,
              minWidth: 0,
              height: 62,
              background: 'none',
              border: 'none',
              color: on ? ink.accent : ink.secondary,
              fontFamily: font.sans,
              fontSize: 10,
              fontWeight: 600,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 4,
              cursor: 'pointer',
              padding: 0,
            }}
          >
            <FigmaImg src={tab.icon} width={tab.w} height={tab.h} alt="" />
            {tab.label}
          </button>
        );
      })}
    </nav>
  );
}

export function isWalletTabPath(path: string) {
  return activeTab(path) != null || path === '/send' || path === '/receive';
}
