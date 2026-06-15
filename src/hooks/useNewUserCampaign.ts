import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

// ── Native detection (lazy — called at runtime not module load) ────────────
function isNativePlatform(): boolean {
  // Check 1: Capacitor bridge injected by native WebView
  try {
    const cap = (window as any).Capacitor;
    if (cap && typeof cap.isNativePlatform === 'function') {
      return cap.isNativePlatform();
    }
  } catch {}

  // Check 2: Android WebView user agent marker
  try {
    const ua = navigator.userAgent || '';
    // Android WebView always contains "; wv)" in UA string
    if (/; wv\)/.test(ua)) return true;
  } catch {}

  return false;
}

// ── Device ID ──────────────────────────────────────────────────────────────
function getDeviceId(): string {
  try {
    const key = 'arxon_device_id';
    const existing = localStorage.getItem(key);
    if (existing) return existing;
    const id = `device_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    localStorage.setItem(key, id);
    return id;
  } catch {
    return 'unknown_' + Date.now();
  }
}

export interface CampaignState {
  isNative: boolean;
  isNewInstall: boolean;
  isEligible: boolean;
  daysRemaining: number;
  daysClaimed: number;
  canClaimToday: boolean;
  campaignEnded: boolean;
  loading: boolean;
  claiming: boolean;
  claim: () => Promise<{ success: boolean; pointsAwarded?: number; error?: string }>;
}

export function useNewUserCampaign(): CampaignState {
  const { user } = useAuth();
  const [native,       setNative]       = useState(false);
  const [isNewInstall, setIsNewInstall] = useState(false);
  const [deviceId,     setDeviceId]     = useState('');
  const [record,       setRecord]       = useState<any>(null);
  const [loading,      setLoading]      = useState(true);
  const [claiming,     setClaiming]     = useState(false);

  useEffect(() => {
    let cancelled = false;

    const init = async () => {
      // Detect native INSIDE useEffect so it runs after React hydration
      // and after the Capacitor bridge has had time to inject window.Capacitor
      const isNative = isNativePlatform();
      const id = getDeviceId();

      // Check first open BEFORE marking it
      const firstOpenKey = 'arxon_first_open';
      const hadPreviousOpen = !!localStorage.getItem(firstOpenKey);
      const isFirstEverOpen = isNative && !hadPreviousOpen;

      if (isNative && !hadPreviousOpen) {
        localStorage.setItem(firstOpenKey, new Date().toISOString());
      }

      if (cancelled) return;
      setNative(isNative);
      setDeviceId(id);
      setIsNewInstall(isNative); // Any native device qualifies as "new install user"

      if (!user) { setLoading(false); return; }

      // Register in DB only on very first open
      if (isFirstEverOpen) {
        await supabase.from('new_user_campaign').insert({
          user_id: user.id,
          device_id: id,
          first_open_at: new Date().toISOString(),
          is_eligible: true,
        }).then(() => {});
      }

      // Fetch campaign record
      const { data } = await supabase
        .from('new_user_campaign')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!cancelled) {
        setRecord(data);
        setLoading(false);
      }
    };

    // Small delay to ensure Capacitor bridge is ready
    const timer = setTimeout(init, 200);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [user]);

  const claim = useCallback(async () => {
    if (!user || !deviceId) return { success: false, error: 'Not ready' };
    setClaiming(true);
    try {
      const { data, error } = await supabase.rpc('claim_new_user_reward' as any, {
        p_device_id: deviceId,
      });
      if (error) return { success: false, error: error.message };
      const result = data as any;
      if (result?.success) {
        const { data: updated } = await supabase
          .from('new_user_campaign')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle();
        setRecord(updated);
        return { success: true, pointsAwarded: result.points_awarded };
      }
      return { success: false, error: result?.error || 'Claim failed' };
    } catch (e: any) {
      return { success: false, error: e.message };
    } finally {
      setClaiming(false);
    }
  }, [user, deviceId]);

  const now         = new Date();
  const firstOpen   = record?.first_open_at ? new Date(record.first_open_at) : now;
  const daysSince   = Math.floor((now.getTime() - firstOpen.getTime()) / 86_400_000);
  const daysClaimed = record?.days_claimed ?? 0;
  const campaignEnded = daysSince >= 7 || daysClaimed >= 7 || record?.is_eligible === false;
  const daysRemaining = Math.max(0, 7 - daysClaimed);
  const lastClaim   = record?.last_claim_at ? new Date(record.last_claim_at) : null;
  const claimedToday = lastClaim ? lastClaim.toDateString() === now.toDateString() : false;
  const canClaimToday = !!record && native && !campaignEnded && !claimedToday;

  return {
    isNative: native,
    isNewInstall,
    isEligible: !!record && !campaignEnded,
    daysRemaining,
    daysClaimed,
    canClaimToday,
    campaignEnded,
    loading,
    claiming,
    claim,
  };
}
