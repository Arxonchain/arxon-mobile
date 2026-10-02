import { useLocation } from 'react-router-dom';
import { useMobileNav } from '@/contexts/MobileNavContext';
import { useChainWallet } from '@/chainWallet/ChainWalletContext';
import NeonBottomNav from './NeonBottomNav';
import { buildV2NavTabs } from './navTabs';

const tabs = buildV2NavTabs();

const PORTFOLIO_PREFIXES = ['/send', '/receive', '/connect', '/wallet-settings', '/wallet'];
const MINE_PREFIXES = [
  '/mine',
  '/mining',
  '/arena',
  '/games',
  '/profile',
  '/tasks',
  '/referrals',
  '/nexus',
  '/leaderboard',
  '/settings',
  '/notifications',
  '/points-history',
  '/word-forge',
];

export default function MobileBottomNavV2() {
  const location = useLocation();
  const { hideNav } = useMobileNav();
  const { address } = useChainWallet();

  if (!address || hideNav) return null;
  if (['/auth', '/admin'].some((p) => location.pathname.startsWith(p))) return null;
  if (location.pathname === '/word-forge' || location.pathname.startsWith('/word-forge/')) return null;

  const activeId = (() => {
    const path = location.pathname;
    if (path === '/activity' || path.startsWith('/tx')) return 'activity';
    if (path === '/explore' || path.startsWith('/explore/')) return 'explore';
    if (path === '/' || PORTFOLIO_PREFIXES.some((p) => path === p || path.startsWith(`${p}/`))) return 'portfolio';
    if (MINE_PREFIXES.some((p) => path === p || path.startsWith(`${p}/`))) return 'mine';
    return 'portfolio';
  })();

  return <NeonBottomNav tabs={tabs} activeId={activeId} layoutId="v2-nav-pill" position="fixed" />;
}
