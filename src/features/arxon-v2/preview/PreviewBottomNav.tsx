import { useLocation } from 'react-router-dom';
import { useMobileNav } from '@/contexts/MobileNavContext';
import { APP_PREVIEW_BASE } from './AppPreviewContext';
import NeonBottomNav from '@/features/arxon-v2/layout/NeonBottomNav';
import { buildV2NavTabs } from '@/features/arxon-v2/layout/navTabs';

const tabs = buildV2NavTabs(APP_PREVIEW_BASE);

export default function PreviewBottomNav() {
  const location = useLocation();
  const { hideNav } = useMobileNav();

  if (hideNav) return null;

  const activeId = (() => {
    const p = location.pathname;
    if (p === APP_PREVIEW_BASE || p === `${APP_PREVIEW_BASE}/`) return 'home';
    for (const t of tabs.slice(1)) if (p.startsWith(t.to)) return t.id;
    return 'home';
  })();

  return <NeonBottomNav tabs={tabs} activeId={activeId} layoutId="preview-nav-pill" position="absolute" />;
}
