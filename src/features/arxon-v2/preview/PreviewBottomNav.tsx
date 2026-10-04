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
    if (p.startsWith(`${APP_PREVIEW_BASE}/testnet`)) return 'testnet';
    if (
      p.startsWith(`${APP_PREVIEW_BASE}/balances`) ||
      p.startsWith(`${APP_PREVIEW_BASE}/portfolio`) ||
      p.startsWith(`${APP_PREVIEW_BASE}/activity`) ||
      p.startsWith(`${APP_PREVIEW_BASE}/tx`)
    ) {
      return 'balances';
    }
    return 'mine';
  })();

  return <NeonBottomNav tabs={tabs} activeId={activeId} layoutId="preview-nav-pill" position="absolute" />;
}
