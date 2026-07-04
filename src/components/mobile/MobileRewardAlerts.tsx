import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Gift, Trophy, X } from 'lucide-react';
import { useInAppNotifications } from '@/hooks/useInAppNotifications';

/** Compact reward/arena alerts for the mobile dashboard (web RewardNotifications equivalent). */
export default function MobileRewardAlerts() {
  const navigate = useNavigate();
  const { notifications, markRead } = useInAppNotifications();
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  const alerts = notifications.filter(n =>
    !n.read &&
    !dismissed.has(n.id) &&
    (n.type.includes('reward') || n.type.includes('rumble') || n.type.includes('arena'))
  ).slice(0, 3);

  if (!alerts.length) return null;

  const dismiss = async (id: string) => {
    setDismissed(prev => new Set(prev).add(id));
    await markRead(id);
  };

  return (
    <div style={{ padding: '0 20px', marginTop: 4 }}>
      <button onClick={() => navigate('/notifications')}
        style={{ display: 'flex', alignItems: 'center', gap: 4, marginLeft: 'auto', marginBottom: 8,
          background: 'none', border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 600,
          color: 'hsl(215 35% 62%)', fontFamily: "'Creato Display',-apple-system,sans-serif" }}>
        View all notifications →
      </button>
      <AnimatePresence>
        {alerts.map(n => {
          const isRumble = n.type.includes('rumble') || n.type.includes('arena');
          return (
            <motion.div key={n.id}
              initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
              style={{ position: 'relative', padding: '14px 16px', borderRadius: 16, marginBottom: 8,
                background: isRumble
                  ? 'linear-gradient(135deg,hsl(38 55% 52%/0.12),hsl(225 28% 9%))'
                  : 'linear-gradient(135deg,hsl(215 35% 62%/0.1),hsl(225 28% 9%))',
                border: `1px solid ${isRumble ? 'hsl(38 55% 52%/0.28)' : 'hsl(215 35% 62%/0.22)'}` }}>
              <button onClick={() => dismiss(n.id)}
                style={{ position: 'absolute', top: 10, right: 10, background: 'none', border: 'none',
                  cursor: 'pointer', color: 'hsl(215 14% 40%)', padding: 4 }}>
                <X size={14} />
              </button>
              <div style={{ display: 'flex', gap: 12, paddingRight: 20 }}>
                <div style={{ width: 40, height: 40, borderRadius: 12, flexShrink: 0,
                  background: isRumble ? 'hsl(38 55% 52%/0.15)' : 'hsl(215 35% 62%/0.12)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {isRumble ? <Trophy size={18} color="hsl(38 55% 52%)" /> : <Gift size={18} color="hsl(215 35% 62%)" />}
                </div>
                <div style={{ minWidth: 0 }}>
                  <p style={{ fontSize: 13, fontWeight: 700, color: 'hsl(215 20% 90%)' }}>{n.title}</p>
                  <p style={{ fontSize: 11, color: 'hsl(215 14% 42%)', marginTop: 2, lineHeight: 1.4 }}>{n.message}</p>
                  {n.amount && n.amount > 0 && (
                    <p style={{ fontSize: 13, fontWeight: 800, marginTop: 4,
                      color: isRumble ? 'hsl(38 55% 58%)' : 'hsl(215 35% 72%)' }}>
                      +{n.amount.toLocaleString()} ARX-P
                    </p>
                  )}
                </div>
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
