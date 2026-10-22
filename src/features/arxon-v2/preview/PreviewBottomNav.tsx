import { useLocation } from 'react-router-dom';
import { useMobileNav } from '@/contexts/MobileNavContext';
import { APP_PREVIEW_BASE } from './AppPreviewContext';
import NeonBottomNav from '@/features/arxon-v2/layout/NeonBottomNav';
import { buildV2NavTabs } from '@/features/arxon-v2/layout/navTabs';

const tabs = buildV2NavTabs(APP_PREVIEW_BASE);
const base = APP_PREVIEW_BASE;

export default function PreviewBottomNav() {
  const location = useLocation();
  const { hideNav } = useMobileNav();

  if (hideNav) return null;

  const activeId = (() => {
    const p = location.pathname;
    if (p === `${base}/mining` || p.startsWith(`${base}/mining/`)) return 'mining';
    if (p === `${base}/arena` || p.startsWith(`${base}/arena/`)) return 'arena';
    if (p === `${base}/games` || p.startsWith(`${base}/games/`)) return 'games';
    if (p === `${base}/leaderboard` || p.startsWith(`${base}/leaderboard/`)) return 'leaderboard';
    if (p === `${base}/profile` || p.startsWith(`${base}/profile/`)) return 'profile';
    return 'home';
  })();

  return <NeonBottomNav tabs={tabs} activeId={activeId} layoutId="preview-nav-pill" position="absolute" />;
}
