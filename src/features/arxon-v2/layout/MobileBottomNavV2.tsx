import { NavLink, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { useMobileNav } from '@/contexts/MobileNavContext';
import { WORD_FORGE_ENABLED } from '@/lib/wordForgeFeature';
import { v2 } from '@/features/arxon-v2/design/tokens';

const tabs = [
  { to: '/', id: 'home', label: 'Home', accent: v2.brand.steel, icon: (a: boolean) => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <path d="M4 10.5L12 4l8 6.5V20a1 1 0 01-1 1h-5v-6H10v6H5a1 1 0 01-1-1v-9.5z" fill={a ? `${v2.brand.steel}33` : 'none'} stroke={a ? v2.brand.steel : v2.brand.muted} strokeWidth="1.8" strokeLinejoin="round" />
    </svg>
  )},
  { to: '/mining', id: 'mining', label: 'Mine', accent: v2.accent.mining, icon: (a: boolean) => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="4" fill={a ? `${v2.accent.mining}33` : 'none'} stroke={a ? v2.accent.mining : v2.brand.muted} strokeWidth="1.8" />
      <circle cx="12" cy="12" r="9" stroke={a ? `${v2.accent.mining}55` : `${v2.brand.muted}44`} strokeWidth="1.2" strokeDasharray="3 3" />
    </svg>
  )},
  { to: '/arena', id: 'arena', label: 'Arena', accent: v2.accent.arena, icon: (a: boolean) => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <path d="M14.5 17.5L3 6V3h3l11.5 11.5M9.5 17.5L21 6V3h-3L9.5 14.5" stroke={a ? v2.accent.arena : v2.brand.muted} strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  )},
  ...(WORD_FORGE_ENABLED ? [{ to: '/games', id: 'games', label: 'Play', accent: v2.accent.cyan, icon: (a: boolean) => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <rect x="4" y="6" width="16" height="12" rx="3" fill={a ? `${v2.accent.cyan}22` : 'none'} stroke={a ? v2.accent.cyan : v2.brand.muted} strokeWidth="1.8" />
      <path d="M10 10v4M8 12h4" stroke={a ? v2.accent.cyan : v2.brand.muted} strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  )}] : [{ to: '/leaderboard', id: 'leaderboard', label: 'Ranks', accent: v2.accent.gold, icon: (a: boolean) => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z" fill={a ? `${v2.accent.gold}22` : 'none'} stroke={a ? v2.accent.gold : v2.brand.muted} strokeWidth="1.7" strokeLinejoin="round" />
    </svg>
  )}]),
  { to: '/profile', id: 'profile', label: 'You', accent: v2.brand.steelLight, icon: (a: boolean) => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="8" r="4" fill={a ? `${v2.brand.steel}33` : 'none'} stroke={a ? v2.brand.steel : v2.brand.muted} strokeWidth="1.8" />
      <path d="M4 21c0-3.3 3.6-6 8-6s8 2.7 8 6" stroke={a ? v2.brand.steel : v2.brand.muted} strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  )},
];

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

  return (
    <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 200, paddingBottom: 'env(safe-area-inset-bottom, 0px)', background: 'linear-gradient(to top, hsl(225 30% 3%) 70%, transparent)' }}>
      <div style={{ margin: '0 12px 12px', borderRadius: 26, padding: '6px 4px', display: 'flex', background: 'linear-gradient(180deg, hsl(225 26% 9% / 0.97), hsl(225 30% 5% / 0.99))', backdropFilter: 'blur(44px)', border: `1px solid ${v2.brand.steel}22`, boxShadow: `0 -8px 40px hsl(225 35% 3% / 0.7), inset 0 1px 0 ${v2.brand.steel}12` }}>
        {tabs.map(({ to, id, label, icon, accent }) => {
          const isActive = id === activeId;
          return (
            <NavLink key={to} to={to} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, padding: '8px 0', textDecoration: 'none', position: 'relative' }}>
              {isActive && (
                <motion.div layoutId="v2-nav-pill" style={{ position: 'absolute', inset: '2px 4px', borderRadius: 18, background: `${accent}18`, border: `1px solid ${accent}44`, boxShadow: `0 4px 16px ${accent}22` }} transition={{ type: 'spring', stiffness: 380, damping: 32 }} />
              )}
              <div style={{ position: 'relative', zIndex: 1 }}>{icon(isActive)}</div>
              <span style={{ position: 'relative', zIndex: 1, fontSize: 9, fontWeight: 800, letterSpacing: '0.06em', color: isActive ? accent : v2.brand.muted, fontFamily: v2.font }}>{label}</span>
              {isActive && <div style={{ position: 'absolute', bottom: 4, width: 4, height: 4, borderRadius: '50%', background: accent, boxShadow: `0 0 8px ${accent}` }} />}
            </NavLink>
          );
        })}
      </div>
    </div>
  );
}
