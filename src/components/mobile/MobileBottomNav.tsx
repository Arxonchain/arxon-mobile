// v2.0 - Mobile UI Redesign: periwinkle nav, immersive space cards, crystal gem
import { motion, AnimatePresence } from 'framer-motion';
import { useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Trophy, Pickaxe, Swords, Send } from 'lucide-react';

const navItems = [
  { icon: LayoutDashboard, label: 'Home', path: '/', id: 'home' },
  { icon: Trophy, label: 'Ranks', path: '/leaderboard', id: 'leaderboard' },
  { icon: Pickaxe, label: 'Mine', path: '/mining', id: 'mining', center: true },
  { icon: Swords, label: 'Arena', path: '/arena', id: 'arena' },
  { icon: Send, label: 'Nexus', path: '/nexus', id: 'nexus' },
];

// Periwinkle brand color
const PERIWINKLE = '#9EB3E0';
const NAVY = '#1E3A5F';

export default function MobileBottomNav() {
  const location = useLocation();
  const navigate = useNavigate();

  const hiddenPaths = ['/auth', '/admin', '/landing', '/litepaper'];
  if (hiddenPaths.some(p => location.pathname.startsWith(p))) return null;

  return (
    <div style={{
      position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 100,
      padding: '0 16px 24px',
      background: 'linear-gradient(to top, #000 60%, transparent)',
    }}>
      <div style={{
        background: PERIWINKLE,
        borderRadius: '32px',
        border: '1px solid rgba(255,255,255,0.25)',
        padding: '10px 8px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-around',
        boxShadow: '0 4px 24px rgba(158,179,224,0.25)',
      }}>
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;

          if (item.center) {
            return (
              <motion.button
                key={item.path}
                whileTap={{ scale: 0.88 }}
                onClick={() => navigate(item.path)}
                style={{
                  width: 56, height: 56,
                  borderRadius: 18,
                  background: NAVY,
                  border: '2px solid rgba(255,255,255,0.3)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  marginTop: -16,
                  cursor: 'pointer',
                  boxShadow: '0 4px 16px rgba(30,58,95,0.5)',
                }}
              >
                <item.icon size={22} color="white" strokeWidth={2.2} />
              </motion.button>
            );
          }

          return (
            <motion.button
              key={item.path}
              whileTap={{ scale: 0.85 }}
              onClick={() => navigate(item.path)}
              style={{
                display: 'flex', flexDirection: 'column',
                alignItems: 'center', gap: 3,
                padding: '5px 14px',
                background: 'none', border: 'none',
                cursor: 'pointer', minWidth: 48,
              }}
            >
              <item.icon
                size={21}
                color={isActive ? NAVY : 'rgba(30,58,95,0.45)'}
                strokeWidth={isActive ? 2.5 : 2}
              />
              <AnimatePresence>
                {isActive && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0 }}
                    style={{
                      width: 4, height: 4, borderRadius: '50%',
                      background: NAVY,
                    }}
                  />
                )}
              </AnimatePresence>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
