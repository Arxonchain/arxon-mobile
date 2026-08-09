import { useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useMobileNav } from '@/contexts/MobileNavContext';
import NeonBottomNav from './NeonBottomNav';
import { buildV2NavTabs } from './navTabs';

const tabs = buildV2NavTabs();

export default function MobileBottomNavV2() {
  const location = useLocation();
  const { user } = useAuth();
  const { hideNav } = useMobileNav();

  if (!user || hideNav) return null;
  if (['/auth', '/admin', '/word-forge'].some((p) => location.pathname.startsWith(p))) return null;

  const activeId = (() => {
    if (location.pathname === '/') return 'home';
    for (const t of tabs.slice(1)) if (location.pathname.startsWith(t.to)) return t.id;
    return 'home';
  })();

  return <NeonBottomNav tabs={tabs} activeId={activeId} layoutId="v2-nav-pill" position="fixed" />;
}
