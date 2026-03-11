import { motion, AnimatePresence } from 'framer-motion';
import { useLocation, useNavigate } from 'react-router-dom';
import { Home, Pickaxe, Trophy, Swords, Wallet } from 'lucide-react';
import { Capacitor } from '@capacitor/core';

const navItems = [
  { icon: Home, label: 'Home', path: '/' },
  { icon: Trophy, label: 'Ranks', path: '/leaderboard' },
  { icon: Pickaxe, label: 'Mine', path: '/mining', accent: true },
  { icon: Swords, label: 'Arena', path: '/arena' },
  { icon: Wallet, label: 'Wallet', path: '/nexus' },
];

export default function MobileBottomNav() {
  const location = useLocation();
  const navigate = useNavigate();
  
  const hiddenPaths = ['/auth', '/admin', '/landing', '/litepaper'];
  if (hiddenPaths.some(p => location.pathname.startsWith(p))) return null;

  return (
    <div style={{
      position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 100,
      padding: '0 16px 28px',
      background: 'linear-gradient(to top, #080B14 60%, transparent)'
    }}>
      <div style={{
        background: 'rgba(12,15,26,0.95)',
        backdropFilter: 'blur(20px)',
        borderRadius: '28px',
        border: '1px solid rgba(255,255,255,0.06)',
        padding: '10px 8px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-around',
        boxShadow: '0 -4px 40px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.03)'
      }}>
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <motion.button key={item.path}
              whileTap={{ scale: 0.85 }}
              onClick={() => navigate(item.path)}
              style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center',
                gap: '4px', cursor: 'pointer', border: 'none', background: 'none',
                padding: item.accent ? '0' : '8px 16px',
                position: 'relative', minWidth: 52
              }}>
              {item.accent ? (
                // Center mine button - elevated pill
                <div style={{
                  width: 56, height: 56, borderRadius: '18px',
                  background: isActive 
                    ? 'linear-gradient(135deg, #00D4FF, #B45FFF)' 
                    : 'linear-gradient(135deg, rgba(0,212,255,0.3), rgba(180,95,255,0.2))',
                  border: '1px solid rgba(0,212,255,0.3)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: isActive ? '0 0 20px rgba(0,212,255,0.4)' : 'none',
                  marginTop: -20
                }}>
                  <item.icon size={22} color="#fff" strokeWidth={2.5} />
                </div>
              ) : (
                <>
                  <div style={{ position: 'relative' }}>
                    <item.icon size={22} color={isActive ? '#00D4FF' : '#2D3748'} strokeWidth={isActive ? 2.5 : 2} />
                    {isActive && (
                      <motion.div layoutId="navDot"
                        style={{ position: 'absolute', bottom: -6, left: '50%', transform: 'translateX(-50%)', width: 4, height: 4, borderRadius: '50%', background: '#00D4FF' }} />
                    )}
                  </div>
                  <AnimatePresence>
                    {isActive && (
                      <motion.span initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                        style={{ color: '#00D4FF', fontSize: '10px', fontWeight: 700, fontFamily: "'Creato Display', sans-serif", letterSpacing: '0.04em' }}>
                        {item.label}
                      </motion.span>
                    )}
                  </AnimatePresence>
                </>
              )}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
