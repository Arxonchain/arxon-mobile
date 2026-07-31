import { NavLink, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { useMobileNav } from '@/contexts/MobileNavContext';
import { WORD_FORGE_ENABLED } from '@/lib/wordForgeFeature';
import { neon } from '@/features/arxon-v2/design/neonTokens';

const tabs = [
  { to: '/', id: 'home', label: 'Home', accent: neon.cyan, icon: (a: boolean) => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <path d="M4 10.5L12 4l8 6.5V20a1 1 0 01-1 1h-5v-6H10v6H5a1 1 0 01-1-1v-9.5z" fill={a ? `${neon.cyan}33` : 'none'} stroke={a ? neon.cyan : 'rgba(232,252,255,0.35)'} strokeWidth="1.8" strokeLinejoin="round" />
    </svg>
  )},
  { to: '/mining', id: 'mining', label: 'Mine', accent: neon.teal, icon: (a: boolean) => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="4" fill={a ? `${neon.teal}33` : 'none'} stroke={a ? neon.teal : 'rgba(232,252,255,0.35)'} strokeWidth="1.8" />
      <circle cx="12" cy="12" r="9" stroke={a ? `${neon.teal}55` : 'rgba(232,252,255,0.2)'} strokeWidth="1.2" strokeDasharray="3 3" />
    </svg>
  )},
  { to: '/arena', id: 'arena', label: 'Arena', accent: neon.purple, icon: (a: boolean) => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <path d="M14.5 17.5L3 6V3h3l11.5 11.5M9.5 17.5L21 6V3h-3L9.5 14.5" stroke={a ? neon.purple : 'rgba(232,252,255,0.35)'} strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  )},
  ...(WORD_FORGE_ENABLED ? [{ to: '/games', id: 'games', label: 'Play', accent: neon.cyan, icon: (a: boolean) => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <rect x="4" y="6" width="16" height="12" rx="3" fill={a ? `${neon.cyan}22` : 'none'} stroke={a ? neon.cyan : 'rgba(232,252,255,0.35)'} strokeWidth="1.8" />
      <path d="M10 10v4M8 12h4" stroke={a ? neon.cyan : 'rgba(232,252,255,0.35)'} strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  )}] : [{ to: '/leaderboard', id: 'leaderboard', label: 'Ranks', accent: neon.gold, icon: (a: boolean) => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z" fill={a ? `${neon.gold}22` : 'none'} stroke={a ? neon.gold : 'rgba(232,252,255,0.35)'} strokeWidth="1.7" strokeLinejoin="round" />
    </svg>
  )}]),
  { to: '/profile', id: 'profile', label: 'You', accent: neon.cyan, icon: (a: boolean) => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="8" r="4" fill={a ? `${neon.cyan}33` : 'none'} stroke={a ? neon.cyan : 'rgba(232,252,255,0.35)'} strokeWidth="1.8" />
      <path d="M4 21c0-3.3 3.6-6 8-6s8 2.7 8 6" stroke={a ? neon.cyan : 'rgba(232,252,255,0.35)'} strokeWidth="1.8" strokeLinecap="round" />
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
    <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 200, paddingBottom: 'env(safe-area-inset-bottom, 0px)', background: `linear-gradient(to top, ${neon.deep} 70%, transparent)` }}>
      <div style={{
        margin: '0 12px 12px', borderRadius: 26, padding: '6px 4px', display: 'flex',
        background: 'rgba(255,255,255,0.04)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
        border: '1px solid rgba(255,255,255,0.08)', boxShadow: '0 -8px 40px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.06)',
      }}>
        {tabs.map(({ to, id, label, icon, accent }) => {
          const isActive = id === activeId;
          return (
            <NavLink key={to} to={to} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, padding: '8px 0', textDecoration: 'none', position: 'relative' }}>
              {isActive && (
                <motion.div layoutId="v2-nav-pill" style={{ position: 'absolute', inset: '2px 4px', borderRadius: 18, background: `${accent}18`, border: `1px solid ${accent}44`, boxShadow: `0 4px 16px ${accent}22` }} transition={{ type: 'spring', stiffness: 380, damping: 32 }} />
              )}
              <div style={{ position: 'relative', zIndex: 1 }}>{icon(isActive)}</div>
              <span style={{ position: 'relative', zIndex: 1, fontSize: 9, fontWeight: 800, letterSpacing: '0.06em', color: isActive ? accent : 'rgba(232,252,255,0.4)', fontFamily: neon.font }}>{label}</span>
              {isActive && <div style={{ position: 'absolute', bottom: 4, width: 4, height: 4, borderRadius: '50%', background: accent, boxShadow: `0 0 8px ${accent}` }} />}
            </NavLink>
          );
        })}
      </div>
    </div>
  );
}
