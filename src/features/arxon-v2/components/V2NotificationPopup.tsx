import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Swords, Clock, Bell, X } from 'lucide-react';
import { displayNotificationMessage, displayNotificationTitle } from '@/lib/notificationDisplay';
import { useInAppNotifications, type AppNotification } from '@/hooks/useInAppNotifications';
import { v2 } from '@/features/arxon-v2/design/tokens';

function iconFor(type: string) {
  if (type === 'arena_win' || type.includes('win')) {
    return { icon: <Trophy size={22} color={v2.accent.gold} />, accent: v2.accent.gold, glow: `${v2.accent.gold}55` };
  }
  if (type === 'arena_loss' || type.includes('loss')) {
    return { icon: <Swords size={22} color={v2.accent.danger} />, accent: v2.accent.danger, glow: `${v2.accent.danger}44` };
  }
  if (type === 'arena_battle_end') {
    return { icon: <Clock size={22} color={v2.accent.cyan} />, accent: v2.accent.cyan, glow: `${v2.accent.cyan}44` };
  }
  if (type.includes('arena')) {
    return { icon: <Swords size={22} color={v2.accent.arena} />, accent: v2.accent.arena, glow: `${v2.accent.arena}44` };
  }
  return { icon: <Bell size={22} color={v2.brand.steel} />, accent: v2.brand.steel, glow: `${v2.brand.steel}33` };
}

function routeFor(n: AppNotification) {
  if (n.type.includes('arena')) return '/arena/prediction-market';
  return '/notifications';
}

/** Neon toast popup for realtime in-app notifications (V2). */
export default function V2NotificationPopup() {
  const navigate = useNavigate();
  const { notifications, markRead } = useInAppNotifications();
  const [active, setActive] = useState<AppNotification | null>(null);
  const seenRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const latest = notifications.find((n) => !n.read && !seenRef.current.has(n.id));
    if (!latest) return;
    seenRef.current.add(latest.id);
    setActive(latest);
    const t = setTimeout(() => setActive(null), 7000);
    return () => clearTimeout(t);
  }, [notifications]);

  const dismiss = async () => {
    if (active && !active.read) await markRead(active.id);
    setActive(null);
  };

  const open = async () => {
    if (!active) return;
    if (!active.read) await markRead(active.id);
    navigate(routeFor(active));
    setActive(null);
  };

  const meta = active ? iconFor(active.type) : null;

  return (
    <AnimatePresence>
      {active && meta && (
        <motion.div
          key={active.id}
          initial={{ opacity: 0, y: -24, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -16, scale: 0.98 }}
          style={{
            position: 'fixed',
            top: 'max(12px, env(safe-area-inset-top))',
            left: 16,
            right: 16,
            zIndex: 9999,
            pointerEvents: 'none',
          }}
        >
          <motion.button
            type="button"
            onClick={open}
            whileTap={{ scale: 0.98 }}
            style={{
              pointerEvents: 'auto',
              width: '100%',
              textAlign: 'left',
              border: `1px solid ${meta.accent}66`,
              borderRadius: v2.radius.md,
              padding: '12px 14px',
              background: `linear-gradient(135deg, ${meta.glow}, hsl(225 28% 7% / 0.96))`,
              boxShadow: v2.shadow(meta.accent, 0.35),
              backdropFilter: 'blur(12px)',
              cursor: 'pointer',
              position: 'relative',
            }}
          >
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); dismiss(); }}
              aria-label="Dismiss"
              style={{
                position: 'absolute',
                top: 10,
                right: 10,
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                color: v2.brand.muted,
                padding: 4,
                pointerEvents: 'auto',
              }}
            >
              <X size={16} />
            </button>
            <div style={{ display: 'flex', gap: 12, paddingRight: 22 }}>
              <div style={{
                width: 40, height: 40, borderRadius: v2.radius.sm, flexShrink: 0,
                background: `${meta.accent}22`, border: `1px solid ${meta.accent}55`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {meta.icon}
              </div>
              <div style={{ minWidth: 0 }}>
                <p style={{ margin: 0, fontSize: 13, fontWeight: 800, color: v2.brand.steelBright, lineHeight: 1.3 }}>
                  {displayNotificationTitle(active.title)}
                </p>
                <p style={{
                  margin: '3px 0 0', fontSize: 11, color: v2.brand.steelLight, lineHeight: 1.4,
                  overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
                }}>
                  {displayNotificationMessage(active.message)}
                </p>
                {active.amount != null && active.amount !== 0 && (
                  <p style={{
                    margin: '6px 0 0', fontSize: 13, fontWeight: 800,
                    color: active.amount > 0 ? v2.accent.mining : v2.accent.danger,
                  }}>
                    {active.amount > 0 ? '+' : ''}{active.amount.toLocaleString()} ARX-P
                  </p>
                )}
              </div>
            </div>
          </motion.button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
