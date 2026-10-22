import { useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useMobileNav } from '@/contexts/MobileNavContext';
import { useAppMode } from '@/walletFigma/flow/ModeShell';
import NeonBottomNav from './NeonBottomNav';
import { buildV2NavTabs } from './navTabs';

const tabs = buildV2NavTabs();

const HOME_PREFIXES = ['/mine', '/tasks', '/referrals', '/nexus', '/notifications', '/points-history', '/settings'];

export default function MobileBottomNavV2() {
  const location = useLocation();
  const { hideNav } = useMobileNav();
  const { user } = useAuth();
  const mode = useAppMode();

  if (mode !== 'mining' || !user || hideNav) return null;
  if (['/auth', '/admin'].some((p) => location.pathname.startsWith(p))) return null;
  if (location.pathname === '/word-forge' || location.pathname.startsWith('/word-forge/')) return null;

  const activeId = (() => {
    const path = location.pathname;
    if (path === '/mining' || path.startsWith('/mining/')) return 'mining';
    if (path === '/arena' || path.startsWith('/arena/')) return 'arena';
    if (path === '/games' || path.startsWith('/games/')) return 'games';
    if (path === '/leaderboard' || path.startsWith('/leaderboard/')) return 'leaderboard';
    if (path === '/profile' || path.startsWith('/profile/')) return 'profile';
    if (HOME_PREFIXES.some((p) => path === p || path.startsWith(`${p}/`))) return 'home';
    return 'home';
  })();

  return <NeonBottomNav tabs={tabs} activeId={activeId} layoutId="v2-nav-pill" position="fixed" />;
}
