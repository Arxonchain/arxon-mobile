import { motion, AnimatePresence } from 'framer-motion';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

// High-quality custom SVG icons
const Icons = {
  dashboard: (active: boolean) => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <rect x="3" y="3" width="7" height="7" rx="2" fill={active ? '#8BAED6' : 'none'} stroke={active ? '#8BAED6' : 'rgba(139,174,214,0.4)'} strokeWidth="1.8"/>
      <rect x="14" y="3" width="7" height="7" rx="2" fill={active ? 'rgba(139,174,214,0.3)' : 'none'} stroke={active ? '#8BAED6' : 'rgba(139,174,214,0.4)'} strokeWidth="1.8"/>
      <rect x="3" y="14" width="7" height="7" rx="2" fill={active ? 'rgba(139,174,214,0.3)' : 'none'} stroke={active ? '#8BAED6' : 'rgba(139,174,214,0.4)'} strokeWidth="1.8"/>
      <rect x="14" y="14" width="7" height="7" rx="2" fill={active ? 'rgba(139,174,214,0.5)' : 'none'} stroke={active ? '#8BAED6' : 'rgba(139,174,214,0.4)'} strokeWidth="1.8"/>
    </svg>
  ),
  leaderboard: (active: boolean) => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <path d="M12 2L9.5 8H3L8 12L6 18L12 14.5L18 18L16 12L21 8H14.5L12 2Z"
        fill={active ? 'rgba(200,150,60,0.3)' : 'none'}
        stroke={active ? '#C8963C' : 'rgba(139,174,214,0.4)'}
        strokeWidth="1.8" strokeLinejoin="round"/>
    </svg>
  ),
  wallet: (active: boolean) => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <rect x="2" y="5" width="20" height="15" rx="3" fill={active ? 'rgba(139,174,214,0.2)' : 'none'} stroke={active ? '#8BAED6' : 'rgba(139,174,214,0.4)'} strokeWidth="1.8"/>
      <path d="M2 10H22" stroke={active ? '#8BAED6' : 'rgba(139,174,214,0.4)'} strokeWidth="1.8"/>
      <circle cx="17" cy="15" r="1.5" fill={active ? '#8BAED6' : 'rgba(139,174,214,0.4)'}/>
      <path d="M7 4V7" stroke={active ? '#8BAED6' : 'rgba(139,174,214,0.35)'} strokeWidth="1.8" strokeLinecap="round"/>
      <path d="M12 3V7" stroke={active ? '#8BAED6' : 'rgba(139,174,214,0.35)'} strokeWidth="1.8" strokeLinecap="round"/>
      <path d="M17 4V7" stroke={active ? '#8BAED6' : 'rgba(139,174,214,0.35)'} strokeWidth="1.8" strokeLinecap="round"/>
    </svg>
  ),
  profile: (active: boolean) => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="8" r="4" fill={active ? 'rgba(139,174,214,0.3)' : 'none'} stroke={active ? '#8BAED6' : 'rgba(139,174,214,0.4)'} strokeWidth="1.8"/>
      <path d="M4 20C4 17 7.6 14.5 12 14.5C16.4 14.5 20 17 20 20" stroke={active ? '#8BAED6' : 'rgba(139,174,214,0.4)'} strokeWidth="1.8" strokeLinecap="round"/>
    </svg>
  ),
};

const navItems = [
  { id: 'home',        label: 'Home',        path: '/',            icon: Icons.dashboard },
  { id: 'leaderboard', label: 'Ranks',       path: '/leaderboard', icon: Icons.leaderboard },
  { id: 'wallet',      label: 'Wallet',      path: '/wallet',      icon: Icons.wallet },
  { id: 'profile',     label: 'Profile',     path: '/profile',     icon: Icons.profile },
];

export default function MobileBottomNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();

  if (!user) return null;
  const hidden = ['/auth', '/admin', '/landing', '/litepaper'];
  if (hidden.some(p => location.pathname.startsWith(p))) return null;

  const current = navItems.find(i =>
    i.path === '/' ? location.pathname === '/' : location.pathname.startsWith(i.path)
  )?.id;

  return (
    <div style={{
      position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 200,
      background: 'linear-gradient(to top, #000 70%, transparent)',
      paddingBottom: 'env(safe-area-inset-bottom, 8px)',
    }}>
      <div style={{
        margin: '0 12px 10px',
        background: 'rgba(10,14,28,0.95)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderRadius: 24,
        border: '1px solid rgba(139,174,214,0.12)',
        padding: '8px 4px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-around',
        boxShadow: '0 -2px 30px rgba(0,0,0,0.6), inset 0 1px 0 rgba(139,174,214,0.06)',
      }}>
        {navItems.map((item) => {
          const isActive = item.id === current;
          return (
            <motion.button
              key={item.id}
              whileTap={{ scale: 0.88 }}
              onClick={() => navigate(item.path)}
              style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                padding: '8px 20px', background: 'none', border: 'none',
                cursor: 'pointer', position: 'relative', minWidth: 60,
                WebkitTapHighlightColor: 'transparent',
              }}
            >
              {/* Active background pill */}
              <AnimatePresence>
                {isActive && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    style={{
                      position: 'absolute', inset: '2px 6px',
                      background: 'rgba(139,174,214,0.1)',
                      borderRadius: 14,
                      border: '1px solid rgba(139,174,214,0.2)',
                    }}
                  />
                )}
              </AnimatePresence>
              <div style={{ position: 'relative', zIndex: 1,
                filter: isActive ? 'drop-shadow(0 0 6px rgba(139,174,214,0.5))' : 'none',
                transition: 'filter 0.2s' }}>
                {item.icon(isActive)}
              </div>
              <span style={{
                fontSize: 9, fontWeight: isActive ? 700 : 500,
                color: isActive ? '#8BAED6' : 'rgba(139,174,214,0.35)',
                letterSpacing: '0.04em', textTransform: 'uppercase',
                position: 'relative', zIndex: 1, transition: 'color 0.2s',
              }}>
                {item.label}
              </span>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
