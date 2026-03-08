import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, Gift, Trophy, ChevronLeft, CheckCheck, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';

interface Notification {
  id: string;
  title: string;
  message: string;
  notification_type: string;
  amount: number | null;
  expires_at: string | null;
  created_at: string;
  read: boolean;
}

export default function Notifications() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedNotif, setSelectedNotif] = useState<Notification | null>(null);

  useEffect(() => {
    if (!user) return;

    const fetchAll = async () => {
      setLoading(true);
      try {
        const { data, error } = await (supabase as any)
          .from('user_notifications')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(50);

        if (!error && data) {
          setNotifications(data);
        }
      } catch {
        // silently fail
      }
      setLoading(false);
    };

    fetchAll();
  }, [user]);

  const markAllRead = async () => {
    const unreadIds = notifications.filter(n => !n.read).map(n => n.id);
    if (unreadIds.length === 0) return;

    setNotifications(prev => prev.map(n => ({ ...n, read: true })));

    try {
      for (const id of unreadIds) {
        await (supabase as any)
          .from('user_notifications')
          .update({ read: true })
          .eq('id', id);
      }
    } catch {
      // silently fail
    }
  };

  const markRead = async (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    try {
      await (supabase as any)
        .from('user_notifications')
        .update({ read: true })
        .eq('id', id);
    } catch {}
  };

  const getIcon = (type: string) => {
    if (type === 'rumble_reward') return <Trophy className="w-5 h-5 text-amber-500" />;
    return <Gift className="w-5 h-5 text-primary" />;
  };

  const getIconBg = (type: string) => {
    if (type === 'rumble_reward') return 'bg-amber-500/20';
    return 'bg-primary/20';
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return d.toLocaleDateString();
  };

  // Detail view
  if (selectedNotif) {
    return (
      <div className="min-h-screen bg-background">
        <header className="border-b border-border/50 bg-background/80 backdrop-blur-xl sticky top-0 z-50">
          <div className="container mx-auto px-4 py-3 flex items-center gap-3">
            <button onClick={() => setSelectedNotif(null)} className="p-1">
              <ChevronLeft className="w-5 h-5 text-foreground" />
            </button>
            <h1 className="text-lg font-bold">Notification</h1>
          </div>
        </header>

        <main className="container mx-auto px-4 py-6 max-w-2xl">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${getIconBg(selectedNotif.notification_type)}`}>
              {getIcon(selectedNotif.notification_type)}
            </div>

            <h2 className="text-xl font-bold text-foreground">{selectedNotif.title}</h2>

            {selectedNotif.amount && selectedNotif.amount > 0 && (
              <div className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-bold ${
                selectedNotif.notification_type === 'rumble_reward'
                  ? 'bg-amber-500/15 text-amber-500'
                  : 'bg-primary/15 text-primary'
              }`}>
                +{selectedNotif.amount.toLocaleString()} ARX-P
              </div>
            )}

            <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
              {selectedNotif.message}
            </p>

            <p className="text-xs text-muted-foreground/60">
              {new Date(selectedNotif.created_at).toLocaleString()}
            </p>
          </motion.div>
        </main>
      </div>
    );
  }

  // List view
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/50 bg-background/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate(-1)} className="p-1">
              <ChevronLeft className="w-5 h-5 text-foreground" />
            </button>
            <div className="flex items-center gap-2">
              <Bell className="w-5 h-5 text-primary" />
              <h1 className="text-lg font-bold">Notifications</h1>
            </div>
          </div>
          {notifications.some(n => !n.read) && (
            <Button variant="ghost" size="sm" onClick={markAllRead} className="text-xs text-primary">
              <CheckCheck className="w-3.5 h-3.5 mr-1" />
              Mark all read
            </Button>
          )}
        </div>
      </header>

      <main className="container mx-auto px-4 py-4 max-w-2xl">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="h-8 w-8 border-3 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : notifications.length === 0 ? (
          <div className="text-center py-20">
            <Bell className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-muted-foreground">No notifications yet</p>
          </div>
        ) : (
          <div className="space-y-2">
            <AnimatePresence>
              {notifications.map((notif, i) => (
                <motion.button
                  key={notif.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03 }}
                  onClick={() => {
                    if (!notif.read) markRead(notif.id);
                    setSelectedNotif(notif);
                  }}
                  className={`w-full text-left p-4 rounded-xl border transition-all ${
                    notif.read
                      ? 'bg-card/20 border-border/30'
                      : notif.notification_type === 'rumble_reward'
                        ? 'bg-gradient-to-r from-amber-500/10 to-yellow-500/5 border-amber-500/30'
                        : 'bg-gradient-to-r from-primary/10 to-accent/5 border-primary/30'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${getIconBg(notif.notification_type)}`}>
                      {getIcon(notif.notification_type)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className={`font-bold text-sm truncate ${notif.read ? 'text-muted-foreground' : 'text-foreground'}`}>
                          {notif.title}
                        </p>
                        {!notif.read && (
                          <span className="w-2 h-2 rounded-full bg-primary shrink-0" />
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{notif.message}</p>
                      <div className="flex items-center justify-between mt-1.5">
                        {notif.amount && notif.amount > 0 ? (
                          <span className={`text-xs font-bold ${
                            notif.notification_type === 'rumble_reward' ? 'text-amber-500' : 'text-primary'
                          }`}>
                            +{notif.amount.toLocaleString()} ARX-P
                          </span>
                        ) : <span />}
                        <span className="text-[10px] text-muted-foreground/60">{formatDate(notif.created_at)}</span>
                      </div>
                    </div>
                  </div>
                </motion.button>
              ))}
            </AnimatePresence>
          </div>
        )}
      </main>
    </div>
  );
}