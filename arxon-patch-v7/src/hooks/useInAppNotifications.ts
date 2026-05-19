import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface AppNotification {
  id: string;
  type: string;
  title: string;
  message: string;
  amount?: number;
  read: boolean;
  created_at: string;
  data?: any;
}

export function useInAppNotifications() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unread, setUnread]               = useState(0);
  const [loading, setLoading]             = useState(false);
  const subRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase
      .from('user_notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50);
    const list = (data || []) as AppNotification[];
    setNotifications(list);
    setUnread(list.filter(n => !n.read).length);
    setLoading(false);
  }, [user]);

  useEffect(() => { load(); }, [load]);

  // Real-time subscription for new notifications
  useEffect(() => {
    if (!user) return;
    if (subRef.current) { supabase.removeChannel(subRef.current); subRef.current = null; }

    const sub = supabase.channel(`notif-${user.id}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'user_notifications',
        filter: `user_id=eq.${user.id}`,
      }, (payload) => {
        const n = payload.new as AppNotification;
        setNotifications(prev => [n, ...prev]);
        setUnread(u => u + 1);
        // Show native notification if permitted
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification(n.title, { body: n.message, icon: '/favicon.jpg', tag: n.id });
        }
      }).subscribe();

    subRef.current = sub;
    return () => { supabase.removeChannel(sub); subRef.current = null; };
  }, [user]);

  const markRead = useCallback(async (id?: string) => {
    if (!user) return;
    if (id) {
      await supabase.from('user_notifications')
        .update({ read: true }).eq('id', id).eq('user_id', user.id);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
      setUnread(u => Math.max(0, u - 1));
    } else {
      // Mark all read
      await supabase.from('user_notifications')
        .update({ read: true }).eq('user_id', user.id).eq('read', false);
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      setUnread(0);
    }
  }, [user]);

  // Helper: create a notification for this user (used locally for immediate feedback)
  const notify = useCallback(async (type: string, title: string, message: string, amount = 0) => {
    if (!user) return;
    await supabase.from('user_notifications').insert({
      user_id: user.id, notification_type: type, title, message, amount,
    });
  }, [user]);

  return { notifications, unread, loading, markRead, notify, reload: load };
}
