import { useLocation } from 'react-router-dom';
import { useMobileNav } from '@/contexts/MobileNavContext';
import { useChainWallet } from '@/chainWallet/ChainWalletContext';
import { useAppMode } from '@/walletFigma/flow/ModeShell';
import NeonBottomNav from './NeonBottomNav';
import { buildV2NavTabs } from './navTabs';

const tabs = buildV2NavTabs();

const BALANCES_PREFIXES = ['/balances', '/portfolio', '/wallet', '/connect', '/wallet-settings'];
const TESTNET_PREFIXES = ['/testnet', '/token'];
const SHARED_WALLET = ['/send', '/receive', '/activity', '/tx'];
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
  const { address, network } = useChainWallet();
  const mode = useAppMode();

  if (mode === 'wallet' || !address || hideNav) return null;
  if (['/auth', '/admin'].some((p) => location.pathname.startsWith(p))) return null;
  if (location.pathname === '/word-forge' || location.pathname.startsWith('/word-forge/')) return null;

  const activeId = (() => {
    const path = location.pathname;
    if (BALANCES_PREFIXES.some((p) => path === p || path.startsWith(`${p}/`))) return 'balances';
    if (TESTNET_PREFIXES.some((p) => path === p || path.startsWith(`${p}/`))) return 'testnet';
    if (SHARED_WALLET.some((p) => path === p || path.startsWith(`${p}/`))) {
      return network === 'arxon' ? 'testnet' : 'balances';
    }
    if (MINE_PREFIXES.some((p) => path === p || path.startsWith(`${p}/`))) return 'mine';
    return 'balances';
  })();

  return <NeonBottomNav tabs={tabs} activeId={activeId} layoutId="v2-nav-pill" position="fixed" />;
}
