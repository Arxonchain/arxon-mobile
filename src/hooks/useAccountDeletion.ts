import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export type DeletionStatus = 'pending' | 'approved' | 'denied' | 'cancelled' | 'completed';

export type AccountDeletionRequest = {
  id: string;
  user_id: string;
  status: DeletionStatus;
  requested_at: string;
  scheduled_for: string;
  approved_at: string | null;
  cancelled_at: string | null;
  completed_at: string | null;
  admin_note: string | null;
};

export function useAccountDeletion() {
  const { user } = useAuth();
  const [request, setRequest] = useState<AccountDeletionRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    if (!user) {
      setRequest(null);
      setLoading(false);
      return;
    }
    const { data, error } = await supabase
      .from('account_deletion_requests')
      .select('id, user_id, status, requested_at, scheduled_for, approved_at, cancelled_at, completed_at, admin_note')
      .eq('user_id', user.id)
      .in('status', ['pending', 'approved'])
      .order('requested_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) {
      setRequest(null);
    } else {
      setRequest((data as AccountDeletionRequest | null) ?? null);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const invoke = useCallback(async (action: string, extra?: Record<string, unknown>) => {
    setBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke('account-deletion', {
        body: { action, ...extra },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      await refresh();
      return data as Record<string, unknown>;
    } finally {
      setBusy(false);
    }
  }, [refresh]);

  const submit = useCallback((confirmation: string) => invoke('request', { confirmation }), [invoke]);
  const cancel = useCallback(() => invoke('cancel'), [invoke]);

  return { request, loading, busy, refresh, submit, cancel };
}
