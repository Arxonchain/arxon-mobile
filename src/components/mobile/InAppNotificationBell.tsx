import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, X, CheckCheck, Zap, Trophy, MessageSquare, TrendingUp, Gift } from 'lucide-react';
import { useInAppNotifications } from '@/hooks/useInAppNotifications';
import { NeonHeaderIconButton } from '@/features/arxon-v2/design/NeonSecondaryUI';
import { neon } from '@/features/arxon-v2/design/neonTokens';

const ACTIVITY_TEXT = '#b8eff8';

function relTime(iso: string) {
  const d = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (d < 60) return 'now';
  if (d < 3600) return `${Math.floor(d / 60)}m ago`;
  if (d < 86400) return `${Math.floor(d / 3600)}h ago`;
  return new Date(iso).toLocaleDateString([], { month: 'short', day: 'numeric' });
}

function typeIcon(type: string) {
  if (type.includes('mining')) return { icon: Zap, col: neon.gold };
  if (type.includes('arena')) return { icon: Trophy, col: neon.purple };
  if (type.includes('chat')) return { icon: MessageSquare, col: neon.teal };
  if (type.includes('nexus')) return { icon: TrendingUp, col: neon.teal };
  if (type.includes('reward')) return { icon: Gift, col: neon.gold };
  return { icon: Bell, col: neon.cyan };
}

export default function InAppNotificationBell() {
  const { notifications, unread, markRead, reload } = useInAppNotifications();
  const [open, setOpen] = useState(false);

  const openDrawer = () => { setOpen(true); reload(); };
  const closeDrawer = () => setOpen(false);
  const readAll = () => markRead();

  return (
    <>
      <NeonHeaderIconButton
        label="Notifications"
        accent={neon.cyan}
        badge={unread || null}
        onClick={openDrawer}
      >
        <Bell size={17} strokeWidth={2.2} />
      </NeonHeaderIconButton>

      <AnimatePresence>
        {open && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={closeDrawer}
              style={{ position: 'fixed', inset: 0, zIndex: 900, background: 'rgba(2,6,14,0.72)', backdropFilter: 'blur(4px)' }}
            />

            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', stiffness: 340, damping: 36 }}
              style={{
                position: 'fixed',
                left: 0,
                right: 0,
                bottom: 0,
                zIndex: 901,
                background: 'linear-gradient(180deg, rgba(12,28,48,0.98) 0%, rgba(6,10,22,0.99) 100%)',
                borderRadius: '22px 22px 0 0',
                border: `1px solid ${neon.cyan}28`,
                borderBottom: 'none',
                boxShadow: `0 -8px 40px rgba(0,0,0,0.5), 0 0 32px ${neon.cyan}08`,
                maxHeight: '80vh',
                display: 'flex',
                flexDirection: 'column',
                fontFamily: neon.font,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 10, paddingBottom: 4 }}>
                <div style={{ width: 36, height: 4, borderRadius: 2, background: `${neon.cyan}35` }} />
              </div>

              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '8px 16px 12px',
              }}>
                <div>
                  <p style={{
                    margin: 0, fontSize: 9, fontWeight: 800, letterSpacing: '0.16em',
                    textTransform: 'uppercase', color: neon.cyan,
                  }}>
                    Inbox
                  </p>
                  <h2 style={{ margin: '4px 0 0', fontSize: 18, fontWeight: 900, color: neon.text }}>Notifications</h2>
                  {unread > 0 && (
                    <p style={{ fontSize: 10, color: 'rgba(184,239,248,0.5)', marginTop: 3 }}>
                      {unread} unread
                    </p>
                  )}
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  {unread > 0 && (
                    <motion.button
                      type="button"
                      whileTap={{ scale: 0.92 }}
                      onClick={readAll}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 5, padding: '7px 11px',
                        borderRadius: 11,
                        background: `${neon.cyan}12`,
                        border: `1px solid ${neon.cyan}30`,
                        cursor: 'pointer',
                        fontFamily: neon.font,
                      }}
                    >
                      <CheckCheck size={13} color={neon.cyan} />
                      <span style={{ fontSize: 10, fontWeight: 700, color: ACTIVITY_TEXT }}>Read all</span>
                    </motion.button>
                  )}
                  <NeonHeaderIconButton label="Close" accent="rgba(184,239,248,0.45)" size={34} onClick={closeDrawer}>
                    <X size={15} strokeWidth={2.5} />
                  </NeonHeaderIconButton>
                </div>
              </div>

              <div style={{ overflowY: 'auto', flex: 1, padding: '0 14px 24px' }}>
                {notifications.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '36px 0' }}>
                    <div style={{
                      width: 48, height: 48, borderRadius: 14, margin: '0 auto 12px',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      background: `${neon.cyan}10`, border: `1px solid ${neon.cyan}25`,
                    }}>
                      <Bell size={22} color={neon.cyan} style={{ opacity: 0.6 }} />
                    </div>
                    <p style={{ fontSize: 14, fontWeight: 800, color: ACTIVITY_TEXT, marginBottom: 6 }}>
                      No notifications yet
                    </p>
                    <p style={{ fontSize: 11, color: 'rgba(184,239,248,0.45)', lineHeight: 1.5, margin: 0 }}>
                      Mining, arena battles, rewards & more
                    </p>
                  </div>
                ) : notifications.map((n) => {
                  const { icon: Icon, col } = typeIcon(n.type);
                  return (
                    <motion.div
                      key={n.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      onClick={() => markRead(n.id)}
                      style={{
                        display: 'flex', alignItems: 'flex-start', gap: 11,
                        padding: '11px 12px', borderRadius: 14, marginBottom: 6, cursor: 'pointer',
                        background: n.read ? 'rgba(255,255,255,0.02)' : `${col}0a`,
                        border: `1px solid ${n.read ? 'rgba(255,255,255,0.05)' : `${col}28`}`,
                      }}
                    >
                      <div style={{
                        width: 34, height: 34, borderRadius: 11, flexShrink: 0,
                        background: `${col}14`, border: `1px solid ${col}30`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center', color: col,
                      }}>
                        <Icon size={15} strokeWidth={2.2} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 }}>
                          <p style={{
                            margin: 0, fontSize: 12, fontWeight: n.read ? 600 : 700,
                            color: n.read ? 'rgba(184,239,248,0.65)' : ACTIVITY_TEXT,
                          }}>
                            {n.title}
                          </p>
                          <span style={{ fontSize: 9, color: 'rgba(184,239,248,0.35)', flexShrink: 0, marginLeft: 8 }}>
                            {relTime(n.created_at)}
                          </span>
                        </div>
                        <p style={{ margin: 0, fontSize: 10, color: 'rgba(184,239,248,0.5)', lineHeight: 1.45 }}>
                          {n.message}
                        </p>
                        {n.amount !== 0 && n.amount && (
                          <p style={{ fontSize: 11, fontWeight: 800, color: col, marginTop: 4 }}>
                            {n.amount > 0 ? '+' : ''}{n.amount.toLocaleString()} ARX-P
                          </p>
                        )}
                      </div>
                      {!n.read && (
                        <div style={{
                          width: 7, height: 7, borderRadius: '50%', background: col, flexShrink: 0,
                          marginTop: 4, boxShadow: `0 0 8px ${col}88`,
                        }} />
                      )}
                    </motion.div>
                  );
                })}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
