import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Gift, Trophy, X, Bell } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface Notification {
  id: string;
  title: string;
  message: string;
  notification_type: string;
  amount: number;
  expires_at: string;
  created_at: string;
}

const RewardNotifications = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!user) return;

    const fetchNotifications = async () => {
      try {
        const { data, error } = await (supabase as any)
          .from('user_notifications')
          .select('*')
          .eq('user_id', user.id)
          .gt('expires_at', new Date().toISOString())
          .eq('read', false)
          .order('created_at', { ascending: false })
          .limit(5);

        if (error) {
          // Table may not exist on this environment yet - silently ignore
          console.warn('Notifications fetch skipped:', error.message);
          return;
        }

        setNotifications(data || []);
      } catch {
        // Silently fail
      }
    };

    fetchNotifications();
  }, [user]);

  const handleDismiss = async (id: string) => {
    setDismissed(prev => new Set(prev).add(id));
    
    try {
      await (supabase as any)
        .from('user_notifications')
        .update({ read: true })
        .eq('id', id);
    } catch {
      // Silently fail
    }
  };

  const visibleNotifications = notifications.filter(n => !dismissed.has(n.id));

  if (visibleNotifications.length === 0) return null;

  return (
    <div className="space-y-2 mb-4">
      {/* View all link */}
      <button
        onClick={() => navigate('/notifications')}
        className="flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 transition-colors ml-auto mb-1"
      >
        <Bell className="w-3 h-3" />
        View all notifications
      </button>
      <AnimatePresence>
        {visibleNotifications.map((notif) => (
          <motion.div
            key={notif.id}
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            className={`relative p-4 rounded-xl border backdrop-blur-sm ${
              notif.notification_type === 'rumble_reward'
                ? 'bg-gradient-to-r from-amber-500/15 to-yellow-500/10 border-amber-500/30'
                : 'bg-gradient-to-r from-primary/15 to-accent/10 border-primary/30'
            }`}
          >
            <button
              onClick={() => handleDismiss(notif.id)}
              className="absolute top-2 right-2 p-1 text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
            
            <div className="flex items-start gap-3 pr-6">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                notif.notification_type === 'rumble_reward'
                  ? 'bg-amber-500/20'
                  : 'bg-primary/20'
              }`}>
                {notif.notification_type === 'rumble_reward' ? (
                  <Trophy className="w-5 h-5 text-amber-500" />
                ) : (
                  <Gift className="w-5 h-5 text-primary" />
                )}
              </div>
              <div className="min-w-0">
                <p className="font-bold text-sm text-foreground">{notif.title}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{notif.message}</p>
                {notif.amount > 0 && (
                  <p className={`text-sm font-bold mt-1 ${
                    notif.notification_type === 'rumble_reward' ? 'text-amber-500' : 'text-primary'
                  }`}>
                    +{notif.amount.toLocaleString()} ARX-P
                  </p>
                )}
              </div>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};

export default RewardNotifications;
