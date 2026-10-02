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
    if (p.startsWith(`${APP_PREVIEW_BASE}/activity`) || p.startsWith(`${APP_PREVIEW_BASE}/tx`)) return 'activity';
    if (p.startsWith(`${APP_PREVIEW_BASE}/explore`)) return 'explore';
    if (p === APP_PREVIEW_BASE || p === `${APP_PREVIEW_BASE}/`) return 'portfolio';
    if (p.startsWith(`${APP_PREVIEW_BASE}/mine`) || p.startsWith(`${APP_PREVIEW_BASE}/arena`) || p.startsWith(`${APP_PREVIEW_BASE}/profile`) || p.startsWith(`${APP_PREVIEW_BASE}/games`) || p.startsWith(`${APP_PREVIEW_BASE}/word-forge`)) {
      return 'mine';
    }
    return 'portfolio';
  })();

  return <NeonBottomNav tabs={tabs} activeId={activeId} layoutId="preview-nav-pill" position="absolute" />;
}
