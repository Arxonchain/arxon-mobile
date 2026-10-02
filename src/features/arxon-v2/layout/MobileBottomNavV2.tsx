import { useLocation } from 'react-router-dom';
import { useMobileNav } from '@/contexts/MobileNavContext';
import { useChainWallet } from '@/chainWallet/ChainWalletContext';
import NeonBottomNav from './NeonBottomNav';
import { buildV2NavTabs } from './navTabs';

const tabs = buildV2NavTabs();

const WALLET_PREFIXES = ['/send', '/receive', '/activity', '/connect', '/tx', '/wallet-settings', '/wallet'];

export default function MobileBottomNavV2() {
  const location = useLocation();
  const { hideNav } = useMobileNav();
  const { address } = useChainWallet();

  if (!address || hideNav) return null;
  if (['/auth', '/admin', '/word-forge'].some((p) => location.pathname.startsWith(p))) return null;

  const activeId = (() => {
    const path = location.pathname;
    if (path === '/' || WALLET_PREFIXES.some((p) => path === p || path.startsWith(`${p}/`))) return 'wallet';
    if (path === '/mine' || path.startsWith('/mining')) return 'home';
    for (const t of tabs.filter((tab) => tab.id !== 'wallet')) {
      if (path === t.to || path.startsWith(`${t.to}/`)) return t.id;
    }
    return 'wallet';
  })();

  return <NeonBottomNav tabs={tabs} activeId={activeId} layoutId="v2-nav-pill" position="fixed" />;
}
