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
  data?: unknown;
}

type DbNotification = {
  id: string;
  notification_type: string;
  title: string;
  message: string;
  amount?: number | null;
  read: boolean;
  created_at: string;
  data?: unknown;
};

function mapRow(row: DbNotification): AppNotification {
  return {
    id: row.id,
    type: row.notification_type,
    title: row.title,
    message: row.message,
    amount: row.amount ?? undefined,
    read: row.read,
    created_at: row.created_at,
    data: row.data,
  };
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
    const list = (data || []).map(row => mapRow(row as DbNotification));
    setNotifications(list);
    setUnread(list.filter(n => !n.read).length);
    setLoading(false);
  }, [user]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!user) return;
    if (subRef.current) { supabase.removeChannel(subRef.current); subRef.current = null; }

    const sub = supabase.channel(`notif-${user.id}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'user_notifications',
        filter: `user_id=eq.${user.id}`,
      }, (payload) => {
        const n = mapRow(payload.new as DbNotification);
        setNotifications(prev => [n, ...prev]);
        setUnread(u => u + 1);
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
      await supabase.from('user_notifications')
        .update({ read: true }).eq('user_id', user.id).eq('read', false);
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      setUnread(0);
    }
  }, [user]);

  const notify = useCallback(async (type: string, title: string, message: string, amount = 0) => {
    if (!user) return;
    await supabase.from('user_notifications').insert({
      user_id: user.id, notification_type: type, title, message, amount,
    });
  }, [user]);

  return { notifications, unread, loading, markRead, notify, reload: load };
}
