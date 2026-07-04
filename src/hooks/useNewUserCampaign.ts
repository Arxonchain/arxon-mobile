import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

const CAMPAIGN_DAYS = 7;

function isNativePlatform(): boolean {
  try {
    const cap = (window as any).Capacitor;
    if (cap && typeof cap.isNativePlatform === 'function') {
      return cap.isNativePlatform();
    }
  } catch { /* ignore */ }
  try {
    const { Capacitor } = require('@capacitor/core');
    if (Capacitor?.isNativePlatform?.()) return true;
  } catch { /* ignore */ }
  try {
    if (/; wv\)/i.test(navigator.userAgent)) return true;
  } catch { /* ignore */ }
  return false;
}

function getDeviceId(): string {
  try {
    const key = 'arxon_device_id';
    const existing = localStorage.getItem(key);
    if (existing) return existing;
    const id = `device_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    localStorage.setItem(key, id);
    return id;
  } catch {
    return `device_${Date.now()}`;
  }
}

function getAccountAgeDays(createdAt: string | undefined): number {
  if (!createdAt) return 9999;
  return Math.floor((Date.now() - new Date(createdAt).getTime()) / 86_400_000);
}

async function resolveAccountCreatedAt(
  userId: string,
  authCreatedAt?: string,
): Promise<string | undefined> {
  if (authCreatedAt) return authCreatedAt;
  const { data } = await supabase
    .from('profiles')
    .select('created_at')
    .eq('user_id', userId)
    .maybeSingle();
  return data?.created_at ?? undefined;
}

interface CampaignRecord {
  days_claimed: number;
  last_claim_at: string | null;
  is_eligible: boolean;
  first_open_at: string;
}

export interface CampaignState {
  isNewAccount: boolean;
  isNative: boolean;
  showBanner: boolean;
  isEligible: boolean;
  daysRemaining: number;
  daysClaimed: number;
  canClaimToday: boolean;
  campaignEnded: boolean;
  loading: boolean;
  claiming: boolean;
  claim: () => Promise<{ success: boolean; pointsAwarded?: number; error?: string }>;
}

async function fetchCampaignRecord(userId: string): Promise<CampaignRecord | null> {
  const { data } = await supabase
    .from('new_user_campaign')
    .select('days_claimed, last_claim_at, is_eligible, first_open_at')
    .eq('user_id', userId)
    .maybeSingle();
  return (data as CampaignRecord | null) ?? null;
}

export function useNewUserCampaign(): CampaignState {
  const { user } = useAuth();
  const [native,        setNative]        = useState(false);
  const [deviceId,      setDeviceId]      = useState('');
  const [record,        setRecord]        = useState<CampaignRecord | null>(null);
  const [accountCreated,setAccountCreated] = useState<string | undefined>();
  const [loading,       setLoading]       = useState(true);
  const [claiming,      setClaiming]      = useState(false);

  const accountAgeDays = useMemo(
    () => getAccountAgeDays(accountCreated),
    [accountCreated],
  );
  const isNewAccount = accountAgeDays < CAMPAIGN_DAYS;

  const ensureRegistered = useCallback(async (id: string, userId: string) => {
    const { data, error } = await supabase.rpc('ensure_new_user_campaign' as any, {
      p_device_id: id,
    });
    if (error) {
      console.warn('[campaign] ensure failed:', error.message);
      return fetchCampaignRecord(userId);
    }
    const result = data as { registered?: boolean; eligible?: boolean; error?: string };
    if (!result?.registered) {
      console.warn('[campaign] not registered:', result?.error);
    }
    return fetchCampaignRecord(userId);
  }, []);

  useEffect(() => {
    let cancelled = false;

    const init = async () => {
      await new Promise(r => setTimeout(r, 300));

      const isNative = isNativePlatform();
      const id = getDeviceId();

      if (cancelled) return;
      setNative(isNative);
      setDeviceId(id);

      if (!user) {
        setLoading(false);
        return;
      }

      const createdAt = await resolveAccountCreatedAt(user.id, user.created_at);
      if (cancelled) return;
      setAccountCreated(createdAt);

      const ageDays = getAccountAgeDays(createdAt);
      const isNew = ageDays < CAMPAIGN_DAYS;

      let campaignRecord: CampaignRecord | null = null;

      if (isNative && isNew) {
        campaignRecord = await ensureRegistered(id, user.id);
      } else {
        campaignRecord = await fetchCampaignRecord(user.id);
      }

      if (!cancelled) {
        setRecord(campaignRecord);
        setLoading(false);
      }
    };

    init();
    return () => { cancelled = true; };
  }, [user, ensureRegistered]);

  const claim = useCallback(async () => {
    if (!user || !deviceId) return { success: false, error: 'Not ready' };
    if (!native) return { success: false, error: 'Claims are mobile-app only' };
    if (!isNewAccount) return { success: false, error: 'Campaign ended for your account' };

    setClaiming(true);
    try {
      if (!record) {
        const refreshed = await ensureRegistered(deviceId, user.id);
        setRecord(refreshed);
      }

      const { data, error } = await supabase.rpc('claim_new_user_reward' as any, {
        p_device_id: deviceId,
      });
      if (error) return { success: false, error: error.message };

      const result = data as any;
      if (result?.success) {
        const updated = await fetchCampaignRecord(user.id);
        setRecord(updated);
        return { success: true, pointsAwarded: result.points_awarded };
      }
      return { success: false, error: result?.error || 'Claim failed' };
    } catch (e: any) {
      return { success: false, error: e.message };
    } finally {
      setClaiming(false);
    }
  }, [user, deviceId, native, isNewAccount, record, ensureRegistered]);

  const now = new Date();
  const daysClaimed = record?.days_claimed ?? 0;
  const lastClaim = record?.last_claim_at ? new Date(record.last_claim_at) : null;
  const claimedToday = lastClaim ? lastClaim.toDateString() === now.toDateString() : false;

  const campaignEnded =
    !isNewAccount ||
    daysClaimed >= CAMPAIGN_DAYS ||
    (record != null && record.is_eligible === false);

  const daysRemaining = Math.max(0, CAMPAIGN_DAYS - daysClaimed);

  // New account on mobile can claim even before record loads — claim RPC auto-registers
  const canClaimToday =
    native &&
    isNewAccount &&
    !campaignEnded &&
    !claimedToday &&
    (record == null || record.is_eligible !== false);

  const showBanner = useMemo(() => {
    if (!user) return false;
    if (!native) return true;
    if (isNewAccount) return true;
    if (daysClaimed > 0) return true;
    return false;
  }, [user, native, isNewAccount, daysClaimed]);

  return {
    isNewAccount,
    isNative: native,
    showBanner,
    isEligible: isNewAccount && !campaignEnded,
    daysRemaining,
    daysClaimed,
    canClaimToday,
    campaignEnded,
    loading,
    claiming,
    claim,
  };
}
