import { memo } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { LayoutDashboard, Pickaxe, Swords, Trophy, Wallet } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const navItems = [
  { icon: LayoutDashboard, label: 'Home',        path: '/' },
  { icon: Trophy,          label: 'Leaderboard', path: '/leaderboard' },
  { icon: Pickaxe,         label: 'Mine',        path: '/mining' },
  { icon: Swords,          label: 'Arena',       path: '/arena' },
  { icon: Wallet,          label: 'Wallet',      path: '/wallet' },
];

const BottomNav = memo(() => {
  const location = useLocation();

  const hidden = ['/auth', '/admin', '/landing', '/litepaper'];
  if (hidden.some(p => location.pathname.startsWith(p))) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 lg:hidden flex justify-center pb-4 px-4 pointer-events-none">
      <motion.div
        initial={{ y: 80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 260, damping: 22, delay: 0.2 }}
        className="pointer-events-auto flex items-center gap-1 px-3 py-2.5 rounded-full bg-[#0d0d0d] border border-white/10 shadow-2xl shadow-black/60"
        style={{ backdropFilter: 'blur(20px)' }}
      >
        {navItems.map((item) => {
          const isActive =
            item.path === '/'
              ? location.pathname === '/'
              : location.pathname.startsWith(item.path);

          return (
            <NavLink key={item.path} to={item.path} className="outline-none">
              <motion.div
                layout
                transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                className={`flex items-center gap-2 px-3 py-2 rounded-full cursor-pointer select-none transition-colors duration-200 ${
                  isActive ? 'bg-white/15' : 'hover:bg-white/5'
                }`}
              >
                <item.icon
                  className={`flex-shrink-0 transition-colors duration-200 ${
                    isActive ? 'text-white w-5 h-5' : 'text-white/40 w-5 h-5'
                  }`}
                  strokeWidth={isActive ? 2.2 : 1.6}
                />
                <AnimatePresence>
                  {isActive && (
                    <motion.span
                      key="label"
                      initial={{ width: 0, opacity: 0 }}
                      animate={{ width: 'auto', opacity: 1 }}
                      exit={{ width: 0, opacity: 0 }}
                      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                      className="text-white text-sm font-semibold whitespace-nowrap overflow-hidden"
                    >
                      {item.label}
                    </motion.span>
                  )}
                </AnimatePresence>
              </motion.div>
            </NavLink>
          );
        })}
      </motion.div>
    </div>
  );
});

BottomNav.displayName = 'BottomNav';
export default BottomNav;
