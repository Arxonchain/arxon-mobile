import { motion, AnimatePresence } from 'framer-motion';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { LayoutDashboard, Trophy, Pickaxe, Swords, Send } from 'lucide-react';

const navItems = [
  { icon: LayoutDashboard, label: 'Home',   path: '/',            id: 'home' },
  { icon: Trophy,          label: 'Ranks',  path: '/leaderboard', id: 'leaderboard' },
  { icon: Pickaxe,         label: 'Mine',   path: '/mining',      id: 'mining', center: true },
  { icon: Swords,          label: 'Arena',  path: '/arena',       id: 'arena' },
  { icon: Send,            label: 'Nexus',  path: '/nexus',       id: 'nexus' },
];

export default function MobileBottomNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user }  = useAuth();

  if (!user) return null;
  const hidden = ['/auth', '/admin', '/landing', '/litepaper'];
  if (hidden.some(p => location.pathname.startsWith(p))) return null;

  return (
    <div style={{
      position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 200,
      padding: '8px 20px calc(env(safe-area-inset-bottom, 0px) + 12px)',
      background: 'linear-gradient(to top, #000 60%, transparent)',
    }}>
      <div style={{
        background: 'rgba(8,12,22,0.97)',
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        borderRadius: 32,
        border: '1px solid rgba(139,174,214,0.1)',
        padding: '10px 0',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-around',
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
                  width: 56, height: 56, borderRadius: 18,
                  background: 'linear-gradient(135deg, #1E3A5F, #0c2040)',
                  border: '1.5px solid rgba(139,174,214,0.35)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  marginTop: -16, cursor: 'pointer',
                  boxShadow: '0 4px 20px rgba(30,58,95,0.6), 0 0 0 1px rgba(139,174,214,0.1)',
                  flexShrink: 0,
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
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                padding: '5px 18px', background: 'none', border: 'none',
                cursor: 'pointer', minWidth: 52,
              }}
            >
              <item.icon
                size={20}
                color={isActive ? '#8BAED6' : 'rgba(139,174,214,0.3)'}
                strokeWidth={isActive ? 2.5 : 2}
                style={{ filter: isActive ? 'drop-shadow(0 0 5px rgba(139,174,214,0.5))' : 'none', transition: 'all 0.18s' }}
              />
              <AnimatePresence>
                {isActive && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0 }}
                    style={{ width: 4, height: 4, borderRadius: '50%', background: '#8BAED6' }}
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
