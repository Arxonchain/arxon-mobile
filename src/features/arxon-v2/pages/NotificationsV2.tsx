import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, Gift, Trophy, CheckCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useInAppNotifications, type AppNotification } from '@/hooks/useInAppNotifications';
import {
  V2Page, V2Header, V2Card, V2Eyebrow, fadeUp, stagger,
} from '../design/Kit';
import { v2 } from '../design/tokens';

function getIconInfo(type: string) {
  if (type === 'arena_win' || type === 'rumble_reward' || type === 'arena' || type.includes('arena_win'))
    return { icon: <Trophy size={18} color={v2.accent.gold} />, accent: v2.accent.gold };
  if (type === 'arena_loss')
    return { icon: <Trophy size={18} color={v2.brand.mutedSoft} />, accent: v2.brand.mutedSoft };
  if (type === 'arena_new_battle' || type === 'arena_battle_end' || type === 'arena_resolved' || type === 'arena_battle_resolved')
    return { icon: <Bell size={18} color={v2.accent.cyan} />, accent: v2.accent.cyan };
  if (type === 'new_tasks')
    return { icon: <Bell size={18} color={v2.accent.cyan} />, accent: v2.accent.cyan };
  return { icon: <Gift size={18} color={v2.brand.steel} />, accent: v2.brand.steel };
}

function formatDate(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

export default function NotificationsV2() {
  const navigate = useNavigate();
  const { notifications, loading, markRead } = useInAppNotifications();
  const [selectedNotif, setSelectedNotif] = useState<AppNotification | null>(null);

  const markAllRead = () => markRead();
  const markOneRead = (id: string) => markRead(id);
  const hasUnread = notifications.some((n) => !n.read);

  if (selectedNotif) {
    const { icon, accent } = getIconInfo(selectedNotif.type);
    return (
      <V2Page>
        <V2Header eyebrow="Inbox" title="Notification" onBack={() => setSelectedNotif(null)} />
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} style={{ padding: '0 16px' }}>
          <div style={{
            width: 56, height: 56, borderRadius: v2.radius.md,
            background: `${accent}18`, border: `1.5px solid ${accent}44`,
            display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16,
          }}>
            {icon}
          </div>
          <h2 style={{ fontSize: 20, fontWeight: 800, color: v2.brand.steelBright, marginBottom: 10 }}>{selectedNotif.title}</h2>
          {selectedNotif.amount != null && selectedNotif.amount !== 0 && (
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 14px',
              borderRadius: 20, marginBottom: 14, background: `${accent}18`, border: `1px solid ${accent}44`,
            }}>
              <span style={{ fontSize: 14, fontWeight: 800, color: selectedNotif.amount > 0 ? v2.accent.mining : v2.accent.danger }}>
                {selectedNotif.amount > 0 ? '+' : ''}{selectedNotif.amount.toLocaleString()} ARX-P
              </span>
            </div>
          )}
          {selectedNotif.amount && selectedNotif.amount < 0 && (
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 14px',
              borderRadius: 20, marginBottom: 14, background: `${v2.brand.muted}18`, border: `1px solid ${v2.brand.muted}44`,
            }}>
              <span style={{ fontSize: 14, fontWeight: 800, color: v2.brand.mutedSoft }}>
                {selectedNotif.amount.toLocaleString()} ARX-P stake
              </span>
            </div>
          )}
          <p style={{ fontSize: 14, color: v2.brand.steelLight, lineHeight: 1.6, marginBottom: 20 }}>{selectedNotif.message}</p>
          <V2Eyebrow accent={v2.brand.muted}>{formatDate(selectedNotif.created_at)}</V2Eyebrow>
        </motion.div>
      </V2Page>
    );
  }

  return (
    <V2Page>
      <motion.div variants={stagger} initial="hidden" animate="show">
        <V2Header
          eyebrow="Inbox"
          title="Notifications"
          subtitle="Arena, rewards & updates"
          onBack={() => navigate(-1)}
          right={hasUnread ? (
            <motion.button
              type="button"
              whileTap={{ scale: 0.9 }}
              onClick={markAllRead}
              style={{
                width: 40, height: 40, borderRadius: 14, cursor: 'pointer', border: 'none',
                background: `${v2.brand.steel}18`, display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              <CheckCheck size={16} color={v2.brand.steel} />
            </motion.button>
          ) : undefined}
        />

        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
            <div style={{
              width: 36, height: 36, borderRadius: '50%',
              border: `3px solid ${v2.brand.steel}33`, borderTopColor: v2.brand.steel,
              animation: 'spin 1s linear infinite',
            }} />
          </div>
        ) : notifications.length === 0 ? (
          <motion.div variants={fadeUp} style={{ textAlign: 'center', padding: '60px 32px' }}>
            <Bell size={40} color={v2.brand.muted} style={{ marginBottom: 16 }} />
            <p style={{ fontSize: 15, fontWeight: 700, color: v2.brand.mutedSoft }}>No notifications yet</p>
            <p style={{ fontSize: 12, color: v2.brand.muted, marginTop: 6 }}>Rewards and updates will appear here</p>
          </motion.div>
        ) : (
          <div style={{ padding: '0 20px' }}>
            <AnimatePresence>
              {notifications.map((n, i) => {
                const { icon, accent } = getIconInfo(n.type);
                return (
                  <motion.div
                    key={n.id}
                    variants={fadeUp}
                    initial="hidden"
                    animate="show"
                    transition={{ delay: i * 0.04 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => { if (!n.read) markOneRead(n.id); setSelectedNotif(n); }}
                    style={{ marginBottom: 10, cursor: 'pointer' }}
                  >
                    <V2Card
                      accent={!n.read ? accent : undefined}
                      padding="16px"
                      style={n.read ? { opacity: 0.75 } : undefined}
                    >
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
                        <div style={{
                          width: 44, height: 44, borderRadius: v2.radius.sm, flexShrink: 0,
                          background: `${accent}18`, border: `1px solid ${accent}44`,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                          {icon}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                            <p style={{
                              fontSize: 13, fontWeight: 700, color: v2.brand.steelBright, margin: 0,
                              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                            }}>
                              {n.title}
                            </p>
                            {!n.read && (
                              <div style={{ width: 6, height: 6, borderRadius: '50%', background: v2.brand.glow, flexShrink: 0 }} />
                            )}
                          </div>
                          <p style={{
                            fontSize: 11, color: v2.brand.muted, lineHeight: 1.4, margin: 0,
                            overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
                          }}>
                            {n.message}
                          </p>
                          <p style={{ fontSize: 10, color: v2.brand.muted, margin: '6px 0 0' }}>{formatDate(n.created_at)}</p>
                        </div>
                        {n.amount && n.amount > 0 && (
                          <span style={{ fontSize: 12, fontWeight: 800, color: v2.accent.mining, flexShrink: 0 }}>
                            +{n.amount.toLocaleString()}
                          </span>
                        )}
                        {n.amount && n.amount < 0 && (
                          <span style={{ fontSize: 12, fontWeight: 800, color: v2.brand.mutedSoft, flexShrink: 0 }}>
                            {n.amount.toLocaleString()}
                          </span>
                        )}
                      </div>
                    </V2Card>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </motion.div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </V2Page>
  );
}
