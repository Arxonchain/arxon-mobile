import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

// Safe native check
const IS_NATIVE = (() => {
  try {
    const { Capacitor } = require('@capacitor/core');
    return Capacitor.isNativePlatform();
  } catch {
    return false;
  }
})();

// ── Device ID ──────────────────────────────────────────────────────────────
function getDeviceId(): string {
  try {
    const key = 'arxon_device_id';
    const existing = localStorage.getItem(key);
    if (existing) return existing;
    const id = `${IS_NATIVE ? 'native' : 'web'}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    localStorage.setItem(key, id);
    return id;
  } catch {
    return 'unknown_' + Date.now();
  }
}

// ── New install detection ──────────────────────────────────────────────────
// FIX: A device is "new" if:
// 1. It is a native platform (not web browser)
// 2. The key 'arxon_first_open' has NEVER been set on this device
// We mark it on first call so subsequent opens still know it was a new install.
function checkIsNewInstall(): boolean {
  if (!IS_NATIVE) return false;
  try {
    const key = 'arxon_first_open';
    const existing = localStorage.getItem(key);
    if (existing) {
      // Already opened before — still a "new install" user if within 7 days
      // We don't return false here — we let the DB record decide eligibility
      return true; // Device has the app installed
    }
    // Very first open ever on this device
    localStorage.setItem(key, new Date().toISOString());
    return true; // Brand new install
  } catch {
    return false;
  }
}

// FIX: Separate check for whether this is the VERY FIRST open (never opened before)
function isVeryFirstOpen(): boolean {
  if (!IS_NATIVE) return false;
  try {
    // If arxon_first_open was JUST set (within last 10 seconds), it's first open
    const val = localStorage.getItem('arxon_first_open');
    if (!val) return false;
    const diff = Date.now() - new Date(val).getTime();
    return diff < 10_000; // Set within last 10 seconds = this IS the first open
  } catch {
    return false;
  }
}

export interface CampaignState {
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
  const [isNewInstall, setIsNewInstall] = useState(false);
  const [deviceId,     setDeviceId]     = useState('');
  const [record,       setRecord]       = useState<any>(null);
  const [loading,      setLoading]      = useState(true);
  const [claiming,     setClaiming]     = useState(false);

  useEffect(() => {
    let cancelled = false;

    const init = async () => {
      const id = getDeviceId();
      
      // FIX: Check BEFORE marking first open
      const hadPreviousOpen = IS_NATIVE
        ? !!localStorage.getItem('arxon_first_open')
        : false;
      
      const isNativeInstall = checkIsNewInstall();
      const firstEverOpen = !hadPreviousOpen && isNativeInstall;

      if (cancelled) return;
      setDeviceId(id);
      setIsNewInstall(isNativeInstall);

      if (!user) { setLoading(false); return; }

      // FIX: Only register in DB on the very first open of a NEW device
      // This prevents the bug where re-opening the app creates a new record
      // and resets eligibility
      if (firstEverOpen) {
        const { error } = await supabase.from('new_user_campaign').insert({
          user_id: user.id,
          device_id: id,
          first_open_at: new Date().toISOString(),
          is_eligible: true,
        });
        // If insert failed due to conflict on device_id, that's fine
        // (user reinstalled — they already used this device)
        if (error && error.code !== '23505') {
          console.warn('[campaign] insert error:', error.message);
        }
      }

      // Always fetch the campaign record for this user
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

  // Derive state
  const now         = new Date();
  const firstOpen   = record?.first_open_at ? new Date(record.first_open_at) : now;
  const daysSince   = Math.floor((now.getTime() - firstOpen.getTime()) / 86_400_000);
  const daysClaimed = record?.days_claimed ?? 0;
  const campaignEnded = daysSince >= 7 || daysClaimed >= 7 || record?.is_eligible === false;
  const daysRemaining = Math.max(0, 7 - daysClaimed);
  const lastClaim   = record?.last_claim_at ? new Date(record.last_claim_at) : null;
  const claimedToday = lastClaim ? lastClaim.toDateString() === now.toDateString() : false;

  // FIX: canClaimToday requires:
  // 1. A record exists in DB (registered as new install)
  // 2. Device is native (not web)
  // 3. Campaign not ended
  // 4. Not already claimed today
  const canClaimToday = !!record && isNewInstall && !campaignEnded && !claimedToday;

  return {
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
