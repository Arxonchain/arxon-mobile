import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { countryByCode } from '@/lib/verification/countries';
import {
  dismissVerificationPromptForToday,
  shouldShowVerificationPrompt,
} from '@/lib/verification/dailyPrompt';

export type VerificationStepId = 'email' | 'country' | 'age' | 'wallet';

export type VerificationStep = {
  id: VerificationStepId;
  label: string;
  done: boolean;
  optional?: boolean;
  comingSoon?: boolean;
};

export type VerificationProfile = {
  country: string | null;
  country_code: string | null;
  age_confirmed_at: string | null;
  country_declared_at: string | null;
  email_change_count: number;
  email_locked_at: string | null;
  phone_verified_at: string | null;
  verification_completed_at: string | null;
};

const MAX_EMAIL_CHANGES = 2;

export function useVerification() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<VerificationProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [promptVisible, setPromptVisible] = useState(false);

  const emailVerified = Boolean(user?.email_confirmed_at);
  const emailLocked = Boolean(profile?.email_locked_at) || (profile?.email_change_count ?? 0) >= MAX_EMAIL_CHANGES;

  const refresh = useCallback(async () => {
    if (!user) {
      setProfile(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data, error } = await supabase
      .from('profiles')
      .select(
        'country, country_code, age_confirmed_at, country_declared_at, email_change_count, email_locked_at, phone_verified_at, verification_completed_at',
      )
      .eq('user_id', user.id)
      .maybeSingle();

    if (!error && data) {
      setProfile(data as VerificationProfile);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    refresh();
  }, [refresh, user?.email_confirmed_at]);

  const countryDone = Boolean(profile?.country_code && profile.country_code !== 'XX');
  const ageDone = Boolean(profile?.age_confirmed_at);
  const isComplete = emailVerified && countryDone && ageDone;

  const steps: VerificationStep[] = useMemo(
    () => [
      { id: 'email', label: 'Email verified', done: emailVerified },
      { id: 'country', label: 'Country', done: countryDone },
      { id: 'age', label: 'Age 18+ confirmed', done: ageDone },
      { id: 'wallet', label: 'Wallet connect', done: false, comingSoon: true },
    ],
    [emailVerified, countryDone, ageDone],
  );

  const requiredSteps = steps.filter((s) => !s.optional && !s.comingSoon);
  const completedCount = requiredSteps.filter((s) => s.done).length;
  const requiredCount = requiredSteps.length;

  useEffect(() => {
    if (!user || loading) return;
    if (isComplete) {
      setPromptVisible(false);
      if (!profile?.verification_completed_at) {
        supabase
          .from('profiles')
          .update({ verification_completed_at: new Date().toISOString() })
          .eq('user_id', user.id)
          .then(() => refresh());
      }
      return;
    }
    setPromptVisible(shouldShowVerificationPrompt(user.id, false));
  }, [user, loading, isComplete, profile?.verification_completed_at, refresh]);

  const dismissDailyPrompt = useCallback(() => {
    if (!user) return;
    dismissVerificationPromptForToday(user.id);
    setPromptVisible(false);
  }, [user]);

  const resendEmailVerification = useCallback(async () => {
    if (!user?.email) throw new Error('No email on account');
    const { error } = await supabase.auth.resend({ type: 'signup', email: user.email });
    if (error) throw error;
  }, [user?.email]);

  const changeEmail = useCallback(
    async (newEmail: string) => {
      if (!user) throw new Error('Not signed in');
      if (emailLocked) throw new Error('Email is permanently linked to this account');
      const trimmed = newEmail.trim().toLowerCase();
      if (!trimmed || !trimmed.includes('@')) throw new Error('Enter a valid email');
      const { error } = await supabase.auth.updateUser({ email: trimmed });
      if (error) throw error;
      const nextCount = (profile?.email_change_count ?? 0) + 1;
      const patch: Partial<VerificationProfile> = { email_change_count: nextCount };
      if (nextCount >= MAX_EMAIL_CHANGES) {
        patch.email_locked_at = new Date().toISOString();
      }
      await supabase.from('profiles').update(patch).eq('user_id', user.id);
      await refresh();
    },
    [user, emailLocked, profile?.email_change_count, refresh],
  );

  const saveCountry = useCallback(
    async (countryCode: string) => {
      if (!user) throw new Error('Not signed in');
      const c = countryByCode(countryCode);
      if (!c) throw new Error('Select a country');
      const now = new Date().toISOString();
      const { error } = await supabase
        .from('profiles')
        .update({
          country: c.name,
          country_code: c.code,
          country_declared_at: now,
        })
        .eq('user_id', user.id);
      if (error) throw error;
      await refresh();
    },
    [user, refresh],
  );

  const confirmAge = useCallback(async () => {
    if (!user) throw new Error('Not signed in');
    const now = new Date().toISOString();
    const { error } = await supabase
      .from('profiles')
      .update({ age_confirmed_at: now })
      .eq('user_id', user.id);
    if (error) throw error;
    await refresh();
  }, [user, refresh]);

  const remainingChanges = Math.max(0, MAX_EMAIL_CHANGES - (profile?.email_change_count ?? 0));

  return {
    loading,
    profile,
    user,
    emailVerified,
    emailLocked,
    emailChangeCount: profile?.email_change_count ?? 0,
    remainingEmailChanges: remainingChanges,
    isComplete,
    steps,
    completedCount,
    requiredCount,
    promptVisible,
    dismissDailyPrompt,
    refresh,
    resendEmailVerification,
    changeEmail,
    saveCountry,
    confirmAge,
  };
}
