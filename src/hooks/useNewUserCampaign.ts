import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

// ── Native detection ───────────────────────────────────────────────────────
// Called lazily inside useEffect so Capacitor bridge is ready
function isNativePlatform(): boolean {
  try {
    const cap = (window as any).Capacitor;
    if (cap && typeof cap.isNativePlatform === 'function') {
      return cap.isNativePlatform();
    }
  } catch {}
  try {
    // Android WebView UA always has "; wv)" marker
    if (/; wv\)/i.test(navigator.userAgent)) return true;
  } catch {}
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

export interface CampaignState {
  isNative: boolean;
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
  const [native,    setNative]    = useState(false);
  const [deviceId,  setDeviceId]  = useState('');
  const [record,    setRecord]    = useState<any>(null);
  const [loading,   setLoading]   = useState(true);
  const [claiming,  setClaiming]  = useState(false);

  useEffect(() => {
    let cancelled = false;

    const init = async () => {
      // Wait 300ms for Capacitor bridge to inject window.Capacitor
      await new Promise(r => setTimeout(r, 300));

      const isNative = isNativePlatform();
      const id = getDeviceId();

      if (cancelled) return;
      setNative(isNative);
      setDeviceId(id);

      if (!user) { setLoading(false); return; }

      // FIX: For native users, ALWAYS try to register them in the campaign.
      // If they already have a record (UNIQUE conflict), that's fine — ignore it.
      // This handles:
      // - Brand new installs (no record yet → creates one)
      // - Reinstalls (device_id conflict → ignored, user already used this device)
      // - Existing users who just got the update (no record → creates one)
      if (isNative) {
        // Check if record already exists first
        const { data: existing } = await supabase
          .from('new_user_campaign')
          .select('id')
          .eq('user_id', user.id)
          .maybeSingle();

        if (!existing) {
          // No record yet — this is their first time. Register them.
          // first_open_at = now, so their 7-day window starts today
          await supabase.from('new_user_campaign').insert({
            user_id: user.id,
            device_id: id,
            first_open_at: new Date().toISOString(),
            is_eligible: true,
          }).then(() => {});
        }
      }

      // Fetch the campaign record
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

    init();
    return () => { cancelled = true; };
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
        // Refresh record to show updated progress
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

  // Derive state from record
  const now         = new Date();
  const firstOpen   = record?.first_open_at ? new Date(record.first_open_at) : now;
  const daysSince   = Math.floor((now.getTime() - firstOpen.getTime()) / 86_400_000);
  const daysClaimed = record?.days_claimed ?? 0;
  const campaignEnded = daysSince >= 7 || daysClaimed >= 7 || record?.is_eligible === false;
  const daysRemaining = Math.max(0, 7 - daysClaimed);
  const lastClaim   = record?.last_claim_at ? new Date(record.last_claim_at) : null;
  const claimedToday = lastClaim
    ? lastClaim.toDateString() === now.toDateString()
    : false;

  // canClaimToday: must have a DB record + be on native + campaign not ended + not claimed today
  const canClaimToday = !!record && native && !campaignEnded && !claimedToday;

  return {
    isNative: native,
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
