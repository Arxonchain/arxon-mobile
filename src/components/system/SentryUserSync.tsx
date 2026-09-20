import { useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { setSentryUser } from '@/lib/sentry';

/** Attach Supabase user id to Sentry events after login (no email). */
export default function SentryUserSync() {
  const { user } = useAuth();

  useEffect(() => {
    setSentryUser(user?.id ?? null);
  }, [user?.id]);

  return null;
}
